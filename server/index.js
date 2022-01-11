// server/index.js

const path = require("path");
const express = require("express");
const pg = require("pg");
const Pool = pg.Pool 
const cors = require("cors");
const jwt = require("jsonwebtoken");
const cookieParser = require("cookie-parser");
const { createTokens, validateToken, getId } = require("./jwt");
const bodyParser = require('body-parser');

const PORT = process.env.PORT || 3001;

const app = express();
app.use(cors());
app.use(cookieParser());

// parse application/x-www-form-urlencoded
app.use(bodyParser.urlencoded({ extended: false }))

// parse application/json
app.use(bodyParser.json())

// MySQL connection
var pool = new Pool ({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  }
})

// Export the data
exports.pool = pool;


// Pokemon Species Query
app.get("/pokemonSpecies", (req, res) => {
    pool.query("SELECT * FROM pokemon_species", function(err, result) {
      if (err) res.status(400).json({Error: err});
      res.send(result)
  })
});

// Pokemon Types query
app.get("/pokemonTypes", (req, res) => {
  pool.query("SELECT * FROM poke_types", function (err, result) {
    if (err) res.status(400).json({Error: err});
    res.send(result)
  });
});

// Pokemon Type Effectiveness query
app.get("/typeEffectiveness", express.json(), (req, res) => {
  var type1 = req.query.type1;
  var type2 = req.query.type2;
  var sql = `SELECT * FROM calculate_weaknesses(${type1}, ${type2})`;
  pool.query(sql, function (err, result) {
    if (err) res.status(400).json({Error: err});
    res.send(result)
  });
});

// Pokemon Types Assigned to Pokemon query
app.get("/indivPokemonTypes", express.json(), (req, res) => {
  var poke_name = String(req.query.name);
  var sql = "SELECT * FROM indiv_pokemon_types WHERE poke_name = " + pool.escape(poke_name);
  pool.query(sql, (err, result) => {
    if (err) {
      if (err) res.status(400).json({Error: err});
    }
    res.send(result);
  });
});

// Get a user's teams - query
app.get("/userToTeamID", express.json(), (req, res) => {
  // Call: http://localhost:3000/userToTeamID
  // Example: http://localhost:3000/userToTeamID
  var userID = getId(req);
  var sql = `SELECT * FROM user_to_team_ids(${userID})`;
  pool.query(sql, function (err, result) {
    if (err) res.status(400).json({Error: err});
    res.send(result)
  });
});

// Get a list of Pokemon that represent a team (given ID) - query
app.get("/teamIDToPokemon", express.json(), (req, res) => {
  // Call: http://localhost:3000/teamIDToPokemon?teamID={teamIDNumber}
  // Example: http://localhost:3000/teamIDToPokemon?teamID=1
  var teamID = req.query.teamID;
  var sql = `SELECT * FROM team_id_to_pokemon(${teamID})`;
  pool.query(sql, function (err, result) {
    if (err) res.status(400).json({Error: err});
    res.send(result)
  });
});

// Register (save) a Pokemon team - query
app.post("/savePokemonTeam", express.json(), (req, res) => {

  // Params necessary for procedure call
  var teamName = String(req.query.teamName);
  var teamDesc = String(req.query.teamDesc);
  var memberID = getId(req);
  var poke1 = req.query.poke1;
  var poke2 = req.query.poke2;
  var poke3 = req.query.poke3;
  var poke4 = req.query.poke4;
  var poke5 = req.query.poke5;
  var poke6 = req.query.poke6;

  pool.query("SELECT * FROM add_team(?, ?, ?, ?, ?, ?, ?, ?, ?)", [teamName, teamDesc, memberID, poke1, poke2, poke3, poke4, poke5, poke6], function (err, result) {
    if (err) throw err;
    res.send(result)
  });
});

// Delete a saved Pokemon team - query
app.put("/deletePokemonTeam", express.json(), (req, res) => {
  var teamID = req.query.teamID;

  pool.query("SELECT * FROM delete_team(?)", [teamID], function (err, result) {
    if (err) throw err;
    res.send(result)
  });
});

// Have Node serve the files for our built React app
app.use(express.static(path.resolve(__dirname, "../client/build")));

// All other GET requests not handled before will return our React app
app.get("*", (req, res) => {
  res.sendFile(path.resolve(__dirname, "../client/build", "index.html"));
});

// request that registers the user with the given username and password
app.post("/api/register", express.json(), (req, res) => {
  const username = req.body.username;
  const password = req.body.password;
  pool.query("CALL add_user(?, ?, FALSE)", [username, password], function (err, results) {
    if (err) res.status(400).json({Error: err});
    const result = results[0][0];

    if (result.MESSAGE === 'User registered.') {
      const token = createTokens(result.member_id);
      res.cookie("accessToken", token, {
        maxAge: 2592000000,
      });
      res.json( {registered: true, message: result.MESSAGE, token: token} );
    } else {
      res.json( {registered: false, message: result.MESSAGE} );
    }
  });
});

// request that validates login details given the username and password
app.post("/api/login", express.json(), (req, res) => {
  const username = req.body.username;
  const password = req.body.password;
  pool.query(`SELECT * FROM sign_in(?,?)`, [username, password], (err, results) => {
    if (err) {
      if (err) res.status(400).json({Error: err});
    }

    const member = results[0][0];
    if (member.auth) {
      const token = createTokens(member.member_id);
      res.cookie("accessToken", token, {
        maxAge: 2592000000,
      });
      res.json( { auth: member.auth,  token: token });
    } else {
      res.json( { auth: member.auth });
    }
  });
});

// request to get the username of the requested user 
app.get("/api/my-profile", (req, res) => {
  if (validateToken) {
    const id = getId(req);
    pool.query("SELECT username FROM member WHERE member_id=?", id, (err, results) => {
      if (err) res.status(400).json({Error: err});
      res.json({ username: results[0].username});
    });
  } 
});

// request to change the password of the requested user
app.put("/api/change-password", (req, res) => {
  if (validateToken) {
    const password = req.body.password;
    const id = getId(req);
    pool.query("SELECT * FROM change_password(?,?)", [id, password], (err, results) => {
      if (err) res.status(400).json({Error: err});
      const result = results[0][0];
      if (result.MESSAGE === 'Password has been changed.') {
        res.json({success: true, message: result.MESSAGE});
      } else {
        res.json({success: false, message: result.MESSAGE});
      }
    });
  }
});

// request for backend to delete the user of the device and remove their cookies
app.delete("/api/delete-user", (req, res) => {
  if (validateToken) {
    const id = getId(req);
    pool.query("SELECT * FROM delete_user(?)", id, (err, results) => {
      if (err) res.status(400).json({Error: err});
      const result = results[0][0];
      if (result.MESSAGE === 'User has been deleted.') {
        res.clearCookie("accessToken")
        res.json({deleted: true, message: result.MESSAGE});
      } else {
        res.json({deleted: false, message: result.MESSAGE});
      }
    });
  }
});

// All other GET requests not handled before will return our React app
app.get("*", (req, res) => {
  res.sendFile(path.resolve(__dirname, "../client/build", "index.html"));
});

// Inform (to console) that server port has opened
app.listen(PORT, () => {
  console.log(`Server listening on ${PORT}`);
});