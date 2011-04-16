var canvas, ctx;
var color;

var circleSize, beatLength, sliderSpeed, time = 0;
var timer = false;

var taiko = true;

//You browser sucks. If you want to see that it doesn't work by you own, click here.

function initBeatMap()
{
	if(osu_file.General.EpilepsyWarning == 1 && !window.confirm("This beatmap contains scenes with rapidly flashing colours.\nPlease take caution if you are affected by epilepsy.\n\tCancel → Pick another beatmap"))
	{
		pickBeatMap();
		return false;
	}
	
	//<canvas>
		if(!document.getElementById("canvas"))
		{
			canvas = document.createElement("canvas");
			canvas.id = "canvas";
			body.appendChild(canvas);
		}
		canvas = document.getElementById("canvas");
		
		if(!canvas.getContext) return false;
		ctx = canvas.getContext("2d");
	
	//couleurs
		//orange green blue red
		color =
		[
			[255,	165,	0],
			[0,	255,	0],
			[0,	0,	255],
			[255,	0,	0]
		];
		
		var i = 0;
		for(key in osu_file.Colours)
		{
			color[i] = osu_file.Colours[key];
			i++;
		}
	
	//creates an array with all the hitObjects
		var comboKey = 1;	//numéro DANS le combo
		var combo = 0;		//numéro DU combo (sur tous)
	
		for(key in osu_file.HitObjects)
		{
			var hc_info = osu_file.HitObjects[key];
		
			var new_hc = new hitCircle();
			new_hc.x = hc_info[0];
			new_hc.y = hc_info[1];
		
			new_hc.time = hc_info[2];
			new_hc.type = hc_info[3];
			new_hc.sound = hc_info[4];
		
			if(hc_info[3] == 2 || hc_info[3] == 6)
			{
				//slider
				new_hc.curveData = hc_info[5];
				new_hc.repeatCount = hc_info[6];
				new_hc.sliderLengthPixels = hc_info[7];
			}
			else if(hc_info[3] == 8 || hc_info[3] == 12)
			{
				//spinner
				new_hc.endTime = hc_info[5];
			}
		
			if(hc_info[3] == 4 || hc_info[3] == 5 || hc_info[3] == 6)
			{
				//new combo
			
				if(key != 0) combo++;//solves issue if 1st hitObject
			
				new_hc.comboKey = 1;
				new_hc.combo = combo;
			
				comboKey = 2;
			}
			else
			{
				new_hc.comboKey = comboKey;
				new_hc.combo = combo;
				comboKey++;
			}
		
			//send to array
			hc.push(new_hc);
		}
	
	//values (circleSize...)
		circleSize = 64 * (1 - 0.7*((osu_file.Difficulty.CircleSize-5)/5)) / 2;
		//beatLength & sliderSpeed → updateValues()
	
	//events
		canvas.onmousedown = checkHit;
		canvas.onmouseup = function() { window.onmousemove = null; }
		canvas.oncontextmenu = function(){ return false; }
		window.onkeydown = checkKey;
	
		window.onresize = function(){resizeBeatMap()};
		body.ontouchmove = function (e) { e.preventDefault(); }
	
		//auto pause
		window.onblur = function(){ pause(); }
	
	//addons
		runAddons("initBeatMap");
	
	//start the game
		initStoryBoard();
		resizeBeatMap();
		
		player.play();
		
		if(!timer) autoUpdateBeatMap();
}

function autoUpdateBeatMap()
{
	timer = true;
	updateBeatMap();
	
	if(!player.ended)
	{
		setTimeout(
			function()
			{
				try//solves some issues // ugly workaround I know
				{
					setTimeout("autoUpdateBeatMap();", 0);
				}
				catch(e)
				{
					log('updateBeatMap failure', e);
				}
			}
		, 0);
	}
	else
	{
		timer = false;
		alert('End - Press "C" to pick another beatmap !');
		runAddons("end");
	}
}

var tps = 0;
var tpst = 0;

