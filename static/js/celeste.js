debug = 0;

Application  = {
	updateHash : function(viewer){
		var hashProps = {
			time: viewer.getTime(),
			lat: viewer.lat,
			lon: viewer.lon,
			alt: viewer.alt,
			az: viewer.az,
			al: viewer.al,
			ro: viewer.ro,
			d: viewer.d
		};
		window.location.hash = mkutil.objectToArray(
			mkutil.mapObject(hashProps, function(value,key){
				return key + '=' + value;
			})).join('&');
	},
	parseHash : function(){
		var hash = window.location.hash.substring(1).split('&');
		var hashProps = hash.reduce(function(prev, curr, index, arr){
			var key = curr.substring(0, curr.indexOf('='));
			var val = curr.substring(curr.indexOf('=') + 1);
			prev[key] = val;
			return prev;
		}, {});
		return {
			time: parseInt(hashProps.time, 10),
			lat: parseFloat(hashProps.lat),
			lon: parseFloat(hashProps.lon),
			alt: parseFloat(hashProps.alt),
			az: parseFloat(hashProps.az),
			al: parseFloat(hashProps.al),
			ro: parseFloat(hashProps.ro),
			d: parseFloat(hashProps.d)
		};
	}
};
Keyboard = function(viewer){
	this.viewer = viewer;
	this.keys = {
		left : false,
		right : false,
		up : false,
		down : false,
		reset : false
	};
	this.delta = 0.05;
	this.keyChange = function(e, isOn){
		var keyCode = (e.keyCode ? e.keyCode : e.which);
		switch (keyCode){
			case 65: case 37: 
				this.keys.left=isOn; break; 
			case 87: case 38: 
				this.keys.up=isOn; break;
			case 68: case 39: 
				this.keys.right=isOn; break;
			case 83: case 40: 
				this.keys.down=isOn; break;
			case 71: 
				this.keys.closer=isOn; break;
			case 70: 
				this.keys.farther=isOn; break;
			case 82: 
				this.keys.reset=isOn; break;
		}
	};
	this.keyboardResponse = function(){
		if (this.keys.left){
			this.viewer.changeAz(-1*this.delta);
		} else if (this.keys.right){
			this.viewer.changeAz(this.delta);
		}
		if (this.keys.up){
			this.viewer.changeAl(this.delta);
		} else if (this.keys.down){
			this.viewer.changeAl(-1*this.delta);
		}
		if (this.keys.closer){
			this.viewer.moveScreen(-40);
		} else if (this.keys.farther){
			this.viewer.moveScreen(40);
		}
		if (this.keys.reset){
			this.viewer.reset();
		}
	};
};

