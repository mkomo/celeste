CelestialObject = function(params){
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
		//    M  Mean Anomaly         = n * (t - T)  =  (t - T) * 360_deg / P
		//       Mean Anomaly is 0 at perihelion and 180 degrees at aphelion
		M : params.M
	}
	
	this.compute = function(date){
		var d = astro.getDays(date) + 1.5;
		var params = mkutil.mapObjectToObject(this.params, function(value){
			if (value.length === 1){
				return value[0]; 
			} else {
				return value[0] + value[1]*d;
			}
		});
		//normalize -- not a necessary step? just aesthetic.
		var degs = ['N','i','w','M'];
		var i, len = degs.length;
		for (i = 0; i < len; i++){
			params[degs[i]] = MathExt.translatePeriodic(params[degs[i]], 0,360);
		}

		// Calculate eccentric anomaly
		//    E = M + (180/pi) * e * sin(M) * (1 + e * cos(M))
		var E = params.M + radToDeg(params.e) * 
						   Math.sin(degToRad(params.M)) * 
						   (1 + params.e * Math.cos(degToRad(params.M)));
					
		//Now we compute the Sun's rectangular coordinates in the plane of the ecliptic, where the X axis points towards the perihelion:
		//
		//    x = r * cos(v) = cos(E) - e
		//    y = r * sin(v) = sin(E) * sqrt(1 - e*e)
		var x = Math.cos(degToRad(E)) - params.e;
		var y = Math.sin(degToRad(E)) * Math.sqrt(1 - params.e*params.e);
		
		//Convert to distance and true anomaly:
		//
		//    r = sqrt(x*x + y*y)
		//    v = arctan2( y, x )
		var r = Math.sqrt(x*x + y*y);
		var v = radToDeg(Math.atan2(y, x));
		
		var z = r * Math.sin(degToRad(v+params.w)) * Math.sin(params.i);
		
		//Now we can compute the ecliptic coords of the Sun:
		//
		//    lon = v + w
		var lon = MathExt.translatePeriodic(v + params.w, 0, 360);
		var lat = 0;
		
		var x = r * Math.cos(degToRad(lon)) * Math.cos(degToRad(lat));
		var y = r * Math.sin(degToRad(lon)) * Math.cos(degToRad(lat));
		var z = r * Math.sin(lat);
		
		//rotate about the axial tilt of earth
		var oblecl = degToRad(23.4393 - 3.563E-7 * d);
		var x_eq = x;
		var y_eq = y * Math.cos(oblecl) - z * Math.sin(oblecl);
		var z_eq = y * Math.sin(oblecl) + z * Math.cos(oblecl);
		
		//Convert to RA and Decl:
		var r = r; // no change caused by rotation
	    var RA = radToHours(Math.atan2( y_eq, x_eq));
	    var Decl = radToDeg(Math.atan2( z_eq, Math.sqrt( x_eq*x_eq + y_eq*y_eq)));
		return new EquatorialCoord(RA, Decl);
	}
}
sunObj = new CelestialObject({
	N: [0],
	i: [0],
	w: [282.9404, 4.70935e-5],
    a: [1.000000],
    e: [0.016709, -1.151e-9],
    M: [356.0470, 0.9856002585]
});