function updateBeatMap()
{
	ctx.clear();
	
	if(!player.ended)
	{
		//addons
		runAddons("updateBeatMap");
		
		updateValues();
		
		if(ratio && !taiko)
		{
			ctx.save();
			
			diff_height = 0;
			diff_width = 0;
			
			if(4*H < 3*W)
			{
				diff_width = W/2 - (4/3 * H)/2;
			}
			else if(4*H > 3*W)
			{
				diff_height = H/2 - (3/4 * W)/2;
			}
			
			ctx.translate(diff_width, diff_height);
		}
		
		for(key in hc)
		{
			hc[key].draw();//← decides what to do
		}
		
		if(taiko)
		{
			ctx.globalCompositeOperation = "destination-over";
			
			ctx.beginPath();
				ctx.fillStyle = "white";
				ctx.circle((1/4*W), H/2, circleSize*1.25*hs);
			ctx.fill();
		}
		
		drawStoryBoard();
		
		if(ratio && !taiko) ctx.restore();
		
		drawProgress();
		drawScore();
		//drawTest();
		
		drawInfo('FPS ⋅ ' + Math.floor(1000 / Math.abs(new Date().getMilliseconds() - tps)) + ' (' + Math.floor(Math.abs((time-tpst)-(new Date().getMilliseconds() - tps))) + ')');
		tps = new Date().getMilliseconds();
		tpst = time;
	}
	else
	{
		drawStat();
	}
}

function checkHit(e)
{
	var click_time = time;
	
	if (e == null) e = window.event;
		
	var mouseX = e.clientX;
	var mouseY = e.clientY;
	
	if(ratio)
	{
		if(4*H < 3*W)
		{
			mouseX -= (W - (4/3 * H))/2;
		}
		else if(4*H > 3*W)
		{
			mouseY -= (H - (3/4 * W))/2;
		}
	}
	
	mouseX = mouseX / ws;
	mouseY = mouseY / hs;
	
	for(key in hc)
	{
		if(isIn(click_time, hc[key].time-1500, hc[key].time+100) && !hc[key].clic && (hc[key].type == 1 || hc[key].type == 4 || hc[key].type == 5))//hitcircle
		{
			if(hc[key].checkHit(mouseX, mouseY)) break;
		}
		
		if(hc[key].type == 2 || hc[key].type == 6)//slider
		{
			var t = hc[key].repeatCount * ( hc[key].sliderLengthPixels / sliderSpeed );//time with repeat
			
			if(isIn(time, hc[key].time-1500, hc[key].time+t))
			{
				if(hc[key].checkSlide(mouseX, mouseY))
				{
					window.onmousemove = checkSlide;
					break;
				}
			}
		}
		
		if(isIn(time, hc[key].time, hc[key].endTime) && (hc[key].type == 8 || hc[key].type == 12))//spinner
		{
			window.onmousemove = checkSpin;
			hc[key].checkSpin(mouseX, mouseY);
			break;
		}
	}
	
	//désactiver le clic
	return false;
}

function checkSlide(e)
{
	var slide_time = time;
	
	if (e == null) e = window.event;
		
	var mouseX = e.clientX;
	var mouseY = e.clientY;
	
	if(ratio)
	{
		if(4*H < 3*W)
		{
			mouseX -= (W - (4/3 * H))/2;
		}
		else if(4*H > 3*W)
		{
			mouseY -= (H - (3/4 * W))/2;
		}
	}
	
	mouseX = mouseX / ws;
	mouseY = mouseY / hs;
	
	for(key in hc)
	{
		if(hc[key].type == 2 || hc[key].type == 6)
		{
			if(hc[key].checkSlide(mouseX, mouseY))
			{
				hc[key].slidePoints.push([mouseX, mouseY]);
				break;
			}
		}
	}
	
	//disables click
	return false;
}

function checkSpin(e)
{
	var spin_time = time;
	
	if (e == null) e = window.event;
		
	var mouseX = e.clientX;
	var mouseY = e.clientY;
	
	if(ratio)
	{
		if(4*H < 3*W)
		{
			mouseX -= (W - (4/3 * H))/2;
		}
		else if(4*H > 3*W)
		{
			mouseY -= (H - (3/4 * W))/2;
		}
	}
	
	mouseX = mouseX / ws;
	mouseY = mouseY / hs;
	
	for(key in hc)
	{
		if(isIn(time, hc[key].time, hc[key].endTime) && (hc[key].type == 8 || hc[key].type == 12))
		{
			hc[key].checkSpin(mouseX, mouseY);
			break;
		}
	}
	
	//disables click
	return false;
}

function sumPoints(type)
{
	var sum = 0;
	for(key in hc)
	{
		if(!type) sum += hc[key].score;
		else if (hc[key].score == type) sum ++;
	}
	
	return sum;
}