Viewer = function(canvas, sunMap, viewerProps){
	this.defaultValues = {
		time : (new Date()).getTime(),
		lat : 43.005134,
		lon : -78.87400442,
		alt : 0,
		az : 0,
		al : 0,
		ro : 0,
		d : canvas.pixelWidth
	};
	var key;
	for (key in this.defaultValues){
		this[key] = this.defaultValues[key];
	}
	for (key in viewerProps){
		this[key] = viewerProps[key];
	}
	this.model = new Model();
	this.screen = new FirstPersonScreen(this, this.model, canvas);
	this.sunMap = sunMap;
	
	this.notifyListeners = function(){
		Application.updateHash(this);
		this.screen.update();
	};
	this.notifyFrameOfReferenceListeners = function(){
		var date = new Date(this.time);
		this.model.update(date, this.lat, this.lon);
		this.sunMap.draw(date, new GeographicCoord(this.lat, this.lon));
		var dateString = $.datepicker.formatDate('D dd M yy', date)
		var timeString =  (date.getHours() < 10 ? '0' : '') + date.getHours() + ':' + 
			(date.getMinutes() < 10 ? '0' : '') + date.getMinutes();
		var dateTimeString = dateString + ', ' + timeString;
		$("#model_v_time").text(dateTimeString);
		$('#datepicker').datepicker('setDate', date);
		$('#timeslider').slider('value', this.getMinutes());
		$(".ui-slider-handle").text(timeString);
		this.notifyListeners();
	};
	this.changeAl = function(delta){
		var newAl = this.al + delta; 
		if (newAl > Math.PI/2){
			this.al = Math.PI/2;
		} else if (newAl < -1*Math.PI/2){
			this.al = -1*Math.PI/2;
		} else {
			this.al = newAl;
		}
		this.notifyListeners();
	};
	this.changeAz = function(delta){
		this.az = MathExt.translateAngle(this.az + delta, 0);
		this.notifyListeners();
	};
	this.moveScreen = function(delta){
		var newDist = this.d + delta; 
		if (newDist >= 1){
			this.d = newDist;
			this.notifyListeners();
		}
	};
	this.setTime = function(time){
		this.time = time;
		this.notifyFrameOfReferenceListeners();
	};
	this.getTime = function(){
		return this.time;
	};
	this.setDate = function(date){
		var currDate = new Date(this.time);
		currDate.setFullYear(date.getFullYear());
		currDate.setMonth(date.getMonth());
		currDate.setDate(date.getDate());
		this.setTime(currDate.getTime());
	};
	this.setMinutes = function(min){
		var currDate = new Date(this.time);
		currDate.setHours(Math.floor(min/60));
		currDate.setMinutes(min % 60);
		this.setTime(currDate.getTime());
	};
	this.getMinutes = function(date){
		var date = new Date(this.time);
		return date.getHours() * 60 + date.getMinutes();
	};
	this.setLocation = function(geoCoord){
		this.lat = geoCoord.lat;
		this.lon = geoCoord.lon;
		this.notifyFrameOfReferenceListeners();
	};
	this.reset = function(){
		for (var key in this.defaultValues){
			this[key] = this.defaultValues[key];
		}
		this.notifyFrameOfReferenceListeners();
	};
};
FirstPersonScreen = function(viewer, model, canvas){
	this.isOrientable = true;
	
	this.viewer = viewer;
	this.model = model;
	this.canvas = canvas;
	
	this.h = this.canvas.pixelHeight;
	this.w = this.canvas.pixelWidth;
	this.rad = Math.sqrt(Math.pow(this.w/2, 2) + Math.pow(this.h/2, 2));
	this.corners = [new Coordinate(this.w/2, this.h/2),
	                  new Coordinate(-1 * this.w/2, this.h/2),
	                  new Coordinate(-1 * this.w/2, -1 * this.h/2),
	                  new Coordinate(this.w/2, -1 * this.h/2)];

	this.earth = ObjectFactory.createEarth();
	this.compass = ObjectFactory.createCompass();
	this.altitudeCircles = ObjectFactory.createAltitudeCircles();
	
	this.update = function(){
		this.canvas.clear();
		this.drawSky();
		this.drawEarth();
		this.drawCompass();
		this.drawAllObjects();
		this.updateCaption(this.viewer.az, this.viewer.al, this.viewer.d, this.w)
	};
	
	this.updateCaption = (function(){
		
		var dirs = ['N','NNE','NE','ENE','E','ESE','SE','SSE','S','SSW','SW','WSW','W','WNW','NW','NNW'];
		
		return function(az, al, d, w){
			var alCaption = Math.abs(radToDeg(al)).toFixed(0) + '&deg;' + 
					(al < 0 ? ' below' : ' above') + ' horizon';
			var dirIndex = Math.floor( ((radToDeg(az) + 11.25) % 360) / 22.5);
			var azCaption = radToDeg(az).toFixed(0) + '&deg; ' + dirs[dirIndex];
			var angularWidthOfScreen = Math.atan(w/d) * (180/Math.PI);
			$('#model_v_az').html(azCaption);
			$('#model_v_al').html(alCaption);
			$('#model_s_d').html(angularWidthOfScreen.toFixed(2) + '&deg;');
		}
	})();
	
	this.drawSky = function(){
		this.canvas.fill('#5689bf');
	};

	this.drawEarth = function(){
		this.drawObject(this.earth);
	};
	
	this.drawCompass = function(){
		this.drawObject(this.compass);
		this.drawObject(this.altitudeCircles);
	};
	
	this.drawAllObjects = function(){
		var objects = this.model.getAll();
		for (var name in objects){
			this.drawObject(objects[name]);
		}
	};
	
	this.drawObject = function(o){
		if (o.type == 'polygon'){
			this.drawPolygon(o);
		} else if (o.type == 'line'){
			this.drawLine(o);
		} else if (o.type == 'point'){
			this.drawPoint(o);
		}
		if (o.hasChildren()){
			for (var i = 0; i < o.children.length; i++){
				this.drawObject(o.children[i]);
			}
		}
		if (o.hasCaptions()){
			this.drawCaptionSet(o.captions);
		}
	};
	
	this.drawPolygon = function(o){
		$.log('coords3d='+o.getVectors());
		var coords3dAug = this.getRotatedCoordsNotBehindViewer(
				o.getVectors(), o.type);
		$.log('coords3dAug='+coords3dAug);
		
		var pObj = new ProjectedObject(this);
		var x, x_prev, intersections, entrance, exit, theta, i;
		for (i = 0; i < coords3dAug.length; i++){
			x = coords3dAug[i];
			x_prev = coords3dAug[(i + coords3dAug.length - 1) % coords3dAug.length];
			if (this.isInVisibilityCone(x)){
				if (!this.isInVisibilityCone(x_prev)){
					//entering visibility cone
					intersections = this.getVisibilityConeIntersections(x_prev, x);
					if (intersections.length != 1) {
						throw "invalid edge intersections headed in: " + intersections;
					}
					entrance = this.getProjection(intersections[0]);
					pObj.addCoordOnBoundary(entrance);
				}
				pObj.addCoordInside(this.getProjection(x));
			} else {
				if (!this.isInVisibilityCone(x_prev)){
					intersections = this.getVisibilityConeIntersections(x_prev, x);
					if (intersections.length == 2){
						//passing through visibility cone
						entrance = this.getProjection(intersections[0]);
						exit = this.getProjection(intersections[1]);
						
						pObj.addCoordOnBoundary(entrance);
						pObj.addCoordOnBoundary(exit);
					}
				} else {
					// leaving visibility cone
					intersections = this.getVisibilityConeIntersections(x_prev, x);
					if (intersections.length != 1) {
						throw "invalid edge intersections headed out: " + intersections;
					}
					exit = this.getProjection(intersections[0]);
					pObj.addCoordOnBoundary(exit);
				}
				theta = MathExt.getAngle(new Coordinate(-1 * x.y, x.z));
				pObj.addCoordOutside(theta);
			}
		}

		var normedCoords = pObj.getCoords();
		this.canvas.drawPolygon(normedCoords, o.properties.fillStyle);
	};
	
	this.drawLine = function(l){
		var coords3dAug = this.getRotatedCoordsNotBehindViewer(
				l.getVectors(), l.type);

		$.log('coords3dAug =  '+coords3dAug);
		var pLine = new ProjectedLine(this);
		var x, x_prev;
		for (var i = 0; i < coords3dAug.length; i++){
			x = coords3dAug[i];
			if (i > 0){
				x_prev = coords3dAug[(i - 1)];
				var intersections = this.getVisibilityConeIntersections(x_prev, x);
				for (var j = 0; j < intersections.length; j++){
					var intersection = this.getProjection(intersections[j]);
					pLine.addCoordOnBoundary(intersection);
				}
			}
			if (this.isInVisibilityCone(x)){
				pLine.addCoordInside(this.getProjection(x));
			} else {
				pLine.addCoordOutside();
			}
		}
		
		this.canvas.drawLine(pLine, l.properties.strokeStyle, l.properties.lineWidth);
	};
	
	this.drawPoint = function(p){
		var x = this.getRotatedCoordsNotBehindViewer(
				p.getVectors(), p.type)[0];
		if (x && this.isInVisibilityCone(x)){
			var point = new ProjectedPoint(this);
			point.addCoord(this.getProjection(x));
			var radius = this.viewer.d * Math.tan(p.properties.radius);
			this.canvas.drawPoint(point.getCoord(), radius, p.properties.pointStyle);
		}
	};
	
	this.drawCaptionSet = function(captions){
		var c;
		var captionSet = new ProjectedCaptionSet(this);
		for (var i = 0; i < captions.length; i++){
			var caption = captions[i];
			c = this.getRotatedCoordsNotBehindViewer([caption.getVector()], 'caption');
			if (c.length > 0 && this.isInVisibilityCone(c[0])){
				captionSet.addCaption(caption, this.getProjection(c[0]));
			}
		}
		this.canvas.drawCaptionSet(captionSet);
	};
	
	this.getRotatedCoordsNotBehindViewer = function(vectors, type){
		var coords3d = this.rotateCoords(vectors);
		var coords3dAug = [];
		var x, x_prev, x_m, i;
		//get only coords not behind viewer 
		for (i = 0; i < coords3d.length; i++){
			x = coords3d[i];
			x_prev = coords3d[(i + coords3d.length - 1) % coords3d.length];
			if (x_prev.x < 0){
				if(x.x >= 0) {
					if (x.x > 0 && (type == 'polygon' || (type == 'line' && i > 0))){
						x_m = this.getYZIntercept(x,x_prev);
						coords3dAug.push(x_m);
					}
					coords3dAug.push(x);
				}
			} else {
				if (x.x >= 0){
					coords3dAug.push(x);
				} else if (type == 'polygon' || (type == 'line' && i > 0)){
					x_m = this.getYZIntercept(x,x_prev);
					coords3dAug.push(x_m);
				}
			}
		}
		return coords3dAug;
	};
	
	this.rotateCoords = function(coords){
		var rCoords = [];
		for (var i = 0; i < coords.length; i++){
//			rCoords.push(coords[i].rotateZ(-1*this.viewer.az).rotateY(this.viewer.al).rotateX(this.viewer.ro));
			rCoords.push(coords[i].rotateFast(-1*this.viewer.az, this.viewer.al));
		}
		return rCoords;
	};
	
	this.getProjection = function(x){
		return new Coordinate(-1 * x.y * this.viewer.d / x.x, x.z * this.viewer.d / x.x);
	};
	
	/**
	 * returns the point at which the line connecting x1 and x2 has x=0
	 * TODO get rid of if condition
	 */
	this.getYZIntercept = function(x1, x2){
		if (x1.x > x2.x){
			return this.getYZIntercept(x2, x1);
		} else {
			var xDiff = new Vector(x2.x - x1.x, x2.y - x1.y, x2.z - x1.z);
			var xSeg = (0 - x1.x) / (x2.x - x1.x);
			return new Vector(xSeg * xDiff.x + x1.x,
								xSeg * xDiff.y + x1.y,
								xSeg * xDiff.z + x1.z);
		}
	};
	this.isInVisibilityCone = function(x){
		var coneSlope = this.rad/this.viewer.d;
		if (x.x > 0){
			var rad = Math.sqrt(Math.pow(x.y, 2) + Math.pow(x.z, 2));
			return rad / x.x <= coneSlope;
		} else {
			return false;
		}
	};
	this.getVisibilityConeIntersections = function(x1, x2){
		var coneSlope = this.rad/this.viewer.d;
		var dx = new Vector(x2.x - x1.x, x2.y - x1.y, x2.z - x1.z);
		//building the quadratic which yields the cone intersections
		var a = Math.pow(dx.y, 2) + Math.pow(dx.z, 2) - Math.pow(coneSlope * dx.x, 2);
		var b = 2 * (x1.y*dx.y + x1.z*dx.z - Math.pow(coneSlope, 2)*x1.x*dx.x);
		var c = Math.pow(x1.y, 2) + Math.pow(x1.z, 2) - Math.pow(coneSlope * x1.x, 2);
		//solving the quadratic, returning only the solutions for points between x1 and x2
		var ts = MathExt.getQuadraticSolutions(a,b,c,[0,1]);
		//plugging the solutions back in to find the intersections
		var intersections = [];
		for (var i = 0; i < ts.length; i++){
			var t = ts[i];
			if (x1.x + dx.x*t > 0){
				intersections.push(new Vector(x1.x + dx.x*t, x1.y + dx.y*t, x1.z + dx.z*t));
			}
		}
		return intersections; 
	};

	this.getCornersBetween = function(startAngle, endAngle, counterclockwise){
		if (!counterclockwise) {
			return this.getCornersBetween(endAngle, startAngle, true).reverse();
		}
		startAngle = MathExt.translateAngle(startAngle, 0);
		endAngle = MathExt.translateAngle(endAngle, 0);
		var includedCorners = [];
		var firstCorner = 0, corner, angle, i;
		for (i = 0; i < this.corners.length; i++){
			corner = this.corners[i];
			angle = MathExt.getAngle(corner); 
			if (angle >= startAngle){
				firstCorner = i;
				break;
			}
		}
		for (i = 0; i < this.corners.length; i++){
			corner = this.corners[(firstCorner + i) % this.corners.length];
			angle = MathExt.getAngle(corner); 
			if (MathExt.isAngleBetween(angle, startAngle, endAngle)){
				includedCorners.push(corner);
			}
		}
		return includedCorners;
	};
};

