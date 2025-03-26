
const express = require('express');
const app = express();
const http = require('http').Server(app);
const io = require('socket.io')(http);
const path = require('path');

app.use(express.static('public'));

let games = {};

io.on('connection', (socket) => {
  socket.on('createGame', () => {
    const gameId = Math.floor(1000 + Math.random() * 9000).toString();
    games[gameId] = { host: socket.id, players: [], drawing: [] };
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
      socket.to(gameId).emit('draw', line);
    }
  });

  socket.on('guess', (data) => {
    const { gameId, guess } = data;
    if (games[gameId]) {
      io.to(gameId).emit('newGuess', { player: socket.id, guess });
    }
  });

  socket.on('clearCanvas', (data) => {
    const { gameId } = data;
    if (games[gameId] && games[gameId].host === socket.id) {
      games[gameId].drawing = [];
      socket.to(gameId).emit('clearCanvas');
    }
  });
});

http.listen(3000, '0.0.0.0', () => {
  console.log('Server running on port 3000');
});
