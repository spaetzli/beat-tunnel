"use strict";
var app = app || {};

app.game = ( function() { 
	var dom = app.dom,
	$ = dom.$;
	
	// hide the active screen (if any) and show the screen 
	// with the specified id
	function showScreen(screenId) {
		var activeScreen = $("#game .screen.active")[0]; // SAME as document.querySelector("#game .screen.active");
		var screen = $("#" + screenId)[0]; // SAME as document.querySelector("#" + screenId);
		if(activeScreen) {
			dom.removeClass(activeScreen, "active");
		}
			dom.addClass(screen, "active");
	}
	
	// expose public methods
	return {
		showScreen: showScreen
	};
})(); // self executing anon function