function drawProgress()
{
	//draws a "camembert" with progress
	if(!isNaN(player.duration) && player.duration != 0)
	{
		var size = 4;
		var dl = (typeof player.buffered == 'object') ? (player.buffered.end(0) / player.duration) : 1;
		var taux = (time / player.duration);
	
		//param
		ctx.globalCompositeOperation = "source-over";
	
		//reset
		ctx.lineWidth = 1;
		ctx.lineCap = "butt";
	
		//background (dl)
		ctx.beginPath();
			ctx.fillStyle = "rgb(225,225,225)";
			ctx.arc((W-h*(size+2)), (h*(size+2)), (h*size), (-Math.PI/2), (Math.PI*2*dl)-(Math.PI/2), 0);
			ctx.lineTo((W-h*(size+2)), (h*(size+2)));
			ctx.closePath();
		ctx.fill();
		
		//camembert (taux)
		ctx.beginPath();
			ctx.fillStyle = "rgb(200,200,200)";
			ctx.arc((W-h*(size+2)), (h*(size+2)), (h*size), (-Math.PI/2), (Math.PI*2*taux)-(Math.PI/2), 0);
			ctx.lineTo((W-h*(size+2)), (h*(size+2)));
			ctx.closePath();
		ctx.fill();
	}
}

function drawTest()
{
	var taux = (time % 1000)/10;
	ctx.fillStyle = "blue";
	ctx.fillRect(0, 0, 2.5*wp, taux*hp);
	
	var taux = (new Date().getMilliseconds() % 1000)/10;
	ctx.fillStyle = "blue";
	ctx.fillRect(2.5*wp, 0, 2.5*wp, taux*hp);
}

function drawScore()
{
	var points = sumPoints();
	var size = 4;
	
	ctx.globalCompositeOperation = "source-over";
			
	ctx.textAlign = "left";
	ctx.textBaseline = "top";

	ctx.font = h*size + "px Arial";
	ctx.fillStyle = "Black";

	if(points < 2) ctx.fillText(points + " Point", (2*h), (2*h));
	else ctx.fillText(points + " Points", (2*h), (2*h));
}

function drawStat()
{
	//outline
		ctx.beginPath();
			ctx.strokeStyle = "Black";
			ctx.rect((wp*25), (hp*10), (wp*50), (hp*80));
			ctx.moveTo((wp*25+(0.1*wp*75)), (hp*10));
			ctx.rect((wp*25+(0.1*wp*50)), (hp*10), (wp*40), (hp*16));
		ctx.stroke();
	
	//txt
		var size = 4;
		ctx.textAlign = "center";
		ctx.textBaseline = "middle";
	
		ctx.font = hp*size + "px Arial";
		ctx.fillStyle = "Black";

		//score
		ctx.font = (hp*16*0.75) + "px Arial";
		ctx.fillText(sumPoints(), (W/2), (18*hp));
		
		//50
		ctx.font = (hp*16*0.75) + "px Arial";
		ctx.fillText(sumPoints(50) + " × 50", (37.5*wp), (48*hp));//100(50÷100)(100÷400)+25
		
		//100
		ctx.font = (hp*16*0.75) + "px Arial";
		ctx.fillText(sumPoints(100) + " × 100", (62.5*wp), (48*hp));
		
		//300
		ctx.font = (hp*16*0.75) + "px Arial";
		ctx.fillText(sumPoints(300) + " × 300", (W/2), (69*hp));//100(80÷100)(2×80÷300)+26
}

function drawInfo(txt)
{
	var points = sumPoints();
	var size = 2;

	ctx.globalCompositeOperation = "source-over";
		
	ctx.textAlign = "left";
	ctx.textBaseline = "bottom";

	ctx.font = h*size + "px Arial";
	ctx.fillStyle = "Black";

	ctx.fillText(txt, (2*h), (H-2*h));
}

var H, W;	//total size (including outside the gamefield)
var hp, wp;	//total percentage (including outside the gamefield)(no ratio)

var Hr, Wr;	//gamefield size (+ ratio)
var h, w;	//percentage (+ ratio)

var hs, ws;	//beatmaps coordinates (ratio of course)(MOST USED SO FAR)
var ratio = false;//→ ratio has to be changed

