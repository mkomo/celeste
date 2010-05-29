debug = 0;

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
	this.keyChange = function(e, on){
		var keyCode = (e.keyCode ? e.keyCode : e.which);
		switch (keyCode){
			case 65: case 37: 
				this.keys['left']=on; break; 
			case 87: case 38: 
				this.keys['up']=on; break;
			case 68: case 39: 
				this.keys['right']=on; break;
			case 83: case 40: 
				this.keys['down']=on; break;
			case 71: 
				this.keys['closer']=on; break;
			case 70: 
				this.keys['farther']=on; break;
			case 82: 
				this.keys['reset']=on; break;
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
			this.viewer.moveScreen(-1);
		} else if (this.keys.farther){
			this.viewer.moveScreen(1);
		}
		if (this.keys.reset){
			this.viewer.reset();
		}
	};
}

Viewer = function(canvas){
	this.date = new Date();
	this.lat = 43.005134;
	this.lon = -78.87400442;
	this.alt = 0;
	this.az = 0;
	this.al = 0;
	this.ro = 0;
	this.d = 10;
	
	this.screen = new Screen(this, canvas);
	
	this.notifyListeners = function(){
		$('#model_v_az').text(this.az);
		$('#model_v_al').text(this.al);
		$('#model_s_d').text(this.d);
		window.location.hash='az='+this.az + '&al='+this.al + '&d=' + this.d;
		this.screen.update();
	}
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
	}
	this.changeAz = function(delta){
		this.az = MathExt.translateAngle(this.az + delta, 0);
		this.notifyListeners();
	}
	this.moveScreen = function(delta){
		var newDist = this.d + delta; 
		if (newDist >= 1){
			this.d = newDist;
			this.notifyListeners();
		}
	}
	this.reset = function(){
		this.az = 0;
		this.al = 0;
		this.d = 10;
		this.notifyListeners();
	}
}

