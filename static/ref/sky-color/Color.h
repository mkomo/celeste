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

#ifndef COLOR_H
#define COLOR_H

//! OpenMountains Global Namespace.
namespace om {
    //! Color
    /*! Color operation functions. Mainly color space conversion. */
    namespace Color {
        //! RGB.
        /* Red, green and blue tristimulus color space. */
        struct RGB {
            //! Constructor.
            RGB(){}
            //! Constructor.
            /*! Creates an RGB object with the given r,g and b values. */
            RGB(float r, float g, float b) : R(r),G(g),B(b) {}
            /*! The the RGB object to the given values r,g and b. */
            void Set( float r, float g, float b){ R=r; G=g; B=b; }
            float R,G,B;
        };

        //! CIE XYZ
        /* X,Y and Z tristimulus color space. */        
        struct XYZ {
            XYZ(){ }
            XYZ(float x, float y, float z) : X(x),Y(y),Z(z) {}
            void Set( float x, float y, float z){ X=x; Y=y; Z=z; }
            float X,Y,Z;
        };

        //! HSV.
        /*! Hue, saturation, value color space */
        struct HSV {
            HSV(){ }
            HSV(float h, float s, float v) : H(h),S(s),V(v) {}
            void Set( float h, float s, float v){ H=h; S=s; V=v; }
            float H,S,V;
        };

        struct xyY {
            xyY(){ }
            xyY(float px, float py, float pY) : x(px),y(py),Y(pY) {}
            void Set( float px, float py, float pY){ x=px; y=py; Y=pY; }
            
            float x,y,Y;
        };
        
        //! RGB to XYZ.
        /*! Convert RGB color information to XYZ.
            \param src Source color
            \param dest Destination color
        */
        void RGBtoXYZ( const RGB &src, XYZ &dest );
        
        //! XYZ to RGB.
        /*! Convert RGB color information to XYZ. Not all XYZ colors are displayable in RGB.
            \param src Source color
            \param dest Destination color
            \param bClamp Clamp color values to [0.0,1.0]
        */
        void XYZtoRGB( const XYZ&src, RGB &dest );

        //! xyY to XYZ.
        /*! Convert xyY color information to XYZ.
            \param src Source color
            \param dest Destination color
        */
        void xyYtoXYZ( const xyY &src, XYZ &dest );

        //! xyY to RGB.
        /*! Convert xyY color information to RGB.
            \param src Source color
            \param dest Destination color
        */
        void xyYtoRGB( const xyY &src, RGB &dest );



        //! RGB to HSV.
        /*! Convert RGB color information to HSV.
            \param src Source color
            \param dest Destination color
        */
        void RGBtoHSV( const RGB &src, HSV &dest );

         //! HSV to RGB.
        /*! Convert RGB color information to HSV.
            \param src Source color
            \param dest Destination color
        */
        void HSVtoRGB( const HSV &src, RGB &dest );


        void GammaCorrection(RGB &col, float gamma );

    }
}
  
#endif
