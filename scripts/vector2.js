"use strict"
var app = app || {};

app.Vector2 = function()
{
	var DEGRAD = Math.PI/180;
	
	function Vector2(x, y)
	{
		this.x = x || 0;
		this.y = y || 0;
	};
	
	var p = Vector2.prototype;
	p.magnitude = function()
	{
		return Math.sqrt(this.x * this.x + this.y * this.y);
	};
	
	p.add = function(v)
	{
		return new Vector2(this.x + v.x, this.y + v.y);
	};
	
	p.subtract = function(v)
	{
		return new Vector2(this.x - v.x, this.y - v.y);
	};
	
	p.multiply = function(n)
	{
		return new Vector2(this.x * n, this.y * n);
	};
	
	p.divide = function(n)
	{
		return new Vector2(this.x/n, this.y/n);
	};
	
	p.rotate = function(deg)
	{
		var rad = deg * DEGRAD;
		var cos = Math.cos(rad);
		var sin = Math.sin(rad);
		var x = this.x * cos -  this.y * sin;
		var y = this.y  * cos +  this.x * sin;
		return new Vector2(x, y);
	};
	
	p.normalized = function()
	{
		return this.divide(this.magnitude());
	};
	
	p.random = function(size)
	{
		var angle = Math.random() * (Math.PI * 2);
		return new Vector2(Math.cos(angle) * size, Math.sin(angle) * size);
	};
	
	return Vector2;
}();