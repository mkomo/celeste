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

#include <cmath>
#include "Color.h"

using namespace om;
using namespace om::Color;

/////////////////////////////////////////////////////////////////////
// Helper function
/////////////////////////////////////////////////////////////////////

template<class T> void clamp( T &a, T lo, T hi )
{
    if( a > hi) a = hi;
    if( a < lo) a = lo;
}

/////////////////////////////////////////////////////////////////////
// XYZ Color Space
/////////////////////////////////////////////////////////////////////

// Convert from RGB to XYZ
void om::Color::RGBtoXYZ( const RGB &src, XYZ &dest )
{
    dest.X = 0.412453 * src.R + 0.357580 * src.G + 0.180423 * src.B;
    dest.Y = 0.212671 * src.R + 0.715160 * src.G + 0.072169 * src.B;
    dest.Z = 0.019334 * src.R + 0.119193 * src.G + 0.950227 * src.B;
}

// Convert from XYZ to RGB
void om::Color::XYZtoRGB( const XYZ &src, RGB &dest )
{
    dest.R  =   3.240479 * src.X    - 1.537150 * src.Y  - 0.498535 * src.Z;
    dest.G = -  0.969256 * src.X    +1.875991 * src.Y  + 0.041556 * src.Z;
    dest.B =    0.055648 * src.X    - 0.204043 * src.Y  + 1.057311 * src.Z;
}

//R    3.240479 -1.53715  -0.49853  X
//G = -0.969256  1.875991  0.041556 Y
//B    0.055648 -0.204043  1.057311 Z


/////////////////////////////////////////////////////////////////////
// xyY Color Space
/////////////////////////////////////////////////////////////////////

// Convert from xyY to XYZ
void om::Color::xyYtoXYZ( const xyY &src, XYZ &dest )
{
  dest.X = src.x * (src.Y / src.y);
  dest.Y = src.Y;
  dest.Z = (1.0 - src.x - src.y)* (src.Y/src.y);
}

// Convert directly from xyY to RGB
void om::Color::xyYtoRGB( const xyY &src, RGB &dest )
{
  XYZ xyz;
  xyYtoXYZ(src,xyz);
  XYZtoRGB(xyz,dest);
}

/////////////////////////////////////////////////////////////////////
// HSV Color Space
/////////////////////////////////////////////////////////////////////

void om::Color::RGBtoHSV( const RGB &src, HSV &dest )
{
  float mn = src.R, mx = src.R;
  int maxVal=0;

  if (src.G > mx){ mx = src.G;maxVal=1;}
  if (src.B > mx){ mx = src.B;maxVal=2;}
  if (src.G < mn) mn = src.G;
  if (src.B < mn) mn= src.B;

  float delta = mx - mn;

  dest.V = mx;
  if( mx != 0 )
    dest.S = delta / mx;
  else {
    dest.S = 0;
    dest.H = 0;
    return;
  }
  if (dest.S==0.0f) {
    // unknown color
    dest.H=-1;
    return;
  } else {
    switch (maxVal) {
      case 0:{dest.H = ( src.G - src.B ) / delta; break;} // yel < h < mag
      case 1:{dest.H = 2 + ( src.B - src.R ) / delta;break;} // cyan < h < yel
      case 2:{dest.H = 4 + ( src.R - src.G ) / delta;break;} // mag < h < cyan
    }
  }

  dest.H *= 60;
  if (dest.H < 0) dest.H += 360;
}

void om::Color::HSVtoRGB( const HSV &src, RGB &dest )
{
  // H is given on [0, 6] or UNDEFINED. S and V are given on [0, 1].
  // RGB are each returned on [0, 1].

  float m, n, f;
  int i;

  if(src.H == -1 ) dest.Set(src.V, src.V, src.V);

  i = (int)floorf(src.H);
  f = src.H - i;

  if(!(i & 1)) f = 1 - f; // if i is even


  m = src.V * (1 - src.S);
  n = src.V * (1 - src.S * f);
  switch (i) {
    case 6:
    case 0: dest.Set( src.V, n, m );
      break;
    case 1: dest.Set( n, src.V, m);
      break;
    case 2: dest.Set( m, src.V, n);
      break;
    case 3: dest.Set( m, n, src.V);
      break;    
    case 4: dest.Set( n, m, src.V);
      break;    
    case 5: dest.Set( src.V, m, n);
      break;    
  }
}

/////////////////////////////////////////////////////////////////////
// Gamma correction
/////////////////////////////////////////////////////////////////////
void om::Color::GammaCorrection(RGB &col, float gamma )
{
  col.R = pow(col.R, 1.0/gamma);
  col.G = pow(col.G, 1.0/gamma);
  col.B = pow(col.B, 1.0/gamma);
}
