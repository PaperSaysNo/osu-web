var DefaultSetting =
{
	Path:	{
		BeatMap:	"/beatmap/",
		Conv:		"/conv/",
		Skin:		"/skin/",
		Sound:		"/sound/"
		},
	ReadMe:	""
}
var Setting = DefaultSetting;

var Data = 
{
	BeatMap:	{},
	Skin:		{},
	Sound:		{}
}

var Games = [];
var Game;

window.onload = function()
{
	setTimeout("main();", 0);
}

var main = function()
{
	loaded = function(){pickBeatMap();};
	loadAll();
}
