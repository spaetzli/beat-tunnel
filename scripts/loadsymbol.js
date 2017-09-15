"use strict"
var app = app || {};

app.LoadSymbol = function(size, blur, linecount, speed, length, FPS, rainbowAlt)
{
	var blur = blur || .2;
	var linecount = linecount || 10;
	var speed = speed || 1;
	var increment = (Math.PI * 2)/linecount;
	var length = length || size * 0.25;
	var half_w = size * 0.5;
	var start_pos = half_w - length;
	var angle = 0;
	
	var obj = {};
	obj.size = size;
	obj.buffer = new DoubleBuffer(size, size);
	
	obj.start = function()
	{
		obj.interval = setInterval(obj.update, (1000/FPS) * speed);
	};
	
	obj.stop = function()
	{
		clearInterval(obj.interval);
		obj.interval = null;
	};
	
	var thing = 0;
	obj.update = function()
	{
		var buffer = obj.buffer;
		buffer.frontCtx.fillRect(0,0,buffer.width,buffer.height);
		buffer.clearBuffer('front');
		buffer.frontCtx.globalAlpha = blur;
		buffer.frontCtx.drawImage(buffer.backBuffer, 0, 0);
		
		angle += increment;
		var cos = Math.cos(angle);
		var sin = Math.sin(angle);
		
		buffer.frontCtx.strokeStyle = rainbowAlt.color;
		buffer.frontCtx.lineWidth = 3;
		buffer.frontCtx.globalAlpha = 1;
		buffer.frontCtx.beginPath();
		buffer.frontCtx.moveTo(half_w + cos * start_pos, half_w + sin * start_pos);
		buffer.frontCtx.lineTo(half_w + cos * half_w, half_w + sin * half_w);
		buffer.frontCtx.stroke();
		buffer.swapBuffers();
	};
	
	return obj;
};