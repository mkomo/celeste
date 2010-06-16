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
		var sun =  sunObj.getGeocentricCoords(date);
		var lat = sun.dec;
		var lon = astro.getLongitude(date, sun.ra);
		return new GeographicCoord(lat, lon);
	}
}

degToRad = function(degrees){
	return degrees * Math.PI/180;
}

radToDeg = function(rad){
	return rad * 180/Math.PI;
}

hoursToRad = function(hours){
	return hours * Math.PI / 12;
}

radToHours = function(rad){
	return rad  * 12 / Math.PI;
}

degToHours = function(deg){
	return deg / 15;
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
	this.properties = {
		isGeocentric : 	properties.isGeocentric,
		color :			properties.color
	}
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
			//TODO add sun coords
		}
		//rotate about the axial tilt of earth
		var oblecl = degToRad(23.4393 - 3.563E-7 * d);
		var c_eq = ecl.rotateX(oblecl).toSpherical();
		//TODO topocentric
		return new EquatorialCoord(c_eq.lat, c_eq.lon);
	};
	this.getPositionInSky = function(frame){
		return frame.getHorizontalFromEquatorial(this.getGeocentricCoords(frame.date));
	};
	this.getAngularDiameter = function(){
		return 32/60 * Math.PI/180;
	};
}
sunObj = new CelestialObject({
	N: [0],
	i: [0],
	w: [282.9404, 4.70935e-5],
    a: [1.000000],
    e: [0.016709, -1.151e-9],
    M: [356.0470, 0.9856002585]
},{
	name : 'sun',
	isGeocentric : true,
	color : '#ff0'
});

