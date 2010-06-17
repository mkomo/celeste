astrodata = {
	sun : new CelestialObject({
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
	}),
	moon : new CelestialObject({
	    N: [125.1228, -0.0529538083],
	    i: [  5.1454],
	    w: [318.0634, 0.1643573223],
	    a: [ 60.2666],
	    e: [0.054900],
	    M: [115.3654, 13.0649929509], 
		perturb: function(moon, eclCoord, d){
			var sun = astrodata.sun.getParams(d);
			
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
		name : 'moon',
		isGeocentric : true,
		isEarthRadii : true,
		color : '#fff'
	}),
	planets : {
		mercury : new CelestialObject({
		    N : [ 48.3313, 3.24587E-5],
		    i : [  7.0047, 5.00E-8],
		    w : [ 29.1241, 1.01444E-5],
		    a : [0.387098],
		    e : [0.205635, 5.59E-10],
		    M : [168.6562, 4.0923344368]
		},{
			name : 'mercury',
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
			name : 'venus',
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
			name : 'mars',
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
				var saturn = astrodata.planets.saturn.getParams(d);
				
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
			name : 'jupiter',
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
				var jupiter = astrodata.planets.jupiter.getParams(d);
				
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
			name : 'saturn',
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
				var saturn = astrodata.planets.saturn.getParams(d);
				var jupiter = astrodata.planets.jupiter.getParams(d);
				
				var Ms = degToRad(saturn.M);//Saturn's  mean anomaly
				var Mj = degToRad(jupiter.M);//Jupiter's mean anomaly
				var Mu = degToRad(uranus.M);//Jupiter's mean anomaly
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
			name : 'uranus',
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
			name : 'neptune',
			isGeocentric : false
		})
	}
}