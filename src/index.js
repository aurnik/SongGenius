/**
    Copyright 2014-2015 Amazon.com, Inc. or its affiliates. All Rights Reserved.

    Licensed under the Apache License, Version 2.0 (the "License"). You may not use this file except in compliance with the License. A copy of the License is located at

        http://aws.amazon.com/apache2.0/

    or in the "license" file accompanying this file. This file is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
*/

/**
 * Made by Aurnik (@aurnik)
 * Based on the TidePooler example for Alexa
 * Nov 7, 2016
 */

/**
 * App ID for the skill
 */
var APP_ID = undefined; // Your APP ID

var http = require('http');

/**
 * The AlexaSkill prototype and helper functions
 */
var AlexaSkill = require('./AlexaSkill');

/**
 * SongGenius is a child of AlexaSkill.
 * To read more about inheritance in JavaScript, see the link below.
 *
 * @see https://developer.mozilla.org/en-US/docs/Web/JavaScript/Introduction_to_Object-Oriented_JavaScript#Inheritance
 */
var SongGenius = function () {
    AlexaSkill.call(this, APP_ID);
};

// Extend AlexaSkill
SongGenius.prototype = Object.create(AlexaSkill.prototype);
SongGenius.prototype.constructor = SongGenius;

// ----------------------- Override AlexaSkill request and intent handlers -----------------------

SongGenius.prototype.eventHandlers.onSessionStarted = function (sessionStartedRequest, session) {
    console.log("onSessionStarted requestId: " + sessionStartedRequest.requestId
        + ", sessionId: " + session.sessionId);
    // any initialization logic goes here
};

SongGenius.prototype.eventHandlers.onLaunch = function (launchRequest, session, response) {
    console.log("onLaunch requestId: " + launchRequest.requestId + ", sessionId: " + session.sessionId);
    handleWelcomeRequest(response);
};

SongGenius.prototype.eventHandlers.onSessionEnded = function (sessionEndedRequest, session) {
    console.log("onSessionEnded requestId: " + sessionEndedRequest.requestId
        + ", sessionId: " + session.sessionId);
    // any cleanup logic goes here
};

/**
 * override intentHandlers to map intent handling functions.
 */
SongGenius.prototype.intentHandlers = {
    "ChooseOption": function (intent, session, response) {
        var actionSlot = intent.slots.Action;
        if (actionSlot && actionSlot.value) {
            handleActionDialogRequest(intent, session, response);
        } else {
            handleMissingInfo(intent, session, response);
        }
    },

    "DefineLyrics": function (intent, session, response) {
        session.attributes.action = "defineLyrics";
        if(intent.slots) {
            var artistSlot = intent.slots.Artist;
            var songSlot = intent.slots.Song;
            var lyricsSlot = intent.slots.Lyrics;
            
            if (lyricsSlot && lyricsSlot.value) {
                session.attributes.lyrics = lyricsSlot.value;
                if(artistSlot && artistSlot.value) {
                    session.attributes.artist = artistSlot.value;
                }
                if(songSlot && songSlot.value) {
                    session.attributes.songName = songSlot.value;
                }
                handleSongSearchRequest(intent, session, response);
            }
        } else {
            handleMissingInfo(intent, session, response);
        }
    },

    "FindSong": function (intent, session, response) {
        session.attributes.action = "findSong";
        if(intent.slots) {
            var artistSlot = intent.slots.Artist;
            var lyricsSlot = intent.slots.Lyrics;
            if (lyricsSlot && lyricsSlot.value) {
                session.attributes.lyrics = lyricsSlot.value;
                if(artistSlot && artistSlot.value) {
                    session.attributes.artist = artistSlot.value;
                }
                handleSongSearchRequest(intent, session, response);
            }
        } else {
            handleMissingInfo(intent, session, response);
        }
    },

    "SayLyrics": function (intent, session, response) {
        handleLyricInfo(intent, session, response);
    },

    "WhichArtist": function (intent, session, response) {
        handleArtistInfo(intent, session, response);
    },

    "AMAZON.YesIntent": function (intent, session, response) {
        handleYesRequest(intent, session, response);
    },

    "AMAZON.NoIntent": function (intent, session, response) {
        handleNoRequest(intent, session, response);
    },

    "IdkIntent": function (intent, session, response) {
        handleIdkRequest(intent, session, response);
    },

    "AMAZON.HelpIntent": function (intent, session, response) {
        handleHelpRequest(response);
    },

    "AMAZON.StopIntent": function (intent, session, response) {
        var speechOutput = "Goodbye";
        response.tell(speechOutput);
    },

    "AMAZON.CancelIntent": function (intent, session, response) {
        var speechOutput = "Goodbye";
        response.tell(speechOutput);
    }
};