ProjectedObject = function(screen){
	this.screen = screen;
	this.isOutside = true;
	this.lastBoundaryPoint = null;
	this.dTheta = 0;

	this.firstBoundaryPoint = null;
	this.dThetaToFirstBP = 0;
	this.angleOfLastNonInteriorPoint = null;
	
	this.normCoords = [];
	
	this.addCoordInside = function(coord){
		this.isOutside = false;
		this.angleOfLastNonInteriorPoint = null;
		this.addCoord(coord);
	};
	this.addCoordOutside = function(theta){
		this.updateOutsideAngle(theta);
		this.isOutside = true;
	};
	this.addCoordOnBoundary = function(coord){
		var thetaEnd = MathExt.getAngle(coord);
		this.updateOutsideAngle(thetaEnd);
		if (this.isOutside){
			if (this.lastBoundaryPoint !== null){
				//a boundary point already exists, fill in closed area
				var thetaStart = MathExt.getAngle(this.lastBoundaryPoint);
				this.fillInBetweenAngles(thetaStart, thetaEnd, this.dTheta > 0);
			} else {
				//no boundary point yet; started outside
				this.dThetaToFirstBP = this.dTheta; 
				this.firstBoundaryPoint = coord;
			}
		}
		this.lastBoundaryPoint = coord;
		this.dTheta = 0;
		this.isOutside = false;
		
		this.addCoord(coord);
	};
	this.addCoord = function(coord){
		var normCoord = new Coordinate(
				(coord.x + this.screen.w/2)/this.screen.w,
				(coord.y + this.screen.h/2)/this.screen.h);
		this.normCoords.push(normCoord);
	};
	this.addCoords = function(coords){
		for (var i = 0; i < coords.length; i++){
			this.addCoord(coords[i]);
		}
	};
	this.fillInBetweenAngles = function(thetaStart, thetaEnd, counterClockwise){
		var corners = this.screen.getCornersBetween(thetaStart, 
				thetaEnd, counterClockwise);
		this.addCoords(corners);
	};
	this.updateOutsideAngle = function(theta){
		if (this.angleOfLastNonInteriorPoint !== null){
			var thetaFromLastPoint = MathExt.translateAngle(
					theta - this.angleOfLastNonInteriorPoint, -1*Math.PI);
			this.dTheta += thetaFromLastPoint;
		}
		this.angleOfLastNonInteriorPoint = theta;
	};
	this.getCoords = function(){
		if (this.isOutside){
			if (this.lastBoundaryPoint === null){
				//never crossed from inside to out
				if (Math.abs(this.dTheta) >= Math.PI){
					//object takes up whole screen
					this.fillInBetweenAngles(0, Math.PI, true);
					this.fillInBetweenAngles(Math.PI, 0, true);
				}
			} else if (this.firstBoundaryPoint !== null){
				//ended outside
				var thetaStart = MathExt.getAngle(this.lastBoundaryPoint);
				var thetaEnd = MathExt.getAngle(this.firstBoundaryPoint);
				
				var thetaFirstPoint = MathExt.translateAngle(
						MathExt.getAngle(this.firstBoundaryPoint) - this.dThetaToFirstBP,
						0);
				var thetaLastNIPToFirst = MathExt.translateAngle(
						thetaFirstPoint - this.angleOfLastNonInteriorPoint, -1*Math.PI);
				var dThetaTotal = this.dTheta + thetaLastNIPToFirst + this.dThetaToFirstBP;

				this.fillInBetweenAngles(thetaStart, thetaEnd, dThetaTotal > 0);
			}
		}
		return this.normCoords;
	};
};

