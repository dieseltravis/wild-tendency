// server.js
// where your node app starts
var Promise = require('bluebird');
var fs = require('fs');
//var text2png = require('text2png');
var Jimp = require("jimp");

//test:
//const { createCanvas, loadImage } = require('canvas');
//const canvas = createCanvas(200, 200);
//const ctx = canvas.getContext('2d');

// init project
var https = require("https");
const querystring = require('querystring');
var express = require('express');
var app = express();

// https://www.last.fm/api/show/user.getTopArtists
const api = "//ws.audioscrobbler.com/2.0/";
const query = {
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

var url = "https:" + api + "?" + querystring.stringify(query);
console.log(url);

var imgData = [];

const IMG_WIDTH_NUM = 4;
const IMG_HEIGHT_NUM = 4;
const IMG_COUNT = IMG_WIDTH_NUM * IMG_HEIGHT_NUM;
const IMG_SIZE = 256;
const PADDING = 10;

var getArtistImg = function (imgUrl, fileName, callback) {
  var request = https.get(imgUrl, function(res) {
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
};

var addArtistText = function (img, txt, callback) {
  Jimp.read(img, function (err, image) {
    if (err) {
      console.log(err);
      throw err;
    }
    // TODO: add font background
    Jimp.loadFont(Jimp.FONT_SANS_16_WHITE).then(function (font) {
      image.cover(IMG_SIZE, IMG_SIZE)  // resize
         .print(font, PADDING, PADDING, txt, IMG_SIZE - (2 * PADDING))     // write text
         .write(img + ".txt.png");     // save
      
      console.log("File with text saved: " + img + ".txt.png");
      //callback(img + ".txt.jpg");
      
      return image;
    });
  });
};

var createGrid = function (imgs, response) {
  console.log("creating grid");
  var image = new Jimp(IMG_WIDTH_NUM * IMG_SIZE, IMG_HEIGHT_NUM * IMG_SIZE, function (gridErr, grid) {
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
        
        /*
        imgFuncs.push(function () {
          console.log("returning promise...");
          return new Promise(function () {
            Jimp.read(tileSrc, function (tileErr, tile) {
              if (tileErr) {
                console.info("tile error: ", tileErr);
                throw tileErr;
              }
              console.log(tileLog);
              return new Promise(function () { grid.blit(tile, x, y); });
            });
          });
        });
        */
        imgFuncs.push([x, y]);
        tiles.push(Jimp.read(tileSrc));
        //(imgs[tileNum], col * IMG_SIZE, row * IMG_SIZE, "adding tile " + tileNum + " at row " + row + ", col " + col));
        tileNum++;
        
        //grid.composite(tileSrc, x, y);        
      }
    }
    
    //Promise.all(imgFuncs).then(function(){
    //  grid.quality(69)  // set nice JPEG quality
    //      .write(__dirname + "/tmp/hello.jpg");
    //});
    Promise.all(tiles).then(function (tileImgs) {
      var blits = [];
      tileImgs.forEach(function (jTile, index) {
        console.log("pushing blit " + index);
        blits.push(grid.composite(jTile, imgFuncs[index][0], imgFuncs[index][1]));
      });
      Promise.all(blits).then(function () {
        console.log("writing");
        grid.quality(69)
            .write(__dirname + "/tmp/hello.jpg", function () {
              response.sendFile(__dirname + '/tmp/hello.jpg');
            });
      });
    });
    
  });
    //callback("/tmp/hello.jpg");
  
  //.quality(69)  // set nice JPEG quality
  //.write(__dirname + "/tmp/hello.jpg")
};

var allImgs = [];

var last = function () {
  imgData = [];
  
  var req = https.get(url, function getJson(res) {
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
            var artistImgSrc = __dirname + "/tmp/" + "img" + i + ".png";
            
            imgData.push({
              artist: name,
              img: imgSrc
            });
            
            getArtistImg(imgSrc, destName, function savedCallback () {
              return addArtistText(artistImgSrc, name);
            });
            allImgs[i] = __dirname + "/tmp/" + "img" + i + ".png" + ".txt.png";
            
            i++;
          });
          
          console.info("img data: ", imgData.length, imgData);
        } else {
          console.info("data error: ", data);
        }
      } else {
        console.info("json error: ", output);
      }
    });
  });

  req.on('error', function onError(err) {
    console.error(err);
  });

  req.end();

};

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
  last();
  response.sendStatus(200);
});

app.get("/hello", function (request, response) {
  createGrid(allImgs, response);
  //response.sendFile(__dirname + '/tmp/hello.jpg');
});

app.get("/hi", function (request, response) {
  //createGrid(allImgs);
  response.sendFile(__dirname + '/tmp/img0.png.txt.png');
});

// listen for requests :)
var listener = app.listen(process.env.PORT, function listening() {
  console.log('Your app is listening on port ' + listener.address().port);
});
