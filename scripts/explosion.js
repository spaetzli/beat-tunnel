"use strict"
var app = app || {};

app.Explosion = function()
{
	function Explosion(x, y, w, h, speed, spread, lifetime, color, star, cloud)
	{
		this.x = x;
		this.y = y;
		this.width = w;
		this.height = h;
		this.spread = spread;
		this.lifetime = lifetime;
		// Images to use for the stars and clouds
		this.star = app.utils.tintImage(star, color);
		this.cloud = cloud;
		
		this.particles = [];
		this.numParticles = 50;
		this.useAdditive = false;
		this.vel = new app.Vector2(0, speed);
	};
	
	var p = Explosion.prototype;
	p.update = function(FPS, ctx, smoke)
	{
		var randRange = app.utils.randRange;
		for(var i = 0; i < this.particles.length; i++)
		{
			if(this.particles[i].isDead()) continue;
			
			var p = this.particles[i];
			p.update(FPS);
			
			if(p.isDead()) continue;
			
			ctx.save();
			ctx.globalCompositeOperation = this.useAdditive ? "lighter" : "source-over";
			ctx.globalAlpha = p.alpha;//p.twinkle ? (randRange(0, 100) < 10 ? p.alpha * 0.2 : p.alpha) : p.alpha;
			ctx.translate(p.x, p.y);
			ctx.rotate(p.rotation);
			var w = p.width * p.scale;
			var h = p.height * p.scale;
			ctx.drawImage(p.image == "star" ? this.star : smoke, -w * 0.5, -h * 0.5, w, h);
			ctx.restore();
		}
		
		ctx.globalAlpha = 1;
		ctx.globalCompositeOperation = "source-over";
	};
	
	p.generateParticles = function()
	{
		var randRange = app.utils.randRange;
		for(var i = 0; i < this.numParticles; i++)
		{
			var type = Math.random() * 100 < 100 ? 1 : 0;		// 1 == "star", 2 == "smoke"
			var x = randRange(this.x, this.x + this.width);
			var y = randRange(this.y, this.y + this.height);
			var size = type ? randRange(20, 40) : randRange(40, 60);
			var lifetime = type ? randRange(this.lifetime * 0.2, this.lifetime * 0.9) : randRange(this.lifetime * 0.6, this.lifetime);
			var p = new app.Particle(type ? "star" : "smoke", x, y, size, size, lifetime);
			p.rotation = randRange(0, Math.PI * 2);
			p.angularVel = randRange(-Math.PI * 0.5, Math.PI * 0.5); 
			p.velocity = this.vel.add((new app.Vector2()).random(randRange(this.spread * 0.2, this.spread)));
			p.fadeWithTime = true;
			p.scaleWithTime = type ? -1 : 1;
			p.twinkle = type ? true : false;
			p.maxScale = type ? 1 : 3;
			
			this.particles.push(p);
		}
	};
	
	p.isOver = function()
	{
		for(var i = 0; i < this.particles.length; i++)
		{
			if(!this.particles[i].isDead())
				return false;
		}
		return true;
	};
	
	return Explosion;
}();