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

class Tile {
  constructor(letter, value) {
    this.letter = letter;
    this.value = value;
    this.selected = false;
  }

  select() {
    this.selected = true;
  }

  unselect() {
    this.selected = false;
  }
}

function HTMLTile(props) {
  return (
    <button
      onClick={() => {
        props.callback();
      }}
      className={
        (props.is_selectable ? "selectable" : "") +
        (props.is_selected ? " selected" : "")
      }
    >
      <span className="letter">{props.letter.toUpperCase()}</span>
      <span className="score">{props.value}</span>
    </button>
  );
}

class Game extends React.Component {
  static SELECTING = "SELECTING";
  static SPELLING = "SPELLING";
  static SCORE = "SCORE";

  constructor(props) {
    super(props);

    let time = new Date();
    const [day, month, year] = [
      time.getDate(),
      time.getMonth(),
      time.getFullYear(),
    ];
    const seed = (day * 100 + month) * 10000 + year;
    this.seed = seed;
    this.random = mulberry32(seed);

    const [tiles, bag_of_tiles] = this.get_tiles(
      [],
      get_starting_bag_of_tiles(),
      7
    );

    const themes = get_themes();
    const theme = themes[this.get_random(0, themes.length - 1)];

    // Check history
    let myStorage = window.localStorage;
    // TODO: Potentially do some validation?
    // Meh, it's all run on the client anyway?
    const already_played_word = myStorage.getItem(
      this.seed.toString() + "word"
    );
    if (already_played_word !== null) {
      const already_played_score = myStorage.getItem(
        this.seed.toString() + "score"
      );
      this.state = {
        theme,
        stage: Game.SCORE,
        tiles: [],
        chosen_tiles: [],
        bag_of_tiles: [],
        spelled_word: spelled_word_storage_to_spelled_word(already_played_word),
        score: already_played_score,
      };
    } else {
      this.state = {
        theme,
        stage: Game.SELECTING,
        tiles,
        chosen_tiles: [],
        bag_of_tiles,
        spelled_word: [],
        score: 0,
      };
    }

    // Doesn't quite work since enter can also be used when selecting a button. Make sure we only do it when we are in the text box
    document.addEventListener("keyup", (e) => {
      if (e.key === "Enter") {
        if (this.state.stage === Game.SPELLING) {
          this.processWord();
        }
      }
    });
  }

  processWord() {
    if (is_valid_word(spelled_word_to_string(this.state.spelled_word))) {
      const score =
        this.state.spelled_word.reduce((prev_value, index_tile) => {
          return prev_value + index_tile[1].value;
        }, 0) + this.state.theme[1](this.state.spelled_word);
      this.setState({
        stage: Game.SCORE,
        tiles: this.state.tiles,
        chosen_tiles: this.state.chosen_tiles,
        bag_of_tiles: this.state.bag_of_tiles,
        spelled_word: this.state.spelled_word,
        score,
      });

      // Save to history // Read from history?
      let myStorage = window.localStorage;
      myStorage.setItem(
        this.seed.toString() + "word",
        spelled_word_to_storage(this.state.spelled_word)
      );
      myStorage.setItem(this.seed.toString() + "score", score.toString());
      // Should we remove entries a year old? Who knows how much storage space this takes up
    } else {
      // Do nothing, wait for a valid input
    }
  }

  processTileClicked(key) {
    const tiles = this.state.tiles.slice();
    const chosen_tile = tiles[key];

    // Remove the tiles from the list
    tiles.splice(key, 1);
    const [new_tiles, bag_of_tiles] = this.get_tiles(
      tiles,
      this.state.bag_of_tiles,
      tiles.length
    );

    const chosen_tiles = this.state.chosen_tiles.slice();
    chosen_tiles.push(chosen_tile);

    const stage = tiles.length === 0 ? Game.SPELLING : Game.SELECTING;

    this.setState({
      stage,
      tiles: new_tiles,
      chosen_tiles,
      bag_of_tiles,
      spelled_word: [],
      score: 0,
    });
  }

