"use strict"
var app = app || {};

app.Particle = function()
{
	function Particle(image, x, y, w, h, lifetime)
	{
		this.image = image;
		this.x = x;
		this.y = y;
		this.width = w;
		this.height = h;
		this.velocity = new app.Vector2();
		this.rotation = 0;
		this.angularVel = 0;
		this.maxScale = 1;
		this.scale = 1;
		this.alpha = 1;
		
		this.fadeWithTime = false;
		this.scaleWithTime = 0;						// 0 = no scaling, 1 = scale up, -1 = scale down
		this.twinkle = false;
		
		this.life = lifetime;						// Amount of reamining time in this particle's life (in seconds)
		this.lifetime = lifetime;					// The lifetime of this particle (in seconds)
	};
	
	Particle.prototype.update = function(FPS)
	{
		var dt = 1/FPS;
		this.x += this.velocity.x * dt;
		this.y += this.velocity.y * dt;
		this.rotation += this.angularVel * dt;
		
		//console.log(this.x, this.y);
		//console.log(this.life, this.lifetime);
		var lifeRatio = this.life/this.lifetime;
		if(this.fadeWithTime) this.alpha = lifeRatio;
		if(this.scaleWithTime != 0)
		{
			this.scale = this.scaleWithTime == 1 ? 1 + (this.maxScale - 1) * (1 - lifeRatio) : lifeRatio;
		}
		
		this.life -= dt;
	};
	
	Particle.prototype.isDead = function()
	{
		return this.life <= 0;
	};
	
	return Particle;
}();