// -------------------------- SongGenius Domain Specific Business Logic --------------------------

var token = undefined; // Your Genius token

function handleWelcomeRequest(response) {
    var speechOutput = {
            speech: "<speak>Welcome to Song Genius. What would you like to do: look up lyrics or find a song?</speak>",
            type: AlexaSkill.speechOutputType.SSML
        },
        repromptOutput = {
            speech: "I can lead you through providing some lyrics and "
                + "an artist name to get song information, "
                + "or you can simply open Song Genius and ask a question like, "
                + "what did kanye mean when he said you should be honored by my lateness? "
                + "So, what would you like to do: look up lyrics or find a song? ",
            type: AlexaSkill.speechOutputType.PLAIN_TEXT
        };

    response.ask(speechOutput, repromptOutput);
}

function handleYesRequest(intent, session, response) {
    if(session.attributes.action) {
        if(session.attributes.lyrics) {
            if(!session.attributes.song) { // no song yet
                if(session.attributes.lyricsConfirmed) {
                    if(!session.attributes.artist) { // saying yes to knowing artist
                        var repromptText = "Who's the artist? Feel free to say: I don't know.";
                        var speechOutput = repromptText;

                        response.ask(speechOutput, repromptText);
                    }
                }
                else {
                    // saying yes to correct lyrics
                    session.attributes.lyricsConfirmed = true;
                    handleSongSearchRequest(intent, session, response);
                }
            }
            else { // yes this is the correct song
                if(session.attributes.action == "findSong") {
                    var speechOutput = "Great! Glad I could help.";
                    response.tell(speechOutput);
                    session.attributes = {};
                }
                else { // this is the correct song to use for lyric search
                    handleLyricDefineRequest(intent,session,response);
                }
            }
        }
        else {
            speechOutput = "What are the lyrics?";
            repromptText = "Can you tell me some of the lyrics of the song?";

            response.ask(speechOutput, repromptText);
        }
    }
    else {
        handleMissingInfo(intent, session, response);
    }
    
}

function handleNoRequest(intent, session, response) {
    if(session.attributes.action) {
        if(session.attributes.lyrics) {
            if(session.attributes.lyricsConfirmed) {
                // saying no to knowing artist
                handleSongSearchRequest(intent,session,response);
            }
            else {
                // saying no to having the correct lyrics
                speechOutput = "Sorry, what are the lyrics?";
                repromptText = "What are the lyrics of the song?";

                response.ask(speechOutput, repromptText);
            }
        }
        else {
            speechOutput = "What are the lyrics?";
            repromptText = "Can you tell me some of the lyrics of the song?";

            response.ask(speechOutput, repromptText);
        }
    }
    else {
        handleMissingInfo(intent, session, response);
    }
    
}

function handleIdkRequest(intent, session, response) {
    if(session.attributes.action) {
        if(session.attributes.lyrics) {
            handleSongSearchRequest(intent,session,response);
        }
        else {
            var speechOutput = "O.K. well let me know if you remember.";
            response.tell(speechOutput);
        }
    }
    else {
        handleActionDialogRequest(intent, session, response);
    }
    
}

function handleHelpRequest(response) {
    var repromptText = "What would you like to do: look up lyrics or find a song?";
    var speechOutput = "I can lead you through providing some lyrics and "
        + "an artist name to get song information, "
        + "or you can simply ask a question like, "
        + "what's the Kanye song that goes: bow in the presence of greatness. "
        + "So, " + repromptText + " "
        + "Or you can say exit. "
        + repromptText;

    response.ask(speechOutput, repromptText);
}

/**
 * Handles the case where the user gave lyrics
 */
function handleLyricInfo(intent, session, response) {
    var lyricValue = getLyricsFromIntent(intent, false),
        repromptText,
        speechOutput;
    if (lyricValue.error) {
        speechOutput = "What are the lyrics?";
        repromptText = "Can you tell me again, " + speechOutput;
        response.ask(speechOutput, repromptText);
        return;
    }
    session.attributes.lyrics = lyricValue.lyrics;
    session.attributes.lyricsConfirmed = false;
    speechOutput = "The lyrics I heard are: " + lyricValue.lyrics + ", right?";
    repromptText = "Did you say " + speechOutput;

    response.ask(speechOutput, repromptText);
}

/**
 * Handles the case where the user gave the Artist's name
 */