ProjectedLine = function(screen){
	this.screen = screen;
	this.segments = [];
	this.currentSegment = [];
	
	this.addCoordInside = function(coord){
		this.addCoord(coord);
	};
	this.addCoordOutside = function(theta){
		if (this.currentSegment.length > 0){
			this.segments.push(this.currentSegment);
			this.currentSegment = [];
		}
	};
	this.addCoordOnBoundary = function(coord){
		this.addCoord(coord);
	};
	this.addCoord = function(coord){
		var normCoord = new Coordinate(
				(coord.x + this.screen.w/2)/this.screen.w,
				(coord.y + this.screen.h/2)/this.screen.h);
		this.currentSegment.push(normCoord);
	};
	this.getSegments = function(){
		if (this.currentSegment.length > 0){
			this.segments.push(this.currentSegment);
		}
		return this.segments;
	};
};

ProjectedPoint = function(screen){
	this.screen = screen;
	this.normCoord = null;
	
	this.addCoord = function(coord){
		this.normCoord = new Coordinate(
				(coord.x + this.screen.w/2)/this.screen.w,
				(coord.y + this.screen.h/2)/this.screen.h);
	};
	this.getCoord = function(){
		return this.normCoord;
	};
};

ProjectedCaptionSet = function(screen){
	this.screen = screen;
	this.normCoords = [];
	this.captions = [];
	this.length = 0;
	
	this.addCaption = function(caption, coord){
		var normCoord = new Coordinate(
				(coord.x + this.screen.w/2)/this.screen.w,
				(coord.y + this.screen.h/2)/this.screen.h);
		this.captions.push(caption);
		this.normCoords.push(normCoord);
		this.length = this.captions.length;
	};
	this.getCoord = function(i){
		return this.normCoords[i];
	};
	this.getCaption = function(i){
		return this.captions[i];
	};
};

