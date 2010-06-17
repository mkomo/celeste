astro = {
	getFullDays : function(date){
		var y = date.getUTCFullYear();
		var m = date.getUTCMonth()+1;
		var d = date.getUTCDate();
		var d_0 = 367*y 
			- Math.floor((7/4)*(y+Math.floor((m+9)/12))) 
			+ Math.floor(275*m/9) + d - 730531.5;
		return d_0;
	},
	getTimeFraction : function(date){
		var t_UT = (date.getUTCSeconds()/60 + 
							date.getUTCMinutes())/60 + 
										date.getUTCHours();
		return t_UT;
	},
	getDays : function(date){
		var d = astro.getFullDays(date) + astro.getTimeFraction(date)/24;
		return d;
	},
	getJulianCenturies : function(days){
		var T_0 = days / 36525; 
		return T_0;
	},
	getSiderealTimeAtMeridian : function(date){
		var T = astro.getJulianCenturies(astro.getDays(date));
		var S_0 = 6.6974 + 24.000513 * (100 * T);
		var t_UT = astro.getTimeFraction(date);
		var S_G = S_0 + (366.2422 / 365.2422) * t_UT;
		return S_G;
	},
	getSiderealTime : function(date, longitude){
		var S_G = astro.getSiderealTimeAtMeridian(date);
		var S = S_G + longitude / 15;
		return MathExt.translatePeriodic(S, 0, 24);
	},
	getLongitude : function(date, siderealTime){
		var S_G = astro.getSiderealTimeAtMeridian(date);
		var lon = 15 * (siderealTime - S_G);
		return MathExt.translatePeriodic(lon, -180, 180);
	},
	/**
	 * Iteratively computes E given the mean anomaly, the eccentricity, and the 
	 * desired precision.
	 * used instead of the given approximation of E in tutorial
	 * @param {Object} M
	 * @param {Object} e
	 * @param {Object} precision
	 * @param {Object} E_0
	 */
	getEccentricAnomaly : function(M, e, precision, E_0){
		if (typeof E_0 === 'undefined') E_0 = 0;
		var E = M + e * Math.sin(E_0);
		if (Math.abs(E - E_0) > precision) {
			return astro.getEccentricAnomaly(M, e, precision, E);
		} else {
			return E;
		}
	},
	/**
	 * returns the coordinate for which the sun is directly overhead at the 
	 * given date.
	 * @param {Date} date
	 */
	getGeographicCoordOfSun : function(date){
		var sun =  astrodata.sun.getGeocentricCoords(date);
		var lat = sun.dec;
		var lon = astro.getLongitude(date, sun.ra);
		return new GeographicCoord(lat, lon);
	}
}

FrameOfReference = function(date, lat, lon){
	this.date = date;
	this.lat = lat;
	this.lon = lon;
	
	this.getHorizontalFromEquatorial = function(eq){
		//azimuth
		var ha = hoursToRad(this.getSiderealTime() - eq.ra);//hour angle
		var az = Math.atan2(-1 * Math.sin(ha), 
					Math.tan(degToRad(eq.dec)) * Math.cos(degToRad(this.lat)) - 
					Math.sin(degToRad(this.lat)) * Math.cos(ha));
		//altitude
		var al = Math.asin(Math.sin(degToRad(this.lat)) * Math.sin(degToRad(eq.dec)) + 
					Math.cos(degToRad(this.lat)) * Math.cos(degToRad(eq.dec)) * Math.cos(ha));
		return new HorizontalCoord(az, al);
	}
	
	this.getSiderealTime = function(){
		return astro.getSiderealTime(this.date, this.lon);
	}
}

