ObjectHolder = function(){
	this.objects = {};
	this.add = function(name, object){
		this.objects[name] = object;
		return this;
	}
	this.remove = function(name){
		//how do you remove something from an associative array?
	}
	this.get = function(name){
		return this.objects[name];
	}
	this.getAll = function(){
		return this.objects;
	}
}
ObjectFactory = {
	createEarth : function(){
		var pi = Math.PI;
		var angles = new Array();
		var sample = 6;
		for (var i = 0; i < sample; i++){
			angles.push(new Angle(2*pi*(i/sample), -1 * Math.acos(3950/(3950 + 6/5280))));
		}
		return new Object(angles, 'polygon', {fillStyle:'#647f38'});
	},
	createAltitudeCircles : function(){
		var objects = new Array();
		var pi = Math.PI;
		var angles = new Array();
		var sample = 50;
		for (var j = 1; j <= 8; j++){
			angles = new Array();
			for (var i = 0; i <= sample; i++){
				angles.push(new Angle(2*pi*(i/sample), pi*j/18));
			}
			objects.push(new Object(angles, 'line', {strokeStyle: debug ? "#fff" : "rgba(255,255,255,0.6)", lineWidth:4}));
		}
		return new CompoundObject(objects);
	},
	createSunPath : function(){
		var lat = 43.005134,lon = -78.87400442, date = new Date();
		var objects = new Array();
		var angles = new Array();
		var captions = new Array();
		var az = degToRad(astro.getAzimuthOfSun(date, lat, lon));
		var al = degToRad(astro.getAltitudeOfSun(date, lat, lon));
		objects.push(new Object([new Angle(az, al)], 'pointset', {pointStyle: "rgba(255,255,0,1)", radius:28}));

		date.setMinutes(0);
		date.setSeconds(0,0);
		for (var hour = 0; hour <= 24; hour++){
			date.setHours(hour);
			var az = degToRad(astro.getAzimuthOfSun(date, lat, lon));
			var al = degToRad(astro.getAltitudeOfSun(date, lat, lon));
			angles.push(new Angle(az, al));
			var hourString = (hour >= 10 ? '' : '0') + hour + '00';
			hour != 24 && captions.push(new Caption(hourString, new Angle(az, al), "#000", 'arial 18px bold'));
		}
		objects.push(new Object(angles, 'line', {strokeStyle: debug ? "#ff0" : "rgba(255,255,0,0.6)", lineWidth:4}))
		return new CompoundObject(objects, captions);
	},
	createCompass : function(){
		var pi = Math.PI;
		var h = -100 * Math.acos(3950/(3950 + 6/5280));
		var vectors;
		var objects = new Array();
		var fill = debug ? "#ff0" : "rgba(255,255,255,0.8)";
		var stroke = debug ? "#ff0" : "rgba(255,255,255,0.8)";
		var font = '18px arial';
		vectors = [new Vector(100,-0.2,h),new Vector(100,0.2,h),new Vector(0.5,0.5,-5),new Vector(0.5,-0.5,-5)]; 
		objects.push(new Object(vectors, 'polygon', {fillStyle : fill}));
		
		vectors = [new Vector(-0.2,-100,h),new Vector(0.2,-100,h),new Vector(0.5,-0.5,-5),new Vector(-0.5,-0.5,-5)]; 
		objects.push(new Object(vectors, 'polygon', {fillStyle : fill}));
		
		vectors = [new Vector(-100,-0.2,h),new Vector(-100,0.2,h),new Vector(-0.5,0.5,-5),new Vector(-0.5,-0.5,-5)]; 
		objects.push(new Object(vectors, 'polygon', {fillStyle : fill}));
		
		vectors = [new Vector(-0.2,100,h),new Vector(0.2,100,h),new Vector(0.5,0.5,-5),new Vector(-0.5,0.5,-5)]; 
		objects.push(new Object(vectors, 'polygon', {fillStyle : fill}));
		
		vectors = [new Vector(100,0,h),new Vector(0,0,100),new Vector(-100,0,h)];
		objects.push(new Object(vectors,'line',{strokeStyle: stroke, lineWidth:4}));

		vectors = [new Vector(0,100,h),new Vector(0,0,100),new Vector(0,-100,h)];
		objects.push(new Object(vectors,'line',{strokeStyle: stroke, lineWidth:4}));
		
		var captions = [new Caption("N", new Vector(100, 0, 0), fill, font),
		                new Caption("E", new Vector(0, 100, 0), fill, font),
		                new Caption("S", new Vector(-100, 0, 0), fill, font),
		                new Caption("W", new Vector(0, -100, 0), fill, font)];
		
		return new CompoundObject(objects, captions);
	}
}