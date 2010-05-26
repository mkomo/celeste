astro = {
	getDaysFromRef : function(date){
		var y = date.getUTCFullYear();
		var m = date.getUTCMonth()+1;
		var d = date.getUTCDate();
		var d_0 = 367*y 
			- Math.floor((7/4)*(y+Math.floor((m+9)/12))) 
			+ Math.floor(275*m/9) + d - 730531.5;
		return d_0;
	},
	getJulianCenturies : function(days){
		var T_0 = days / 36525; 
		return T_0;
	},
	getTimeFraction : function(date){
		var t_UT = (date.getUTCSeconds()/60 + 
							date.getUTCMinutes())/60 + 
										date.getUTCHours();
		return t_UT;
	},
	getSiderealTime : function(date, longitude){
		var T_0 = astro.getJulianCenturies(astro.getDaysIncludingTimeFromRef(date));
		var S_0 = 6.6974 + 2400.0513 * T_0;
		var t_UT = astro.getTimeFraction(date);
		var S_G = S_0 + (366.2422 / 365.2422) * t_UT;
		var S = S_G + longitude * 24 / 360;
		return S;
	},
	getDaysIncludingTimeFromRef : function(date){
		var d = astro.getDaysFromRef(date) + astro.getTimeFraction(date)/24;
		return d;
	},
	getMeanLongitudeOfSun : function(date){
		var T = astro.getJulianCenturies(astro.getDaysFromRef(date));
		var L_0 = 280.466 + 36000.770 * T;
		return L_0;
	},
	getMeanAnomalyOfSun : function(date){
		var T = astro.getJulianCenturies(astro.getDaysFromRef(date));
		var M_0 = 357.529 + 35999.050 * T;
		return M_0;
	},
	getEquationOfCenterForSun : function(date){
		var T = astro.getJulianCenturies(astro.getDaysFromRef(date));
		var M_0 = astro.getMeanAnomalyOfSun(date);
		var C = (1.915 - 0.005 * T) * Math.sin(degToRad(M_0)) + 0.020 * Math.sin(degToRad(2 * M_0));
		return C;
	},
	getTrueEclipticalLongitudeOfSun : function(date){
		var L_0 = astro.getMeanLongitudeOfSun(date);
		var C = astro.getEquationOfCenterForSun(date);
		L_S = L_0 + C;
		return L_S;
	},
	getObliquityOfOrbit : function(date){
		var T = astro.getJulianCenturies(astro.getDaysFromRef(date));
		var K = 23.439 - 0.013 * T;
		return K;
	},
	getRightAscensionOfSun : function(date){
		var L_S = astro.getTrueEclipticalLongitudeOfSun(date);
		var K = astro.getObliquityOfOrbit(date);
		var R_S = radToHours(Math.atan2(Math.sin(degToRad(L_S))*Math.cos(degToRad(K)),Math.cos(degToRad(L_S))));
		return R_S;
	},
	getDeclinationOfSun : function(date){
		var K = astro.getObliquityOfOrbit(date);
		var R_S = astro.getRightAscensionOfSun(date);
		var D_S = radToDeg(Math.asin(Math.sin(hoursToRad(R_S)) * Math.sin(degToRad(K))));
		return D_S;
	},
	getAzimuthOfSun : function(date, lat, lon){
		var R_S = astro.getRightAscensionOfSun(date);
		var D_S = astro.getDeclinationOfSun(date);
		var S = astro.getSiderealTime(date, lon);
		var H = S - R_S;
		var A = Math.atan2(-1*Math.sin(hoursToRad(H)), Math.tan(degToRad(D_S))*Math.cos(degToRad(lat)) - Math.sin(degToRad(lat))*Math.cos(hoursToRad(H)));
		return radToDeg(A);
	},
	getAltitudeOfSun : function(date, lat, lon){
		var R_S = astro.getRightAscensionOfSun(date);
		var D_S = astro.getDeclinationOfSun(date);
		var S = astro.getSiderealTime(date, lon);
		var H = S - R_S;
		var h = Math.asin(Math.sin(degToRad(lat)) * Math.sin(degToRad(D_S)) + Math.cos(degToRad(lat)) * Math.cos(degToRad(D_S)) * Math.cos(hoursToRad(H)));
		return radToDeg(h);
	}
}

degToRad = function(degrees){
	return degrees * Math.PI/180;
}

hoursToRad = function(hours){
	return hours * Math.PI / 12;
}

radToHours = function(rad){
	return rad  * 12 / Math.PI;
}

radToDeg = function(rad){
	return rad * 180/Math.PI;
}