const express = require('express');
const app = express();
const http = require('http').Server(app);
const io = require('socket.io')(http);
const path = require('path');

app.use(express.static('public'));

let games = {};

const createNewGame = (hostId) => ({
  host: hostId,
  players: [],
  drawing: [],
  guesses: []
});

io.on('connection', (socket) => {
  socket.on('createGame', () => {
    const gameId = Math.floor(1000 + Math.random() * 9000).toString();
    games[gameId] = createNewGame(socket.id);
    socket.join(gameId);
    socket.emit('gameCreated', gameId);
  });

  socket.on('joinGame', (gameId) => {
    if (games[gameId]) {
      socket.join(gameId);
      games[gameId].players.push(socket.id);
      socket.emit('gameJoined', gameId);
    }
  });

  socket.on('draw', (data) => {
    const { gameId, line } = data;
    if (games[gameId] && games[gameId].host === socket.id) {
      games[gameId].drawing.push(line);
      io.to(gameId).emit('draw', line);
      io.to(gameId).emit('updateDrawCount', games[gameId].drawing.length);
    }
  });

  socket.on('guess', (data) => {
    const { gameId, guess } = data;
    if (games[gameId]) {
      const guessObj = { id: Date.now(), player: socket.id, guess, correct: false };
      games[gameId].guesses.push(guessObj);
      io.to(gameId).emit('newGuess', guessObj);
    }
  });

  socket.on('validateGuess', (data) => {
    const { gameId, guessId } = data;
    const game = games[gameId];
    if (game && game.host === socket.id) {
      const guess = game.guesses.find(g => g.id === guessId);
      if (guess) {
        guess.correct = true;
        io.to(gameId).emit('guessValidated', guess);
      }
    }
  });

  socket.on('clearCanvas', (data) => {
    const { gameId } = data;
    if (games[gameId] && games[gameId].host === socket.id) {
      games[gameId].drawing = [];
      io.to(gameId).emit('clearCanvas');
      io.to(gameId).emit('updateDrawCount', 0);
    }
  });
});

http.listen(3000, '0.0.0.0', () => {
  console.log('Server running on port 3000');
});