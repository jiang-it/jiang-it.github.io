// Build instructions, assuming that npx and babel are installed:
// npx babel src --out-dir . --presets react-app/prod

// Avert your eyes, the code below is bad
// Q: Is that indicative of how I program professionally?
// A: I plead the Fifth

// TODO list:
// Readjust size of tiles on smaller screens
// Size of text (rules, description, etc)
// Should the letter U be more likely if there's a Q? Or just increase the score of it?
// Add game modifiers
// - 8 tiles instead of 7
// - Start with a random tile
// - Randomly exchange a tile at the end (twice)
// - Pick two tiles at a time instead of 1
// - Pick a tile and get a copy
// Add history stats / histogram?
// Fix enter selecting buttons if we last clicked a letter
// Wild card support?
// Multi letter tile support?

"use strict";

var _slicedToArray = (function () {
  function sliceIterator(arr, i) {
    var _arr = [];
    var _n = true;
    var _d = false;
    var _e = undefined;
    try {
      for (
        var _i = arr[Symbol.iterator](), _s;
        !(_n = (_s = _i.next()).done);
        _n = true
      ) {
        _arr.push(_s.value);
        if (i && _arr.length === i) break;
      }
    } catch (err) {
      _d = true;
      _e = err;
    } finally {
      try {
        if (!_n && _i["return"]) _i["return"]();
      } finally {
        if (_d) throw _e;
      }
    }
    return _arr;
  }
  return function (arr, i) {
    if (Array.isArray(arr)) {
      return arr;
    } else if (Symbol.iterator in Object(arr)) {
      return sliceIterator(arr, i);
    } else {
      throw new TypeError(
        "Invalid attempt to destructure non-iterable instance"
      );
    }
  };
})();

var _createClass = (function () {
  function defineProperties(target, props) {
    for (var i = 0; i < props.length; i++) {
      var descriptor = props[i];
      descriptor.enumerable = descriptor.enumerable || false;
      descriptor.configurable = true;
      if ("value" in descriptor) descriptor.writable = true;
      Object.defineProperty(target, descriptor.key, descriptor);
    }
  }
  return function (Constructor, protoProps, staticProps) {
    if (protoProps) defineProperties(Constructor.prototype, protoProps);
    if (staticProps) defineProperties(Constructor, staticProps);
    return Constructor;
  };
})();

function _possibleConstructorReturn(self, call) {
  if (!self) {
    throw new ReferenceError(
      "this hasn't been initialised - super() hasn't been called"
    );
  }
  return call && (typeof call === "object" || typeof call === "function")
    ? call
    : self;
}

function _inherits(subClass, superClass) {
  if (typeof superClass !== "function" && superClass !== null) {
    throw new TypeError(
      "Super expression must either be null or a function, not " +
        typeof superClass
    );
  }
  subClass.prototype = Object.create(superClass && superClass.prototype, {
    constructor: {
      value: subClass,
      enumerable: false,
      writable: true,
      configurable: true,
    },
  });
  if (superClass)
    Object.setPrototypeOf
      ? Object.setPrototypeOf(subClass, superClass)
      : (subClass.__proto__ = superClass);
}

function _classCallCheck(instance, Constructor) {
  if (!(instance instanceof Constructor)) {
    throw new TypeError("Cannot call a class as a function");
  }
}

var Tile = (function () {
  function Tile(letter, value) {
    _classCallCheck(this, Tile);

    this.letter = letter;
    this.value = value;
    this.selected = false;
  }

  _createClass(Tile, [
    {
      key: "select",
      value: function select() {
        this.selected = true;
      },
    },
    {
      key: "unselect",
      value: function unselect() {
        this.selected = false;
      },
    },
  ]);

  return Tile;
})();

