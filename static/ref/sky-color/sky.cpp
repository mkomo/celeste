////////////////////////////////////////////////////////////////////////////
//    copyright            : (C) 2003 by OpenMountains Developers         //
//    email                : openmountains-devel@lists.sf.net             //
//    Website              : http://openmountains.sf.net                  //
////////////////////////////////////////////////////////////////////////////

////////////////////////////////////////////////////////////////////////////
//                                                                        //
//   This program is free software; you can redistribute it and/or modify //
//   it under the terms of the GNU General Public License as published by //
//   the Free Software Foundation; either version 2 of the License, or    //
//   (at your option) any later version.                                  //
//                                                                        //
////////////////////////////////////////////////////////////////////////////

#include <osg/Group>
#include <osg/Notify>


#include <osg/Geode>
#include <osg/GeoSet>
#include <osg/Depth>

#include <osg/StateSet>
#include <osg/Transform>

#include <osgUtil/CullVisitor>

#include <osgDB/ReadFile>

#include <cmath>
#include <iostream>

#include "sky.h"

#ifdef WIN32
#pragma warning( disable : 4244 )
#pragma warning( disable : 4305 )
#endif

using namespace osg;
using namespace std;

// Color conversion module
using namespace om::Color;

namespace om {
namespace Sky {

//////////////////////////////////////////////////////////////
// Constants
//////////////////////////////////////////////////////////////

// Distribution coefficients for the luminance(Y) distribution function
static float YDC[5][2] = { { 0.1787, - 1.4630},
                            {-0.3554,   0.4275},
                            {-0.0227,   5.3251},
                            { 0.1206, - 2.5771},
                            {-0.0670,   0.3703} };

// Distribution coefficients for the x distribution function
static float xDC[5][2] = { {-0.0193, -0.2592},
                            {-0.0665, 0.0008},
                            {-0.0004, 0.2125},
                            {-0.0641, -0.8989},
                            {-0.0033, 0.0452} };

// Distribution coefficients for the y distribution function
static float yDC[5][2] = { {-0.0167, -0.2608},
                            {-0.0950, 0.0092},
                            {-0.0079, 0.2102},
                            {-0.0441, -1.6537},
                            {-0.0109, 0.0529} };

// Zenith x value
static float xZC[3][4] = {  {0.00166, -0.00375, 0.00209, 0},
                            {-0.02903, 0.06377, -0.03203, 0.00394},
                            {0.11693, -0.21196, 0.06052, 0.25886} };
// Zenith y value
static float yZC[3][4] = { { 0.00275, -0.00610, 0.00317, 0},
                            {-0.04214, 0.08970, -0.04153, 0.00516},
                            {0.15346, -0.26756, 0.06670, 0.26688} };

//////////////////////////////////////////////////////////////
// Helper functions
//////////////////////////////////////////////////////////////
#define PI 3.1415927f
#define TO_RAD(ang) osg::DegreesToRadians((ang))

// Angle between (thetav, theta) and  (phiv,phi)
inline float AngleBetween(float thetav, float phiv, float theta, float phi) {
  float cospsi = sin(thetav) * sin(theta) * cos(phi-phiv) + cos(thetav) * cos(theta);
  if (cospsi > 1)  return 0;
  if (cospsi < -1) return M_PI;
  return acos(cospsi);
}


//////////////////////////////////////////////////////////////
// Sun position
//////////////////////////////////////////////////////////////

Sun::Sun() : m_fTheta(0.0f), m_fPhi(0.0f)
{
}


void Sun::CalcPosition( float pTime, float pDay, float pLat, float pLong, float pSTM )
{
  float solarTime, solarDeclination, solarAltitude, opp, adj, solarAzimuth;

  solarTime = pTime +
    (0.170 * sin(4 * PI * (pDay - 80) / 373) - 0.129 * sin(2 * PI * (pDay - 8) / 355)) +
    (pSTM - pLong) / 15;
  solarDeclination = (0.4093 * sin(2 * PI * (pDay - 81) / 368));
  solarAltitude = asin(sin(TO_RAD(pLat)) * sin(solarDeclination) -
    cos(TO_RAD(pLat)) * cos(solarDeclination) * cos(PI * solarTime / 12));

  opp = -cos(solarDeclination) * sin(PI * solarTime / 12);
  adj = -(cos(TO_RAD(pLat)) * sin(solarDeclination) + sin(TO_RAD(pLat)) * cos(solarDeclination) *  cos(PI * solarTime / 12));
  solarAzimuth = atan(opp / adj);

  m_fPhi = -solarAzimuth;
  m_fTheta = PI / 2 - solarAltitude;
}


//////////////////////////////////////////////////////////////
// Day Sky model
// "Practical Anlaytic Method for Daylight" Skylight/color
//////////////////////////////////////////////////////////////

// Perez Function
inline float PerezFunction( float A, float B, float C, float D, float E,
                            float Theta, float Gamma )
{
  float cosGamma = cos(Gamma);
  float d = (1+ A * exp(B/cos(Theta)))*(1+ C * exp(D*Gamma) + E * cosGamma*cosGamma );
  return d;
}

// Constructor
DaySky::DaySky()
{
  m_T = m_T2 = 1.0f;
  m_ThetaS = m_PhiS = 0.0f;
}

// Set turbidity and precalc power of two
void DaySky::SetTurbidity( float pT )
{
  m_T = pT;
  m_T2 = m_T * m_T;
}

// Set sun position
void DaySky::SetSunPosition( float theta, float phi )
{
  m_ThetaS = theta;
  m_PhiS = phi;
}


// Calculate color
Color::RGB DaySky::Color( float theta, float phi )
{
  // Angle between sun (zenith=0.0!!) and point(theta,phi) to get compute color for
  float gamma = AngleBetween( theta, phi, m_ThetaS, m_PhiS );

  Color::xyY skycolor;
  Color::xyY Zenith;
  
  float A,B,C,D,E;
  float d,chi;

  // Zenith luminance
  chi = (4.0/9.0 - m_T/120.0)*(M_PI - 2*m_ThetaS);
  Zenith.Y = (4.0453*m_T - 4.9710)*tan(chi) - 0.2155*m_T + 2.4192;
  if (Zenith.Y < 0.0) Zenith.Y = -Zenith.Y;

  A = YDC[0][0]*m_T + YDC[0][1];
  B = YDC[1][0]*m_T + YDC[1][1];
  C = YDC[2][0]*m_T + YDC[2][1];
  D = YDC[3][0]*m_T + YDC[3][1];
  E = YDC[4][0]*m_T + YDC[4][1];

  // Sky luminance
  d = Distribution(A, B, C, D, E, theta, gamma);
  skycolor.Y = Zenith.Y * d;


  // Zenith x
  Zenith.x = Chromaticity( xZC );
  A = xDC[0][0]*m_T + xDC[0][1];
  B = xDC[1][0]*m_T + xDC[1][1];
  C = xDC[2][0]*m_T + xDC[2][1];
  D = xDC[3][0]*m_T + xDC[3][1];
  E = xDC[4][0]*m_T + xDC[4][1];

  // Sky x
  d = Distribution(A, B, C, D, E, theta, gamma);
  skycolor.x = Zenith.x * d;


  // Zenith y
  Zenith.y = Chromaticity( yZC );
  A = yDC[0][0]*m_T + yDC[0][1];
  B = yDC[1][0]*m_T + yDC[1][1];
  C = yDC[2][0]*m_T + yDC[2][1];
  D = yDC[3][0]*m_T + yDC[3][1];
  E = yDC[4][0]*m_T + yDC[4][1];

  // Sky y
  d = Distribution(A, B, C, D, E, theta, gamma);
  skycolor.y = Zenith.y * d;

  
  // SH:  scale xyY, just a hack
  //      i don't get proper luminance values otherwise...
  //skycolor.Y /= 15.0f;
  skycolor.Y = 1 - exp(-(1.0/25.0) * skycolor.Y);
  
  // convert to RGB
  Color::RGB col;
  Color::xyYtoRGB(skycolor,col);
  
  return col;  
}


// Calculate distribution
float DaySky::Distribution( float A, float B, float C, float D, float E, float Theta, float Gamma )
{
  //                       Perez_f0(Theta,Gamma)
  //    calculates:   d = -----------------------
  //                       Perez_f1(0,ThetaSun)
  float f0 = PerezFunction( A,B,C,D,E,Theta,Gamma );
  float f1 = PerezFunction( A,B,C,D,E,0,m_ThetaS );
  return(f0/f1);
}

// Calculate chromaticity (zenith)
float DaySky::Chromaticity( float ZC[3][4] )
{
  // Theta, Theta² and Theta³
  float t1 = m_ThetaS;
  float t2 = t1*t1;
  float t3 = t2 * t1;
  
  float c = (ZC[0][0]*t3 + ZC[0][1]*t2 + ZC[0][2]*t1 + ZC[0][3])* m_T2 +
            (ZC[1][0]*t3 + ZC[1][1]*t2 + ZC[1][2]*t1 + ZC[1][3])* m_T +
            (ZC[2][0]*t3 + ZC[2][1]*t2 + ZC[2][2]*t1 + ZC[2][3]);
  return c;
}



//////////////////////////////////////////////////////////////
// SkyDome
//////////////////////////////////////////////////////////////

//////////////////////////////////////////////////
// Constructor.
//////////////////////////////////////////////////
Dome::Dome() : Entity("Sky")
{
  // Std. Parameter Setup
  m_Param.TimeOfDay   = 5.0f;
  m_Param.JulianDay   = 40.0f;
  m_Param.Lat         = 20.0f;
  m_Param.Long        = 0.0f;
  m_Param.StdMeridian = 0.0f;
  m_Param.Turbidity   = 2.0f;
  m_Param.Exposure    = 25.0f;
  m_Param.Gamma       = 2.5f;
  m_Param.UpdateTime  = 180.0f;
  m_Param.TimeWarp    = 1.0f;
}

void Dome::Init()
{
  Dome::m_Node = Build();
  m_LastUpdate = gTimer.tick();
  UpdateColors();
}


void Dome::Update()
{
    osg::Timer_t now = gTimer.tick();
    
    if( gTimer.delta_s(m_LastUpdate,now) >= m_Param.UpdateTime ){
      m_LastUpdate = now;
      m_Param.TimeOfDay += m_Param.UpdateTime*m_Param.TimeWarp/3600.0f;
            cout << "Update Dome: Time=" << m_Param.TimeOfDay << endl;
      if(m_Param.TimeOfDay >= 24.0f) m_Param.TimeOfDay = 0.0f;
      UpdateColors();
    }
}

//////////////////////////////////////////////////
// Update Sky colors
//////////////////////////////////////////////////
void Dome::UpdateColors()
{
  float theta, phi;  
  // Calculate sun position
  m_Sun.CalcPosition(   m_Param.TimeOfDay, m_Param.JulianDay,
                        m_Param.Lat, m_Param.Long, m_Param.StdMeridian );

  // Set DayLight parameters
  m_DaySky.SetTurbidity( m_Param.Turbidity );
  m_DaySky.SetSunPosition( m_Sun.Theta(), m_Sun.Phi() /* 0,0 */);
  

  int i,j;
  int ci=0;
  Color::RGB col;
  Color::HSV sky_hsv;
  
/*  cout << "SkyDome Parameters" << endl;
  cout << "Sun: Theta=" <<thetaS<< " Phi=" << phiS << endl;*/

  osg::Vec4Array *colors = dynamic_cast<osg::Vec4Array*>(m_Geom->getColorArray());
  
  for( i = 0; i < m_NLevel; i++ ){
    for( j = 0; j <= 18; j++ ){
      theta = osg::DegreesToRadians(90.0f - m_Levels[i]);
      phi = osg::DegreesToRadians((float)(j*20));

      col = m_DaySky.Color( theta, phi );

      // Some color tweaking
      
      // RGB to HSV color space
      //Color::RGBtoHSV(col,sky_hsv);
      // exposure control: exp
      //sky_hsv.H = 1 - exp(-(1.0/m_Param.Exposure) * sky_hsv.H);
      //Color::HSVtoRGB(sky_hsv, col);
      // Gamma correction
      Color::GammaCorrection(col, m_Param.Gamma );
                   
      (*colors)[ci][0] = col.R;/* / m_Param.LinearScale;*/
      (*colors)[ci][1] = col.G;/* / m_Param.LinearScale; */
      (*colors)[ci][2] = col.B;/* / m_Param.LinearScale; */
      (*colors)[ci][3] = 1.0;
      ++ci;
    }
  }
  m_Geom->setColorArray( colors );
}


//////////////////////////////////////////////////
// Create Sky Geometry and return
// Node for SceneGraph
//////////////////////////////////////////////////
Node* Dome::Build( void )
{
    int i, j;
    m_Levels[0] = 0.0; m_Levels[1] = 1.0; m_Levels[2]= 15.0; m_Levels[3]= 30.0;
    m_Levels[4] = 60.0; m_Levels[5] =  90.0; m_Levels[6] = 120.0; m_Levels[7] = 150.0;
    m_Levels[8] = 165.0; m_Levels[9] =  179.0; m_Levels[10] = 180.0;
    
    float x, y, z;
    float alpha, theta;
    float radius = 2000.0f;
    int nlev = 11;
    m_NLevel = nlev;

    m_Geom = new Geometry;

    Vec3Array& coords = *(new Vec3Array(19*nlev));
    Vec4Array& colors = *(new Vec4Array(19*nlev));


    int ci = 0;

    for( i = 0; i < nlev; i++ )
    {
        for( j = 0; j <= 18; j++ )
        {
            alpha = osg::DegreesToRadians(m_Levels[i]);
            theta = osg::DegreesToRadians((float)(j*20));

            x = radius * cosf( alpha ) * cosf( theta );
            y = radius * cosf( alpha ) * -sinf( theta );
            z = radius * sinf( alpha );

            coords[ci][0] = x;
            coords[ci][1] = y;
            coords[ci][2] = z;

            ci++;
        }


    }

    for( i = 0; i < nlev-1; i++ )
    {
        DrawElementsUShort* drawElements = new DrawElementsUShort(PrimitiveSet::TRIANGLE_STRIP);
        drawElements->reserve(38);

        for( j = 0; j <= 18; j++ )
        {
            drawElements->push_back((i+1)*19+j);
            drawElements->push_back((i+0)*19+j);
        }

        m_Geom->addPrimitiveSet(drawElements);
    }

    m_Geom->setVertexArray( &coords );
    m_Geom->setColorArray( &colors );
    m_Geom->setColorBinding( Geometry::BIND_PER_VERTEX );


    StateSet *dstate = new StateSet;
    dstate->setMode( GL_LIGHTING, StateAttribute::OFF );
    dstate->setMode( GL_CULL_FACE, StateAttribute::ON );
    // clear the depth to the far plane.
    osg::Depth* depth = new osg::Depth;
    depth->setFunction(osg::Depth::ALWAYS);
    depth->setRange(1.0,1.0);
    dstate->setAttributeAndModes(depth,StateAttribute::ON );
    dstate->setRenderBinDetails(-2,"RenderBin");

    m_Geom->setStateSet( dstate );

    Geode *geode = new Geode;
    geode->addDrawable( m_Geom );

    geode->setName( "Sky" );

    return geode;
}

//////////////////////////////////////////////////
// Set Skydome parameters
//////////////////////////////////////////////////
void Dome::SetParam( float TimeOfDay, float JulianDay, float Lat, float Long, float StdMeridian,
                     float Turbidity, float Exposure, float Gamma, float UpdateTime, float TimeWarp )
{
  m_Param.TimeOfDay = TimeOfDay;
  m_Param.JulianDay = JulianDay;
  m_Param.Lat = Lat;
  m_Param.Long = Long;
  m_Param.StdMeridian = StdMeridian;
  m_Param.Turbidity = Turbidity;
  m_Param.Exposure = Exposure;
  m_Param.Gamma   = Gamma;
  m_Param.UpdateTime = UpdateTime;
  m_Param.TimeWarp = TimeWarp;
}


} // NS Sky
} // NS om
