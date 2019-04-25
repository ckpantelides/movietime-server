var port = process.env.PORT || 3000;

var app = require("express")();
var server = require("http").Server(app);
var io = require("socket.io")(server);

server.listen(port);
// WARNING: app.listen(80) will NOT work here!

app.get("/", function(req, res) {
  res.sendFile(__dirname + "/index.html");
});

// socket.io connects to the Client website
// var io = require("socket.io").listen(server);
// axios makes requests to The Movie DB API. We'll receive movie titles from the client (via socket.io)
// the titles will be searced on The Movie DB to return URLs for the poster images, which will be
// sent back to the client through socket.io
var axios = require("axios");

const util = require("util");

// variables to build the URL for The Movie DB poster image searches
var urlStart = "https://api.themoviedb.org/3/search/movie?api_key=";
var urlEnd = "&query=";

// Movie Database API key
var API = process.env.mdbkey;

// creates connection to the client through socket.io
io.on("connection", function(socket) {
  // when the client emits a "request images" event
  // (i.e. sends an array of movie titles to be searched)
  socket.on("request images", function(obj) {
    // array to hold the axios "get" requests
    var promises = [];
    // array to hold the poster URLs for each movie
    var movieList = [];
    // builds the url for each axios "get" request and pushes it to the "promises" array
    for (var i = 0, l = obj.data.length; i < l; i++) {
      let url = urlStart + API + urlEnd + obj.data[i].title;
      promises.push(axios.get(url));
    }

    // axios.all and .spread is needed to retain the order of the "get" requests, as these
    // will run concurrently
    axios
      .all(promises)
      .then(
        // once the axios requests are over, the poster image URL is built and pushed to the
        // movieList array
        axios.spread((...args) => {
          for (let k = 0; k < args.length; k++) {
            var posterPath = args[k].data.results[0].poster_path;
            var posterUrl = "http://image.tmdb.org/t/p/w185" + posterPath;

            movieList.push(posterUrl);
          }
        })
      )
      // once all poster image URLs have been built, they're sent to the client
      .then(function() {
        io.emit("image links", movieList);
      })
      .catch(error => {
        console.log(error);
      });
  });
});