moonObj = new CelestialObject({
    N: [125.1228, -0.0529538083],
    i: [  5.1454],
    w: [318.0634, 0.1643573223],
    a: [ 60.2666],//TODO change units to AU (instead of earth radii)
    e: [0.054900],
    M: [115.3654, 13.0649929509], 
	perturb: function(moon, eclCoord, d){
		var sun = sunObj.getParams(d);
		
		var Ls = degToRad(sun.N + sun.w + sun.M);//Sun's  mean longitude
		var Lm = degToRad(moon.N + moon.w + moon.M);//Moon's mean longitude
		var Ms = degToRad(sun.M);//Sun's  mean anomaly
		var Mm = degToRad(moon.M);//Moon's mean anomaly
		var D = Lm - Ls;//Moon's mean elongation
		var F = Lm - degToRad(moon.N);//Moon's argument of latitude
		
		//Perturbations in longitude (degrees):
		var lonPert = MathExt.sum([
			 -1.274 * Math.sin(Mm - 2*D),    //(Evection)
			  0.658 * Math.sin(2*D),         //(Variation)
			 -0.186 * Math.sin(Ms),          //(Yearly equation)
			 -0.059 * Math.sin(2*Mm - 2*D),
			 -0.057 * Math.sin(Mm - 2*D + Ms),
			  0.053 * Math.sin(Mm + 2*D),
			  0.046 * Math.sin(2*D - Ms),
			  0.041 * Math.sin(Mm - Ms),
			 -0.035 * Math.sin(D),            //(Parallactic equation)
			 -0.031 * Math.sin(Mm + Ms),
			 -0.015 * Math.sin(2*F - 2*D),
			  0.011 * Math.sin(Mm - 4*D)
		]);
		  
		//Perturbations in latitude (degrees):
		var latPert = MathExt.sum([
			 -0.173 * Math.sin(F - 2*D),
			 -0.055 * Math.sin(Mm - F - 2*D),
			 -0.046 * Math.sin(Mm + F - 2*D),
			  0.033 * Math.sin(F + 2*D),
			  0.017 * Math.sin(2*Mm + F)
		]);
			  
		//Perturbations in lunar distance (Earth radii):
		var radPert = MathExt.sum([
			 -0.58 * Math.cos(Mm - 2*D),
			 -0.46 * Math.cos(2*D)
		]);
			 
		eclCoord.lat = eclCoord.lat + latPert;
		eclCoord.lon = eclCoord.lon + lonPert;
		eclCoord.r = eclCoord.r + radPert;
		
		return eclCoord;
	}
},{
	isGeocentric : true,
	color : '#fff'
});
planets = {
	mercury : new CelestialObject({
	    N : [ 48.3313, 3.24587E-5],
	    i : [  7.0047, 5.00E-8],
	    w : [ 29.1241, 1.01444E-5],
	    a : [0.387098],
	    e : [0.205635, 5.59E-10],
	    M : [168.6562, 4.0923344368]
	},{
		isGeocentric : false
	}),
	venus : new CelestialObject({
	    N : [ 76.6799, 2.46590E-5],
	    i : [  3.3946, 2.75E-8],
	    w : [ 54.8910, 1.38374E-5],
	    a : [0.723330],
	    e : [0.006773, 1.302E-9],
	    M : [ 48.0052, 1.6021302244]
	},{
		isGeocentric : false
	}),
	mars : new CelestialObject({
	    N : [ 49.5574, 2.11081E-5],
	    i : [  1.8497, 1.78E-8],
	    w : [286.5016, 2.92961E-5],
	    a : [1.523688],
	    e : [0.093405, 2.516E-9],
	    M : [ 18.6021, 0.5240207766]
	},{
		isGeocentric : false
	}),
	jupiter : new CelestialObject({
	    N : [100.4542, 2.76854E-5],
	    i : [  1.3030, 1.557E-7],
	    w : [273.8777, 1.64505E-5],
	    a : [ 5.20256],
	    e : [0.048498, 4.469E-9],
	    M : [ 19.8950, 0.0830853001],
		perturb: function(jupiter, eclCoord, d){
			var saturn = planet.saturn.getParams(d);
			
			var Ms = degToRad(saturn.M);//Saturn's  mean anomaly
			var Mj = degToRad(jupiter.M);//Jupiter's mean anomaly
			
			//Perturbations in longitude (degrees):
			var lonPert = MathExt.sum([
			    -0.332 * Math.sin(2*Mj - 5*Ms - degToRad(67.6)),
			    -0.056 * Math.sin(2*Mj - 2*Ms + degToRad(21)),
			     0.042 * Math.sin(3*Mj - 5*Ms + degToRad(21)),
			    -0.036 * Math.sin(Mj - 2*Ms),
			     0.022 * Math.cos(Mj - Ms),
			     0.023 * Math.sin(2*Mj - 3*Ms + degToRad(52)),
			    -0.016 * Math.sin(Mj - 5*Ms - degToRad(69))
			]);
				 
			eclCoord.lon = eclCoord.lon + lonPert;
			
			return eclCoord;
		}
	},{
		isGeocentric : false
	}),
	saturn : new CelestialObject({
	    N : [113.6634, 2.38980E-5],
	    i : [  2.4886, 1.081E-7],
	    w : [339.3939, 2.97661E-5],
	    a : [ 9.55475],
	    e : [0.055546, 9.499E-9],
	    M : [316.9670, 0.0334442282],
		perturb: function(saturn, eclCoord, d){
			var jupiter = planet.jupiter.getParams(d);
			
			var Ms = degToRad(saturn.M);//Saturn's  mean anomaly
			var Mj = degToRad(jupiter.M);//Jupiter's mean anomaly

			//Perturbations in longitude (degrees):
			var lonPert = MathExt.sum([
			     0.812 * Math.sin(2*Mj - 5*Ms - degToRad(67.6)),
			    -0.229 * Math.cos(2*Mj - 4*Ms - degToRad(2)),
			     0.119 * Math.sin(Mj - 2*Ms - degToRad(3)),
			     0.046 * Math.sin(2*Mj - 6*Ms - degToRad(69)),
			     0.014 * Math.sin(Mj - 3*Ms + degToRad(32))
			]);
			var latPert = MathExt.sum([
			    -0.020 * Math.cos(2*Mj - 4*Ms - degToRad(2)),
			     0.018 * Math.sin(2*Mj - 6*Ms - degToRad(49))
			]);
				 
			eclCoord.lon = eclCoord.lon + lonPert;
			eclCoord.lat = eclCoord.lat + latPert;
			
			return eclCoord;
		}
	},{
		isGeocentric : false
	}),
	uranus : new CelestialObject({
	    N : [ 74.0005, 1.3978E-5],
	    i : [  0.7733, 1.9E-8],
	    w : [ 96.6612, 3.0565E-5],
	    a : [19.18171, 1.55E-8],
	    e : [0.047318, 7.45E-9],
	    M : [142.5905, 0.011725806],
		perturb: function(uranus, eclCoord, d){
			var saturn = planet.saturn.getParams(d);
			var jupiter = planet.jupiter.getParams(d);
			
			var Ms = degToRad(saturn.M);//Saturn's  mean anomaly
			var Mj = degToRad(jupiter.M);//Jupiter's mean anomaly
			var Mu = degToRad(uranus.M);//Jupiter's mean anomaly
			var sum = function(acc, val){
				return acc+val;
			}
			//Perturbations in longitude (degrees):
			var lonPert = MathExt.sum([
			     0.040 * Math.sin(Ms - 2*Mu + degToRad(6)),
			     0.035 * Math.sin(Ms - 3*Mu + degToRad(33)),
			    -0.015 * Math.sin(Mj - Mu + degToRad(20))
			]);
				 
			eclCoord.lon = eclCoord.lon + lonPert;
			
			return eclCoord;
		}
	},{
		isGeocentric : false
	}),
	neptune : new CelestialObject({
	    N : [131.7806, 3.0173E-5],
	    i : [  1.7700, 2.55E-7],
	    w : [272.8461, 6.027E-6],
	    a : [30.05826, 3.313E-8],
	    e : [0.008606, 2.15E-9],
	    M : [260.2471, 0.005995147]
	},{
		isGeocentric : false
	})
};