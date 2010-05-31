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
	polygon : function(fillStyle, opts){
		if (typeof opts == 'undefined') opts = {};
		opts['fillStyle'] = fillStyle;
		return new Object('polygon', opts);
	},
	line : function(strokeStyle, lineWidth, opts){
		if (typeof opts == 'undefined') opts = {};
		opts['strokeStyle'] = strokeStyle;
		opts['lineWidth'] = lineWidth;	
		return new Object('line', opts);
	},
	point : function(pointStyle, radius, opts){
		if (typeof opts == 'undefined') opts = {};
		opts['radius'] = radius;
		opts['pointStyle'] = pointStyle;
		return new Object('point', opts);
	},
	empty : function(opts){
		if (typeof opts == 'undefined') opts = {};
		return new Object('empty', opts);
	},
	createEarth : function(){
		var earth = ObjectFactory.polygon('#647f38');
		var pi = Math.PI;
		var sample = 6;
		for (var i = 0; i < sample; i++){
			earth.addPoints([new HorizontalCoord(2*pi*(i/sample), -1 * Math.acos(3950/(3950 + 6/5280)))]);
		}
		return earth;
	},
	createAltitudeCircles : function(){
		var circles = ObjectFactory.empty();
		var pi = Math.PI;
		var angles = new Array();
		var sample = 50;
		for (var j = 1; j <= 8; j++){
			var c = ObjectFactory.line(debug ? "#fff" : "rgba(255,255,255,0.6)", 4);
			for (var i = 0; i <= sample; i++){
				c.addPoints([new HorizontalCoord(2*pi*(i/sample), pi*j/18)]);
			}
			circles.addChildren([c]);
		}
		return circles;
	},
	createSunPath : function(date, lat, lon){
		var sunPath = ObjectFactory.line(debug ? "#ff0" : "rgba(255,255,0,0.6)", 4);

		var frame = new FrameOfReference(date, lat, lon);
		var hCoord = frame.getHorizontalFromEquatorial(astro.getSun(date));

		sunPath.addChildren(ObjectFactory.point("rgba(255,255,0,1)", 28)
				   .addPoints(hCoord));
		
		frame.date.setMinutes(0);
		frame.date.setSeconds(0,0);
		for (var hour = 0; hour <= 24; hour++){
			frame.date.setHours(hour);
			hCoord = frame.getHorizontalFromEquatorial(astro.getSun(frame.date));
			sunPath.addPoints(hCoord);
			var hourString = (hour >= 10 ? '' : '0') + hour + '00';
			hour != 24 && sunPath.addCaptions(new Caption(hourString, hCoord, "#000", 'arial 18px bold'));
		}
		return sunPath;
	},
	createCompass : function(){
		var pi = Math.PI;
		var h = -100 * Math.acos(3950/(3950 + 6/5280));
		var fill = debug ? "#ff0" : "rgba(255,255,255,0.8)";
		var stroke = debug ? "#ff0" : "rgba(255,255,255,0.8)";
		var font = '18px arial';

		var compass = ObjectFactory.empty()
				.addChildren([
					ObjectFactory.polygon(fill)
						.addPoints([new Vector(100,-0.2,h),new Vector(100,0.2,h),
						            new Vector(0.5,0.5,-5),new Vector(0.5,-0.5,-5)]),
					ObjectFactory.polygon(fill)
						.addPoints([new Vector(-0.2,-100,h),new Vector(0.2,-100,h),
						            new Vector(0.5,-0.5,-5),new Vector(-0.5,-0.5,-5)]),
					ObjectFactory.polygon(fill)
						.addPoints([new Vector(-100,-0.2,h),new Vector(-100,0.2,h),
						            new Vector(-0.5,0.5,-5),new Vector(-0.5,-0.5,-5)]),
					ObjectFactory.polygon(fill)
						.addPoints([new Vector(-0.2,100,h),new Vector(0.2,100,h),
						            new Vector(0.5,0.5,-5),new Vector(-0.5,0.5,-5)]),
			    	ObjectFactory.line(stroke, 4)
						.addPoints([new Vector(100,0,h),new Vector(0,0,100),new Vector(-100,0,h)]),
					ObjectFactory.line(stroke, 4)
						.addPoints([new Vector(0,100,h),new Vector(0,0,100),new Vector(0,-100,h)])					            
				])
				.addCaptions([new Caption("N", new Vector(100, 0, 0), fill, font),
		                new Caption("E", new Vector(0, -100, 0), fill, font),
		                new Caption("S", new Vector(-100, 0, 0), fill, font),
		                new Caption("W", new Vector(0, 100, 0), fill, font)]);
		
		return compass;
	}
}