function HTMLTile(props) {
  return React.createElement(
    "button",
    {
      onClick: function onClick() {
        props.callback();
      },
      className:
        (props.is_selectable ? "selectable" : "") +
        (props.is_selected ? " selected" : ""),
    },
    React.createElement(
      "span",
      { className: "letter" },
      props.letter.toUpperCase()
    ),
    React.createElement("span", { className: "score" }, props.value)
  );
}

var Game = (function (_React$Component) {
  _inherits(Game, _React$Component);

  function Game(props) {
    _classCallCheck(this, Game);

    var _this = _possibleConstructorReturn(
      this,
      (Game.__proto__ || Object.getPrototypeOf(Game)).call(this, props)
    );

    var time = new Date();
    var _ref = [time.getDate(), time.getMonth(), time.getFullYear()],
      day = _ref[0],
      month = _ref[1],
      year = _ref[2];

    var seed = (day * 100 + month) * 10000 + year;
    _this.seed = seed;
    _this.random = mulberry32(seed);

    var _this$get_tiles = _this.get_tiles([], get_starting_bag_of_tiles(), 7),
      _this$get_tiles2 = _slicedToArray(_this$get_tiles, 2),
      tiles = _this$get_tiles2[0],
      bag_of_tiles = _this$get_tiles2[1];

    var themes = get_themes();
    var theme = themes[_this.get_random(0, themes.length - 1)];

    // Check history
    var myStorage = window.localStorage;
    // TODO: Potentially do some validation?
    // Meh, it's all run on the client anyway?
    var already_played_word = myStorage.getItem(_this.seed.toString() + "word");
    if (already_played_word !== null) {
      var already_played_score = myStorage.getItem(
        _this.seed.toString() + "score"
      );
      _this.state = {
        theme: theme,
        stage: Game.SCORE,
        tiles: [],
        chosen_tiles: [],
        bag_of_tiles: [],
        spelled_word: spelled_word_storage_to_spelled_word(already_played_word),
        score: already_played_score,
      };
    } else {
      _this.state = {
        theme: theme,
        stage: Game.SELECTING,
        tiles: tiles,
        chosen_tiles: [],
        bag_of_tiles: bag_of_tiles,
        spelled_word: [],
        score: 0,
      };
    }

    // Doesn't quite work since enter can also be used when selecting a button. Make sure we only do it when we are in the text box
    document.addEventListener("keyup", function (e) {
      if (e.key === "Enter") {
        if (_this.state.stage === Game.SPELLING) {
          _this.processWord();
        }
      }
    });
    return _this;
  }

  _createClass(Game, [
    {
      key: "processWord",
      value: function processWord() {
        if (is_valid_word(spelled_word_to_string(this.state.spelled_word))) {
          var score =
            this.state.spelled_word.reduce(function (prev_value, index_tile) {
              return prev_value + index_tile[1].value;
            }, 0) + this.state.theme[1](this.state.spelled_word);
          this.setState({
            stage: Game.SCORE,
            tiles: this.state.tiles,
            chosen_tiles: this.state.chosen_tiles,
            bag_of_tiles: this.state.bag_of_tiles,
            spelled_word: this.state.spelled_word,
            score: score,
          });

          // Save to history // Read from history?
          var myStorage = window.localStorage;
          myStorage.setItem(
            this.seed.toString() + "word",
            spelled_word_to_storage(this.state.spelled_word)
          );
          myStorage.setItem(this.seed.toString() + "score", score.toString());
          // Should we remove entries a year old? Who knows how much storage space this takes up
        } else {
          // Do nothing, wait for a valid input
        }
      },
    },
    {
      key: "processTileClicked",
      value: function processTileClicked(key) {
        var tiles = this.state.tiles.slice();
        var chosen_tile = tiles[key];

        // Remove the tiles from the list
        tiles.splice(key, 1);

        var _get_tiles = this.get_tiles(
            tiles,
            this.state.bag_of_tiles,
            tiles.length
          ),
          _get_tiles2 = _slicedToArray(_get_tiles, 2),
          new_tiles = _get_tiles2[0],
          bag_of_tiles = _get_tiles2[1];

        var chosen_tiles = this.state.chosen_tiles.slice();
        chosen_tiles.push(chosen_tile);

        var stage = tiles.length === 0 ? Game.SPELLING : Game.SELECTING;

        this.setState({
          stage: stage,
          tiles: new_tiles,
          chosen_tiles: chosen_tiles,
          bag_of_tiles: bag_of_tiles,
          spelled_word: [],
          score: 0,
        });
      },
    },
    {
      key: "generateTiles",
      value: function generateTiles(tiles, _callback, is_selectable) {
        return React.createElement(
          "div",
          null,
          tiles.map(function (tile, index) {
            return React.createElement(HTMLTile, {
              key: index,
              letter: tile.letter,
              value: tile.value,
              callback: function callback() {
                _callback(index);
              },
              is_selectable: is_selectable,
              is_selected: tile.selected,
            });
          })
        );
      },
    },
    {
      key: "spellTileClicked",
      value: function spellTileClicked(index) {
        if (this.state.stage === Game.SPELLING) {
          var chosen_tiles = this.state.chosen_tiles.slice();

          var spelled_word = this.state.spelled_word.slice();

          if (chosen_tiles[index].selected) {
            chosen_tiles[index].unselect();
            var i = spelled_word.findIndex(function (index_tile) {
              return index_tile[0] === index;
            });
            spelled_word.splice(i, 1);
          } else {
            chosen_tiles[index].select();
            spelled_word.push([index, chosen_tiles[index]]);
          }

          this.setState({
            stage: this.state.stage,
            tiles: [],
            chosen_tiles: chosen_tiles,
            bag_of_tiles: this.state.bag_of_tiles,
            spelled_word: spelled_word,
            score: 0,
          });
        }
      },
    },
    {
      key: "render",
      value: function render() {
        var _this2 = this;

        var theme_div = React.createElement(
          "div",
          null,
          React.createElement("h3", null, this.state.theme[0])
        );

        var tile_choices_div =
          this.state.stage === Game.SELECTING
            ? React.createElement(
                "div",
                { id: "tile-choices" },
                React.createElement(
                  "div",
                  null,
                  React.createElement("h2", null, "PICK A TILE")
                ),
                this.generateTiles(
                  this.state.tiles,
                  function (index) {
                    _this2.processTileClicked(index);
                  },
                  this.state.stage === Game.SELECTING
                )
              )
            : null;

        var selected_tiles_div =
          (this.state.stage === Game.SELECTING &&
            this.state.chosen_tiles.length > 0) ||
          this.state.stage === Game.SPELLING
            ? React.createElement(
                "div",
                { id: "selected-tiles" },
                React.createElement(
                  "div",
                  null,
                  React.createElement(
                    "h2",
                    null,
                    this.state.stage === Game.SPELLING
                      ? "Spell a word. No proper nouns."
                      : "YOUR TILES"
                  )
                ),
                this.generateTiles(
                  this.state.chosen_tiles,
                  function (index) {
                    _this2.spellTileClicked(index);
                  },
                  this.state.stage === Game.SPELLING
                )
              )
            : null;

        var valid_word = is_valid_word(
          spelled_word_to_string(this.state.spelled_word)
        );

        var input_div =
          this.state.stage === Game.SPELLING
            ? React.createElement(
                "div",
                { id: "input" },
                React.createElement("input", {
                  type: "text",
                  value: spelled_word_to_string(this.state.spelled_word),
                  onChange: function onChange(e) {
                    var new_str = e.target.value.toLowerCase();
                    var chosen_tiles = _this2.state.chosen_tiles.slice();
                    var spelled_word = [];
                    chosen_tiles.forEach(function (tile) {
                      tile.unselect();
                    });

                    var _loop = function _loop(i) {
                      var index = chosen_tiles.findIndex(function (tile) {
                        return (
                          tile.letter === new_str[i] && tile.selected === false
                        );
                      });
                      if (index > -1) {
                        chosen_tiles[index].select();
                        spelled_word.push([index, chosen_tiles[index]]);
                      }
                    };

                    for (var i = 0; i < new_str.length; i++) {
                      _loop(i);
                    }

                    _this2.setState({
                      chosen_tiles: chosen_tiles,
                      spelled_word: spelled_word,
                      stage: _this2.state.stage,
                      tiles: _this2.state.tiles,
                      bag_of_tiles: _this2.state.bag_of_tiles,
                      score: 0,
                    });
                  },
                }),
                React.createElement(
                  "button",
                  {
                    className: valid_word ? "valid-word" : "invalid-word",
                    id: "submit-button",
                    onClick: function onClick() {
                      if (_this2.state.stage === Game.SPELLING) {
                        _this2.processWord();
                      }
                    },
                  },
                  valid_word ? "SUBMIT" : "INVALID"
                )
              )
            : null;

        var word_tiles = [];
        if (this.state.stage === Game.SCORE) {
          for (var i = 0; i < this.state.spelled_word.length; i++) {
            var _index2 = this.state.spelled_word[i][0];
            // Reset this to false. This is not great since we are mutating value in place, but whatever
            this.state.spelled_word[i][1].unselect();
            word_tiles.push(this.state.spelled_word[i][1]);
          }
        }

        var score_div =
          this.state.stage === Game.SCORE
            ? React.createElement(
                "div",
                null,
                React.createElement("h2", null, "You scored"),
                React.createElement(
                  "div",
                  null,
                  React.createElement("h1", null, this.state.score)
                ),
                React.createElement("h2", null, "with the word"),
                this.generateTiles(word_tiles, function (_index) {}, false)
              )
            : null;

        return React.createElement(
          "div",
          { id: "game" },
          theme_div,
          tile_choices_div,
          selected_tiles_div,
          input_div,
          score_div
        );
      },

      // Returns an integer between lower and upper [inclusive].
      // Intends to be approximately uniform
    },
    {
      key: "get_random",
      value: function get_random(lower, upper) {
        lower = Math.ceil(lower);
        upper = Math.floor(upper);
        var diff = upper - lower;
        return Math.floor(this.random() * (diff + 1) + lower);
      },

      // Assumes that num > old_tiles / 1
      // Returns new_tiles, bag_of_tiles
    },
    {
      key: "get_tiles",
      value: function get_tiles(old_tiles, bag_of_tiles, num) {
        old_tiles = old_tiles.slice();
        bag_of_tiles = bag_of_tiles.slice();
        var new_tiles = [];

        // Keep half of the old tiles
        var half = Math.floor(old_tiles.length / 2);
        for (var i = 0; i < half; i++) {
          var rand = this.get_random(0, old_tiles.length - 1);
          new_tiles.push(old_tiles[rand]);
          old_tiles.splice(rand, 1);
        }

        // Get tiles out of the bag
        while (new_tiles.length < num) {
          // Perhaps check for no tiles?
          var _rand = this.get_random(0, bag_of_tiles.length - 1);
          new_tiles.push(bag_of_tiles[_rand]);
          bag_of_tiles.splice(_rand, 1);
        }

        // Put the unused old tiles back into the bag
        bag_of_tiles = bag_of_tiles.concat(old_tiles);
        return [new_tiles, bag_of_tiles];

        // Do we care about Q/U connectivity?
      },
    },
  ]);

  return Game;
})(React.Component);