function handleArtistInfo(intent, session, response) {
    if(intent.slots.Artist.value.toLowerCase() == "yes") {
        return handleYesRequest(intent, session, response);
    }
    var artistValue = getArtistFromIntent(intent, false),
        repromptText,
        speechOutput;
    if (artistValue.error) {
        speechOutput = "What's the name of the artist? You can say I don't know.";
        repromptText = "Can you tell me again? " + speechOutput;
        response.ask(speechOutput, repromptText);
        return;
    }
    session.attributes.artist = artistValue.artist;
    if(session.attributes.action) {
        if(session.attributes.lyrics) {
            handleSongSearchRequest(intent, session, response);
        }
        else {
            speechOutput = "What are the song lyrics?";
            repromptText = "Can you tell me some of the lyrics of the song?";

            response.ask(speechOutput, repromptText);
        }
    }
    else {
        handleMissingInfo(intent, session, response);
        return;
    }
    
}

/**
 * catchall for dialogue
 */
function handleActionDialogRequest(intent, session, response) {

    var actionValue = getActionFromIntent(intent, false),
        repromptText,
        speechOutput;
    if (actionValue.error) {
        speechOutput = "What do you want to do: look up lyrics or find a song?";
        repromptText = "Sorry I didn't really understand that. " + speechOutput;
        response.ask(repromptText, repromptText);
        return;
    }

    session.attributes.action = actionValue.action;
    if(actionValue.action == "findSong") {
        speechOutput = "What are some lyrics?";
        repromptText = "Can you tell me some of the lyrics of the song?";

        response.ask(speechOutput, repromptText);
        return;
    }
    else { // defineLyrics
        speechOutput = "What lyrics do you want to define?";
        repromptText = "What are the lyrics that you want to define?";

        response.ask(speechOutput, repromptText);
        return;
    }
        
    
}

/**
 * Handles the song search
 */
function handleSongSearchRequest(intent, session, response) {
    var lyrics = session.attributes.lyrics,
        artist = session.attributes.artist,
        title = session.attributes.songName,
        song = session.attributes.song,
        songList = session.attributes.results,
        repromptText,
        speechOutput;
    if(song) { // this is a re-search

        if(song.index < songList.length - 1) {
            var newResult = session.attributes.song = songList[song.index + 1];

            speechOutput = "Is the song " + newResult.title + " by " + newResult.artist + "?";
            repromptText = "There are " + (songList.length - 1 - newResult.index) + " more results, but " + speechOutput;
            response.ask(speechOutput, repromptText);
            return;
        }
        else { // reached end of results
            var speechOutput = "Sorry, I couldn't find your song.";
            response.tell(speechOutput);
            return;
        }
    }
    else { // find song for first time
        lyricWords = lyrics.split(" ");
        if(lyricWords.length > 7) {
            // for long enough lyrics, filter out uncommon words
            // to avoid things that may have been misheard
            // leads to better search results
            lyrics = lyricWords.filter(checkWord).join(" ");
        }
        
        http.get("http://api.genius.com/search?q="+lyrics.replace(' ', '%20')+"&access_token=" + token, function (res) {
            
            var statusCode = res.statusCode;
            var contentType = res.headers['content-type'];
            
            var error = void 0;
            if (statusCode !== 200) {
                error = new Error('Request Failed.\n' + ('Status Code: ' + statusCode));
            }
            if (error) {
                // consume response data to free up memory
                res.resume();
                return;
            }
            res.setEncoding('utf8');
            var rawData = '';
            res.on('data', function (chunk) {
                return rawData += chunk;
            });
            res.on('end', function () {
                try {
                    var data = JSON.parse(rawData);
                    var results = data.response.hits;
                    results = results.filter(function(r) {
                        return r.type == "song";
                    });
                    results = results.map(function(r, i) {
                        var song = r.result;
                        return {
                            title: song.title,
                            id: song.id,
                            artist: song.primary_artist.name,
                            index: i,
                            popularity: song.pyongs_count ? song.pyongs_count : 0,
                            annotationNum: song.annotation_count
                        };
                    });
                    results.sort(function(a,b) {
                        return b.popularity - a.popularity;
                    });
                    results.map(function(r,i) {
                        r.index = i;
                        return r;
                    });
                    
                    var resultsFiltArtist = [];
                    session.attributes.results = results;
                    if(artist) {
                        resultsFiltArtist = results.filter(function(song) {
                            return song.artist.toLowerCase().indexOf(artist.toLowerCase()) > -1 || similarity(song.artist.toLowerCase(), artist.toLowerCase()) > 0.7;
                        });
                        if(resultsFiltArtist.length > 0) {
                            session.attributes.results = resultsFiltArtist.map(function(r,i) {
                                r.index = i;
                                return r;
                            });
                        }
                    }
                    
                    var firstResult = session.attributes.song = session.attributes.results[0];
    
                    if(session.attributes.action == "findSong") {
                        speechOutput = "Is the song " + firstResult.title + " by " + firstResult.artist + "?";
                        repromptText = "There are " + (session.attributes.results.length - 1 - firstResult.index).toString() + " more results, but " + speechOutput;
                        response.ask(speechOutput, repromptText);
                        return;
                    }
                    else {
                        speechOutput = "The song we're looking at is " + firstResult.title + " by " + firstResult.artist + ", right?";
                        repromptText = "There are " + (session.attributes.results.length - 1 - firstResult.index).toString() + " more results, but " + speechOutput;
                        response.ask(speechOutput, repromptText);
                        return;
                    }
                } catch (e) {
                    console.log(e.message);
                    return;
                }
            });
        }).on('error', function (e) {
            console.log(e.message);
            return;
        });
       
    }
}

