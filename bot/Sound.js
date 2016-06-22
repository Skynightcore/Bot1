
var commands = require("./commands.js");



var replyTextToDirectMessages = "I'm agubot! Use !commands on a public chat room to see the command list.";
var replyTextToMentions = "Use !commands to see the command list.";


var stopped = false;
var np = true;

var nowPlayingTitle = "";
var nowPlayingUser = "";

var queue = [];

var request = require('request');
var Discord = require("discord.js");
var bot = new Discord.Client();

var queueLimit = 20;





exports.setDefaultAdminRole = function(roleName) {
	
	if(typeof roleName !== 'string') {
		throw new Error('New role name must be String');
	}
	
	for(var i = 0; i < commands.length; i++) {
		var pos = inArray('admin', commands[i].permissions);
		if(pos !== false) {
			commands[i].permissions[pos] = roleName.toLowerCase();
		}
	}
	
}

//////////////////////////////////////////////////////////////////////////////////////////////////////////////
/////////////////////////////////////////////// EVENT HANDLERS ///////////////////////////////////////////////
////////////////////////////////////////////r//////////////////////////////////////////////////////////////////



//Queue handler
var checkQueue = function() {
	
	if(!stopped && !queueEmpty() && !bot.voiceConnection.playing) {
		playNextTrack();
	}
	
	setTimeout(checkQueue, 5000);
};

///////////////////////////////////////////////////////////////////////////////////////////////////////////////////
/////////////////////////////////////////////// AUXILIARY FUNCTIONS ///////////////////////////////////////////////
///////////////////////////////////////////////////////////////////////////////////////////////////////////////////


function inArray(needle, haystack) {
	for(var i = 0; i < haystack.length; i++) {
		if(haystack[i] === needle) {
			return i;
		}
	}
	
	return false;
}

function searchCommand(command) {
	
	for(var i = 0; i < commands.length; i++) {
		if(commands[i].command == command.toLowerCase()) {
			return commands[i];
		}
	}
	
	return false;
}

function clearQueue(message) {
	queue = [];
	bot.reply(message, "Queue has been cleared!");
}

function getSongQueue(message) {
	
	var response = "";
	
	if(queueEmpty()) {
		response = "the queue is empty.";
	} else {
		for(var i = 0; i < queue.length; i++) {
			response += "\"" + queue[i]['title'] + "\" (requested by " + queue[i]['user'] + ")\n";
		}
	}
	
	bot.reply(message, response);
}

function playNextTrack() {
	
	if(queueEmpty()) {
		bot.sendMessage(bot.servers.get('name', serverName).channels.get('name', textChannelName), "Queue is empty!");
		bot.voiceConnection.stopPlaying();
		return;
	}
		
	bot.voiceConnection.playFile(queue[0]['url']);
	
	nowPlayingTitle = queue[0]['title'];
	nowPlayingUser = queue[0]['user'];
	
	console.log(getTime() +  "NP: \"" + nowPlayingTitle + "\" (by " + nowPlayingUser + ")");
	
	if(np) {
		bot.sendMessage(bot.servers.get('name', serverName).channels.get('name', textChannelName), "Now Playing: \"" + nowPlayingTitle + "\" (requested by " + queue[0]['mention'] + ")");
	}
	
	queue.splice(0,1);
}

function getNowPlaying() {
	if(bot.voiceConnection.playing) {
		return "\"" + nowPlayingTitle + "\" (requested by " + nowPlayingUser + ")";
	} else {
		return "Nothing!";
	}
}

function addVideoToQueue(videoID, message) {
	
	var baseURL = "https://savedeo.com/download?url=https%3A%2F%2Fwww.youtube.com%2Fwatch%3Fv%3D";
	
	request(baseURL + videoID, function (error, response, body) {
		
		if (!error && response.statusCode == 200) {
			var cheerio = require('cheerio'), $ = cheerio.load(body);
			var videoTitle = $('title').text();
			
			if(videoTitle.indexOf('SaveDeo') != -1) {
				bot.reply(message, "Sorry, I couldn't get audio track for that video.");
				return;
			}
			
			var audioURL = $('#main div.clip table tbody tr th span.fa-music').first().parent().parent().find('td a').attr('href');
			
			queue.push({
				title: videoTitle, 
				user: message.author.username, 
				mention: message.author.mention(), 
				url: audioURL
			});
			
			bot.reply(message, "\"" + videoTitle + "\" has been added to the queue.");
			
		} else {
			bot.reply(message, "There has been a problem handling your request.");
			console.log(error);
		}
	});
}

function getVideoId(string) {
	var searchToken = "?v=";
	var i = string.indexOf(searchToken);
	
	if(i == -1) {
		searchToken = "&v=";
		i = string.indexOf(searchToken);
	}
	
	if(i == -1) {
		searchToken = "youtu.be/";
		i = string.indexOf(searchToken);
	}
	
	if(i != -1) {
		var substr = string.substring(i + searchToken.length);
		var j = substr.indexOf("&");
		
		if(j == -1) {
			j = substr.indexOf("?");
		}
		
		if(j == -1) {
			return substr;
		} else {
			return substr.substring(0,j);
		}
	}
	
	return string;
}

function queueEmpty() {
	return queue.length === 0;
}

function getTime() {
	function f(x) {
		return x<10?"0"+x:x;
	}
	var date = new Date();
	return "[" + f(date.getHours()) + ":" + f(date.getMinutes()) + ":" + f(date.getSeconds()) + "] ";
}