  generateTiles(tiles, callback, is_selectable) {
    return (
      <div>
        {tiles.map((tile, index) => {
          return (
            <HTMLTile
              key={index}
              letter={tile.letter}
              value={tile.value}
              callback={() => {
                callback(index);
              }}
              is_selectable={is_selectable}
              is_selected={tile.selected}
            ></HTMLTile>
          );
        })}
      </div>
    );
  }

  spellTileClicked(index) {
    if (this.state.stage === Game.SPELLING) {
      const chosen_tiles = this.state.chosen_tiles.slice();

      let spelled_word = this.state.spelled_word.slice();

      if (chosen_tiles[index].selected) {
        chosen_tiles[index].unselect();
        const i = spelled_word.findIndex(
          (index_tile) => index_tile[0] === index
        );
        spelled_word.splice(i, 1);
      } else {
        chosen_tiles[index].select();
        spelled_word.push([index, chosen_tiles[index]]);
      }

      this.setState({
        stage: this.state.stage,
        tiles: [],
        chosen_tiles,
        bag_of_tiles: this.state.bag_of_tiles,
        spelled_word,
        score: 0,
      });
    }
  }

  render() {
    const theme_div = (
      <div>
        <h3>{this.state.theme[0]}</h3>
      </div>
    );

    const tile_choices_div =
      this.state.stage === Game.SELECTING ? (
        <div id="tile-choices">
          <div>
            <h2>{"PICK A TILE"}</h2>
          </div>
          {this.generateTiles(
            this.state.tiles,
            (index) => {
              this.processTileClicked(index);
            },
            this.state.stage === Game.SELECTING
          )}
        </div>
      ) : null;

    const selected_tiles_div =
      (this.state.stage === Game.SELECTING &&
        this.state.chosen_tiles.length > 0) ||
      this.state.stage === Game.SPELLING ? (
        <div id="selected-tiles">
          <div>
            <h2>
              {this.state.stage === Game.SPELLING
                ? "Spell a word. No proper nouns."
                : "YOUR TILES"}
            </h2>
          </div>
          {this.generateTiles(
            this.state.chosen_tiles,
            (index) => {
              this.spellTileClicked(index);
            },
            this.state.stage === Game.SPELLING
          )}
        </div>
      ) : null;

    const valid_word = is_valid_word(
      spelled_word_to_string(this.state.spelled_word)
    );

    const input_div =
      this.state.stage === Game.SPELLING ? (
        <div id="input">
          <input
            type="text"
            value={spelled_word_to_string(this.state.spelled_word)}
            onChange={(e) => {
              const new_str = e.target.value.toLowerCase();
              const chosen_tiles = this.state.chosen_tiles.slice();
              const spelled_word = [];
              chosen_tiles.forEach((tile) => {
                tile.unselect();
              });

              for (let i = 0; i < new_str.length; i++) {
                let index = chosen_tiles.findIndex((tile) => {
                  return tile.letter === new_str[i] && tile.selected === false;
                });
                if (index > -1) {
                  chosen_tiles[index].select();
                  spelled_word.push([index, chosen_tiles[index]]);
                }
              }

              this.setState({
                chosen_tiles,
                spelled_word,
                stage: this.state.stage,
                tiles: this.state.tiles,
                bag_of_tiles: this.state.bag_of_tiles,
                score: 0,
              });
            }}
          ></input>
          <button
            className={valid_word ? "valid-word" : "invalid-word"}
            id="submit-button"
            onClick={() => {
              if (this.state.stage === Game.SPELLING) {
                this.processWord();
              }
            }}
          >
            {valid_word ? "SUBMIT" : "INVALID"}
          </button>
        </div>
      ) : null;

    const word_tiles = [];
    if (this.state.stage === Game.SCORE) {
      for (let i = 0; i < this.state.spelled_word.length; i++) {
        let index = this.state.spelled_word[i][0];
        // Reset this to false. This is not great since we are mutating value in place, but whatever
        this.state.spelled_word[i][1].unselect();
        word_tiles.push(this.state.spelled_word[i][1]);
      }
    }

    const score_div =
      this.state.stage === Game.SCORE ? (
        <div>
          <h2>{"You scored"}</h2>
          <div>
            <h1>{this.state.score}</h1>
          </div>
          <h2>{"with the word"}</h2>
          {this.generateTiles(word_tiles, (_index) => {}, false)}
        </div>
      ) : null;

    return (
      <div id="game">
        {theme_div}
        {tile_choices_div}
        {selected_tiles_div}
        {input_div}
        {score_div}
      </div>
    );
  }

