var urlParse = require('url').parse;
var https = require('https');
const fs = require('fs');


let downloadFile = function(url, dest) {
    return new Promise(function (resolve, reject) {
      var info = urlParse(url);
      var httpClient = info.protocol === 'https:' ? https : http;
      var options = {
        host: info.host,
        path: info.path,
        headers: {
          'user-agent': 'WHAT_EVER'
        }
      };
  
      httpClient.get(options, function (res) {
        // check status code
        if (res.statusCode !== 200) {
          reject(new Error('request to ' + url + ' failed, status code = ' + res.statusCode + ' (' + res.statusMessage + ')'));
          return;
        }
  
        var file = fs.createWriteStream(dest);
        file.on('finish', function () {
          // close() is async, call resolve after close completes.
          file.close(resolve);
        });
        file.on('error', function (err) {
          // Delete the file async. (But we don't check the result)
          fs.unlink(dest);
          reject(err);
        });
  
        res.pipe(file);
      })
        .on('error', function (err) {
          reject(err);
        })
        .end();
    });
  }

exports.downloadFile = downloadFile;