module.exports = {
	name: 'skip',
	description: 'Skips the current song playing',
	execute(message, args) {

		const serverQueue = message.client.queue.get(message.guild.id);
		
		if (!message.member.voice.channel){
			return message.channel.send('You silly baka, you have to be in a voice channel!');
		} 
		serverQueue.connection.dispatcher.end();

	},
};