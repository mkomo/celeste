Model = function(){
	this.objects = {};
	this.add = function(name, object){
		this.objects[name] = object;
		return this;
	}
	this.get = function(name){
		return this.objects[name];
	}
	this.getAll = function(){
		return this.objects;
	}
	this.update = function(date, lat, lon){
		this.add('sun',
			ObjectFactory.createCelestialObject(astrodata.sun, date, lat, lon, true));
		this.add('moon',
			ObjectFactory.createCelestialObject(astrodata.moon, date, lat, lon, true));
		for (var name in astrodata.planets){
			this.add(name,
				ObjectFactory.createCelestialObject(
					astrodata.planets[name], date, lat, lon, false));
		}
	}
}

FieldObject = function(type, properties){
	this.type = type;
	this.properties = {
		fillStyle : 'rgb(100,100,100)',
		strokeStyle : null,
		pointStyle : null
	}
	for (var key in properties){
		this.properties[key] = properties[key];
	}

	this.points = new Array();
	this.captions = new Array();
	this.children = new Array();
	this.addPoints = function(pointsToAdd){
		this.points = this.points.concat(pointsToAdd);
		return this;
	}
	this.addCaptions = function(captionsToAdd){
		this.captions = this.captions.concat(captionsToAdd);
		return this;
	}
	this.addChildren = function(childrenToAdd){
		this.children = this.children.concat(childrenToAdd);
		return this;
	}
	this.getVectors = function(){
		var vectors = new Array();
		for (var i = 0; i < this.points.length; i++){
			vectors.push(this.points[i].toVector());
		}
		return vectors;
	}
	this.hasCaptions = function(){
		return this.captions.length > 0;
	}
	this.hasChildren = function(){
		return this.children.length > 0;
	}
};

ObjectFactory = {
	polygon : function(fillStyle, opts){
		if (typeof opts == 'undefined') opts = {};
		opts['fillStyle'] = fillStyle;
		return new FieldObject('polygon', opts);
	},
	line : function(strokeStyle, lineWidth, opts){
		if (typeof opts == 'undefined') opts = {};
		opts['strokeStyle'] = strokeStyle;
		opts['lineWidth'] = lineWidth;	
		return new FieldObject('line', opts);
	},
	point : function(pointStyle, radius, opts){
		if (typeof opts == 'undefined') opts = {};
		opts['radius'] = radius;
		opts['pointStyle'] = pointStyle;
		return new FieldObject('point', opts);
	},
	empty : function(opts){
		if (typeof opts == 'undefined') opts = {};
		return new FieldObject('empty', opts);
	},
	createEarth : function(){
		var earth = ObjectFactory.polygon('#647f38');
		var pi = Math.PI;
		var sample = 6;
		for (var i = 0; i < sample; i++){
			earth.addPoints([
				new HorizontalCoord(2*pi*(i/sample), 
					-1 * Math.acos(3950/(3950 + 6/5280)))
			]);
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
	createCelestialObject : function(cObj, date, lat, lon, withPath){
		var frame = new FrameOfReference(date, lat, lon);
		var hCoord = cObj.getPositionInSky(frame);
		var angDiam = cObj.getAngularDiameter(date);
		var color = cObj.properties.color;
		if (typeof color === 'undefined'){
			color = '#fff';
		}
		var obj = ObjectFactory.point(color, angDiam/2);
		obj.addPoints(hCoord);
		var captionStyle = new CaptionStyle(color, '16px arial', color, 1);
		obj.addCaptions(new Caption(cObj.properties.name, hCoord, captionStyle));
		
		if (withPath) {
			obj.addChildren(ObjectFactory.createCelestialPath(cObj, frame, color));
		}
		return obj;
	},
	createCelestialPath : function(cObj, frame, color){
		var path = ObjectFactory.line(color, 4);
		var captionStyle = new CaptionStyle(color, '14px arial', color, 1);
		frame.date.setMinutes(0);
		frame.date.setSeconds(0, 0);
		var hCoord;
		for (var hour = 0; hour <= 24; hour++) {
			frame.date.setHours(hour);
			hCoord = cObj.getPositionInSky(frame);
			path.addPoints(hCoord);
			if (hour != 24){
				var hourString = (hour >= 10 ? '' : '0') + hour + '00';
				path.addCaptions(new Caption(hourString, hCoord, captionStyle));	
			}
		}
		return path;
	},
	createCompass : function(){
		var pi = Math.PI;
		var h = -100 * Math.acos(3950/(3950 + 6/5280));
		var fill = debug ? "#ff0" : "rgba(255,255,255,0.8)";
		var stroke = debug ? "#ff0" : "rgba(255,255,255,0.8)";
		var captionStyle = new CaptionStyle("#fff", '18px arial', '#fff', 1); 

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
				.addCaptions([new Caption("N", new Vector(100, 0, 0), captionStyle),
		                new Caption("E", new Vector(0, -100, 0), captionStyle),
		                new Caption("S", new Vector(-100, 0, 0), captionStyle),
		                new Caption("W", new Vector(0, 100, 0), captionStyle)]);
		
		return compass;
	}
}