// server.js
// where your node app starts
//TODO: massive refactoring, this code is a goddamn mess

const Jimp = require("jimp");
const fs = require('fs');
const https = require("https");
const querystring = require('querystring');
const express = require('express');
var app = express();

// https://www.last.fm/api/show/user.getTopArtists
const api = "//ws.audioscrobbler.com/2.0/";
var query = {
  method: "user.gettopartists",
  user: "diesel_travis", 
  period: "1month", 
  limit: "16",
  api_key: process.env.LASTFM_API_KEY,
  format: "json"
};

const SIZES = {
  SMALL: 0,
  MEDIUM: 1,
  LARGE: 2,
  EXTRALARGE: 3,
  MEGA: 4
};

console.log(process.env.PROJECT_DOMAIN);
const PROJECT_URL = `https://${process.env.PROJECT_DOMAIN}.glitch.me/`;
console.log(PROJECT_URL);

var getUrl = function () { 
  return "https:" + api + "?" + querystring.stringify(query);
};
console.log(getUrl());

var imgData = [];

const IMG_WIDTH_NUM = 4;
const IMG_HEIGHT_NUM = 4;
const IMG_COUNT = IMG_WIDTH_NUM * IMG_HEIGHT_NUM;
const IMG_SIZE = 256;
const PADDING = 10;

var getArtistImg = function (imgUrl, fileName, callback) {
  console.info("getArtistImg:", imgUrl, fileName);
  if (imgUrl) {
    https.get(imgUrl, function(res) {
      var imagedata = '';
      res.setEncoding('binary');

      res.on('data', function(chunk){
        imagedata += chunk;
      });

      res.on('end', function(){
        fs.writeFile(__dirname + "/tmp/" + fileName, imagedata, 'binary', function(err){
          if (err) throw err;
          console.log("File saved: " + "/tmp/" + fileName);
          return callback();
        });
      });
    });
  } else {
    var replacement = new Jimp(IMG_SIZE, IMG_SIZE, function (newErr, newImg) {
      console.log("image not found, making a new one");
      if (newErr) {
        console.info("new img error", newErr);
        throw newErr;
      }
      newImg.write(__dirname + "/tmp/" + fileName, function(err) {
          if (err) throw err;
          console.log("File saved: " + "/tmp/" + fileName);
          return callback();
        });
    });
  }
};

var addArtistText = function (img, txt, callback) {
  return Jimp.read(img, function (err, image) {
    if (err) {
      console.log(err);
      throw err;
    }
    
    var blackFont = Jimp.loadFont(Jimp.FONT_SANS_16_BLACK);
    var whiteFont = Jimp.loadFont(Jimp.FONT_SANS_16_WHITE);

    Promise.all([image.cover(IMG_SIZE, IMG_SIZE), blackFont, whiteFont]).then(function (){
      console.log("printing black: " + img);
      blackFont.then(function (font) {
        image.print(font, PADDING - 1, PADDING - 1, txt, IMG_SIZE - (2 * PADDING))
             .print(font, PADDING - 1, PADDING + 1, txt, IMG_SIZE - (2 * PADDING))
             .print(font, PADDING + 1, PADDING - 1, txt, IMG_SIZE - (2 * PADDING))
             .print(font, PADDING + 1, PADDING + 1, txt, IMG_SIZE - (2 * PADDING));
        
        return image;
      }).then(function () {
        console.log("printing white: " + img);
        whiteFont.then(function (font) {
          return image.print(font, PADDING, PADDING, txt, IMG_SIZE - (2 * PADDING))
               .write(img + ".txt.png", function () {
            console.log("File with text saved: " + img + ".txt.png");
            callback();
          });
        });
      });
    });
  });
};

var del = function (f) {
  fs.access(f, function(err) { 
    if (err) {
      console.log(err);
    } else {
      fs.unlink(f, function() {
        console.info("deleted: ", f);
      });
    }
  });
};

