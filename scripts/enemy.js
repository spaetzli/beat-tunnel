"use strict"
var app = app || {};

app.Enemy = function()
{
	function Enemy(pos, w, h, spd, shot, bounds)
	{
		this.health = 7;
		this.position = pos;
		this.width = w;
		this.height = h;
		this.speed = spd;							// The number of pixeld the enemy should move per second
		this.shots = shot;
		this.bounds = bounds;
		this.destroy = false;
	};
	
	Enemy.prototype.update = function(FPS)
	{
		this.position.y += this.speed * (1/FPS);
		if(this.position.y - this.height > this.bounds.y)
			this.destroy = true;
	};
	
	Enemy.prototype.getHitbox = function()
	{
		return {x: this.position.x, y: this.position.y, width: this.width, height: this.height};
	};
	
	return Enemy;
}();