Game.SELECTING = "SELECTING";
Game.SPELLING = "SPELLING";
Game.SCORE = "SCORE";

var domContainer = document.querySelector("#novelty_game_container");
ReactDOM.render(React.createElement(Game, null), domContainer);

// ===========================================

function get_starting_bag_of_tiles() {
  var num_letter_score_pairs = [
    [3, "a", 1],
    [1, "b", 3],
    [1, "c", 3],
    [2, "d", 2],
    [4, "e", 1],
    [1, "f", 4],
    [2, "g", 2],
    [1, "h", 3],
    [2, "i", 1],
    [1, "j", 8],
    [1, "k", 4],
    [2, "l", 2],
    [1, "m", 3],
    [3, "n", 1],
    [2, "o", 1],
    [1, "p", 3],
    [1, "q", 10],
    [2, "r", 1],
    [1, "s", 1],
    [3, "t", 1],
    [2, "u", 1],
    [1, "v", 4],
    [1, "w", 4],
    [1, "x", 7],
    [1, "y", 3],
    [1, "z", 8],
  ];

  var bag_of_tiles = [];
  num_letter_score_pairs.forEach(function (num_letter_score) {
    var _num_letter_score = _slicedToArray(num_letter_score, 3),
      num = _num_letter_score[0],
      letter = _num_letter_score[1],
      score = _num_letter_score[2];

    for (var i = 0; i < num; i++) {
      bag_of_tiles.push(new Tile(letter, score));
    }
  });
  return bag_of_tiles;
}