function resizeBeatMap(e)
{
	W = window.innerWidth;
	H = window.innerHeight;
	
	wp = (W/100);
	hp = (H/100);
	
	ws = (W/512); //512
	hs = (H/384); //384
	// 512÷384 = 800÷600 = 4÷3
	
	Hr = H;
	Wr = W;
	
	h = hp;
	w = wp;
	
	if(4*H < 3*W)
	{
		ws = (4/3 * H) / 512;
		Wr = (4/3 * H);
		
		w = (4/3 * hp);
		ratio = true;
	}
	else if(4*H > 3*W)
	{
		hs = (3/4 * W) / 384;
		Hr = (3/4 * W);
		
		h = (3/4 * wp);
		ratio = true;
	}
	else
	{
		ratio = false;
	}
	
	canvas.setAttribute("width", W);
	canvas.setAttribute("height", H);
	
	//addons
	updateBeatMap();
	runAddons("resizeBeatMap");
}

function updateValues()
{
	time = player.currentTime * 1000;
	
	//beatLength inherited only once (cannot inherit from inherited values)
	//beatLength in ms
	
	var i, li = 0;//latest_i = li
	
	for(i in osu_file.TimingPoints)
	{
		if(time > osu_file.TimingPoints[i][0])//too late
		{
			i = (i == 0) ? 0 : i-1;
			break;
		}
		else if(osu_file.TimingPoints[i][1] > 0)//if not inherited
		{
			li = i;
		}
	}
	
	if(osu_file.TimingPoints[i][1] < 0)
	{
		//inherited
		speed = osu_file.Difficulty.SliderMultiplier * ( 100 / osu_file.TimingPoints[li][1] );
		
		beatLength = osu_file.TimingPoints[i][1] / -100 * osu_file.TimingPoints[li][1];
		sliderSpeed = -100 * speed / osu_file.TimingPoints[i][1];
	}
	else
	{
		beatLength = osu_file.TimingPoints[i][1];
		sliderSpeed = osu_file.Difficulty.SliderMultiplier * ( 100 / beatLength );
	}
}

var type_array = {
	1 : "normal",
	2 : "slider",
	4 : "new_combo",
	5 : "normal_new_combo",
	6 : "slider_new_combo",
	8 : "spinner"};
//useless - but useful for memory !

var hc = [];//filled with initBeatMap()