Screen = function(viewer, canvas){
	this.viewer = viewer;
	this.canvas = canvas;
	this.h = 5;
	this.w = 8;
	this.rad = Math.sqrt(Math.pow(this.w/2, 2) + Math.pow(this.h/2, 2));
	this.corners = [new Coordinate(this.w/2, this.h/2),
	                  new Coordinate(-1 * this.w/2, this.h/2),
	                  new Coordinate(-1 * this.w/2, -1 * this.h/2),
	                  new Coordinate(this.w/2, -1 * this.h/2)];

	this.earth = ObjectFactory.createEarth();
	this.compass = ObjectFactory.createCompass();
	this.altitudeCircles = ObjectFactory.createAltitudeCircles();
	this.sunPath = ObjectFactory.createSunPath(viewer.date, viewer.lat, viewer.lon);
	
	this.update = function(){
		this.canvas.clear();
		this.drawSky();
		this.drawEarth();
		this.drawCompass();
		this.drawAllObjects();
	}
	
	this.drawSky = function(){
		if (!debug)
			this.canvas.fill('#5689bf');
	}

	this.drawEarth = function(){
//		if (!debug)
			this.drawObject(this.earth);
	}
	
	this.drawCompass = function(){
		this.drawObject(this.compass);
		this.drawObject(this.altitudeCircles);
	}
	
	this.drawAllObjects = function(){
		this.drawObject(this.sunPath);
	}
	
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
	}
	
	this.drawPolygon = function(o){
		$.log('coords3d='+o.getVectors());
		var coords3dAug = this.getRotatedCoordsNotBehindViewer(
				o.getVectors(), o.type);
		$.log('coords3dAug='+coords3dAug);
		
		var pObj = new ProjectedObject(this);
		var x, x_prev;
		for (var i = 0; i < coords3dAug.length; i++){
			x = coords3dAug[i];
			x_prev = coords3dAug[(i + coords3dAug.length - 1) % coords3dAug.length];
			if (this.isInVisibilityCone(x)){
				if (!this.isInVisibilityCone(x_prev)){
					//entering visibility cone
					var intersections = this.getVisibilityConeIntersections(x_prev, x);
					if (intersections.length != 1) throw "invalid edge intersections headed in: " + intersections;
					var entrance = this.getProjection(intersections[0]);
					pObj.addCoordOnBoundary(entrance);
				}
				pObj.addCoordInside(this.getProjection(x));
			} else {
				if (!this.isInVisibilityCone(x_prev)){
					var intersections = this.getVisibilityConeIntersections(x_prev, x);
					if (intersections.length == 2){
						//passing through visibility cone
						var entrance = this.getProjection(intersections[0]);
						var exit = this.getProjection(intersections[1]);
						
						pObj.addCoordOnBoundary(entrance);
						pObj.addCoordOnBoundary(exit);
					}
				} else {
					// leaving visibility cone
					var intersections = this.getVisibilityConeIntersections(x_prev, x);
					if (intersections.length != 1) throw "invalid edge intersections headed out: " + intersections;
					var exit = this.getProjection(intersections[0]);
					pObj.addCoordOnBoundary(exit);
				}
				var theta = MathExt.getAngle(new Coordinate(-1 * x.y, x.z));
				pObj.addCoordOutside(theta);
			}
		}

		var normedCoords = pObj.getCoords();
		this.canvas.drawPolygon(normedCoords, o.properties.fillStyle);
	}
	
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
	}
	
	this.drawPoint = function(p){
		var x = this.getRotatedCoordsNotBehindViewer(
				p.getVectors(), p.type)[0];
		if (x && this.isInVisibilityCone(x)){
			var point = new ProjectedPoint(this);
			point.addCoord(this.getProjection(x));
			this.canvas.drawPoint(point.getCoord(), p.properties.radius, p.properties.pointStyle);
		}
	}
	
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
	}
	
	this.getRotatedCoordsNotBehindViewer = function(vectors, type){
		var coords3d = this.rotateCoords(vectors);
		var coords3dAug = new Array();
		var x, x_prev;
		//get only coords not behind viewer 
		for (var i = 0; i < coords3d.length; i++){
			x = coords3d[i];
			x_prev = coords3d[(i + coords3d.length - 1) % coords3d.length];
			if (x_prev.x < 0){
				if(x.x >= 0) {
					if (x.x > 0 && (type == 'polygon' || (type == 'line' && i > 0))){
						var x_m = this.getYZIntercept(x,x_prev);
						coords3dAug.push(x_m);
					}
					coords3dAug.push(x);
				}
			} else {
				if (x.x >= 0){
					coords3dAug.push(x);
				} else if (type == 'polygon' || (type == 'line' && i > 0)){
					var x_m = this.getYZIntercept(x,x_prev);
					coords3dAug.push(x_m);
				}
			}
		}
		return coords3dAug;
	}
	
	this.rotateCoords = function(coords){
		var rCoords = new Array();
		for (var i = 0; i < coords.length; i++){
//			rCoords.push(coords[i].rotateZ(-1*this.viewer.az).rotateY(this.viewer.al).rotateX(this.viewer.ro));
			rCoords.push(coords[i].rotateFast(-1*this.viewer.az, this.viewer.al));
		}
		return rCoords;
	}
	
	this.getProjection = function(x){
		return new Coordinate(-1 * x.y * this.viewer.d / x.x, x.z * this.viewer.d / x.x);
	}
	
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
	}
	this.isInVisibilityCone = function(x){
		var coneSlope = this.rad/this.viewer.d;
		if (x.x > 0){
			var rad = Math.sqrt(Math.pow(x.y, 2) + Math.pow(x.z, 2));
			return rad / x.x <= coneSlope;
		} else {
			return false;
		}
	}
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
		var intersections = new Array();
		for (var i = 0; i < ts.length; i++){
			var t = ts[i];
			if (x1.x + dx.x*t > 0){
				intersections.push(new Vector(x1.x + dx.x*t, x1.y + dx.y*t, x1.z + dx.z*t));
			}
		}
		return intersections; 
	}

	this.getCornersBetween = function(startAngle, endAngle, counterclockwise){
		if (!counterclockwise) return this.getCornersBetween(endAngle, startAngle, true).reverse();
		startAngle = MathExt.translateAngle(startAngle, 0);
		endAngle = MathExt.translateAngle(endAngle, 0);
		var includedCorners = new Array();
		var firstCorner = 0;
		for (var i = 0; i < this.corners.length; i++){
			var corner = this.corners[i];
			var angle = MathExt.getAngle(corner); 
			if (angle >= startAngle){
				firstCorner = i;
				break;
			}
		}
		for (var i = 0; i < this.corners.length; i++){
			var corner = this.corners[(firstCorner + i) % this.corners.length];
			var angle = MathExt.getAngle(corner); 
			if (MathExt.isAngleBetween(angle, startAngle, endAngle)){
				includedCorners.push(corner);
			}
		}
		return includedCorners;
	}
}