function is_valid_word(word) {
  // Man, it's crazy that I ask people to write binary search
  // when I don't want to write binary search. I guess that's
  // part of the game
  return list_of_words.includes(word);
}

function spelled_word_to_string(spelled_word) {
  return spelled_word.reduce(function (prevValue, index_tile) {
    return prevValue.concat(index_tile[1].letter).toUpperCase();
  }, "");
}

function spelled_word_to_storage(spelled_word) {
  console.log(spelled_word);
  return spelled_word.reduce(function (prevValue, index_tile) {
    var s = index_tile[1].letter + "|" + index_tile[1].value.toString();
    console.log(s);
    return prevValue.concat(prevValue === "" ? s : "/" + s);
  }, "");
}

function spelled_word_storage_to_spelled_word(spelled_word_storage) {
  var letter_score_arr = spelled_word_storage.split("/");
  var spelled_word = [];
  for (var i = 0; i < letter_score_arr.length; i++) {
    var _letter_score_arr$i$s = letter_score_arr[i].split("|"),
      _letter_score_arr$i$s2 = _slicedToArray(_letter_score_arr$i$s, 2),
      letter = _letter_score_arr$i$s2[0],
      score = _letter_score_arr$i$s2[1];

    spelled_word.push([i, new Tile(letter, score)]);
  }
  return spelled_word;
}

