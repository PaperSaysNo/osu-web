{
	Metadata : 
	{
		Package : "pick",
		Maintainer : "TheCaméléon",
		Description : "Touche c",
		Homepage : "http://pictuga.tk/"
	},
	
	Running : false,
	ActivationKey : "c",
	
	Functions : 
	{
		switchOnOff : function()
		{
			player.pause();
			hc = [];
			player.currentTime = 0;
			pickBeatMap();
		}
	}
}