ProjectedObject = function(screen){
	this.screen = screen;
	this.isOutside = true;
	this.lastBoundaryPoint = null;
	this.dTheta = 0;

	this.firstBoundaryPoint = null;
	this.dThetaToFirstBP = 0;
	this.angleOfLastNonInteriorPoint = null;
	
	this.normCoords = new Array();
	
	this.addCoordInside = function(coord){
//		$.log('add inside');
		this.isOutside = false;
		this.angleOfLastNonInteriorPoint = null;
		this.addCoord(coord);
	}
	this.addCoordOutside = function(theta){
		$.log('add outside:' + theta);
		this.updateOutsideAngle(theta);
		this.isOutside = true;
	}
	this.addCoordOnBoundary = function(coord){
//		$.log('add boundary');
		var thetaEnd = MathExt.getAngle(coord);
		this.updateOutsideAngle(thetaEnd);
		if (this.isOutside){
			if (this.lastBoundaryPoint != null){
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
	}
	this.addCoord = function(coord){
		var normCoord = new Coordinate(
				(coord.x + this.screen.w/2)/this.screen.w,
				(coord.y + this.screen.h/2)/this.screen.h);
		this.normCoords.push(normCoord);
	}
	this.addCoords = function(coords){
		for (var i = 0; i < coords.length; i++){
			this.addCoord(coords[i]);
		}
	}
	this.fillInBetweenAngles = function(thetaStart, thetaEnd, counterClockwise){
		var corners = this.screen.getCornersBetween(thetaStart, 
				thetaEnd, counterClockwise);
		this.addCoords(corners);
	}
	this.updateOutsideAngle = function(theta){
		if (this.angleOfLastNonInteriorPoint != null){
			var thetaFromLastPoint = MathExt.translateAngle(
					theta - this.angleOfLastNonInteriorPoint, -1*Math.PI);
			this.dTheta += thetaFromLastPoint;
		}
		this.angleOfLastNonInteriorPoint = theta;
	}
	this.getCoords = function(){
		if (this.isOutside){
			if (this.lastBoundaryPoint == null){
				//never crossed from inside to out
				if (Math.abs(this.dTheta) >= Math.PI){
					//object takes up whole screen
					this.fillInBetweenAngles(0, Math.PI, true);
					this.fillInBetweenAngles(Math.PI, 0, true);
				}
			} else if (this.firstBoundaryPoint != null){
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
	}
}

ProjectedLine = function(screen){
	this.screen = screen;
	this.segments = new Array();
	this.currentSegment = new Array();
	
	this.addCoordInside = function(coord){
		this.addCoord(coord);
	}
	this.addCoordOutside = function(theta){
		if (this.currentSegment.length > 0){
			this.segments.push(this.currentSegment);
			this.currentSegment = new Array();
		}
	}
	this.addCoordOnBoundary = function(coord){
		this.addCoord(coord);
	}
	this.addCoord = function(coord){
		var normCoord = new Coordinate(
				(coord.x + this.screen.w/2)/this.screen.w,
				(coord.y + this.screen.h/2)/this.screen.h);
		this.currentSegment.push(normCoord);
	}
	this.getSegments = function(){
		if (this.currentSegment.length > 0){
			this.segments.push(this.currentSegment);
		}
		return this.segments;
	}
}

ProjectedPoint = function(screen){
	this.screen = screen;
	
	this.normCoord = new Array();
	
	this.addCoord = function(coord){
		var normCoord = new Coordinate(
				(coord.x + this.screen.w/2)/this.screen.w,
				(coord.y + this.screen.h/2)/this.screen.h);
		this.normCoord = normCoord;
	}
	this.getCoord = function(){
		return this.normCoord;
	}
}

ProjectedCaptionSet = function(screen){
	this.screen = screen;
	this.normCoords = new Array();
	this.captions = new Array();
	this.length = 0;
	
	this.addCaption = function(caption, coord){
		var normCoord = new Coordinate(
				(coord.x + this.screen.w/2)/this.screen.w,
				(coord.y + this.screen.h/2)/this.screen.h);
		this.captions.push(caption);
		this.normCoords.push(normCoord);
		this.length = this.captions.length;
	}
	this.getCoord = function(i){
		return this.normCoords[i];
	}
	this.getCaption = function(i){
		return this.captions[i];
	}
}

Canvas = function(canvasObject){
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
	}
	
	this.drawCaptionSet = function(captionSet){
		var c;
		for (var i = 0; i < captionSet.length; i++){
			c = captionSet.getCaption(i);
			this.drawCaption(c.text, captionSet.getCoord(i), c.style, c.font);
			this.drawPoint(captionSet.getCoord(i), 4, '#f00');
		}
	}
	
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
	}
	
	this.drawLine = function(pLine, strokeStyle, lineWidth){
		var segments = pLine.getSegments();
		this.context.strokeStyle = strokeStyle;
		this.context.lineWidth = lineWidth;
		this.context.beginPath();
		for (var i = 0; i < segments.length; i++){
			var coords = segments[i];
			for (var j = 0; j < coords.length; j++){ 
				var p = this.getPixelForNormCoord(coords[j]);
				(j == 0) ? this.context.moveTo(p.x, p.y) :this.context.lineTo(p.x, p.y);
			}
			this.context.stroke();
			if (debug) {
				for (var j = 0; j < coords.length; j++){ 
					this.drawPoint(coords[j], 3, '#00f', j);
				}
			}
		}
	}
	
	this.drawPolygon = function(coords, style){
		this.context.fillStyle = style;
		this.context.beginPath();
		if (coords.length > 0){
			for (var i = 0; i < coords.length; i++){ 
				var p = this.getPixelForNormCoord(coords[i]);
				(i == 0) ? this.context.moveTo(p.x, p.y) : this.context.lineTo(p.x, p.y);
			}
			this.context.fill();
			if (debug) {
				for (var i = 0; i < coords.length; i++){ 
					this.drawPoint(coords[i], 3, '#00f', i);
				}
			}
		}
	}
	
	this.drawCaption = function(text, coord, style, font){
		var p = this.getPixelForNormCoord(coord);
		this.context.fillStyle = style;
		this.context.font = font;
		this.context.fillText(text, p.x+6, p.y+4);	
	}

	this.drawText = function(text, pCenter, style){
		this.context.fillStyle = style;
		this.context.font = 'bold 12px Verdana';
		this.context.fillText(text, pCenter.x+5, pCenter.y+15);	
	}
	
	this.fill = function(style){
		this.context.fillStyle = style;
		this.context.fillRect(0,0,this.pixelWidth, this.pixelHeight);
	}
	
	this.getPixelForNormCoord = function(coord){
		if (debug){
			return new Pixel(coord.x * this.pixelWidth / 2 + this.pixelWidth/4, this.pixelHeight * (1 - coord.y)/2 + this.pixelHeight/4);
		} else {
			return new Pixel(coord.x * this.pixelWidth, this.pixelHeight - coord.y * this.pixelHeight);
		}
	}
}
Object = function(type, properties){
	this.type = type;
	this.properties = {
		fillStyle : 'rgb(100,100,100)',
		strokeStyle : null,
		pointStyle : null
	}
	for (key in properties){
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

Caption = function(text, point, style, font){
	this.text = text;
	this.point = point;
	this.style = style;
	this.font = font;
	this.getVector = function(){
		return this.point.toVector();
	}
}

HorizontalCoord = function(az, al){
	this.az = az;
	this.al = al;
	this.toVector = function(){
		return new Vector(
				Math.cos(this.az) * Math.cos(this.al),
				-1 * Math.sin(this.az) * Math.cos(this.al),
				Math.sin(this.al));
	}
	this.toString = function(){
		return '(' + this.az + ',' + this.al + ')';
	}
}

Pixel = function(x,y){
	this.x = x;
	this.y = y;
	this.toString = function(){
		return '(' + x + ',' + y + ')';
	}
}
Coordinate = function(x,y){
	this.x = x;
	this.y = y;
	this.toString = function(){
		return '(' + x.toFixed(12) + ',' + y.toFixed(12) + ')';
	}
} 

Vector = function(x,y,z){
	this.x = x;
	this.y = y;
	this.z = z;
	this.toString = function(){
		return '(' + x.toFixed(12) + ',' + y.toFixed(12) + ',' + z.toFixed(12) + ')';
	}
	this.toVector = function(){
		return this;
	}
	this.rotateFast = function(phi, theta){
		var sinPhi = Math.sin(phi);
		var cosPhi = Math.cos(phi);
		var sinTheta = Math.sin(theta);
		var cosTheta = Math.cos(theta);
		return new Vector(
				(this.x * cosPhi + this.y * sinPhi) * cosTheta + this.z * sinTheta, 
				this.y * cosPhi - this.x * sinPhi,
				this.z * cosTheta - (this.x * cosPhi + this.y * sinPhi) * sinTheta);
	}
	this.rotateX = function(theta){
		return new Vector(this.x, 
				this.y * Math.cos(theta) - this.z * Math.sin(theta), 
				this.z * Math.cos(theta) + this.y * Math.sin(theta));
	}

	this.rotateY = function(theta){
		return new Vector(this.x * Math.cos(theta) + this.z * Math.sin(theta), 
				this.y,
				this.z * Math.cos(theta) - this.x * Math.sin(theta));
	}

	this.rotateZ = function(theta){
		return new Vector(this.x * Math.cos(theta) - this.y * Math.sin(theta), 
				this.y * Math.cos(theta) + this.x * Math.sin(theta),
				this.z);
	}
}