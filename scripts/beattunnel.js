"use strict"
var app = app || {};

app.beattunnel = function()
{

	// constants
	var CANVAS_WIDTH = 480;
	var CANVAS_HEIGHT = 720; 
	var FPS = 30;	
	
	var GAME_STATE = {
		START: "start",
		LOADING: "loading",
		INSTRUCTIONS: "instructions",
		PLAYING: "playing",
		PAUSED: "paused",
		END: "end"
	};
	
	var container;
	var songFile;
	var statusDiv;
	var isPlaying = false;
	var loadProgressDesc; // This is used to describe the current state of the song's load to the user 
	var keydown = [];
	var trackPos = 0;
	var prevTrackPos = 0;
	var startTime = 0;
	var bufferData; // holds the result of loading and decoding the sound file for quick play/pause
	var ctx;
	
	 //Audio context, audio analyzer and audio source globals
	var audioCtx, analyzerNode, sourceNode; 
	
	// Used for tracking the various data necessary to calculate the average frequency of the song
	var count = 0;
	var total = 0;
	var avg = 0;
	var percentAvg = 0;
	var averages = [];
	var maxSample = 15;
	var prevTime = 0;
	var dt = 0;
	
	// The unique seed generated from the current song
	var seed = 0;
	
	// GAME VARIABLES
	var gameState = GAME_STATE.START;								// The current state of the game
	var prevState;													// Used for storing the state to retrun to when returning from PAUSED state
	var speed = 370;												// The speed at which the path scrolls.
	var tiles = [];													// An array of rows of tiles.
	var tileSize = 30;												// The width/height of each tile.
	var rowSize;													// The number of tiles per row of the path. Calculated dynamically.
	var colSize;													// The number of tiles per column of the path. Calculated dynamically.
	var pathOffset;													// The distance from x = 0 at which the path gets drawn. Calculated dynamically.
	var pathSize = 18;												// The total width of the path area (walls + walkable area)
	var minPathSize = 4;											// The minimum size (in number of tiles) of the path.
	var maxWallSize;												// The maximum size (in number of tiles) of the walls.
	var wallOffset = 0												// The offset of the walls from the center of the path. Adjusting this causes the path to zig-zag more
	var currentOffset = 0;											// The current offset of the walls. This variable adjusts over time to match the wallOffset whenever it changes.
	var cooldown = 0;												// This is the 'cooldown' time remaining before the next adjustment to the wallOffset
	var orbs = [];													// This is an array of all of the orbs on the screen.
	var orbSize = 13;												// The height/width of the orbs.
	var orbValue = 100;												// The number of points each orb adds to the player's score.
	var scoreBox = {x: CANVAS_WIDTH * .8, y: -90, w: 100, h: 100};	// This is the box containing the player's score text. //{x:0, y:-90, w:200, h:100};
	var loopInterval;
	var rainbowAlt;
	var loadSymbol;
	var notebuffer;
	var notecnt = 0;
	var notemax = 50;
	var enemies = [];
	var attackedEnemies = [];
	var shockTime = 10;
	var readyToLoad = false;
	
	// PLAYER VARIABLES
	var player;
	var score = 0;
	var displayedScore = 0;
	var scoreText = 0;
	var playerSize = 20;
	var mouse = {x: 0, y: 0};
	var colliding = false;
	var scoreMultiplier = 1;
	var invincibilityFrames = 0;
	var invincibilityMax = 30;
	var attackRadius = 150;
	var energyDrainRate = .1;
	var damageRate = 1;
	var attacking = false;
	var highScores = [0, 0, 0, 0, 0];
	
	// DRAW VARIABLES
	var tileBuffer;
	var tileImage;
	var orbImage;
	var effectBuffer;
	var effectCtx;
	var images;
	var explosions = [];
	
	// SOUND VARIABLES
	var sounds;
	var soundManager;
	
	var KEYBOARD = {
		"KEY_LEFT": 37,
		"KEY_RIGHT": 39			
	};
	
	var imagePaths = {
		star: "images/star.png",
		smoke: "images/smoke.png",
		note: "images/note.png",
		noteOutline: "images/note-outline.png",
		powerup: "images/plusone.png"
	};
	
	var soundPaths = {
		ring: "sounds/ring.mp3"
	}
	
	//XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX
	//																INITIALIZATION FUNCTIONS
	//XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX

	function setReady(state)
	{
		readyToLoad = state;
	};

	function focusUnpause()
	{
		pause(false);
	};
	
	function blurPause()
	{
		pause(true);
	};

	function togglePauseFunctions(isPauseEnabled)
	{
		if(isPauseEnabled)
		{
			window.onfocus = focusUnpause;
			window.onblur = blurPause;
		}
		else
		{
			window.onfocus = null;
			window.onblur = null;	
		}
	}
	
	function pause(state)
	{
		// Let's not allow the game to be paused/unpaused in states other than PLAYING
		if(gameState != GAME_STATE.PLAYING && gameState != GAME_STATE.PAUSED) return;
		
		if(state)
		{
			if(gameState == GAME_STATE.PAUSED) return;
			
			prevState = gameState;
			gameState = GAME_STATE.PAUSED;
			
			ctx.globalAlpha = .5;
			ctx.fillStyle = "#000000";
			ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
			
			ctx.globalAlpha = 1;
			var fontSize = 100;
			ctx.font = fontSize + "px Consolas";
			ctx.fillStyle = "#FFFFFF";
			var text = "PAUSED";
			var width = ctx.measureText(text).width;
			ctx.fillText(text, (CANVAS_WIDTH - width) * 0.5, CANVAS_HEIGHT * 0.5 + fontSize * 0.5);
			
			if(!sourceNode) return;
			
			sourceNode.stop(0);
			var stopTime = (new Date()).getTime(); // get time at which song was stopped
			prevTrackPos = trackPos; // the point at which the song resumes at
			trackPos = prevTrackPos + (stopTime - startTime) / 1000; // pos in song at which it paused
		}
		else
		{
			if(gameState != GAME_STATE.PAUSED) return;
			
			gameState = prevState;
			
			if(!sourceNode) return;
			analyzerNode = audioCtx.createAnalyser();
				
			sourceNode = audioCtx.createBufferSource();
			
			// gets rid of having to reload song from scratch/getting a new buffer.
			// just setting sourceNode's buffer equal to the one stored in bufferData
			// and playing after a pause won't "load" or buffer anymore
			sourceNode.buffer = bufferData;
			sourceNode.connect(analyzerNode);
			analyzerNode.connect(audioCtx.destination);
			
			sourceNode.start(0, trackPos);
			startTime = (new Date()).getTime(); // gets time in msecs
		}
	};
	
	function init(){
		highScores = sessionStorage.getItem("HighScores") || highScores;
		if(typeof highScores === "string") 
			highScores = app.utils.string2intarray(highScores);
		console.log("HIGH SCORES!!!!");
		console.log(highScores);
		
     	container = document.querySelector("#container");
     	//barsList = makeSimpleGraph(container, NUM_BARS);
		var canvas = document.querySelector('canvas');
		canvas.width = CANVAS_WIDTH;
		canvas.height = CANVAS_HEIGHT;
		canvas.style.zIndex = 100;
		ctx = canvas.getContext('2d');
		
		//container.appendChild(canvas);
		ctx.fillStyle = "#000000";
		ctx.fillRect(0,0,canvas.width, canvas.height);
			
		audioCtx = new (window.AudioContext || window.webkitAudioContext)();
		setUpDragDropAndLoad(container);
		
		window.addEventListener("keydown",function(e) {
		/*
			if(gameState != GAME_STATE.PLAYING) return;
			if((e.keyCode == 65 || e.keyCode == 68) && !keydown[e.keyCode])
			{
				attackEnemies(e.keyCode == 65 ? "left" : "right");
			};*/
			//console.log("keydown=" + e.keyCode);
			keydown[e.keyCode] = true;
		});
		
		window.addEventListener("keyup",function(e) {
			//console.log("keyup=" + e.keyCode);
			keydown[e.keyCode] = false;
		});
		
		canvas.addEventListener("mousemove", function(e)
		{
			var $canvas = $(canvas);
			mouse = {
				x: Math.round((e.pageX - $canvas.offset().left)),
				y: Math.round((e.pageY - $canvas.offset().top))
			}
			if(player) player.position = {x: mouse.x - 30, y: mouse.y - 30};
		});
		
		canvas.addEventListener("mousedown", function(e)
		{
			if(gameState != GAME_STATE.PLAYING) return;
			attacking = true;
		});
		
		canvas.addEventListener("mouseup", function(e)
		{
			if(gameState != GAME_STATE.PLAYING) return;
			attacking = false;
		});
		
		togglePauseFunctions(true);
		
		initTiles();
		initPlayer();
		
		prevTime = (new Date()).getTime();
		
		rainbowAlt = app.RainbowAlternator(FPS);
		loadSymbol = app.LoadSymbol(100, .9, 25, 3, 30, FPS, rainbowAlt);
		notebuffer = new DoubleBuffer(514, 653); //MakeBuffer(200, 200);
		setInterval(loop,1000/FPS); // [REFRESH]
		
		soundManager = new app.SoundManager(10);
	};
	
	
	function setUpDragDropAndLoad(dropTarget) {
		dropTarget.addEventListener("dragover", function(e) {
			e.stopPropagation();
			e.preventDefault();
			e.dataTransfer.dropEffect = "copy";
		});
		
		dropTarget.addEventListener("drop", function(e) {
			e.stopPropagation();
			e.preventDefault();
			if( !(gameState == GAME_STATE.START || gameState == GAME_STATE.END) || !readyToLoad)
				return;
			songFile = e.dataTransfer.files[0];
			loadFile(songFile);
		});
		
		function loadFile(fileObject) {
			statusDiv = document.getElementById("status");
			var reader = new FileReader();
			
			reader.addEventListener("load", function(e) {
				//console.log(e.target.result);
				playAndAnalyzeSound(e.target.result);
				//analyzeSoundOnly(e.target.result);
			});
			
			reader.readAsArrayBuffer(fileObject);
			//statusDiv.innerHTML = "Loading...";
			gameState = GAME_STATE.LOADING;
			loadProgressDesc = "Reading Sound File";
		}
	}	// end setUpDragDropAndLoad()
	
	
	function playAndAnalyzeSound(arrayBuffer) {
		try{
			if(sourceNode)
				sourceNode.stop(0);
			
			analyzerNode = audioCtx.createAnalyser();
			
			loadProgressDesc = "Decoding Sound File";
			
			// Let's set an interval to continuously update the progress message in case things are taking too long
			var count = 0;
			var tooLongInterval = setInterval(function()
			{
				if(count == 0)
					loadProgressDesc = "Still Decoding Sound File";
				else if(count == 1)
					loadProgressDesc = "STILL Decoding Sound File...";
				else if(count == 2)
					loadProgressDesc = "Anytime Now";
				else if(count == 3)
					loadProgressDesc = "Almost Done?";
				else if(count == 4)
					loadProgressDesc = "Sorry for the wait...";
				
				count++;
			}, 5000);
			
			audioCtx.decodeAudioData(arrayBuffer, function(buffer) {
				bufferData = buffer;
				
				sourceNode = audioCtx.createBufferSource();
				sourceNode.buffer = buffer;
				sourceNode.connect(analyzerNode);
				sourceNode.onended = songComplete;
				analyzerNode.connect(audioCtx.destination);
				
				console.log("Paused at: " + trackPos); // debug
				
				clearInterval(tooLongInterval);
				setTimeout(function()
				{
					sourceNode.start(0, trackPos);
					startTime = (new Date()).getTime(); // gets time in msecs
					
					gameState = GAME_STATE.PLAYING;
					isPlaying = true;

					document.getElementById("play-game").innerHTML = "Resume";
					document.getElementById("how-to-play").innerHTML = "Forgot how to play?";
					
					// Set up a seed based on an arbitrary value from the buffer's first channel.
					// This will allow us to generate a unique set of 'random' values for each song loaded in.
					var channelData = buffer.getChannelData(1);
					seed = Math.abs(channelData[Math.floor(channelData.length * 0.5)]);
					seed = Math.round(seed * (Math.pow(2,31)*0.5));
					Math.seed = seed;
					
					//statusDiv.innerHTML = "Finished loading";
					
					//loopInterval = setInterval(loop,1000/FPS);
				}, 100);
				
				
			});
		} 
		catch(e){
			statusDiv.innerHTML = "Error! " + e;
		}
	}
	
	// a version of playAndAnalyzeSound that doesn't play the song immediately
	// after loading it - easiest way to do it
	function analyzeSoundOnly(arrayBuffer) {
		try{
			if(sourceNode)
				sourceNode.stop(0);
			
			analyzerNode = audioCtx.createAnalyser();
			analyzerNode.smoothingTimeConstant = 0;
			
			audioCtx.decodeAudioData(arrayBuffer, function(buffer) {
				bufferData = buffer;
				
				// Set up a seed based on an arbitrary value from the buffer's first channel.
				// This will allow us to generate a unique set of 'random' values for each song loaded in.
				var channelData = buffer.getChannelData(1);
				seed = Math.abs(channelData[Math.floor(channelData.length * 0.5)]);
				seed = Math.round(seed * (Math.pow(2,31)*0.5));
				Math.seed = seed;
				
				// load in a brand new song, and it won't play from where the
				// last one left off
				prevTrackPos = trackPos = 0;
				
				//statusDiv.innerHTML = "Done Loading!";
				
				//setInterval(loop,1000/30);
			});
		} 
		catch(e){
			statusDiv.innerHTML = "Error! " + e;
		}
	}
	
	
	function loop() {
		if(gameState == GAME_STATE.START)
		{
			DrawStartScreen();
			if(randRange(0, 100) < 10) makeExplosion(randRange(0, CANVAS_WIDTH), randRange(0, CANVAS_HEIGHT));
			updateExplosions();
			//drawLightning({x: 0, y: 0}, {x: CANVAS_WIDTH, y: CANVAS_HEIGHT}, 5, 100, rainbowAlt.color, 3);
		}
		else if(gameState == GAME_STATE.LOADING)
		{
			DrawLoadScreen();
		}
		else if(gameState == GAME_STATE.PAUSED)
		{
			// DO NOTHING FOR NOW! WE ARE PAUSED!
		}
		else if(gameState == GAME_STATE.END)
		{
			// nothing
		}
		else if(gameState == GAME_STATE.PLAYING && isPlaying)
		{
			var byteArray = new Uint8Array(analyzerNode.frequencyBinCount);
			analyzerNode.getByteFrequencyData(byteArray);
			var totals = [];
			var sections = 1;
			var section_size = byteArray.length/sections;
			
			total = 0;
			count = 0;
			
			for(var i = 0; i < byteArray.length;i++)
			{
				if(byteArray[i] > 0)
				{	
					total += byteArray[i];
					count++;
				}
			}
			
			total /= count;
			averages.push(total);
			if(averages.length > maxSample) averages.shift();
			
			total = 0;
			for(var i = 0; i < averages.length; i++)
				total += averages[i];
			total /= averages.length;
			
			// Since we have the average frequency stored in total right here, let's add it to the score (if we're not out of bounds)
			//if(!colliding) score += Math.ceil(total / 100);
			
			updateTiles(total);
			checkCollisions();
			
			if(colliding) score -= 120;
			
			/*
			if(score < 0) 
			{
				songComplete();
				return;
			}*/
			
			var t = (total - 20)/160;
			//if(t < 0) t = 0;
			if(t > 1) t = 1;
			
			percentAvg = t;
			if(isNaN(percentAvg)) percentAvg = 0;
			
			//colorTile(perfectRainbow(t));
			drawTiles();
			drawPlayer(condenseData(byteArray),t);
			
			attackedEnemies = [];
			if(attacking) attackEnemies();
			updateAndDrawEnemies();
			attackedEnemies.forEach(function(enemy)
			{
				var epos = {x: enemy.position.x, y: enemy.position.y};
				drawLightning(mouse, epos, 5, 100, "#FFFFFF", 6);
				drawLightning(mouse, epos, 5, 100, "#FFFFFF", 3);
				drawLightning(mouse, epos, 5, 100, "#FFFFFF", 6);
			});
			updateExplosions();
			
			updateOrbs();
			
			updateNoteBuffer();
			ctx.drawImage(notebuffer.frontBuffer, CANVAS_WIDTH * .8, 0 , 80, 100);
		}
		
	}
	
	//XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX
	//																GAME LOGIC HELPER FUNCTIONS
	//XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX
	
	function initTiles()
	{
		tiles = [];
		rowSize = Math.floor(CANVAS_WIDTH/tileSize);
		colSize = Math.floor(CANVAS_HEIGHT/tileSize);
		pathOffset = (rowSize * 0.5) - (pathSize * 0.5);
		maxWallSize = Math.floor((pathSize - minPathSize) * 0.5);
		
		console.log(rowSize + ", " + colSize + ", " + pathOffset + ", " + maxWallSize);
		for(var i = 0; i < colSize + 1; i++)
		{
			var row = {};
			row.y = CANVAS_HEIGHT - (tileSize * (i + 1));
			row.tileStates = [];
			for(var j = 0; j < rowSize; j++)
			{
				var state = 0;
				if(j > pathOffset && j < pathOffset + pathSize)
				{
					state = (j == pathOffset + 1) || (j == pathOffset + pathSize - 1) ? 2 : 1;
				}
				row.tileStates.push(state);
			}
			tiles.push(row);
		}
		
		
		// Let's make the buffers for drawing the tiles while we are initializing things
		tileImage = document.createElement('canvas');
		tileBuffer = document.createElement('canvas');
		
		tileImage.width = tileBuffer.width = tileSize;
		tileImage.height = tileBuffer.height = tileSize;
		
		// Let's draw the tileImage now, too!
		var tileCtx = tileImage.getContext('2d');
		
		tileCtx.fillStyle = "#222222";
		for(var i = 0; i < 10; i++)
		{
			var w = tileSize * (1 - (i+1)/10);
			tileCtx.globalAlpha = (i+1)/10;
			tileCtx.fillRect(tileSize * 0.5 - w * 0.5, tileSize * 0.5 - w * 0.5, w, w);
		}
		tileCtx.lineWidth = 2;
		tileCtx.strokeRect(0,0,tileSize,tileSize);
		
		
		// Since orbs are also drawn with the tiles, let's just initialize the orb stuff here too
		effectBuffer = new DoubleBuffer(CANVAS_WIDTH,CANVAS_HEIGHT);
		
		orbImage = document.createElement('canvas');
		orbImage.width = orbSize;
		orbImage.height = orbSize;
		var orbCtx = orbImage.getContext('2d');
		orbCtx.fillStyle = "#FFFFFF";
		for(var i = 0; i < 10; i++)
		{
			orbCtx.beginPath();
			tileCtx.globalAlpha = (i+1)/20;
			orbCtx.arc(orbSize * 0.5, orbSize * 0.5, (orbSize * 0.5) * (1 - (i+1)/10), 0, Math.PI*2);
			orbCtx.closePath();
			orbCtx.fill();
		}
		
		var temp = document.createElement('canvas');
		var b_ctx = temp.getContext('2d');
		b_ctx.clearRect(0,0,orbSize,orbSize);
		b_ctx.fillStyle = "#FF0000";
		b_ctx.fillRect(0,0,orbSize,orbSize);
		b_ctx.globalCompositeOperation = "destination-atop";
		b_ctx.drawImage(orbImage,0,0);
		b_ctx.globalCompositeOperation = "lighter";
		b_ctx.drawImage(orbImage,0,0);
		
		orbCtx.clearRect(0,0,orbSize,orbSize);
		orbCtx.drawImage(temp,0,0);
	}
	
	function updateTiles(avg)
	{
		var curTime = (new Date()).getTime();
		//dt = (curTime - prevTime)/1000;
		dt = FPS/1000;
		prevTime = curTime;
		
		for(var i = 0; i < tiles.length; i++)
		{
			tiles[i].y += speed * dt;
			if(tiles[i].y >= CANVAS_HEIGHT)
			{
				
				if(currentOffset != wallOffset)
				{
					var dir = wallOffset - currentOffset;
					dir = dir/Math.abs(dir); // Normalize dir so we're only changing by 1
					currentOffset += dir;
					if(currentOffset == wallOffset)
						cooldown = Math.seededRandom(2, 5);
				}
				
				tiles.shift();
				
				var row = {};
				row.y = tiles[tiles.length - 1].y - tileSize;
				row.tileStates = [];
				
				var wallsize = (avg - 20)/160;
				//if(wallsize < 0) wallsize = 0;
				if(wallsize > 1) wallsize = 1;
				row.color = perfectRainbow(wallsize);
				wallsize = Math.floor((pathSize - (pathSize - minPathSize) * (1 - wallsize)) * 0.5);
				
				for(var j = 0; j < rowSize; j++)
				{
					var state = 0;
					if(j > pathOffset && j < pathOffset + pathSize)
					{
						state = (j >= pathOffset + 1 && j < pathOffset + wallsize + currentOffset) || (j <= pathOffset + pathSize - 1 && j > pathOffset + pathSize - (wallsize - currentOffset)) ? 2 : 1;
					}
					row.tileStates.push(state);
				}
				
				
				// See if we should place an orb on this row
				var tempRand = Math.seededRandom(0,1000);
				if(tempRand < 150)
				{
					var start = pathOffset + wallsize + currentOffset;
					var end = start + (pathSize - (wallsize * 2));
					var index = Math.round(Math.seededRandom(start, end));
					row.tileStates[index] = tempRand < 10 ? 4 : 3;
				}
				
				/*
				if(Math.seededRandom(1,100) < 50)
				{
					var start = pathOffset + wallsize + currentOffset;
					var end = start + (pathSize - (wallsize * 2));
					var index = Math.round(Math.seededRandom(0, pathSize));
					if(row.tileStates[index] == 1) row.tileStates[index] = 3;
				}*/
				
				tiles.push(row);
			}
		}
		
		if(cooldown > 0) cooldown -= dt;
		if(cooldown <= 0)
		{
			wallOffset = Math.seededRandom(-maxWallSize, maxWallSize);
		}
	}
	
	function colorTile(color)
	{
		var b_ctx = tileBuffer.getContext('2d');
		b_ctx.clearRect(0,0,tileSize,tileSize);
		b_ctx.fillStyle = color;
		b_ctx.fillRect(0,0,tileSize,tileSize);
		b_ctx.globalCompositeOperation = "destination-atop";
		b_ctx.drawImage(tileImage,0,0);
		b_ctx.globalCompositeOperation = "lighter";
		b_ctx.drawImage(tileImage,0,0);
	}

	function drawTiles()
	{
		ctx.fillStyle = "#000000";
		ctx.fillRect(0,0,CANVAS_WIDTH,CANVAS_HEIGHT);
		for(var i = 0; i < tiles.length; i++)
		{
			// This is a stupid fix to correct the position of the first tile, since it was getting offset somehow.
			if(i == 0) tiles[i].y = tiles[i + 1].y + tileSize;
			
			var row = tiles[i];
			colorTile(row.color);
			for(var j = 0; j < row.tileStates.length; j++)
			{
				var state = row.tileStates[j];
				if(state == 1 || state == 3)
				{
					ctx.drawImage(tileBuffer, j*tileSize, row.y, tileSize, tileSize);
				}
				else if(state == 2)
				{
					//ctx.fillStyle = "#FF0000";
					//ctx.fillRect(j*tileSize, row.y, tileSize, tileSize);
				}
				else if(state == 4)
				{
					//ctx.fillStyle = "#FF0000";
					//ctx.fillRect(j*tileSize, row.y, tileSize, tileSize);
					ctx.drawImage(images.powerup, j*tileSize, row.y, tileSize, tileSize);
				}
				
				if(state == 3)
				{
					var orbOffset = (tileSize - orbSize) * 0.5;
					var x = j*tileSize + orbOffset;
					var y = row.y + orbOffset;
					ctx.drawImage(orbImage, x, y, orbSize, orbSize);
					var ringRad = (orbSize * 1.1) * percentAvg;
					if(percentAvg <= 0) continue;
					ctx.lineWidth = 2;
					ctx.strokeStyle = "#FFFFFF";
					ctx.beginPath();
					ctx.arc(j*tileSize + tileSize * 0.5,row.y + tileSize * 0.5,ringRad,0,Math.PI*2);
					ctx.closePath();
					ctx.stroke();
				}
			}
		}
		//ctx.drawImage(tileBuffer, 0, 0, 100, 100);
	}
	
	function initPlayer()
	{
		player = new DoubleBuffer(playerSize*5, playerSize*5);
		player.position = {x: CANVAS_WIDTH * 0.5 - 30, y: CANVAS_HEIGHT - player.height};
		player.color = "#FFFFFF";
	}
	
	function drawPlayer(data)
	{
		data = shuffle(data);
		player.clearBuffer("front");
		player.frontCtx.globalCompositeOperation = "lighter";
		player.frontCtx.globalAlpha = 0.8;
		player.frontCtx.drawImage(player.backBuffer,0,0);
		
		var center = {x: player.width * 0.5, y: player.height * 0.5};
		var angle = 0;//Math.random() * (Math.PI * 2);
		var increment = (Math.PI * 2)/data.length;
		var radius = player.width * 0.5;
		var startPoint;
		
		player.frontCtx.globalAlpha = 1;
		player.frontCtx.strokeStyle = colliding ? "#FF0000" : player.color;
		player.frontCtx.fillStyle = "#FFFFFF";
		player.frontCtx.lineWidth = 3;
		player.frontCtx.beginPath();
		for(var i = 0; i < data.length; i++)
		{
			var ratio = data[i]/255;
			if(i == 0)
			{
				startPoint = {x: center.x + (radius*Math.cos(angle))*ratio, y: center.y + (radius*Math.sin(angle))*ratio};
				player.frontCtx.moveTo(startPoint.x, startPoint.y);
			}
			else
			{
				player.frontCtx.lineTo(center.x + (radius*Math.cos(angle))*ratio, center.y + (radius*Math.sin(angle))*ratio);
			}
			angle += increment;
		}
		player.frontCtx.lineTo(startPoint.x, startPoint.y);
		player.frontCtx.closePath();
		player.frontCtx.stroke();
		
		ctx.drawImage(player.frontBuffer,player.position.x,player.position.y,60,60);
		player.swapBuffers();
		
		return;
		// Draw the player's attack radius
		ctx.lineWidth = 2;
		ctx.strokeStyle = "#FF0000";
		ctx.beginPath();
		ctx.arc(mouse.x, mouse.y, attackRadius, 0, Math.PI * 2);
		ctx.stroke();
	}
	
	function condenseData(data)
	{
		var condensed_data = [];
		var numToProcess = data.length * .4; // Since the entire frequency spectrum is never filled, let's only examine about 40% of it.
		var processed = 0;
		while(processed < numToProcess)
		{
			var total = 0;
			var count = 0;
			for(var i = 0; i < 10; i++)
			{
				total += data[processed];
				count++;
				processed++;
				if(processed == numToProcess)
					break;
			}
			var avg = total/count;
			condensed_data.push(avg);
		}
		return condensed_data;
	}
	
	function updateOrbs()
	{
		effectBuffer.clearBuffer("front");
		effectBuffer.frontCtx.globalAlpha = .8;
		effectBuffer.frontCtx.drawImage(effectBuffer.backBuffer,0,0);
		effectBuffer.frontCtx.globalAlpha = 1;
		effectBuffer.frontCtx.strokeStyle = "#FFFFFF";
		effectBuffer.frontCtx.lineWidth = 3;
		effectBuffer.frontCtx.beginPath();
		for(var i = 0; i < orbs.length; i++)
		{
			var orb = orbs[i];
			orb.prevPos.x = orb.posData.x;
			orb.prevPos.y = orb.posData.y;
			orb.posData.x += orb.velocity.x * dt;
			orb.posData.y += orb.velocity.y * dt;
			orb.velocity.x += orb.acceleration.x * dt;
			orb.velocity.y += orb.acceleration.y * dt;
			
			// See if this orb is ready to be removed yet
			if(SATPointCheck(orb.posData, scoreBox))
			{
				orbs.splice(i,1);
				i--;
				score += orbValue * scoreMultiplier;
				++notecnt;
				continue;
			}
			
			// If there's still an orb here, let's draw it!
			ctx.drawImage(orbImage, orb.posData.x - orbSize * 0.5, orb.posData.y - orbSize * 0.5);
			effectBuffer.frontCtx.moveTo(orb.posData.x, orb.posData.y);
			effectBuffer.frontCtx.lineTo(orb.prevPos.x, orb.prevPos.y);
		}
		effectBuffer.frontCtx.closePath();
		effectBuffer.frontCtx.stroke();
		ctx.drawImage(effectBuffer.frontBuffer,0,0);
		
		/*
		ctx.strokeStyle = "#FF0000";
		ctx.strokeRect(scoreBox.x,scoreBox.y,scoreBox.w,scoreBox.h);
		*/
		ctx.fillStyle = colliding ? "#FF0000" : "#FFFFFF";
		ctx.font = "40px Consolas";
		if(isNaN(score)) score = 0;
		if(displayedScore != score)
		{
			displayedScore += Math.round(200 * scoreMultiplier * dt);
			if(displayedScore > score) 
				displayedScore = score;
		}
		
		scoreText = "" + Math.abs(displayedScore);
		while(scoreText.length < (displayedScore < 0 ? 6 : 7))
			scoreText = "0" + scoreText;
		if(displayedScore < 0) scoreText = "-" + scoreText;
		ctx.fillText(scoreText, 10, 50);
		ctx.fillText("mult: " + scoreMultiplier, 10, 100);
		
		effectBuffer.swapBuffers();
	}
	
	function checkCollisions()
	{
		colliding = false;
		for(var i = 0; i < tiles.length; i++)
		{
			var row = tiles[i];
			for(var j = 0; j < row.tileStates.length; j++)
			{
				var state = row.tileStates[j];
				var posData = {x: pathOffset + j * tileSize + tileSize * 0.5, y: row.y + tileSize * 0.5};
				
				// Check for an orb collision
				if(state == 3)
				{
					var dx = mouse.x - posData.x;
					var dy = mouse.y - posData.y;
					var dist = Math.sqrt(dx * dx + dy * dy);
					if(dist < (orbSize * 0.5) + 20)
					{
						row.tileStates[j] = 1;
						dx = (scoreBox.x + scoreBox.w * 0.5) - posData.x;
						dy = (scoreBox.y + scoreBox.h * 0.5) - posData.y;
						var mag = Math.sqrt(dx * dx + dy * dy);
						dx /= mag;
						dy /= mag;
						var accel = {x: dx * 6000, y: dy * 6000};
						var spd = Math.random() * 100;
						var rand = Math.floor(Math.random() * 2) + 1;
						// This makes the starting velocity perpendicular to the desired one, causing a curved path of motion toward the destination
						var vel = {x: dy * spd * (rand == 1 ? -1 : 1), y: dx * spd * (rand == 2 ? -1 : 1)};  
						var orb = {posData: posData, velocity: vel, acceleration: accel};
						orb.prevPos = {x: posData.x, y: posData.y};
						orbs.push(orb);
						soundManager.PlaySound(sounds.ring, .15);
					}
				}
				// Check for a powerup collision
				else if(state == 4)
				{
					var dx = mouse.x - posData.x;
					var dy = mouse.y - posData.y;
					var dist = Math.sqrt(dx * dx + dy * dy);
					if(dist < (tileSize * 0.5) + 5) // 5 is the radius of hitbox around player
					{
						row.tileStates[j] = 1;
						++scoreMultiplier;
					}
				}
				// Check for a wall collision
				else if(state == 2)
				{
					var dx = mouse.x - posData.x;
					var dy = mouse.y - posData.y;
					var dist = Math.sqrt(dx * dx + dy * dy);
					if(dist < (tileSize * 0.5) + 5) // 5 is the radius of hitbox around player
						colliding = true;
				}
			}
		}
		// After tile collisions
		
		// If we still have invincibility frames
		if(invincibilityFrames > 0)
		{
			--invincibilityFrames;
			// Change color here
			player.color = interpolate(255, 255, 255, 255, 0, 0, (invincibilityFrames/invincibilityMax), 0, 1);
			return;
		}
		
		var phit = {x: mouse.x, y: mouse.y, width: 5, height: 5};
		for(var i = 0; i < enemies.length; i++)
		{
			if(enemies[i].attacked) continue;
			
			var enemy = enemies[i];
			var ehit = enemy.getHitbox();//{x: enemy.position.x, y: enemy.position.y, width: enemy.width, height: enemy.height};
			if(SATRectCheck(phit, ehit))
			{
				score -= 1000 * scoreMultiplier;
				invincibilityFrames = invincibilityMax;
				break;
			}
		};
	}
	
	function SATPointCheck(point, object)
	{
		if(point.x < object.x || point.x > object.x + object.w) return false;
		if(point.y < object.y || point.y > object.y + object.h) return false;
		return true;
	}
	
	function SATRectCheck(a, b)
	{
		if(a.x + a.width < b.x || a.x > b.x + b.width) return false;
		if(a.y + a.height < b.y || a.y > b.y + b.height) return false;
		return true;
	};
	
	function radialCheck(a, b)
	{
		var dx = a.x - b.x;
		var dy = a.y - b.y;
		var dist = Math.sqrt(dx * dx + dy * dy);
		return (dist < a.radius + b.radius);
	};
	
	function updateNoteBuffer()
	{
		var noteratio = clamp(notecnt/notemax, 0, 1);
		
		var buffer = notebuffer;
		buffer.clearBuffer('front');
		buffer.clearBuffer('back');
		buffer.frontCtx.drawImage(images.note, 0, 0);
		buffer.frontCtx.globalCompositeOperation = "source-in";
		buffer.frontCtx.fillStyle = perfectRainbow(noteratio);
		
		var max = .95;
		var start = (1 - max);
		var filled = start + (max - start) * (1 - noteratio);
		
		buffer.frontCtx.fillRect(0,buffer.height * filled,buffer.width,buffer.height * max);
		buffer.frontCtx.globalCompositeOperation = "source-over";
		buffer.frontCtx.drawImage(images.noteOutline, 0, 0);
	};
	
	function attackEnemies()
	{
		if(notecnt > energyDrainRate) notecnt -= energyDrainRate;
		else return;
		
		var phit = {x: mouse.x, y: mouse.y, radius: attackRadius};
		for(var i = 0; i < enemies.length; i++)
		{
			var enemy = enemies[i];
			var ehit = {x: enemy.position.x + enemy.width * 0.5, y: enemy.position.y + enemy.height * 0.5, radius: enemy.width};
			if(radialCheck(phit, ehit))
			{
				enemy.health -= damageRate;
				if(enemy.health <= 0) enemy.destroy = true;
				else attackedEnemies.push(enemy);
			}
		}
		/*
		ctx.strokeStyle = "#FF0000";
		ctx.lineWidth = 50;
		ctx.beginPath();
		ctx.moveTo(mouse.x, mouse.y);
		ctx.lineTo(dir == "left" ? 0 : CANVAS_WIDTH, mouse.y);
		ctx.stroke();
		
		var hitrect = {x: dir == "left" ? 0 : mouse.x, y: mouse.y - 25, width: CANVAS_WIDTH * 0.5, height: 50};
		for(var i = 0; i < enemies.length; i++)
		{
			if(enemies[i].attacked) continue;
			if(SATRectCheck(hitrect, enemies[i].getHitbox()))
			{
				enemies[i].attacked = true;
				attackedEnemies.push({enemy: enemies[i], duration: shockTime});
			}
		}
		*/
	};
	
	function updateAndDrawEnemies()
	{
		// Start by making new enemies!
		var chance = Math.random()*100;
		if(chance < 2)
		{
			var pos = {x: Math.random() * CANVAS_WIDTH, y: -50};
			//(pos, w, h, dur, shot, bounds)
			var e = new app.Enemy(pos, 50, 50, speed * 1.5, 1, {x: CANVAS_WIDTH, y: CANVAS_HEIGHT});
			enemies.push(e);
		}
		
		// Next, let's update the enemies and destroy any dead enemies
		ctx.fillStyle = "#00FF00";
		ctx.strokeStyle = "#FFFFFF";
		ctx.lineWidth = 3;
		var toBeDestroyed = [];
		enemies.forEach(function(enemy, i)
		{
			if(enemy.destroy)
			{
				toBeDestroyed.push(i);
				makeExplosion(enemy.position.x, enemy.position.y);
			}
			else
			{
				enemy.update(FPS);
				ctx.beginPath();
				ctx.arc(enemy.position.x, enemy.position.y, enemy.width * 0.5, 0, Math.PI * 2);
				ctx.fill();
				ctx.stroke();
				//ctx.fillRect(enemy.position.x, enemy.position.y, enemy.height, enemy.width);
				//ctx.strokeRect(enemy.position.x, enemy.position.y, enemy.height, enemy.width);
			}
		});
		
		// Throw out any enemies that were found to be destroyed
		toBeDestroyed.forEach(function(index)
		{
			enemies.splice(index,1);
		});
	};
	
	function drawLightning(startpos, endpos, segment, bend, color, size)
	{
		var start = new app.Vector2(startpos.x, startpos.y);
		var end = new app.Vector2(endpos.x, endpos.y);
		
		var curPos = start;
		var toEnd = end.subtract(start);
		var dist = toEnd.magnitude();
		
		ctx.strokeStyle = color || "#FFFFFF";
		ctx.lineWidth = size || 1;
		ctx.beginPath();
		ctx.moveTo(start.x, start.y);
		
		while(dist > segment)
		{
			toEnd = toEnd.normalized().multiply(segment);
			toEnd = toEnd.rotate(randRange(-bend, bend));
			
			var nextPos = curPos.add(toEnd);
			ctx.lineTo(nextPos.x, nextPos.y);
			
			curPos = nextPos;
			toEnd = end.subtract(curPos);
			dist = toEnd.magnitude();
		}
		
		ctx.lineTo(end.x, end.y);
		ctx.stroke();
	};
	
	function makeExplosion(x, y)
	{
		//x, y, w, h, speed, spread, lifetime, star, cloud
		var e = new app.Explosion(x, y, 1, 1, speed, 120, 4, rainbowAlt.color, images.star, images.smoke);
		e.generateParticles();
		e.useAdditive = true;
		explosions.push(e);
	};
	
	function updateExplosions()
	{
		var toRemove = [];
		for(var i = 0; i < explosions.length; i++)
		{
			explosions[i].update(FPS, ctx, images.smoke);
			if(explosions[i].isOver())
				toRemove.push(i);
		};
		for(var i = 0; i < toRemove.length; i++)
		{
			explosions.splice(toRemove[i], 1);
		}
	};
	
	function songComplete()
	{
		updateHighScoreList();
		console.log(highScores);
		// Since pausing technically ends the song when it stops it, let's put this here to prevent the game from actually ending
		if(gameState == GAME_STATE.PAUSED) return;
		
		//clearInterval(loopInterval);
		gameState = GAME_STATE.END;
		
		isPlaying = false;
		
		ctx.fillStyle = "#000000";
		var elapsed = 9;
		ctx.globalAlpha = .1;
		var interval = setInterval(function()
		{
			ctx.fillRect(0,0,CANVAS_WIDTH, CANVAS_HEIGHT);
			elapsed += 10;
			if(elapsed >= 500)
			{
				clearInterval(interval);
				ctx.font = "50px Consolas";
				ctx.fillStyle = "#FFFFFF";
				ctx.globalAlpha = 1;
				var text = "Score: " + scoreText;
				var width = ctx.measureText(text).width;
				ctx.fillText(text,(CANVAS_WIDTH - width) * 0.5, (CANVAS_HEIGHT - 100) * 0.3);
				
				ctx.font = "40px Consolas";
				text = "HIGH SCORES";
				width = ctx.measureText(text).width;
				ctx.fillText(text,(CANVAS_WIDTH - width) * 0.5, (CANVAS_HEIGHT - 100) * 0.5);
				for(var i = 0; i < highScores.length; i++)
				{
					text = "" + highScores[i];
					while(text.length < 7)
						text = " " + text;
					text = (i+1) + ": " + text;
					width = ctx.measureText(text).width;
					ctx.fillText(text,(CANVAS_WIDTH - width) * 0.5, (CANVAS_HEIGHT - 100) * 0.5 + 40 * (i + 1));
				}
				//statusDiv.innerHTML = "Song Complete! \nFinal Score: " + scoreText;
			}
		}, 10);
	}
	
	function updateHighScoreList()
	{
		highScores.push(score);
		highScores = mergesort(highScores).reverse();
		highScores.pop();
		sessionStorage.setItem("HighScores", highScores);
	};
	
	//XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX
	//																SCREEN DRAWING FUNCTIONS
	//XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX
	
	function DrawStartScreen()
	{
		ctx.fillStyle = "#000000";
		ctx.fillRect(0,0,CANVAS_WIDTH,CANVAS_HEIGHT);
		
		var fontSize = 30;
		ctx.font = fontSize + "px OffSide";
		ctx.fillStyle = "#FFFFFF";
		var text = "Drag and drop";
		var width = ctx.measureText(text).width;
		ctx.fillText(text, (CANVAS_WIDTH - width) * 0.5, CANVAS_HEIGHT * 0.5 - fontSize * 2 - 15);
		
		fontSize = 25;
		ctx.font = fontSize + "px Oxygen";
		text = "an audio file to start!";
		width = ctx.measureText(text).width;
		ctx.fillText(text, (CANVAS_WIDTH - width) * 0.5, CANVAS_HEIGHT * 0.5 - fontSize);
	}
	
	function DrawLoadScreen()
	{
		ctx.fillStyle = "#000000";
		ctx.fillRect(0,0,CANVAS_WIDTH,CANVAS_HEIGHT);
		
		if(!loadSymbol.interval) loadSymbol.start();
		ctx.drawImage(loadSymbol.buffer.frontBuffer, CANVAS_WIDTH * 0.5 - loadSymbol.size * 0.5, CANVAS_HEIGHT * 0.5 - loadSymbol.size * 0.5);
		
		var fontSize = 50;
		ctx.font = fontSize + "pt OffSide";
		ctx.fillStyle = "#FFFFFF";
		var text = "LOADING";
		var width = ctx.measureText(text).width;
		ctx.fillText(text, (CANVAS_WIDTH - width) * 0.5, CANVAS_HEIGHT * .4 - fontSize * 2 - 15);
		
		fontSize = 20;
		ctx.font = fontSize + "pt Oxygen";
		text = loadProgressDesc;
		width = ctx.measureText(text).width;
		ctx.fillText(text, (CANVAS_WIDTH - width) * 0.5, CANVAS_HEIGHT * .75);
		//loadProgressDesc
	}
	
	
	//XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX
	//																	UTILITY FUNCTIONS
	//XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX
	
	// Since all of my utility funcitons used to be in this function, I'm going to create some local variables to make referencing the new ones in app.utils easier.
	console.log(app.utils);
	var makeBuffer = app.utils.makeBuffer;
	var shuffle = app.utils.shuffle;
	var perfectRainbow = app.utils.perfectRainbow;
	var rainbow = app.utils.rainbow;
	var interpolate = app.utils.interpolate;
	var RGB2Color = app.utils.RBG2Color;
	var RGB2Color2 = app.utils.RBG2Color2;
	var byte2Hex = app.utils.byte2Hex;
	var clamp = app.utils.clamp;
	var randRange = app.utils.randRange;
	var mergesort = app.utils.mergesort;
	
	// Defines a function for generating seeded random numbers. Found via Google.
	Math.seededRandom = function(min, max) {
		max = max || 1;
		min = min || 0;
	 
		Math.seed = (Math.seed * 9301 + 49297) % 233280;
		var rnd = Math.seed / 233280;
		return min + rnd * (max - min);
	}
	
	function loadImages()
	{
		images = [];
		var complete = 0;
		var toload = 0;
		
		function loadImage(i)
		{
			++toload;
			var img = new Image();
			img.src = imagePaths[i];
			img.onload = function()
			{
				console.log("image loaded! " + i);
				images[i] = img;
				if(++complete == toload)
					loadSounds();
			};
		};
		
		for(var i in imagePaths)
		{
			loadImage(i);
		}
	};
	
	function loadSounds()
	{
		sounds = [];
		var complete = 0;
		var toload = 0;
		
		function loadSound(i)
		{
			++toload;
			var sound = new Audio();
			sound.src = soundPaths[i]
			sound.id = i;
			sounds[i] = sound;
			if(++complete == toload)
				init();
			console.log("sound " + i + " loaded!");
		};
		
		for(var i in soundPaths)
		{
			loadSound(i);
		}
	};
	
	return {
		loadImages: loadImages,
		pause: pause,
		setReady: setReady,
		togglePauseFunctions: togglePauseFunctions
	};
};