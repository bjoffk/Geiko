const util = require('util');
const request = require('request');

module.exports = {
	name: 'javajesus',
	description: 'Creates a random Java Jesus fact!',
	execute(message, args) {

		const url = "https://api.chucknorris.io/jokes/random";
		const getChuckNorrisFact = util.promisify(request);
		getChuckNorrisFact(url).then(data => {
		  let content = JSON.parse(data.body);
		  message.channel.send(content.value.replace(/Chuck Norris/gi, 'Java Jesus'));
		}).catch(error => console.log('error: ', error))

	},
};