function hitCircle() //class // actually not only hitcircles ;)
{
	this.x = 0;
	this.y = 0;
	
	this.comboKey = 0;
	this.combo = 0;
	
	this.type = 0;
	this.sound = 0;
	
	this.time = 0;
	
	this.clic = false;
	this.clicTime = 0;
	this.score = 0;
	
	//sliders
	this.curveData = 0;
	this.repeatCount = 1;
	this.sliderLengthPixels = 0;
	
	this.slidePoints = [];
	
	//spinners
	this.endTime = 0;
	this.spinPoints = [];
}
	
	hitCircle.prototype.draw = function()
	{
		if(taiko) return this.taikoDraw();
		
		if(this.type == 1 || this.type == 4 || this.type == 5)//hitCircle
		{
			if(isIn(time, this.time-1500, this.time) && !this.clic)
			{
				this.drawApproach();
				this.drawObject();
			}
			
			if((isIn(time, this.time+100, this.time+500) && !this.clic)
			|| (isIn(time, this.time-1500, this.time+100) && this.clic))
			{
				this.drawScore();
			}
		}
		
		else if(this.type == 2 || this.type == 6)//slider
		{
			//have fun
			var points = this.curveData;
			points[0] = [this.x, this.y];
			
			var t = this.repeatCount * ( this.sliderLengthPixels / sliderSpeed );//time with repeat
			
			if(isIn(time, this.time-1500, this.time))//approach
			{
				this.drawApproach();
				this.drawObject();
			}
			if(isIn(time, this.time, this.time+t))//sliding
			{
				this.drawObject();
				this.drawBall();
			}
		}
		
		else if(this.type == 8 || this.type == 12)//spinner
		{
			if(isIn(time, this.time, this.endTime))
			{
				this.drawObject();
			}
		}
		
		else	log('unkown hitObject type', this.type);
	}
	
	
	hitCircle.prototype.drawObject = function()
	{
		var alpha = (1-(this.time-time)/1500);
		var rgba = this.color(alpha);
		var rgb = this.color();
		
		if(this.type == 1 || this.type == 4 || this.type == 5)
		{
			//circle
			
			var size = circleSize;
			
			ctx.globalCompositeOperation = "destination-over";
		
			ctx.textAlign = "center";
			ctx.textBaseline = "middle";
		
			ctx.font = hs*size + "px Arial";
			ctx.fillStyle = "rgba(255,255,255," + alpha + ")";
		
			ctx.fillText(this.comboKey, this.x*ws, this.y*hs);
			
			//reset
			ctx.lineWidth = 1;
			ctx.lineCap = "butt";
		
			//inner
			ctx.beginPath();
				ctx.fillStyle = rgba;
				ctx.circle(this.x*ws, this.y*hs, hs*size*0.95);
			ctx.fill();
		
			//outter
			ctx.beginPath();
				ctx.fillStyle = "rgba(200,200,200," + alpha + ")";
				ctx.circle(this.x*ws, this.y*hs, hs*size);
			ctx.fill();
		}
		
		if (this.type == 2 || this.type == 6)
		{
			//slider
			
			ctx.globalCompositeOperation = "destination-over";
			
			//reverse arrow
				if(this.repeatCount > 1)
				{
					if(time > this.time)
					{
						var t = this.sliderLengthPixels / sliderSpeed;
						var repeat = (Math.ceil((time-this.time) / t));
						
						log(repeat, [repeat % 2, (repeat % 2 == 1)], this.repeatCount);
						
						if(this.repeatCount > repeat)
						{
							var xy = (repeat % 2 == 1) ? this.curveData[this.curveData.length-1] : [this.x, this.y];
							var image = pic["reversearrow"];
							ctx.drawImageAngle(image, xy[0]*ws, xy[1]*hs);
						
							//ajouter angle ? → changer un peu this.slidePoints ?
						}
					}
					else
					{
						var xy = this.curveData[this.curveData.length-1];
						var image = pic["reversearrow"];
						ctx.drawImageAngle(image, xy[0]*ws, xy[1]*hs);
					}
				}
			
			//circle combo
				var size = circleSize;
			
				ctx.textAlign = "center";
				ctx.textBaseline = "middle";
		
				ctx.font = hs*size + "px Arial";
				ctx.fillStyle = "rgba(255,255,255," + alpha + ")";
		
				ctx.fillText(this.comboKey, this.x*ws, this.y*hs);
			
				//reset
				ctx.lineWidth = 1;
				ctx.lineCap = "butt";
		
				//inner
				ctx.beginPath();
					ctx.fillStyle = rgba;
					ctx.circle(this.x*ws, this.y*hs, hs*size*0.95);
				ctx.fill();
		
				//outter
				ctx.beginPath();
					ctx.fillStyle = "rgba(200,200,200," + alpha + ")";
					ctx.circle(this.x*ws, this.y*hs, hs*size);
				ctx.fill();
			
			//inner
				ctx.lineWidth = hs*(size*0.95)*2;
				ctx.lineCap = "round"; 
				ctx.lineJoin = "round";
		
				ctx.beginPath(); 
				ctx.strokeStyle = rgba;
		
				for(var i = 0; i <= (this.curveData.length-1); i++)
				{
					if(i == 0)	ctx.moveTo(this.x*ws,this.y*hs);
					else 		ctx.lineTo(this.curveData[i][0]*ws,this.curveData[i][1]*hs);
				}
		
				ctx.stroke();
			
			//outter
				ctx.lineWidth = hs*size*2;
				ctx.lineCap = "round"; 
				ctx.lineJoin = "round";
		
				ctx.beginPath(); 
				ctx.strokeStyle = "rgba(200,200,200," + alpha + ")";
		
				for(var i = 0; i <= (this.curveData.length-1); i++)
				{
					if(i == 0)	ctx.moveTo(this.x*ws,this.y*hs);
					else 		ctx.lineTo(this.curveData[i][0]*ws, this.curveData[i][1]*hs);
				}
		
				ctx.stroke();
		}
		
		if (this.type == 8 || this.type == 12)
		{
			//spinner
			
			var isCircle = checkCircle(this.spinPoints);
			
			if(false)
			{
				//see the drawing ;p
				ctx.beginPath();
				ctx.strokeStyle = "Blue";
				for(i in this.spinPoints)
				{
					if(i == 0)	ctx.moveTo(this.spinPoints[i][0]*hs, this.spinPoints[i][1]*ws);
					else 		ctx.lineTo(this.spinPoints[i][0]*hs, this.spinPoints[i][1]*ws);
				}
				ctx.stroke();
			}
			
			if(isIn(time, this.time, this.endTime))
			{
				//frame
				var image = pic["spinner-background"];
				ctx.drawImageAngle(image, (Wr/2), (Hr/2));
			}
			
			if(this.spinPoints.length >= 2)
			{
				var image = pic["spinner-circle"];
				
				var angle1 =  angleWithCenter(this.spinPoints[0][0], this.spinPoints[0][1]);
				var angle2 =  angleWithCenter(this.spinPoints[this.spinPoints.length-1][0], this.spinPoints[this.spinPoints.length-1][1]);
				
				angleDiff = mainMesure(angle2 - angle1);
				
				ctx.globalCompositeOperation = "source-over";
				ctx.drawImageAngle(image, (Wr/2), (Hr/2), (isCircle) ? angleDiff : -angleDiff);
			}
			
			if(isIn(time, this.time, this.endTime))
			{
				//progress
				var progress = (1-(this.endTime-time)/(this.endTime-this.time));//1 -> 0
				var image = pic["spinner-metre"];
				
				ctx.globalCompositeOperation = "source-over";
				ctx.drawImage(image,
					0, (image.height-progress*image.height),
					image.width, progress*image.height,
					((Wr-image.width)/2), (((Hr+image.height)/2)-progress*image.height),
					image.width, progress*image.height);
			}
		}
	}
	
	hitCircle.prototype.drawApproach = function()
	{
		var alpha = (1-(this.time-time)/1500);
		var rgba = this.color(alpha);
	
		if(!this.clic)
		{
			var taux = ((this.time-time)/1500);
		
			//reset
			ctx.lineWidth = 5;
			ctx.lineCap = "butt";
		
			ctx.globalCompositeOperation = "destination-over";
			
			ctx.beginPath();
				ctx.strokeStyle = rgba;
				ctx.circle(this.x*ws, this.y*hs, (1+3*taux)*circleSize*hs);
			ctx.stroke();
		}
	}
	
	hitCircle.prototype.drawBall = function()
	{
		var slided = false;
		for(i in this.slidePoints)
		{
			if(this.checkSlide(this.slidePoints[i][0], this.slidePoints[i][1]))
			{
				slided = true;
				break;
			}
		}
		
		var points = this.curveData;
		points[0] = [this.x, this.y];
		
		//speed
		var t1 = this.sliderLengthPixels / sliderSpeed;	//time if slider at good speed
		var v2 = distanceFromPoints(points) / t1;	//speed with sliders with wrong length
		var progress = ( time - this.time ) - ( t1 * Math.floor( ( time-this.time ) / t1) );//elsapsed time
		var dist = v2 * progress;			//distance during elapsed time
		
		if((Math.floor((time-this.time) / t1)) % 2 != 0)//if going back
			dist = distanceFromPoints(points) - dist;
		
		var at = pointAtDistance(points, dist);
		
		if(!isNaN(at[0]) && !isNaN(at[1]))
		{
			//circle
				if(slided)
				{
					ctx.globalCompositeOperation = "source-over";
			
					ctx.beginPath();
					ctx.strokeStyle = "yellow";
					ctx.lineWidth = 5;
						ctx.circle(at[0]*ws, at[1]*hs, circleSize*hs*2);
					ctx.stroke();
				}
			
			//ball
				var i = (Math.floor(dist/10) % 10);
				if(points[at[3]][0] > points[at[3]+1][0]) i = 9 - i;//fix issues where ball goes backward
				
				var image = pic["sliderb" + i];
				ctx.globalCompositeOperation = "source-over";
				ctx.drawImageAngle(image, at[0]*hs, at[1]*ws, at[2]);
		}
	}
	
	hitCircle.prototype.drawScore = function()
	{
		var image = pic["hit" + this.score];
		ctx.globalCompositeOperation = "destination-over";
		ctx.drawImageAngle(image, this.x*ws, this.y*hs);
	}
	
	hitCircle.prototype.calcPoints = function()
	{
		if(this.clic)
		{
			var offset = (this.time - this.clicTime);
			
			if (offset < 400)
			{
				if (isIn(offset, 200, 300))		this.score = 50;
				else if (isIn(offset, 75, 200))		this.score = 100;
				else if (isIn(offset, -50, 75))		this.score = 300;
				else if (isIn(offset, -100, -50))	this.score = 100;
			}
		}
	}
	
	hitCircle.prototype.checkHit = function(mouseX, mouseY)
	{
		var radius = circleSize * 1.25;
		
		ctx.beginPath();
		ctx.circle(this.x, this.y, radius);
		this.clic = ctx.isPointInPath(mouseX, mouseY);
		
		this.clicTime = time;
		this.calcPoints();
		
		if(this.clic) this.playSound();
		
		return this.clic;
	}
	
	hitCircle.prototype.checkSlide = function(mouseX, mouseY)
	{
		if(time <= this.time)
		{
			var radius = circleSize * 2;
		
			ctx.beginPath();
			ctx.circle(this.x, this.y, radius);
			return ctx.isPointInPath(mouseX, mouseY);
		}
		else
		{
			var radius = circleSize * 1.25;
		
			var points = this.curveData;
			points[0] = [this.x, this.y];
		
			//speed
			var t = this.sliderLengthPixels / sliderSpeed;
		
			if(isIn(time, this.time-1500, (this.time + t * this.repeatCount)))
			{
				var v = distanceFromPoints(points) / t;//speed with wrong length
		
				var progress = ( time - this.time ) - ( t * Math.floor( ( time-this.time ) / t) );//[progress] = T
				var dist = v * progress;//distance on the slider
		
				if((Math.floor((time-this.time) / t)) % 2 != 0)
					dist = distanceFromPoints(points) - dist;
		
				var at = pointAtDistance(points, dist);
			
				if(!isNaN(at[0]) && !isNaN(at[1]))
				{
					ctx.beginPath();
					ctx.circle(at[0], at[1], radius);
					return ctx.isPointInPath(mouseX, mouseY);
				}
				else return false;
			}
		}
	}
	
	hitCircle.prototype.checkSpin = function(mouseX, mouseY)
	{
		if(this.spinPoints.length >= 1)
		{
			if(this.spinPoints[this.spinPoints.length-1] != [mouseX, mouseY])
			{
				this.spinPoints.push([mouseX, mouseY]);
			}
		}
		else this.spinPoints.push([mouseX, mouseY]);
	}
	
	hitCircle.prototype.color = function()
	{
		var key = this.combo % color.length;
		if(arguments[0])
		{
			return "rgba(" + color[key][0] + ", " + color[key][1] + ", " + color[key][2] + ", " + arguments[0] + ")";
		}
		else
		{
			return "rgb(" + color[key][0] + ", " + color[key][1] + ", " + color[key][2] + ")";
		}
	}
	
	hitCircle.prototype.playSound = function()
	{
		log('paf');
		
		return false;
		
		var sound_array = ["hitnormal", "hitwhistle"];
		if(this.sound > sound_array.length-1) this.sound = 1;
		
		sounds[sound_array[this.sound]].currentTime = 0;
		sounds[sound_array[this.sound]].play();
	}
	
	/******************************************************************************************/
	
	hitCircle.prototype.taikoDraw = function()
	{
		if(this.type == 1 || this.type == 4 || this.type == 5)//hitCircle
		{
			if(isIn(time, this.time-1500, this.time+500) && !this.clic)
			{
				var taux = ((this.time-time)/1500);
				
				ctx.globalCompositeOperation = "destination-over";
				
				ctx.beginPath();
					ctx.fillStyle = this.color();
					ctx.circle((1/4*W + 3/4*W*taux), Hr/2, circleSize*hs);
				ctx.fill();
			}
		}
	}

function checkKey(e)
{
	if (e == null) e = window.event;
	
	var keyCode  = (window.event) ? event.keyCode : e.keyCode;
	var key = String.fromCharCode(keyCode).toLowerCase();
	
	log('key hit', key, keyCode);
	
	switch(key)
	{
		case "q":
			removejWindow();
			break;
		case "i":
			var txt = "";
			for(key in pic)
			{
				txt += "<img src='/images/" + key + ".png' title='" + key + "' />";
			}
			alert(txt);
			break;
	}
	
	switch(keyCode)
	{
		case 27:
			pause();
			break;
	}
	
	for(i in addons)
	{
		if(addons[i].ActivationKey == key)
		{
			if(addons[i].Running == true)
			{
				addons[i].Running = false;
				if(isFunction(addons[i].Functions["switchOff"])) addons[i].Functions["switchOff"]();
			}
			else
			{
				addons[i].Running = true;
				if(isFunction(addons[i].Functions["switchOn"])) addons[i].Functions["switchOn"]();
			}
			if(isFunction(addons[i].Functions["switchOnOff"])) addons[i].Functions["switchOnOff"]();
		}
	}
}
