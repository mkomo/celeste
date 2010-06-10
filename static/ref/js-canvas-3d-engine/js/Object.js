function Object( verts, tris ) {
	this.vertices  = verts;
	this.triangles = tris;
}

Object.prototype.translate = function(x,y,z) {
	var tr = translation(x,y,z);
	return this.multiply(tr);
}

Object.prototype.scale = function(x,y,z) {
	var sr = scaling(x,y,z);
	return this.multiply(sr);
}

Object.prototype.multiply = function(matrix) {
	var vs = [];

	for( var i = 0; i < this.vertices.length; i++ ) 
		vs[i] = matrix.vmultiply(this.vertices[i]);
	
	var no = new Object( vs, this.triangles );
	no.update = this.update;
	return no;
}