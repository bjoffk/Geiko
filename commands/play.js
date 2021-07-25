const ytdl = require("ytdl-core");
const sYt = require('scrape-youtube').default;

function timeFormatter(s) {
    return (s - (s %= 60)) / 60 + (9 < s ? ':' : ':0') + s
}

module.exports = {
    name: "play",
    description: "Play a youtube link, or searches youtube for you!",
    async execute(message) {
        try {
            const args = message.content.split(" ");
            const command = message.content.slice('!').split(/ +/g).shift().toLowerCase();;
            const msg = message.content.substring(command.length + 1);
            const queue = message.client.queue;
            const serverQueue = message.client.queue.get(message.guild.id);
            var song = { stream: {}, details: {}, showDetails: false, ytUrl: "" };

            const voiceChannel = message.member.voice.channel;
            if (!voiceChannel)
                return message.channel.send(
                    "You need to be in a voice channel to play music!"
                );
            const permissions = voiceChannel.permissionsFor(message.client.user);
            if (!permissions.has("CONNECT") || !permissions.has("SPEAK")) {
                return message.channel.send(
                    "I need the permissions to join and speak in your voice channel!"
                );
            }

            //Check if it is a youtube link
            if (message.content.includes('youtube.com/')) {
                try {
                    //http fix for ytdl-core - clean this up
                    if ((message.content.includes('http') || message.content.includes('https'))) {
                        song.stream = await ytdl(args[1].toString(), { type: 'opus', filter: 'audioonly', quality: 'highestaudio', highWaterMark: 1 << 25 });
                    } else {
                        song.stream = await ytdl('https://' + args[1].toString(), { type: 'opus', filter: 'audioonly', quality: 'highestaudio', highWaterMark: 1 << 25 });
                    }
                } catch (error) {
                    message.reply('Gomen, YouTube did not answer! Try again, ne? ^__~ ');
                }
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
                        await sYt.search(msg, { limit: 1 }).then(result => {
                            song.stream = ytdl(result.videos[0].link, { type: 'opus', filter: 'audioonly', quality: 'highestaudio', highWaterMark: 1 << 25 });
                            if (result != null) {
                                hasData = true;
                            }
                        });
                    } catch (error) {
                        if (++count == maxTries) {
                            console.log(error)
                            message.reply(' gomen... YouTube did not return any useful data after 15 tires! Try again, ne? ^__~ ');
                            break;
                        }
                    }
                }
            }
            //if no music is playing
            if (!serverQueue) {
                const queueContruct = {
                    textChannel: message.channel,
                    voiceChannel: voiceChannel,
                    connection: null,
                    songs: [],
                    playing: true
                };

                queue.set(message.guild.id, queueContruct);
                queueContruct.songs.push(song);

                try {

                    var connection = await voiceChannel.join();
                    queueContruct.connection = connection;

                    song.stream.on('info', (info) => {
                        song.details = info.player_response.videoDetails;
                        //check if thumbnail is needed or not
                        if ((message.content.includes('http') || message.content.includes('https'))) {
                            song.showDetails = false;
                        } else {
                            song.showDetails = true;
                        }
                        this.play(message, queueContruct.songs[0]);
                    })

                } catch (error) {
                    console.log(error);
                    queue.delete(message.guild.id);
                    return message.channel.send(error);
                }
                //else add to queue
            } else {
                serverQueue.songs.push(song);

                song.stream.on('info', (info) => {
                    song.details = info.player_response.videoDetails;
                    song.showDetails = true;
                    return message.channel.send('I have added the following song to the queue for you~ ' + song.details.title + ' (' + timeFormatter(song.details.lengthSeconds) + ')');
                })
            }
        } catch (error) {
            console.log(error);
            message.channel.send(error.message);
        }
    },

    play(message, song) {
        const queue = message.client.queue;
        const guild = message.guild;
        const serverQueue = queue.get(message.guild.id);
        const streamOptions = { seek: 0, passes: 3, volume: 0.5, bitrate: 192000 }

        if (!song) {
            queue.delete(guild.id);
            return;
        }

        const dispatcher = serverQueue.connection
            .play(song.stream, streamOptions)
            .on("finish", () => {
                serverQueue.songs.shift();
                this.play(message, serverQueue.songs[0]);
                //announce next song, if any
                if (serverQueue.songs.length != 0) {
                    serverQueue.textChannel.send('Playing next song, ' + serverQueue.songs.length + ' song(s) left in the queue.');
                }
            })
            .on("error", error => console.error(error));

        //announce what is playing
        if (song.showDetails == true) {
            console.log("hej")
            serverQueue.textChannel.send(' hoi~! Now playing ' + song.details.title + ' (' + timeFormatter(song.details.lengthSeconds) + ')' + '\n' + 'youtube.com/watch?v=' + song.details.videoId,
                { files: [song.details.thumbnail.thumbnails[3].url] });
        } else {
            serverQueue.textChannel.send(' Now playing ' + song.details.title + ' (' + timeFormatter(song.details.lengthSeconds) + ')');
        }
    }
};