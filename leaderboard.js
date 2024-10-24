// server/index.js
import express from "express";
import { createServer } from "http";
import { Server } from "socket.io";
import { fileURLToPath } from "url";
import path from "path";
import { members } from "./mongo.js";

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer);
const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Serve static files
app.use(express.static("public"));
app.use(express.json());

// Game state management
const gameState = {
  mysterypull: { participants: [], leaderboard: {} },
  echospins: { participants: [], leaderboard: {} },
  echodrop: { participants: [], leaderboard: {} },
  emojiracer: { participants: [], leaderboard: {} },
  dumpsterdive: { participants: [], leaderboard: {} },
};

// Socket.IO connection handling
io.on("connection", (socket) => {
  console.log("Host connected:", socket.id);

  // Send initial state
  socket.emit("initialState", gameState);

  // Handle adding participants
  socket.on("addParticipant", ({ game, name }) => {
    if (gameState[game].participants.length < 16) {
      gameState[game].participants.push(name);
      io.emit("participantsUpdated", {
        game,
        participants: gameState[game].participants,
      });
    }
  });

  // Handle wins
  socket.on("addWin", ({ game, participant }) => {
    if (!gameState[game].leaderboard[participant]) {
      gameState[game].leaderboard[participant] = 0;
    }
    gameState[game].leaderboard[participant]++;

    io.emit("leaderboardUpdated", {
      game,
      leaderboard: gameState[game].leaderboard,
    });
  });

  // Handle reset
  socket.on("resetData", () => {
    Object.keys(gameState).forEach((game) => {
      gameState[game] = { participants: [], leaderboard: {} };
    });
    io.emit("stateReset", gameState);
  });

  socket.on("disconnect", () => {
    console.log("Host disconnected:", socket.id);
  });
});

// Start server
const PORT = process.env.PORT || 3000;
httpServer.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
