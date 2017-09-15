"use strict"
var app = app || {};

// Base code for SoundManager class obtained from http://www.storiesinflight.com/html5/audio.html
app.SoundManager = function()
{
	function SoundManager(maxChannels)
	{
		this.channel_max = maxChannels;
		this.audiochannels = [];
		
		for (var a=0;a<this.channel_max;a++) {
			this.audiochannels[a] = new Array();
			this.audiochannels[a]['channel'] = new Audio();
			this.audiochannels[a]['finished'] = -1;
		}
	};
	
	SoundManager.prototype.PlaySound = function(s, v)
	{
		for (var a=0;a<this.audiochannels.length;a++) {
			var thistime = new Date();
			if (this.audiochannels[a]['finished'] < thistime.getTime()) {
				this.audiochannels[a]['finished'] = thistime.getTime() + s.duration*1000;
				this.audiochannels[a]['channel'].src = s.src;
				this.audiochannels[a]['channel'].volume = v || 1;
				this.audiochannels[a]['channel'].load();
				this.audiochannels[a]['channel'].play();
				break;
			}
		}
	};
	
	return SoundManager;
}();