CanvasPane = function(canvasObject){
	this.canvas = canvasObject;
	this.context = canvasObject.getContext('2d');
	this.context.textAlign = 'start';
	this.context.textBaseline = 'top';
	
	this.pixelWidth = $(canvasObject).width();
	this.pixelHeight = $(canvasObject).height();
	
	this.clear = function(){
		this.context.clearRect(0,0,this.pixelWidth, this.pixelHeight);
		if (debug){
			this.context.strokeStyle = '#f00';
			this.context.lineWidth = 1;
			this.context.strokeRect(this.pixelWidth/4,this.pixelHeight/4,
					this.pixelWidth/2, this.pixelHeight/2);
			var radius = Math.sqrt(Math.pow(this.pixelWidth/4, 2) + 
					Math.pow(this.pixelHeight/4, 2));
			
			this.context.fillStyle = 'rgba(200,200,255,0.6)';
			this.context.beginPath();
			this.context.arc(this.pixelWidth/2, this.pixelHeight/2, 
					radius, 0, 2*Math.PI, true);
			this.context.closePath();
			this.context.fill();
		}		
	};
	
	this.drawCaptionSet = function(captionSet){
		var c, style;
		for (var i = 0; i < captionSet.length; i++){
			c = captionSet.getCaption(i);
			style = c.style;
			this.drawCaption(c.text, captionSet.getCoord(i), style.textStyle, style.font);
			if (style.pointStyle !== undefined) {
				this.drawPoint(captionSet.getCoord(i), style.radius, style.pointStyle);
			}
		}
	};
	
	this.drawPoint = function(coord, r, style, label){
		this.context.fillStyle = style;
		this.context.beginPath();
		var pCenter = this.getPixelForNormCoord(coord);
		this.context.arc(pCenter.x, pCenter.y, r, 0, Math.PI*2, true);
		this.context.closePath();
		this.context.fill();
		if (typeof(label) != 'undefined'){
			this.drawText(label, pCenter, style);
		}
	};
	
	this.drawLine = function(pLine, strokeStyle, lineWidth){
		var segments = pLine.getSegments();
		this.context.strokeStyle = strokeStyle;
		this.context.lineWidth = lineWidth;
		this.context.beginPath();
		var i, j;
		for (i = 0; i < segments.length; i++){
			var coords = segments[i];
			for (j = 0; j < coords.length; j++){ 
				var p = this.getPixelForNormCoord(coords[j]);
				if (j === 0) {
					this.context.moveTo(p.x, p.y);
				} else {
					this.context.lineTo(p.x, p.y);
				}
			}
			this.context.stroke();
			if (debug) {
				for (j = 0; j < coords.length; j++){ 
					this.drawPoint(coords[j], 3, '#00f', j);
				}
			}
		}
	};
	
	this.drawPolygon = function(coords, style){
		this.context.fillStyle = style;
		this.context.beginPath();
		if (coords.length > 0){
			var i;
			for (i = 0; i < coords.length; i++){ 
				var p = this.getPixelForNormCoord(coords[i]);
				if (i === 0) {
					this.context.moveTo(p.x, p.y);
				} else {
					this.context.lineTo(p.x, p.y);
				}
			}
			this.context.fill();
			if (debug) {
				for (i = 0; i < coords.length; i++){ 
					this.drawPoint(coords[i], 3, '#00f', i);
				}
			}
		}
	};
	
	this.drawCaption = function(text, coord, style, font){
		var p = this.getPixelForNormCoord(coord);
		this.context.fillStyle = style;
		this.context.font = font;
		this.context.fillText(text, p.x+6, p.y+4);	
	};

	this.drawText = function(text, pCenter, style){
		this.context.fillStyle = style;
		this.context.font = 'bold 12px Verdana';
		this.context.fillText(text, pCenter.x+5, pCenter.y+15);	
	};
	
	this.fill = function(style){
		this.context.fillStyle = style;
		this.context.fillRect(0,0,this.pixelWidth, this.pixelHeight);
	};
	
	this.getPixelForNormCoord = function(coord){
		if (debug){
			return new Pixel(coord.x * this.pixelWidth / 2 + this.pixelWidth/4, this.pixelHeight * (1 - coord.y)/2 + this.pixelHeight/4);
		} else {
			return new Pixel(coord.x * this.pixelWidth, this.pixelHeight - coord.y * this.pixelHeight);
		}
	};
};

