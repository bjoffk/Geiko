module.exports = {
	name: 'leave',
	description: 'Leaves the current voice channel',
	async execute(message, args) {

		const voiceChannel = message.member.voice.channel;
		if (!voiceChannel)
			return message.channel.send(
				'Join a voice channel - BAAAKA!'
			);
		try {
			let connection = await voiceChannel.join();
			connection.play('./clips/omae.aac')
				.on("finish", () => {
					message.channel.send('It is not like I want to be here anyway - BAAAKA!');
					voiceChannel.leave();
				});
		} catch (err) {
			console.log(err);
			return message.channel.send(err);
		}
	},
};