var createGrid = function (imgs, exresponse, username) {
  console.log("creating grid");
  return new Jimp(IMG_WIDTH_NUM * IMG_SIZE, IMG_HEIGHT_NUM * IMG_SIZE, function (gridErr, grid) {
    console.log("grid width:" + (IMG_WIDTH_NUM * IMG_SIZE) + " by height:" + (IMG_HEIGHT_NUM * IMG_SIZE));
    if (gridErr) {
      console.info("new grid error", gridErr);
      throw gridErr;
    }
    
    let tileNum = 0;
    let imgFuncs = [];
    let tiles = [];
    for (var row = 0; row < IMG_HEIGHT_NUM; row++) {
      for (var col = 0; col < IMG_WIDTH_NUM; col++) {
        let tileSrc = imgs[tileNum];
        let x = col * IMG_SIZE;
        let y = row * IMG_SIZE; 
        let tileLog = "adding tile " + tileNum + " at row " + row + ", col " + col;
        
        imgFuncs.push([x, y, tileLog]);
        tiles.push(Jimp.read(tileSrc));

        tileNum++;
      }
    }
    
    Promise.all(tiles).then(function (tileImgs) {
      var blits = [];
      tileImgs.forEach(function (jTile, index) {
        console.log("pushing tile " + index);
        blits.push(grid.composite(jTile, imgFuncs[index][0], imgFuncs[index][1]));
      });
      
      Promise.all(blits).then(function () {
        console.log("writing hello file");
        grid.quality(85)
            .write(__dirname + "/tmp/hello." + username + ".jpg", function () {
              exresponse.send("hello.jpg");
          
              console.log("deleting tmp imgs...");
              for(let x = IMG_COUNT; x--;) {
                del(__dirname + "/tmp/img" + x + ".png");
                del(__dirname + "/tmp/img" + x + ".png.txt.png");
              }
            });
      });
    });
  });
};

var allImgs = [];

var last = function (username, exresponse) {
  imgData = [];
  var artImgFuncs = [];
  query.user = username;
  var newUrl = getUrl();
  console.log(newUrl);
  
  var req = https.get(newUrl, function getJson(res) {
    console.log('STATUS: ' + res.statusCode);

    var output = '';
    res.setEncoding('utf8');

    res.on('data', function onData(chunk) {
      output += chunk;
    });

    res.on('end', function onEnd() {
      var data = JSON.parse(output);

      if (data && data.topartists && data.topartists.artist) {
        let arts = data.topartists.artist;

        if (arts && arts.length > 0) {
          var i = 0;
          arts.forEach((artist) => {
            var name = artist.name;
            var imgSrc = artist.image[SIZES.EXTRALARGE]["#text"];
            var destName = "img" + i + ".png";
            var artistImgSrc = __dirname + "/tmp/img" + i + ".png";
            
            imgData.push({
              artist: name,
              img: imgSrc
            });
            
            artImgFuncs.push(new Promise (function (resolve) {
              getArtistImg(imgSrc, destName, function savedCallback () {
                return addArtistText(artistImgSrc, name, resolve);
              });
            }));

            allImgs[i] = __dirname + "/tmp/img" + i + ".png.txt.png";
            
            i++;
          });
          
          console.info("img data: ", imgData.length, imgData);
          
          Promise.all(artImgFuncs).then(function () {
            console.log("creating grid for " + username);
            createGrid(allImgs, exresponse, username);
          });
          
          //exresponse.sendStatus(200);
        } else {
          console.info("data error: ", data);
          exresponse.sendStatus(500);
          exresponse.send(data);
        }
      } else {
        console.info("json error: ", output);
        exresponse.sendStatus(500);
        exresponse.send(output);
      }      
    });
  });

  req.on('error', function onError(err) {
    console.error(err);
    exresponse.sendStatus(500);
    exresponse.send(err);
  });

  req.end();
};

var sanitizeUser = function (dirtyUser) {
  let cleanUser = "";
  if (dirtyUser) {
    cleanUser = dirtyUser.replace(/\W+/,"_");
  }

  return cleanUser;
};


// Express app: 
// http://expressjs.com/en/starter/static-files.html
app.use(express.static('public'));

// http://expressjs.com/en/starter/basic-routing.html
app.get("/", function slash(request, response) {
  response.sendFile(__dirname + '/views/index.html');
});

app.get("/dreams", function getDreams(request, response) {
  response.send(imgData);
});

// could also use the POST body instead of query string: http://expressjs.com/en/api.html#req.body
app.post("/dreams", function postDream(request, response) {
  let lastfmuser = "";
  if (request && request.query && request.query.dream) {
    lastfmuser = sanitizeUser(request.query.dream);
    console.info("setting img for: ", lastfmuser);
  }
  last(lastfmuser, response);
});

// debugging routes
app.get("/hello", function (request, response) {
  //createGrid(allImgs, response);
  let lastfmuser = "";
  if (request && request.query && request.query.l) {
    lastfmuser = sanitizeUser(request.query.l);
    console.info("getting img for: ", lastfmuser);
  }
  
  response.sendFile(__dirname + "/tmp/hello." + lastfmuser + ".jpg");
});

app.get("/hi", function (request, response) {
  response.sendFile(__dirname + '/tmp/img0.png.txt.png');
});


// listen for requests :)
var listener = app.listen(process.env.PORT, function listening() {
  console.log('Your app is listening on port ' + listener.address().port);
});