Caption = function(text, point, style){
	this.text = text;
	this.point = point;
	this.style = style;
	this.getVector = function(){
		return this.point.toVector();
	};
};

CaptionStyle = function(textStyle, font, pointStyle, radius){
	this.textStyle = textStyle;
	this.font = font;
	this.pointStyle = pointStyle;
	this.radius = radius;
};

HorizontalCoord = function(az, al){
	this.az = az;
	this.al = al;
	this.toVector = function(){
		return new Vector(
				Math.cos(this.az) * Math.cos(this.al),
				-1 * Math.sin(this.az) * Math.cos(this.al),
				Math.sin(this.al));
	};
	this.toString = function(){
		return '(' + this.az + ',' + this.al + ')';
	};
};

EquatorialCoord = function(lat, lon){
	this.ra = MathExt.translatePeriodic(degToHours(lon), 0, 24);//alpha
	this.dec = lat;//delta
	this.toString = function(){
		var absDec = Math.abs(this.dec);
		var sgnDec = MathExt.sgn(this.dec);
		var d = Math.floor(absDec);
		var m = Math.floor(60* (absDec-d));
		var s = Math.floor(60* (60*(absDec-d)-m));
		var decStr = (sgnDec*d) + '_deg ' + m + '\' ' + s + '"';
		var h = Math.floor(this.ra);
		var m = Math.floor(60* (this.ra-h));
		var s = Math.floor(60* (60*(this.ra-h)-m));
		var raStr = h + 'h ' + m + 'm ' + s + 's';
		return '(' + decStr + ',' + raStr + ')';
	};
};

