const Discord = require('discord.js');
const { prefix, token } = require('./config.json');
const client = new Discord.Client();
client.commands = new Discord.Collection();

const fs = require('fs');
var path = require('path');
const googleTTS = require('google-tts-api');
const request = require('request');
const util = require('util');
const ytdl = require('ytdl-core');
const sYt = require('scrape-youtube').default;
const getLyrics = require("@allvaa/get-lyrics");
const fD = require('./functions/fileDownloader')

//Object for holding the VoiceConnection object
let connection = {};
//Create an dispatcher for controlling audio and set state of writing
let dispatcher = { _writableState: { _writing: false } };
//Search function related 
let ytResults = [];
//Queue
let musicQueue = [];
//Current song
let currentSong = '';

//Audio settings
const streamOptions = { seek: 0, passes: 3, volume: 0.5, bitrate: 192000 }

let botProperties = { name: '', onVoiceChannel: false, connectedChannel: {} }




//Read commands
client.commands = new Discord.Collection();

const commandFiles = fs.readdirSync('./commands').filter(file => file.endsWith('.js'));

for (const file of commandFiles) {
	const command = require(`./commands/${file}`);
	// set a new item in the Collection
	// with the key as the command name and the value as the exported module
	client.commands.set(command.name, command);
}


//Bot part
client.on('ready', () => {
  console.log(`Logged in as ${client.user.tag}!`);
  botProperties.name = client.user.tag;
});

client.once('reconnecting', () => {
  console.log('Reconnecting!');
});

client.once('disconnect', () => {
  console.log('Disconnect!');
});