CelestialObject = function(params, properties){
	this.params = {
		//    N  (usually written as "Capital Omega") Longitude of Ascending
		//       Node. This is the angle, along the ecliptic, from the Vernal
		//       Point to the Ascending Node, which is the intersection between
		//       the orbit and the ecliptic, where the planet moves from south
		//       of to north of the ecliptic, i.e. from negative to positive
		//       latitudes.
		N : params.N,
		//    i  Inclination, i.e. the "tilt" of the orbit relative to the
		//       ecliptic.  The inclination varies from 0 to 180 degrees. If
		//       the inclination is larger than 90 degrees, the planet is in
		//       a retrogade orbit, i.e. it moves "backwards".  The most
		//       well-known celestial body with retrogade motion is Comet Halley.
		i : params.i,
		//    w  (usually written as "small Omega") The angle from the Ascending
		//       node to the Perihelion, along the orbit.
		w : params.w,
		//a  Mean distance, or semi-major axis
		a : params.a,
		//e  Eccentricity
		e : params.e,
		//    M  Mean Anomaly         = n * (t - T)  =  (t - T) * 360 / P
		//       Mean Anomaly is 0 at perihelion and 180 degrees at aphelion
		M : params.M
	}
	this.properties = properties;
	if (typeof params.perturb === 'function'){
		this.perturb = params.perturb;
	}
	this.getParams = function(d){
		var degs = ['N','i','w','M'];
		return mkutil.mapObject(this.params, function(value, key){
			var x = value[0];
			if (value.length === 2){
				x += value[1]*d;
			}
			//normalize -- not a necessary step? just aesthetic.
			if (degs.indexOf(key) != -1){
				x = MathExt.translatePeriodic(x, 0, 360);
			}
			return x;
		});
	};
	this.computeEcliptic = function(d){
		var params = this.getParams(d)

		// Calculate eccentric anomaly
		var E = radToDeg(astro.getEccentricAnomaly(degToRad(params.M), params.e, 0.0001));
		
		// compute the coordinates in the plane of the orbit, 
		// where the X axis points towards the perihelion:
		var c = new RectangularCoord({
			x : params.a * (Math.cos(degToRad(E)) - params.e),
			y : params.a * Math.sin(degToRad(E)) * Math.sqrt(1 - params.e*params.e),
			z : 0
		});
		// Now we can compute the ecliptic coords:
		//rotate ascending node to x=0 (in y direction)
		c = c.rotateZ(degToRad(params.w));
		//rotate into plane of inclination
		c = c.rotateX(degToRad(params.i));
		//rotate ascending node into correct position
		c = c.rotateZ(degToRad(params.N));
		
		//compute perturbations 
		if (typeof this.perturb === "function") {
			var eclCoord = c.toSpherical();
			eclCoord = this.perturb(params, eclCoord, d);
			c = eclCoord.toRect();
		}
		return c;
	};
	this.getGeocentricCoords = function(date){
		var d = astro.getDays(date) + 1.5;
		var ecl = this.computeEcliptic(d);
		if (!this.properties.isGeocentric){
			var sunCoord = astrodata.sun.computeEcliptic(d);
			ecl.x += sunCoord.x;
			ecl.y += sunCoord.y;
			ecl.z += sunCoord.z;
		}
		//rotate about the axial tilt of earth
		var oblecl = degToRad(23.4393 - 3.563E-7 * d);
		var c_eq = ecl.rotateX(oblecl).toSpherical();
		return new EquatorialCoord(c_eq.lat, c_eq.lon, c_eq.r);
	};
	this.getPositionInSky = function(frame){
		var geocentricCoord = this.getGeocentricCoords(frame.date);
		var hCoord = frame.getHorizontalFromEquatorial(geocentricCoord);
		
		//TODO topocentric - this is the poor man's solution. So we want more?
		var r = geocentricCoord.r * (this.properties.isEarthRadii ? 1 : 23455); 
		var parallax = Math.atan(1 / r);
		hCoord.al -= parallax * Math.cos(hCoord.al);
		
		return hCoord; 
	};
	this.getAngularDiameter = function(){
		return 32/60 * Math.PI/180;
	};
}