GeographicCoord = function(lat, lon){
	this.lat = lat;
	this.lon = lon;
	this.toString = function(){
		return '(' + this.lat + ',' + this.lon + ')';
	};
};

SphericalCoord = function(params){
	this.lat = params.lat;
	this.lon = params.lon;
	this.r = params.r;
	this.toRect = function(){
		var sinLat = Math.sin(degToRad(this.lat));
		var cosLat = Math.cos(degToRad(this.lat));
		var sinLon = Math.sin(degToRad(this.lon));
		var cosLon = Math.cos(degToRad(this.lon));
		return new RectangularCoord({
			x : this.r * cosLat * cosLon,
			y : this.r * cosLat * sinLon,
			z : this.r * sinLat
		});
	};
	this.toString = function(){
		return '(' + this.lat + ',' + this.lon + ')';
	};
};
RectangularCoord = function(params){
	this.x = params.x;
	this.y = params.y;
	this.z = params.z;
	
	this.rotateX = function(theta){
		return new RectangularCoord({
			x: this.x, 
			y: this.y * Math.cos(theta) - this.z * Math.sin(theta), 
			z: this.z * Math.cos(theta) + this.y * Math.sin(theta)
		});
	};

	this.rotateY = function(theta){
		return new RectangularCoord({
			x: this.x * Math.cos(theta) + this.z * Math.sin(theta), 
			y: this.y,
			z: this.z * Math.cos(theta) - this.x * Math.sin(theta)
		});
	};

	this.rotateZ = function(theta){
		return new RectangularCoord({
			x: this.x * Math.cos(theta) - this.y * Math.sin(theta), 
			y: this.y * Math.cos(theta) + this.x * Math.sin(theta),
			z: this.z
		});
	};
	
	this.toSpherical = function(){
		return new SphericalCoord({
			lat : radToDeg(Math.atan2(this.z, Math.sqrt(this.x * this.x + this.y * this.y))),
			lon : radToDeg(Math.atan2(this.y, this.x)),
			r : Math.sqrt(this.x * this.x + this.y * this.y + this.z * this.z)
		});
	};
	this.toString = function(){
		return '(' + this.x.toFixed(6) + ',' + this.y.toFixed(6) + ',' + this.z.toFixed(6) + ')';
	};
}
Pixel = function(x,y){
	this.x = x;
	this.y = y;
	this.toString = function(){
		return '(' + x + ',' + y + ')';
	};
};
Coordinate = function(x,y){
	this.x = x;
	this.y = y;
	this.toString = function(){
		return '(' + x.toFixed(12) + ',' + y.toFixed(12) + ')';
	};
};

