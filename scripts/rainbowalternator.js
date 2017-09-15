"use strict"
var app = app || {};

app.RainbowAlternator = function(FPS){
	var i = .1;
	var t = 0;
	var cur = 0;
	var next = i;
	var cur_color = app.utils.perfectRainbow(cur,true);
	var next_color = app.utils.perfectRainbow(next,true);
	var duration = 500;
	var frame = 1000/FPS
	
	var obj = {};
	obj.color = app.utils.RGB2Color(cur_color.r, cur_color.g, cur_color.b);
	
	obj.start = function()
	{
		obj.interval = setInterval(obj.update, frame);
	};
	
	obj.stop = function()
	{
		clearInterval(obj.interval);
	};
	
	obj.update = function()
	{
		t += frame * 0.001 * (1000/duration);
		if(t > 1) updateColors();
		// Shorter names for the sake of less typing...
		var c = cur_color;
		var n = next_color;
		obj.color = app.utils.interpolate(c.r, c.g, c.b, n.r, n.g, n.b, t, 0, 1);
	};
	
	function updateColors()
	{
		t = 0;
		cur = (cur = cur + i) > 1 ? 0 : cur;
		next = (next = cur + i) > 1 ? 0 : next;
		cur_color = app.utils.perfectRainbow(cur, true);
		next_color = app.utils.perfectRainbow(next, true);
	};
	
	obj.start();
	return obj;
};