/**
 * Handles the lyric search
 */
function handleLyricDefineRequest(intent, session, response) {

    var lyrics = session.attributes.lyrics,
        song = session.attributes.song,
        repromptText,
        speechOutput;
    var results = [];
    var pages = Math.ceil(song.annotationNum / 50);
    var pagesVisited = 0;
    for(var i = 0; i < pages; i++) {
        getJSON("http://api.genius.com/referents?song_id="+song.id+"&per_page=50&page="+(i+1).toString()+"&text_format=plain&access_token=" + token, function(err,data){
            pagesVisited++;
            results = results.concat(data.response.referents);
            if(pagesVisited == pages) {
                results = results.map(function(l){
                    var fragmentSims = l.fragment.split("\n").map(function(fragmentLine){
                        return similarity(fragmentLine, lyrics);
                    });
                    return {
                        lyric: l.fragment,
                        similarity: Math.max.apply(null, fragmentSims),
                        annotation: l.annotations[0].body.plain
                    };
                });
                results = results.sort(function(a,b) {
                    return b.similarity - a.similarity;
                });
                if(results.length > 0 && results[0].similarity > 0.3) {
                    // say the lyric meaning
                    var meaning = results[0].annotation;
                    var speechOutput = "Here is the full lyric. " + results[0].lyric.replace("\n",". ") + ". Here's the meaning I found. " + meaning.replace("\n",". ");
                    response.tell(speechOutput);
                    session.attributes = {};
                }
                else {
                    var speechOutput = "Sorry, I couldn't find any meanings for that song.";
                    response.tell(speechOutput);
                }
            }
        });
    }
    
}

/**
 * Handle no slots, or slot(s) with no values.
 * In the case of a dialog based skill with multiple slots,
 * when passed a slot with no value, we cannot have confidence
 * it is the correct slot type so we rely on session state to
 * determine the next turn in the dialog, and reprompt.
 */
function handleMissingInfo(intent, session, response) {
    if (session.attributes.action) {
        if (session.attributes.lyrics) {
            var repromptText = "What's the name of the artist? You can say I don't know.";
            var speechOutput = repromptText;

            response.ask(speechOutput, repromptText);
        }
        else {
            var repromptText = "What lyrics should I search?";
            var speechOutput = repromptText;

            response.ask(speechOutput, repromptText);
        }
        
    }
    else {
        speechOutput = "What do you want to do: look up lyrics or find a song?";
        repromptText = "Sorry I didn't really understand that. " + speechOutput;
        response.ask(speechOutput, repromptText);
        return;
    }
}

/**
 * Gets the action from the intent, or returns an error
 */
function getActionFromIntent(intent, assignDefault) {
    if(intent.slots) {
        var actionSlot = intent.slots.Action;
        // slots can be missing, or slots can be provided but with empty value.
        // must test for both.
        if (!actionSlot || !actionSlot.value) {
            if (!assignDefault) {
                return {
                    error: true
                }
            } else {
                return {
                    action: 'findSong'
                }
            }
        } else {
            // get action from value
            var actionName = actionSlot.value;
            if (actionName.indexOf("lyric") != -1) {
                return {
                    action: 'defineLyrics'
                }
            } else if (actionName.indexOf("song") != -1) {
                return {
                    action: 'findSong'
                }
            } else {
                return {
                    error: true
                }
            }
        }
    }
    return {
        error: true
    }
}

/**
 * Gets the lyrics from the intent, or returns an error
 */
