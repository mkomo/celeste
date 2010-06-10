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

#ifndef SKY_H
#define SKY_H

#include <osg/Geode>
#include <osg/Geometry>
#include <osg/StateSet>
#include <osg/Vec4>

#include "Timer.h"
#include "Entity.h"
#include "Color.h"

namespace om {
    //! Sky modelling
    /*! Module for sky modelling and rendering.
        Implementation of the "Practical Analytic Model for Daylight"
     */
    namespace Sky {

      //! Sun
      class Sun {
        public:
          Sun();
          //! Calculate the sun position according to the parameters given.          
          void CalcPosition( float pTime, float pDay, float pLat, float pLong, float pSTM );
          //! Sun angle theta.
          inline float Theta(){ return m_fTheta; }
          //! Sun angle phi.
          inline float Phi(){ return m_fPhi; }
        private:                                                              
          float m_fTheta;
          float m_fPhi;        
      };


      //! Day Sky
      /*! Skycolor computation based on sun position and turbidity
          This is a day sky model so the colors are wrong after the sun
          is below the horzion.
      */
      class DaySky {
        public:
          //! Constructor.
          DaySky();
          //! Set turbidity.
          void SetTurbidity( float pT );
          //! Get turbidity.
          inline float GetTurbidity(){ return m_T; }
          //! Set sun position.
          void SetSunPosition( float theta, float phi );
          //! Get color.
          /*! Get the color for the angles theta and phi. Theta is between the zenith and the sample point
              on the sky, phi is between North and the sample point. */
          Color::RGB Color( float theta, float phi );
                    
        private:
          //! Calculate distribution
          float Distribution( float A, float B, float C, float D, float E, float Theta, float Gamma );
          //! Calc the actual color/chromaticity
          float Chromaticity( float ZC[3][4] );
          
          float m_T, m_T2;    // Turbidity T and T
          float m_ThetaS, m_PhiS;
      };
      
      
      //! Sky Dome
      /*! Halfsphere skydome which uses the DaySky to simulated a physical correct sky coloring.
          \see DaySky
      */
      class Dome : public Entity  {
      public:
        //! SkyDome parameters.      
        struct Param {
          //! Time
          /*! Valid values are in the range [0.0,24.0[. But since just a day sky model
              is implemented for now not all values produce correct results.
              \see DaySky
          */
          float TimeOfDay;
          //! Day
          /*! Valid vaules are in the range [1,365]. 1 corresponds to the 1. January. */
          float JulianDay;
          //! Latitude
          float Lat;
          //! Longitude
          float Long;
          //! Standard meridian
          float StdMeridian;
          //! Turbidity
          float Turbidity;
          //! Exposure of the image
          float Exposure;
          //! Gamma correction, 2.5 is std.
          float Gamma;
          //! Update Interval.
          /*! Number of sec. after which the skydome should be updated */
          float UpdateTime;
          //! Time scaling.
          /*! 1.0 means no warping, < 1.0, slow motion, > 1.0 fast motion */
          float TimeWarp;
        };

        //! Constructor.        
        Dome();
        //! Set parameters.
        void SetParam( Param pParam ){ m_Param = pParam; }
        //! Set parameters.        
        void SetParam(  float TimeOfDay, float JulianDay,
                        float Lat, float Long, float StdMeridian,
                        float Turbidity,
                        float Exposure, float Gamma, float UpdateTime, float TimeWarp=1.0f );
        //! Get parameters.                        
        Param & GetParam(){ return m_Param; }
        
        virtual osg::Node * SceneData(){ return m_Node; }

        virtual void Update();
        virtual void Init();
        virtual void Reset(){;}
      private:
        void UpdateColors();
        osg::Node* Build( void );

        DaySky    m_DaySky;
        Sun       m_Sun;
        
        osg::Node *m_Node;
        osg::StateSet *m_pState;
        osg::Geometry *m_Geom;
        
        Param m_Param;

        float m_Levels[11];
        int   m_NLevel;
        
        osg::Timer_t m_LastUpdate;
    };
  }
}
#endif
