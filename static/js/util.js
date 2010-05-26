MathExt = {
	getQuadraticSolutions : function (a,b,c,domain){
		var sols = new Array();
		var det = b*b - 4*a*c;
		if (a == 0){
			var sol = -1*c/b;
			MathExt.inRange(sol, domain) && sols.push(sol);
		} else if (det == 0){
			var sol = -1*b/(2*a);
			MathExt.inRange(sol, domain) && sols.push(sol);
		} else if (det > 0) {
			var part1 = -1*b/(2*a);
			var part2 = Math.sqrt(det)/(2*a);
			if (part2 < 0){
				//we always want the smaller solution to be given first
				part2 = -1 * part2;
			}
			MathExt.inRange(part1 - part2, domain) && sols.push(part1 - part2);
			MathExt.inRange(part1 + part2, domain) && sols.push(part1 + part2);
		}
		return sols;
	},
	inRange : function(a, range){
		return !range || a >= range[0] && a <= range[1];
	},
	getAngle : function(coord){
		var angle = Math.atan2(coord.y, coord.x);
		return MathExt.translateAngle(angle, 0);
	},
	translateAngle : function(angle, angleMin){
		var diff = angle - angleMin;
		diff = diff - Math.floor(diff/(2*Math.PI))*2*Math.PI;
		return angleMin + diff;
	},
	isAngleBetween : function(theta, theta_min, theta_max){
		if (theta_min == theta_max){
			return theta == theta_min;
		} else if (theta_min < theta_max){
			return theta > theta_min && theta < theta_max;
		} else {
			return theta > theta_min || theta < theta_max;
		}
	}
}


$.extend({
	log : function(msg, force) {
		if (force || debug && typeof(console)!="undefined" && console)
			console.log("%s", msg);
	},
	param : function(name){
		name = name.replace(/[\[]/,"\\\[").replace(/[\]]/,"\\\]");
		var regexS = "[\\#?&]"+name+"=([^&#]*)";
		var regex = new RegExp( regexS );
		var results = regex.exec( window.location.href );
		if( results == null )
			return "";
		else
			return results[1];
	}
});