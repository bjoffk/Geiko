const ytSearch = require('yt-search')
ytResults = []

let fetch = function (search, mode, callback) {

  ytSearch(search, function (err, r) {
    if (err) throw err

    const videos = r.videos

    const firstResult = videos[0]

    if (mode == 1) {
      callback(firstResult);
    } else {
      callback(videos)
    }

  })

}

exports.fetch = fetch;