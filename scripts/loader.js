"use strict";
var app = app || {};

// wait until main document is loaded
window.addEventListener("load", function() {
	// start dynamic loading
	Modernizr.load([{
		// these files are always loaded
		load: ["scripts/sizzle.js",
			   "scripts/dom.js", 
			   "scripts/game.js",
			   "scripts/utilities.js",
			   "scripts/DoubleBuffer.js",
			   "scripts/loadsymbol.js",
			   "scripts/rainbowalternator.js",
			   "scripts/soundmanager.js",
			   "scripts/enemy.js",
			   "scripts/vector2.js",
			   "scripts/particle.js",
			   "scripts/explosion.js",
			   "scripts/beattunnel.js"],
		
		// called when all files have finished loading and executing
		complete: function() {
			// Create a new beattunnel instance and begin initialization
			var beattunnel = app.beattunnel();
			beattunnel.loadImages();
			
			// show first screen
			app.game.showScreen("main-menu");
			
			var playButton = document.getElementById("play-game");
			playButton.addEventListener("click", function(e) {
				app.game.showScreen("game-screen");
				beattunnel.pause(false);
				beattunnel.togglePauseFunctions(true);
				beattunnel.setReady(true);
			});
			
			var instructionButton = document.getElementById("how-to-play");
			instructionButton.addEventListener("click", function(e) {
				app.game.showScreen("instructions");
			});
			
			/*
			var backButton = document.getElementById("back-button");
			backButton.addEventListener("click", function(e) {
				app.game.showScreen("main-menu");
			});
			*/
			
			window.addEventListener("keydown", function(e) {
				// keyCode 27 refers to the ESC button
				if(e.keyCode == 27)
				{
					app.game.showScreen("main-menu");
					beattunnel.pause(true);
					beattunnel.togglePauseFunctions(false);
					beattunnel.setReady(false);
				}
			});
		}
	}]); // end Modernizr.load
}, false); // end addEventListener