  // Returns an integer between lower and upper [inclusive].
  // Intends to be approximately uniform
  get_random(lower, upper) {
    lower = Math.ceil(lower);
    upper = Math.floor(upper);
    const diff = upper - lower;
    return Math.floor(this.random() * (diff + 1) + lower);
  }

  // Assumes that num > old_tiles / 1
  // Returns new_tiles, bag_of_tiles
  get_tiles(old_tiles, bag_of_tiles, num) {
    old_tiles = old_tiles.slice();
    bag_of_tiles = bag_of_tiles.slice();
    const new_tiles = [];

    // Keep half of the old tiles
    const half = Math.floor(old_tiles.length / 2);
    for (let i = 0; i < half; i++) {
      let rand = this.get_random(0, old_tiles.length - 1);
      new_tiles.push(old_tiles[rand]);
      old_tiles.splice(rand, 1);
    }

    // Get tiles out of the bag
    while (new_tiles.length < num) {
      // Perhaps check for no tiles?
      let rand = this.get_random(0, bag_of_tiles.length - 1);
      new_tiles.push(bag_of_tiles[rand]);
      bag_of_tiles.splice(rand, 1);
    }

    // Put the unused old tiles back into the bag
    bag_of_tiles = bag_of_tiles.concat(old_tiles);
    return [new_tiles, bag_of_tiles];

    // Do we care about Q/U connectivity?
  }
}

let domContainer = document.querySelector("#novelty_game_container");
ReactDOM.render(<Game />, domContainer);

// ===========================================

function get_starting_bag_of_tiles() {
  const num_letter_score_pairs = [
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
    // [1, "Wild", 0],
  ];

  let bag_of_tiles = [];
  num_letter_score_pairs.forEach((num_letter_score) => {
    const [num, letter, score] = num_letter_score;
    for (let i = 0; i < num; i++) {
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
  return spelled_word.reduce((prevValue, index_tile) => {
    return prevValue.concat(index_tile[1].letter).toUpperCase();
  }, "");
}

function spelled_word_to_storage(spelled_word) {
  console.log(spelled_word);
  return spelled_word.reduce((prevValue, index_tile) => {
    const s = index_tile[1].letter + "|" + index_tile[1].value.toString();
    console.log(s);
    return prevValue.concat(prevValue === "" ? s : "/" + s);
  }, "");
}

function spelled_word_storage_to_spelled_word(spelled_word_storage) {
  const letter_score_arr = spelled_word_storage.split("/");
  const spelled_word = [];
  for (let i = 0; i < letter_score_arr.length; i++) {
    const [letter, score] = letter_score_arr[i].split("|");
    spelled_word.push([i, new Tile(letter, score)]);
  }
  return spelled_word;
}

function get_themes() {
  const explanation_lambda_pairs = [
    [
      "+1 per tile",
      (spelled_word) => {
        return spelled_word.length;
      },
    ],
    [
      "+2 per tile with A, E, I, O, or U",
      (spelled_word) => {
        return (
          spelled_word.filter((index_tile) => {
            return is_aeiou(index_tile[1].letter);
          }).length * 2
        );
      },
    ],
    [
      "+5 if six or more tiles",
      (spelled_word) => {
        return spelled_word.length >= 6 ? 5 : 0;
      },
    ],
    [
      "+1 per tile if word starts with A, E, I, O, or U",
      (spelled_word) => {
        return is_aeiou(spelled_word[0][1].letter) ? spelled_word.length : 0;
      },
    ],
    [
      "Double the value of the fifth tile",
      (spelled_word) => {
        return spelled_word.length >= 5 ? spelled_word[4][1].value : 0;
      },
    ],
  ];
  return explanation_lambda_pairs;
}

function is_aeiou(char) {
  const c = char.toUpperCase();
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
