"use strict"
var app = app || {};

app.utils = (function()
{
	// Easily create a canvas to use as a graphic buffer 
	function MakeBuffer(width, height)
	{
		var buffer = document.createElement('canvas');
		buffer.width = width || 100;
		buffer.height = height || 100;
		return buffer;
	};
	
	// Array-shuffling function, courtesy of Google.
	function shuffle(o)
	{
		for(var t, j, i = o.length; i; j = Math.floor(Math.random() * i), t = o[--i], o[i] = o[j], o[j] = t);
		return o;
	}
	
	// COLOR GENERATING FUNCTIONS
	// courtesy of Google
	
	// Generates a color in the rainbow between violet and bright red/pink
	function perfectRainbow(t, rgb)
	{
		return rainbow(Math.PI*1.65,Math.PI*1.65,Math.PI*1.65,3,5,1,t,128,127,rgb);
	}
	
	// Function for drawing colorful rainbow colors
	function rainbow(f1,f2,f3,p1,p2,p3,t,cen,wid,rgb)
	{
		var r = Math.sin(f1*t+p1)*wid+cen;
		var g = Math.sin(f2*t+p2)*wid+cen;
		var b = Math.sin(f3*t+p3)*wid+cen;
		return rgb ? {r: r, g: g, b: b} : RGB2Color(r,g,b);
	}
	
	function interpolate(r1,g1,b1,r2,g2,b2,t,st,et)
	{
		var elapsed = t/(et-st);
		var r = r1 + elapsed*(r2-r1);
		var g = g1 + elapsed*(g2-g1);
		var b = b1 + elapsed*(b2-b1);
		return RGB2Color(r,g,b);
	}
	
	function RGB2Color(r,g,b)
	{
		return '#' + byte2Hex(r) + byte2Hex(g) + byte2Hex(b);
	}
	
	function RGB2Color2(r,g,b)
	{
		return 'rgb(' + r + ',' + g + ',' + b + ')';
	}
	
	function byte2Hex(n)
	{
		var nybHexString = "0123456789ABCDEF";
		return String(nybHexString.substr((n >> 4) & 0x0F,1)) + nybHexString.substr(n & 0x0F,1);
	}
	
	function clamp(value, min, max)
	{
		return Math.min(Math.max(value, min), max);
	};
	
	function randRange(min, max)
	{
		return min + Math.random() * (max - min);
	};
	
	function tintImage(img,color)
	{
		var buffer = document.createElement('canvas');
		buffer.width = img.width;
		buffer.height = img.height;
		var bx = buffer.getContext('2d');
		
		bx.fillStyle = color;
		bx.fillRect(0,0,img.width,img.height);
		bx.globalCompositeOperation = "destination-atop";
		bx.drawImage(img,0,0);
		bx.globalCompositeOperation = "lighter";
		bx.drawImage(buffer,0,0);
		//bx.drawImage(buffer,0,0);
		return buffer;
	};
	
	function mergesort(a)
	{
		if(a.length <= 1)
			return a;
		var lower = [];
		var higher = [];
		var equal = [];
		var pivot = a[Math.floor(a.length/2)];
		
		for(var i = 0; i < a.length; i++)
		{
			if(a[i] < pivot)
				lower.push(a[i]);
			else if(a[i] > pivot)
				higher.push(a[i]);
			else 
				equal.push(a[i]);
		}
		return mergesort(lower).concat(equal, mergesort(higher));
	}
	
	function string2intarray(s)
	{
		var a = s.split(',');
		for(var i = 0; i < a.length; i++)
		{
			a[i] = a[i] * 1;
		};
		return a;
	};
	
	return {
		makeBuffer: MakeBuffer,
		shuffle: shuffle,
		perfectRainbow: perfectRainbow,
		rainbow: rainbow,
		interpolate: interpolate,
		RGB2Color: RGB2Color,
		RGB2Color2: RGB2Color2,
		byte2Hex: byte2Hex,
		clamp: clamp,
		randRange: randRange,
		tintImage: tintImage,
		mergesort: mergesort,
		string2intarray: string2intarray
	};
}());