client.on('message', async message => {

  //Check wheter message is from own bot
  if (message.author.bot) return;
  //Check for prefix
  if (!message.content.startsWith(prefix)) return;

  //Get various, needs some serious cleaning
  const args = message.content.slice('!').split(/ +/g);
  const command = args.shift().toLowerCase();
  const msg = message.content.substring(command.length + 1);
  var song = { stream: {}, details: {}, showDetails: false, ytUrl: "" };

  //Used when some ideas needs testing
  if (command === '!ping') {
    message.reply('pong');
  }

  if (command === '!join') {
    // Only try to join the sender's voice channel if they are in one themselves
    if (message.member.voice.channel) {
      connection = await message.member.voice.channel.join();
      botProperties.onVoiceChannel = true;
      dispatcher = connection.play('./clips/tutturuu.mp3');
    } else {
      message.reply('Join a voice channel - BAAAKA!');
    }
  }

  if (command === '!play') {
    // Only try to join the sender's voice channel if they are in one themselves
    if (message.member.voice.channel) {
      connection = await message.member.voice.channel.join();
      botProperties.onVoiceChannel = true;


      //Check if it is a youtube link
      if (message.content.includes('youtube.com/')) {

        try {

          //http fix for ytdl-core - clean this up
          if ((message.content.includes('http') || message.content.includes('https'))){

            song.stream = await ytdl(args.toString(), { type: 'opus', filter: 'audioonly', quality: 'highestaudio', highWaterMark: 1 << 25 });
          
          }else{

            song.stream = await ytdl('https://'+args.toString(), { type: 'opus', filter: 'audioonly', quality: 'highestaudio', highWaterMark: 1 << 25 });
          
          }

          

        } catch (error) {
          message.reply('Gomen, YouTube did not answer! Try again, ne? ^__~ ');
        }

        song.stream.on('info', (info) => {
          song.details = info.player_response.videoDetails;
          //Check if we need thumbnail
          if ((message.content.includes('http') || message.content.includes('https'))) {
            song.showDetails = false;
          } else {
            song.showDetails = true;
          }
          play(song, connection, message);

        })

        //SoundCloud
      } else if (message.content.includes('soundcloud.com/')) {
        message.reply('Gomen, I do not know how to play SoundCloud music yet! ;___; ');
        //If person is searching on youtube
      } else {

        var count = 0;
        var maxTries = 15;
        var hasData = false;

        while (true && hasData == false) {

          try {

            await sYt.search(msg,{ limit: 1 }).then(result => {

              //console.log(result.videos[0])

              song.stream = ytdl(result.videos[0].link, { type: 'opus', filter: 'audioonly', quality: 'highestaudio', highWaterMark: 1 << 25 });

              song.stream.on('info', (info) => {

                song.details = info.player_response.videoDetails;
                song.showDetails = true;

                play(song, connection, message);

              })

              if(result != null){
                hasData = true;
              }

            });


          } catch (error) {

            if(++count == maxTries){
              message.reply(' gomen... YouTube did not return any useful data after 15 tires! Try again, ne? ^__~ ');
              break;
            }

          }

        }


      }

    } else {
      message.reply('Join a voice channel - BAAAKA!');
    }
  }

  if (command === '!replay') {
    // Only try to join the sender's voice channel if they are in one themselves
    if (message.member.voice.channel) {
      connection = await message.member.voice.channel.join();
      play(song, connection, message);
    } else {
      message.reply('Join a voice channel - BAAAKA!');
    }
  }

  if (command === '!playid') {
    // Only try to join the sender's voice channel if they are in one themselves
    if (message.member.voice.channel) {
      connection = await message.member.voice.channel.join();
      botProperties.onVoiceChannel = true;

      //Make sure people are using the right syntax
      if (args.length == 1 && !isNaN(msg)) {

        song.stream = await ytdl(ytResults[msg].url, { type: 'opus', filter: 'audioonly', quality: 'highest' });

        song.stream.on('info', (info) => {
          song.details = info.player_response.videoDetails;
          song.showDetails = true;
          play(song, connection, message);

        })

      } else {

        message.reply("baaaaka~! >:( You are using a wrong syntax!");

      }

    } else {
      message.reply('Join a voice channel - BAAAKA!');
    }
  }

  if (command === '!lyrics') {
    // Only try to join the sender's voice channel if they are in one themselves
    if (message.member.voice.channel) {
      getLyrics(""+currentSong)
      .then( result => message.reply(", I found this for you: \n" + result.lyrics))
      .catch(error => message.reply("Something went wrong! \n" + error));

    } else {
      message.reply('You are not even listening to the music BAAAKA!');
    }
  }

  if (command === '!search') {
    // Only try to join the sender's voice channel if they are in one themselves
    if (message.member.voice.channel) {

      ytResults = []


      await sYt.search(msg, { limit: 10 }).then(results => {

        var listOutput = "";
        var videoList = results.videos;
        console.log(videoList)

        for (let i = 0; i < 10; i++) {

          var tempVid = {
            index: 0,
            title: "",
            timestamp: "",
            url: ""
          };

          tempVid.index = i;
          tempVid.title = videoList[i].title
          tempVid.timestamp = videoList[i].duration
          tempVid.url = videoList[i].link

          ytResults.push(tempVid);

        }

        ytResults.forEach((video) => {

          listOutput += video.index + " - " + video.title + " - " + video.timestamp + "\n \n"

        });

        message.reply(' I have found the following for you: ```' + listOutput + '```' + '\n\n To play a song; `!playid {id} `');

      }).catch(error =>
        message.reply('Gomen, YouTube is being a baka~! Try again, ne? ^_~')

      )

    } else {
      message.reply('You are not even on a voice channel - BAAAKA!');
    }
  }


  if (command === '!leave') {
    // Only try to join the sender's voice channel if they are in one themselves
    if (message.member.voice.channel) {
      dispatcher.end();
      message.reply('>:(');
      connection = await message.member.voice.channel.join();
      botProperties.onVoiceChannel = true;
      dispatcher = connection.play('./clips/omae.aac');
      dispatcher.on('finish', () => {
        console.log('Finished playing!');
        message.member.voice.channel.leave();
        botProperties.onVoiceChannel = false;
      });

    } else {
      message.reply('Join a voice channel - BAAAKA!');
    }
  }

  if (command === '!pause') {
    // Only try to join the sender's voice channel if they are in one themselves
    if (message.member.voice.channel) {
      dispatcher.pause();
      message.reply('Haaaaai~! Pausing the song! (^__^)');
    } else {
      message.reply('You are not even listening to the music BAAAKA!');
    }
  }

  if (command === '!resume') {
    // Only try to join the sender's voice channel if they are in one themselves
    if (message.member.voice.channel) {
      dispatcher.resume();
      message.reply('Haaaaai~! Resuming the song! (^__^)');
    } else {
      message.reply('You are not even listening to the music BAAAKA!');
    }
  }

  if (command === '!skip') {
    // Only try to join the sender's voice channel if they are in one themselves
    if (message.member.voice.channel) {
      dispatcher.end();
      message.reply('ryōkai~! Skipping the song :3');
    } else {
      message.reply('You are not even listening to the music BAAAKA!');
    }
  }

  if (command === '!clear') {
    // Only try to join the sender's voice channel if they are in one themselves
    if (message.member.voice.channel) {
      musicQueue = []
      message.reply('ryōkai~! The queue is now empty! :3');
    } else {
      message.reply('You are not even listening to the music BAAAKA!');
    }
  }

  if (command === '!list' || command === '!queue') {
    // Only try to join the sender's voice channel if they are in one themselves
    if (message.member.voice.channel) {

      var queue = "";

      musicQueue.forEach((video, index) => {
        queue += index + " - " + video.details.title + " - " + timeFormatter(video.details.lengthSeconds) + "\n \n"

      });

      message.reply(' the following is queued: ```' + queue + '```');

    } else {
      message.reply('You are not even listening to the music BAAAKA!');
    }
  }

  if (command === '!shuffle') {
    // Only try to join the sender's voice channel if they are in one themselves
    if (message.member.voice.channel) {

      for (let i = musicQueue.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * i)
        const temp = musicQueue[i]
        musicQueue[i] = musicQueue[j]
        musicQueue[j] = temp
      }

      message.reply('ryōkai~! Shuffling the playlist! :3');
    } else {
      message.reply('You are not even listening to the music BAAAKA!');
    }
  }

  if (command === '!javajesus') {
    const url = "https://api.chucknorris.io/jokes/random";
    const getChuckNorrisFact = util.promisify(request);
    getChuckNorrisFact(url).then(data => {
      let content = JSON.parse(data.body);
      message.reply(content.value.replace(/Chuck Norris/gi, 'Java Jesus'));
    }).catch(err => console.log('error: ', err))

  }


});