function get_themes() {
  var explanation_lambda_pairs = [
    [
      "+1 per tile",
      function (spelled_word) {
        return spelled_word.length;
      },
    ],
    [
      "+2 per tile with A, E, I, O, or U",
      function (spelled_word) {
        return (
          spelled_word.filter(function (index_tile) {
            return is_aeiou(index_tile[1].letter);
          }).length * 2
        );
      },
    ],
    [
      "+5 if six or more tiles",
      function (spelled_word) {
        return spelled_word.length >= 6 ? 5 : 0;
      },
    ],
    [
      "+1 per tile if word starts with A, E, I, O, or U",
      function (spelled_word) {
        return is_aeiou(spelled_word[0][1].letter) ? spelled_word.length : 0;
      },
    ],
    [
      "Double the value of the fifth tile",
      function (spelled_word) {
        return spelled_word.length >= 5 ? spelled_word[4][1].value : 0;
      },
    ],
  ];
  return explanation_lambda_pairs;
}

function is_aeiou(char) {
  var c = char.toUpperCase();
  return c === "A" || c === "E" || c === "I" || c === "O" || c === "U";
}

// From https://stackoverflow.com/questions/521295/seeding-the-random-number-generator-in-javascript
// Which seems to be from Tommy Ettinger
function mulberry32(a) {
  return function () {
    var t = (a += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
