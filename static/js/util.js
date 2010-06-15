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
		return MathExt.translatePeriodic(angle, angleMin, angleMin + 2*Math.PI);
	},
	translatePeriodic : function(val, min, max){
		var period = max - min;
		var diff = val - min;
		diff = diff - Math.floor(diff/period)*period;
		return min + diff;
	},
	sgn : function(val){
		if (val < 0) return -1;
		if (val > 0) return 1;
		return 0;
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
mkutil = {
	mapObject : function(original, func, keysToMap, includeAll){
		var mappedObj = {}, i, mapAllKeys = ! $.isArray(keysToMap);
		for (i in original){
			if (mapAllKeys || keysToMap.indexOf(i) != -1) {
				mappedObj[i] = func.call(null, original[i], i);
			} else if (includeAll){
				mappedObj[i] = original[i];
			}
		}
		return mappedObj;
	},
	objectToArray : function(obj, keysToInclude){
		var mappedArray = [], i, mapAllKeys = ! $.isArray(keysToInclude);
		for (i in obj){
			if (mapAllKeys || keysToInclude.indexOf(i) != -1) {
				mappedArray.push(obj[i]);
			}
		}
		return mappedArray;
	}
}