//Move TTS out, and remove dirty await
client.on('voiceStateUpdate', async (oldState, newState, message) => {
  var newUserChannel = newState.channel
  var oldUserChannel = oldState.channel

  //Don't trigger self // undefined (will be undefined on joining)
  if (oldState.member.nickname == undefined) return;


  if (!dispatcher._writableState.writing) {


    try {

      if ((newUserChannel == connection.channel && oldUserChannel != undefined && newUserChannel != oldUserChannel) || (newUserChannel == connection.channel && oldUserChannel == null && newUserChannel != oldUserChannel)) {
        googleTTS(oldState.member.nickname + " has joined the channel", 'en-US')
          .then(function (url) {
            var dest = path.resolve(__dirname, 'say.mp3'); // file destination
            return fD.downloadFile(url, dest);
          })
          .then(function () {
            botProperties.onVoiceChannel = true;
            botProperties.connectedChannel = newState.member.voice.channel;
            dispatcher = connection.play('./say.mp3');
          })
          .catch(function (err) {
            console.error(err.stack);
          });

      }
    } catch (error) {

      console.log("Something went wrong in voiceStateUpdate");

    }

  }
})


function play(song, connection, message) {

  //Check if music is playing
  if (dispatcher._writableState.writing) {
    song.showDetails = true;
    musicQueue.push(song);

    message.reply(' I have added the following song to the queue for you~ ' + song.details.title + ' (' + timeFormatter(song.details.lengthSeconds) + ')');

  } else {

    dispatcher = connection.play(song.stream, streamOptions);
    currentSong = song.details.title;
    //announce
    if (song.showDetails == true) {
      message.channel.send(' hoi~! Now playing ' + song.details.title + ' (' + timeFormatter(song.details.lengthSeconds) + ')' + '\n' + 'youtube.com/watch?v=' + song.details.videoId,
        { files: [song.details.thumbnail.thumbnails[3].url] });
    } else {
      message.channel.send(' Now playing ' + song.details.title + ' (' + timeFormatter(song.details.lengthSeconds) + ')');
    }

    

    //When the current song ends
    dispatcher.on('finish', () => {
      if (musicQueue.length != 0) {

        play(musicQueue[0], connection, message);

        musicQueue.shift();
        message.channel.send("Playing next song, there are " + musicQueue.length + " song(s) left in the queue.");
      }

    });
  }

}


function timeFormatter(s) {
  return (s - (s %= 60)) / 60 + (9 < s ? ':' : ':0') + s
}

client.login(token);