function getLyricsFromIntent(intent, assignDefault) {

    var lyricsSlot = intent.slots.Lyrics;
    // slots can be missing, or slots can be provided but with empty value.
    // must test for both.
    if (!lyricsSlot || !lyricsSlot.value) {
        return {
            error: true
        }
    } else {
        return {
            lyrics: lyricsSlot.value
        };
    }
}

/**
 * Gets the artist from the intent, or returns an error
 */
function getArtistFromIntent(intent, assignDefault) {

    var artistSlot = intent.slots.Artist;
    // slots can be missing, or slots can be provided but with empty value.
    // must test for both.
    if (!artistSlot || !artistSlot.value) {
        return {
            error: true
        }
    } else {
        // get artist from value
        var artistName = artistSlot.value;
        return {
            artist: artistName
        };
    }
}

/**
 * Gets the song from the intent, or returns an error
 */
function getSongFromIntent(intent, assignDefault) {
    var songSlot = intent.slots.Song;
    var artistSlot = intent.slots.Artist;
    // slots can be missing, or slots can be provided but with empty value.
    // must test for both.
    if (!songSlot || !songSlot.value) {
        return {
            error: true
        }
    } else {
        var songInfo = {};

        if (artistSlot && artistSlot.value) {
            songInfo.artist = artistSlot.value;
        }
        songInfo.song = songSlot.value;
        return songInfo;
    }
}

// I was originally using a browser to do testing with a getJSON function
// but after moving to node I just used http.get()
var getJSON = function(url, callback) {
    http.get(url, function (res) {
        var statusCode = res.statusCode;
        var contentType = res.headers['content-type'];
        
        var error = void 0;
        if (statusCode !== 200) {
            error = new Error('Request Failed.\n' + ('Status Code: ' + statusCode));
        }
        if (error) {
            console.log(error.message);
            // consume response data to free up memory
            res.resume();
            return callback(error);
        }
        res.setEncoding('utf8');
        var rawData = '';
        res.on('data', function (chunk) {
            return rawData += chunk;
        });
        res.on('end', function () {
            try {
                var parsedData = JSON.parse(rawData);
                return callback(null, parsedData);
            } catch (e) {
                console.log(e.message);
                return callback(e);
            }
        });
    }).on('error', function (e) {
        return callback(e);
    });
};

// http://stackoverflow.com/a/36566052/7005070
function editDistance(s1, s2) {
  s1 = s1.toLowerCase();
  s2 = s2.toLowerCase();

  var costs = new Array();
  for (var i = 0; i <= s1.length; i++) {
    var lastValue = i;
    for (var j = 0; j <= s2.length; j++) {
      if (i == 0)
        costs[j] = j;
      else {
        if (j > 0) {
          var newValue = costs[j - 1];
          if (s1.charAt(i - 1) != s2.charAt(j - 1))
            newValue = Math.min(Math.min(newValue, lastValue),
              costs[j]) + 1;
          costs[j - 1] = lastValue;
          lastValue = newValue;
        }
      }
    }
    if (i > 0)
      costs[s2.length] = lastValue;
  }
  return costs[s2.length];
}

// http://stackoverflow.com/a/36566052/7005070
// String similarity function based on Levenshtein distance
function similarity(s1, s2) {
  var longer = s1;
  var shorter = s2;
  if (s1.length < s2.length) {
    longer = s2;
    shorter = s1;
  }
  var longerLength = longer.length;
  if (longerLength == 0) {
    return 1.0;
  }
  return (longerLength - editDistance(longer, shorter)) / parseFloat(longerLength);
}