Vector = function(x,y,z){
	this.x = x;
	this.y = y;
	this.z = z;
	this.toString = function(){
		return '(' + x.toFixed(12) + ',' + y.toFixed(12) + ',' + z.toFixed(12) + ')';
	};
	this.toVector = function(){
		return this;
	};
	this.rotateFast = function(phi, theta){
		var sinPhi = Math.sin(phi);
		var cosPhi = Math.cos(phi);
		var sinTheta = Math.sin(theta);
		var cosTheta = Math.cos(theta);
		return new Vector(
				(this.x * cosPhi + this.y * sinPhi) * cosTheta + this.z * sinTheta, 
				this.y * cosPhi - this.x * sinPhi,
				this.z * cosTheta - (this.x * cosPhi + this.y * sinPhi) * sinTheta);
	};
	this.rotateX = function(theta){
		return new Vector(this.x, 
				this.y * Math.cos(theta) - this.z * Math.sin(theta), 
				this.z * Math.cos(theta) + this.y * Math.sin(theta));
	};

	this.rotateY = function(theta){
		return new Vector(this.x * Math.cos(theta) + this.z * Math.sin(theta), 
				this.y,
				this.z * Math.cos(theta) - this.x * Math.sin(theta));
	};

	this.rotateZ = function(theta){
		return new Vector(this.x * Math.cos(theta) - this.y * Math.sin(theta), 
				this.y * Math.cos(theta) + this.x * Math.sin(theta),
				this.z);
	};
};

SunMap = function(canvas){
	this.context = canvas.getContext('2d');
	this.height = $(canvas).height();
	this.width = $(canvas).width();
	this.draw = function(date, coord){
		var coordOfSun = astro.getGeographicCoordOfSun(date);
		var cLat = degToRad(coordOfSun.lat);
		var cLon = degToRad(coordOfSun.lon);
		var above = this.getEdgeOfBrightness(cLon, cLat, cLon) > cLat;
		this.context.clearRect(0,0,this.width,this.height);
		//draw shadow of darkness
		this.context.fillStyle = "rgba(0,0,40,0.3)";
		this.context.moveTo(this.width, above ? 0 : this.height);
		this.context.lineTo(  0, above ? 0 : this.height);
		for (var i = 0; i <= this.width; i++){
			var lon = Math.PI * 2 * (i - this.width/2) / this.width;
			var lat = this.getEdgeOfBrightness(lon, cLat, cLon);
			var j = this.height * ((Math.PI/2 - lat)/ Math.PI);
			this.context.lineTo(i, j);
		}
		this.context.fill();
		this.drawCoord(coord);
	};
	this.drawCoord = function(coord){
		this.context.fillStyle = "#f55";
		this.context.beginPath();
		var p = new Pixel((180 + coord.lon)*this.width/360, (90 - coord.lat)*this.height/180);
		this.context.arc(p.x, p.y, 2, 0, Math.PI*2, true);
		this.context.closePath();
		this.context.fill();
	};
	this.getEdgeOfBrightness = function(lon, theta, phi){ 
		if (Math.cos(lon - phi) === 0) {
			return 0;
		} else {
			return -1 * MathExt.sgn(Math.sin(theta) * Math.cos(lon - phi)) *
						Math.asin(Math.cos(theta) /
				Math.sqrt(1 + Math.pow(Math.tan(lon - phi) * Math.sin(theta), 2)));
		}
	};
};