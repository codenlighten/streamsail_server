// public/js/socket-handler.js
const socket = io();
let sessionId = null;

socket.on("sessionInitialized", ({ sessionId: newSessionId, state }) => {
  sessionId = newSessionId;
  // Update UI with initial state
  Object.entries(state).forEach(([game, gameState]) => {
    updateParticipantList(game, gameState.participants);
    updateLeaderboard(game, gameState.leaderboard);
  });
});

// Add participant
function addParticipant(game, name) {
  if (sessionId) {
    socket.emit("addParticipant", { sessionId, game, name });
  }
}

// Add win
function addWin(game, participant) {
  if (sessionId) {
    socket.emit("addWin", { sessionId, game, participant });
    updateURLWithParams(game, participant, sessionId);
  }
}

// Reset data
function resetData() {
  if (
    sessionId &&
    confirm("Are you sure you want to reset all data? This cannot be undone.")
  ) {
    socket.emit("resetData", { sessionId });
  }
}

// Update URL with session
function updateURLWithParams(game, name, sessionId) {
  const url = new URL(window.location);
  url.searchParams.set("game", game);
  url.searchParams.set("name", name);
  url.searchParams.set("session", sessionId);
  window.history.pushState({}, "", url);
}