// 1000 most commonly used English words
var commonWords = ["a","able","about","above","accept","across","act","actually","add","admit","afraid","after","afternoon","again","against","age","ago","agree","ah","ahead","air","all","allow","almost","alone","along","already","alright","also","although","always","am","amaze","an","and","anger","angry","animal","annoy","another","answer","any","anymore","anyone","anything","anyway","apartment","apparently","appear","approach","are","area","aren't","arm","around","arrive","as","ask","asleep","ass","at","attack","attempt","attention","aunt","avoid","away","baby","back","bad","bag","ball","band","bar","barely","bathroom","be","beat","beautiful","became","because","become","bed","bedroom","been","before","began","begin","behind","believe","bell","beside","besides","best","better","between","big","bit","bite","black","blink","block","blonde","blood","blue","blush","body","book","bore","both","bother","bottle","bottom","box","boy","boyfriend","brain","break","breakfast","breath","breathe","bright","bring","broke","broken","brother","brought","brown","brush","build","burn","burst","bus","business","busy","but","buy","by","call","calm","came","can","can't","car","card","care","carefully","carry","case","cat","catch","caught","cause","cell","chair","chance","change","chase","check","cheek","chest","child","children","chuckle","city","class","clean","clear","climb","close","clothes","coffee","cold","college","color","come","comment","complete","completely","computer","concern","confuse","consider","continue","control","conversation","cool","corner","couch","could","couldn't","counter","couple","course","cover","crack","crazy","cross","crowd","cry","cup","cut","cute","dad","damn","dance","dark","date","daughter","day","dead","deal","dear","death","decide","deep","definitely","desk","did","didn't","die","different","dinner","direction","disappear","do","doctor","does","doesn't","dog","don't","done","door","doubt","down","drag","draw","dream","dress","drink","drive","drop","drove","dry","during","each","ear","early","easily","easy","eat","edge","either","else","empty","end","enjoy","enough","enter","entire","escape","especially","even","evening","eventually","ever","every","everyone","everything","exactly","except","excite","exclaim","excuse","expect","explain","expression","eye","eyebrow","face","fact","fall","family","far","fast","father","fault","favorite","fear","feel","feet","fell","felt","few","field","fight","figure","fill","finally","find","fine","finger","finish","fire","first","fit","five","fix","flash","flip","floor","fly","focus","follow","food","foot","for","force","forget","form","forward","found","four","free","friend","from","front","frown","fuck","full","fun","funny","further","game","gasp","gave","gaze","gently","get","giggle","girl","girlfriend","give","given","glad","glance","glare","glass","go","God","gone","gonna","good","got","gotten","grab","great","green","greet","grey","grin","grip","groan","ground","group","grow","guard","guess","gun","guy","had","hadn't","hair","half","hall","hallway","hand","handle","hang","happen","happy","hard","has","hate","have","haven't","he","he'd","he's","head","hear","heard","heart","heavy","held","hell","hello","help","her","here","herself","hey","hi","hide","high","him","himself","his","hit","hold","home","hope","horse","hospital","hot","hour","house","how","however","hug","huge","huh","human","hundred","hung","hurry","hurt","I","I'd","I'll","I'm","I've","ice","idea","if","ignore","imagine","immediately","important","in","inside","instead","interest","interrupt","into","is","isn't","it","it's","its","jacket","jeans","jerk","job","join","joke","jump","just","keep","kept","key","kick","kid","kill","kind","kiss","kitchen","knee","knew","knock","know","known","lady","land","large","last","late","laugh","lay","lead","lean","learn","least","leave","led","left","leg","less","let","letter","lie","life","lift","light","like","line","lip","listen","little","live","lock","locker","long","look","lose","lost","lot","loud","love","low","lunch","mad","made","make","man","manage","many","mark","marry","match","matter","may","maybe","me","mean","meant","meet","memory","men","mention","met","middle","might","mind","mine","minute","mirror","miss","mom","moment","money","month","mood","more","morning","most","mother","mouth","move","movie","Mr.","Mrs.","much","mum","mumble","music","must","mutter","my","myself","name","near","nearly","neck","need","nervous","never","new","next","nice","night","no","nod","noise","none","normal","nose","not","note","nothing","notice","now","number","obviously","of","off","offer","office","often","oh","okay","old","on","once","one","only","onto","open","or","order","other","our","out","outside","over","own","pack","pain","paint","pair","pants","paper","parents","park","part","party","pass","past","pause","pay","people","perfect","perhaps","person","phone","pick","picture","piece","pink","piss","place","plan","play","please","pocket","point","police","pop","position","possible","power","practically","present","press","pretend","pretty","probably","problem","promise","pull","punch","push","put","question","quick","quickly","quiet","quietly","quite","race","rain","raise","ran","rang","rather","reach","read","ready","real","realize","really","reason","recognize","red","relationship","relax","remain","remember","remind","repeat","reply","respond","rest","return","ride","right","ring","road","rock","roll","room","rose","round","rub","run","rush","sad","safe","said","same","sat","save","saw","say","scare","school","scream","search","seat","second","see","seem","seen","self","send","sense","sent","serious","seriously","set","settle","seven","several","shadow","shake","share","she","she'd","she's","shift","shirt","shit","shock","shoe","shook","shop","short","shot","should","shoulder","shouldn't","shout","shove","show","shower","shrug","shut","sick","side","sigh","sight","sign","silence","silent","simply","since","single","sir","sister","sit","situation","six","skin","sky","slam","sleep","slightly","slip","slow","slowly","small","smell","smile","smirk","smoke","snap","so","soft","softly","some","somehow","someone","something","sometimes","somewhere","son","song","soon","sorry","sort","sound","space","speak","spend","spent","spoke","spot","stair","stand","star","stare","start","state","stay","step","stick","still","stomach","stood","stop","store","story","straight","strange","street","strong","struggle","stuck","student","study","stuff","stupid","such","suck","sudden","suddenly","suggest","summer","sun","suppose","sure","surprise","surround","sweet","table","take","taken","talk","tall","teacher","team","tear","teeth","tell","ten","than","thank","that","that's","the","their","them","themselves","then","there","there's","these","they","they'd","they're","thick","thing","think","third","this","those","though","thought","three","threw","throat","through","throw","tie","tight","time","tiny","tire","to","today","together","told","tomorrow","tone","tongue","tonight","too","took","top","totally","touch","toward","town","track","trail","train","tree","trip","trouble","trust","truth","try","turn","TV","twenty","two","type","uncle","under","understand","until","up","upon","us","use","usual","usually","very","visit","voice","wait","wake","walk","wall","want","warm","warn","was","wasn't","watch","water","wave","way","we","we'll","we're","we've","wear","week","weird","well","went","were","weren't","wet","what","what's","whatever","when","where","whether","which","while","whisper","white","who","whole","why","wide","wife","will","wind","window","wipe","wish","with","within","without","woke","woman","women","won't","wonder","wood","word","wore","work","world","worry","worse","would","wouldn't","wow","wrap","write","wrong","yeah","year","yell","yes","yet","you","you'd","you'll","you're","you've","young","your","yourself","true"];
// same list with some shorter words removed
var commonWords2 = ["able","about","above","accept","across","act","actually","add","admit","afraid","after","afternoon","again","against","age","ago","agree","ahead","air","all","allow","almost","alone","along","already","alright","also","although","always","am","amaze","an","and","anger","angry","animal","annoy","another","answer","any","anymore","anyone","anything","anyway","apartment","apparently","appear","approach","are","area","aren't","arm","around","arrive","as","ask","asleep","ass","at","attack","attempt","attention","aunt","avoid","away","baby","back","bad","bag","ball","band","bar","barely","bathroom","be","beat","beautiful","became","because","become","bed","bedroom","been","before","began","begin","behind","believe","bell","beside","besides","best","better","between","big","bit","bite","black","blink","block","blonde","blood","blue","blush","body","book","bore","both","bother","bottle","bottom","box","boy","boyfriend","brain","break","breakfast","breath","breathe","bright","bring","broke","broken","brother","brought","brown","brush","build","burn","burst","bus","business","busy","but","buy","by","call","calm","came","can","can't","car","card","care","carefully","carry","case","cat","catch","caught","cause","cell","chair","chance","change","chase","check","cheek","chest","child","children","chuckle","city","class","clean","clear","climb","close","clothes","coffee","cold","college","color","come","comment","complete","completely","computer","concern","confuse","consider","continue","control","conversation","cool","corner","couch","could","couldn't","counter","couple","course","cover","crack","crazy","cross","crowd","cry","cup","cut","cute","dad","damn","dance","dark","date","daughter","day","dead","deal","dear","death","decide","deep","definitely","desk","did","didn't","die","different","dinner","direction","disappear","do","doctor","does","doesn't","dog","don't","done","door","doubt","down","drag","draw","dream","dress","drink","drive","drop","drove","dry","during","each","ear","early","easily","easy","eat","edge","either","else","empty","end","enjoy","enough","enter","entire","escape","especially","even","evening","eventually","ever","every","everyone","everything","exactly","except","excite","exclaim","excuse","expect","explain","expression","eye","eyebrow","face","fact","fall","family","far","fast","father","fault","favorite","fear","feel","feet","fell","felt","few","field","fight","figure","fill","finally","find","fine","finger","finish","fire","first","fit","five","fix","flash","flip","floor","fly","focus","follow","food","foot","for","force","forget","form","forward","found","four","free","friend","from","front","frown","fuck","full","fun","funny","further","game","gasp","gave","gaze","gently","get","giggle","girl","girlfriend","give","given","glad","glance","glare","glass","go","God","gone","gonna","good","got","gotten","grab","great","green","greet","grey","grin","grip","groan","ground","group","grow","guard","guess","gun","guy","had","hadn't","hair","half","hall","hallway","hand","handle","hang","happen","happy","hard","has","hate","have","haven't","he","he'd","he's","head","hear","heard","heart","heavy","held","hell","hello","help","her","here","herself","hey","hi","hide","high","him","himself","his","hit","hold","home","hope","horse","hospital","hot","hour","house","how","however","hug","huge","huh","human","hundred","hung","hurry","hurt","I'd","I'll","I'm","I've","ice","idea","if","ignore","imagine","immediately","important","in","inside","instead","interest","interrupt","into","is","isn't","it","it's","its","jacket","jeans","jerk","job","join","joke","jump","just","keep","kept","key","kick","kid","kill","kind","kiss","kitchen","knee","knew","knock","know","known","lady","land","large","last","late","laugh","lay","lead","lean","learn","least","leave","led","left","leg","less","let","letter","lie","life","lift","light","like","line","lip","listen","little","live","lock","locker","long","look","lose","lost","lot","loud","love","low","lunch","mad","made","make","man","manage","many","mark","marry","match","matter","may","maybe","me","mean","meant","meet","memory","men","mention","met","middle","might","mind","mine","minute","mirror","miss","mom","moment","money","month","mood","more","morning","most","mother","mouth","move","movie","Mr.","Mrs.","much","mum","mumble","music","must","mutter","my","myself","name","near","nearly","neck","need","nervous","never","new","next","nice","night","no","nod","noise","none","normal","nose","not","note","nothing","notice","now","number","obviously","of","off","offer","office","often","oh","okay","old","on","once","one","only","onto","open","or","order","other","our","out","outside","over","own","pack","pain","paint","pair","pants","paper","parents","park","part","party","pass","past","pause","pay","people","perfect","perhaps","person","phone","pick","picture","piece","pink","piss","place","plan","play","please","pocket","point","police","pop","position","possible","power","practically","present","press","pretend","pretty","probably","problem","promise","pull","punch","push","put","question","quick","quickly","quiet","quietly","quite","race","rain","raise","ran","rang","rather","reach","read","ready","real","realize","really","reason","recognize","red","relationship","relax","remain","remember","remind","repeat","reply","respond","rest","return","ride","right","ring","road","rock","roll","room","rose","round","rub","run","rush","sad","safe","said","same","sat","save","saw","say","scare","school","scream","search","seat","second","see","seem","seen","self","send","sense","sent","serious","seriously","set","settle","seven","several","shadow","shake","share","she","she'd","she's","shift","shirt","shit","shock","shoe","shook","shop","short","shot","should","shoulder","shouldn't","shout","shove","show","shower","shrug","shut","sick","side","sigh","sight","sign","silence","silent","simply","since","single","sir","sister","sit","situation","six","skin","sky","slam","sleep","slightly","slip","slow","slowly","small","smell","smile","smirk","smoke","snap","so","soft","softly","some","somehow","someone","something","sometimes","somewhere","son","song","soon","sorry","sort","sound","space","speak","spend","spent","spoke","spot","stair","stand","star","stare","start","state","stay","step","stick","still","stomach","stood","stop","store","story","straight","strange","street","strong","struggle","stuck","student","study","stuff","stupid","such","suck","sudden","suddenly","suggest","summer","sun","suppose","sure","surprise","surround","sweet","table","take","taken","talk","tall","teacher","team","tear","teeth","tell","ten","than","thank","that","that's","the","their","them","themselves","then","there","there's","these","they","they'd","they're","thick","thing","think","third","this","those","though","thought","three","threw","throat","through","throw","tie","tight","time","tiny","tire","to","today","together","told","tomorrow","tone","tongue","tonight","too","took","top","totally","touch","toward","town","track","trail","train","tree","trip","trouble","trust","truth","try","turn","TV","twenty","two","type","uncle","under","understand","until","up","upon","us","use","usual","usually","very","visit","voice","wait","wake","walk","wall","want","warm","warn","was","wasn't","watch","water","wave","way","we","we'll","we're","we've","wear","week","weird","well","went","were","weren't","wet","what","what's","whatever","when","where","whether","which","while","whisper","white","who","whole","why","wide","wife","will","wind","window","wipe","wish","with","within","without","woke","woman","women","won't","wonder","wood","word","wore","work","world","worry","worse","would","wouldn't","wow","wrap","write","wrong","yeah","year","yell","yes","yet","you","you'd","you'll","you're","you've","young","your","yourself","true"];
var cwLen = commonWords2.length;
function checkWord(w) {
    // word is in the common words list
    if(commonWords.indexOf(w) != -1) {
        return true;
    }
    for(var i = 0; i < cwLen; i++) {
        // word is composed of a common word (i.e. everywhere contains every)
        if(w.indexOf(commonWords2[i]) != -1) {
            return true;
        }
    }
    return false;
}

// Create the handler that responds to the Alexa Request.
exports.handler = function (event, context) {
    var songGenius = new SongGenius();
    songGenius.execute(event, context);
};

