module.exports = {
    name: 'join',
    description: 'Joins the users voice channel',
    async execute(message, args) {

        const voiceChannel = message.member.voice.channel;
        
        if (!voiceChannel)
            return message.channel.send(
                'Join a voice channel - BAAAKA!'
            );

        const permissions = voiceChannel.permissionsFor(message.client.user);
        
        if (!permissions.has("CONNECT") || !permissions.has("SPEAK")) {
            return message.channel.send(
                "Gomen, I don't have premessions to speak in your channel!"
            );
        }

        try {
            let connection = await voiceChannel.join();
            connection.play('./clips/tutturuu.mp3');
        } catch (error) {
            console.log(error);
            return message.channel.send(error);
        }
    },
};