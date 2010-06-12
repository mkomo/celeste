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
	 * returns the coordinate for which the sun is directly overhead at the 
	 * given date.
	 * @param {Date} date
	 */
	getGeographicCoordOfSun : function(date){
		var sun =  astro.getSun(date);
		var lat = sun.dec;
		var lon = astro.getLongitude(date, sun.ra);
		return new GeographicCoord(lat, lon);
	},
	
	/*
	 * The following are functions that are necessary for computing the position of the sun
	 */
	getMeanLongitudeOfSun : function(T){
		var L_0 = 280.466 + 36000.770 * T;
		return L_0;
	},
	getMeanAnomalyOfSun : function(T){
		var M_0 = 357.529 + 35999.050 * T;
		return M_0;
	},
	getEquationOfCenterForSun : function(T){
		var M_0 = astro.getMeanAnomalyOfSun(T);
		var C = (1.915 - 0.005 * T) * Math.sin(degToRad(M_0)) + 0.020 * Math.sin(degToRad(2 * M_0));
		return C;
	},
	getTrueEclipticalLongitudeOfSun : function(T){
		var L_0 = astro.getMeanLongitudeOfSun(T);
		var C = astro.getEquationOfCenterForSun(T);
		L_S = L_0 + C;
		return L_S;
	},
	getObliquityOfOrbit : function(T){
		var K = 23.4393 - 0.01301 * T;
		return K;
	},
	getSun : function(date){
		var T = astro.getJulianCenturies(astro.getDays(date));
		var L_S = astro.getTrueEclipticalLongitudeOfSun(T);
		var K = astro.getObliquityOfOrbit(T);
		var R_S = radToHours(Math.atan2(Math.sin(degToRad(L_S))*Math.cos(degToRad(K)),Math.cos(degToRad(L_S))));
		var D_S = radToDeg(Math.asin(Math.sin(hoursToRad(R_S)) * Math.sin(degToRad(K))));
		return new EquatorialCoord(R_S, D_S);
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

FrameOfReference = function(date, lat, lon){
	this.date = date;
	this.lat = lat;
	this.lon = lon;
	
	this.getHorizontalFromEquatorial = function(eq){
		//azimuth
		var ha = hoursToRad(astro.getSiderealTime(this.date, this.lon) - eq.ra);//hour angle
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