import dotenv from "dotenv";
import express from "express";
import { createServer } from "http";
import { Server } from "socket.io";
import path from "path";
import { fileURLToPath } from "url";
import { v4 as uuidv4 } from "uuid";
import { members, leaderboard, gamestate, tweets } from "./mongo.js";
import session from "express-session";
import bcrypt from "bcrypt";
import rateLimit from "express-rate-limit";
import { latestTweets } from "./streamsail_agents.js";
import { handleAi } from "./simpleAi.js";
// jwt
import jwt from "jsonwebtoken";
dotenv.config();

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer);
const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Rate limiting
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // Limit each IP to 5 requests per windowMs
  message: { error: "Too many attempts, please try again later" },
});

// Middleware Setup
app.use(express.static("public"));
app.use(express.json());

// Session Middleware Setup
app.use(
  session({
    secret: process.env.SESSION_SECRET || "secret", // Replace with environment variable in production
    resave: false,
    saveUninitialized: false,
    cookie: { secure: false, maxAge: 1000 * 60 * 60 * 24 }, // Set secure: true in production with HTTPS
  })
);

// Authentication middleware
const requireAuth = (req, res, next) => {
  if (req.session && req.session.userId) {
    next();
  } else {
    res.status(401).json({ error: "Authentication required" });
  }
};

// Track active game sessions with cleanup
const activeGames = new Map();
const INACTIVE_THRESHOLD = 24 * 60 * 60 * 1000; // 24 hours

const cleanupInactiveGames = async () => {
  const now = Date.now();
  for (const [sessionId, game] of activeGames.entries()) {
    if (now - game.lastActivity > INACTIVE_THRESHOLD) {
      activeGames.delete(sessionId);
    }
  }

  // Clean database
  const threshold = new Date(now - INACTIVE_THRESHOLD);
  await gamestate.deleteMany({
    updatedAt: { $lt: threshold },
  });
};

setInterval(cleanupInactiveGames, 60 * 60 * 1000); // Run every hour

// Basic routes
app.get("/", (req, res) => {
  if (req.session.userId) {
    res.redirect("/dashboard");
  } else {
    res.sendFile(path.join(__dirname, "public", "index.html"));
  }
});

// Auth routes with rate limiting
app.post("/api/login", authLimiter, async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: "Email and password required" });
    }

    const user = await members.findOne({ email });

    if (!user) {
      return res.status(401).json({ error: "Invalid email or password" });
    }

    const isValidPassword = await bcrypt.compare(password, user.password);
    if (!isValidPassword) {
      return res.status(401).json({ error: "Invalid email or password" });
    }

    req.session.userId = user._id;
    req.session.email = user.email;
    req.session.hasSubscription = user.activeSubscription;
    console.log("User logged in:", user.email);
    const token = jwt.sign({ email: user.email }, process.env.JWT_SECRET, {
      expiresIn: "12h",
    });
    res.json({
      success: true,
      user: {
        email: user.email,
        hasSubscription: user.activeSubscription,
      },
      token,
    });
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

app.post("/api/register", authLimiter, async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: "Email and password required" });
    }

    const existingUser = await members.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ error: "Email already registered" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    await members.insertOne({
      email,
      password: hashedPassword,
      activeSubscription: false,
      createdAt: new Date(),
    });

    res.json({ success: true });
  } catch (error) {
    console.error("Registration error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

app.post("/api/logout", requireAuth, (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      return res.status(500).json({ error: "Failed to logout" });
    }
    res.json({ success: true });
  });
});

// Protected routes
app.get("/dashboard", requireAuth, (req, res) => {
  res.sendFile(path.join(__dirname, "public", "dashboard.html"));
});

app.get("/profile", requireAuth, (req, res) => {
  res.sendFile(path.join(__dirname, "public", "profile.html"));
});

//simpleAi.js simple.query simple.tweet simple.email simple.conversation
app.get("/api/ai/query", requireAuth, async (req, res) => {
  const { question } = req.query;
  const response = await handleAi(`streamsailquery ${question}`);
  res.json({ response });
});
app.get("/api/ai/tweet", async (req, res) => {
  let { tweet } = req.query;
  if (!tweet) {
    tweet =
      "StreamSail Pro is the best platform for live streaming and interactive features. Check it out now!";
  }
  const response = await handleAi.tweet(`tweet ${tweet}`);
  res.json({ response });
});
app.get("/api/ai/email", requireAuth, async (req, res) => {
  const { email } = req.query;
  const response = await handleAi(`email ${email}`);
  res.json({ response });
});

app.get("/api/user", requireAuth, (req, res) => {
  res.json({
    email: req.session.email,
    hasSubscription: req.session.hasSubscription,
  });
});

app.get("/api/tweets", requireAuth, async (req, res) => {
  const tweets = await latestTweets();
  if (!tweets) {
    console.log("Failed to fetch tweets");
    return res.status(500).json({ error: "Failed to fetch tweets" });
  }
  res.json(tweets);
});

// Game routes
const gameRoutes = [
  "mystery-pullbox",
  "randomizer-wheel",
  "sports-showdown",
  "gpk-showdown",
  "emoji-racer",
];

gameRoutes.forEach((game) => {
  app.get(`/games/${game}`, requireAuth, (req, res, next) => {
    const filePath = path.join(__dirname, "games", `${game}.html`);
    res.sendFile(filePath, (err) => {
      if (err) {
        next(new Error("Game not found"));
      }
    });
  });
});

// Tool routes
const toolRoutes = [
  "leaderboard",
  "break-calculator",
  "talk-flare",
  "auto-host",
  "countdown",
  "animation",
  "qr-codes",
];

toolRoutes.forEach((tool) => {
  app.get(`/tools/${tool}`, requireAuth, (req, res, next) => {
    const filePath = path.join(__dirname, "tools", `${tool}.html`);
    res.sendFile(filePath, (err) => {
      if (err) {
        next(new Error("Tool not found"));
      }
    });
  });
});

// Game state management
const initializeGameSession = async (hostId, userId) => {
  const sessionId = uuidv4();
  const initialState = {
    sessionId,
    hostId,
    userId,
    games: {
      mysterypull: { participants: [], leaderboard: {} },
      echospins: { participants: [], leaderboard: {} },
      echodrop: { participants: [], leaderboard: {} },
      emojiracer: { participants: [], leaderboard: {} },
      dumpsterdive: { participants: [], leaderboard: {} },
    },
    createdAt: new Date(),
    updatedAt: new Date(),
    lastActivity: Date.now(),
  };

  await gamestate.updateOne(
    { sessionId },
    { $setOnInsert: initialState },
    { upsert: true }
  );

  activeGames.set(sessionId, {
    lastActivity: Date.now(),
    userId,
  });

  return initialState;
};

// Socket event handlers
const handleAddParticipant = async (socket, { sessionId, game, name }) => {
  const session = await gamestate.findOne({
    sessionId,
    userId: socket.userId,
  });

  if (session && session.games[game].participants.length < 16) {
    const updatedParticipants = [...session.games[game].participants, name];

    await gamestate.updateOne(
      { sessionId },
      {
        $set: {
          [`games.${game}.participants`]: updatedParticipants,
          updatedAt: new Date(),
          lastActivity: Date.now(),
        },
      }
    );

    activeGames.get(sessionId).lastActivity = Date.now();
    io.to(sessionId).emit("participantsUpdated", {
      game,
      participants: updatedParticipants,
    });
  }
};

const handleAddWin = async (socket, { sessionId, game, participant }) => {
  await gamestate.updateOne(
    { sessionId, userId: socket.userId },
    {
      $inc: { [`games.${game}.leaderboard.${participant}`]: 1 },
      $set: {
        updatedAt: new Date(),
        lastActivity: Date.now(),
      },
    }
  );

  await leaderboard.updateOne(
    { game, participant },
    {
      $inc: { wins: 1 },
      $set: { lastWin: new Date() },
      $setOnInsert: { firstWin: new Date() },
    },
    { upsert: true }
  );

  const session = await gamestate.findOne({ sessionId });
  activeGames.get(sessionId).lastActivity = Date.now();

  io.to(sessionId).emit("leaderboardUpdated", {
    game,
    leaderboard: session.games[game].leaderboard,
  });
};

const handleResetData = async (socket, { sessionId }) => {
  const resetState = {
    games: {
      mysterypull: { participants: [], leaderboard: {} },
      echospins: { participants: [], leaderboard: {} },
      echodrop: { participants: [], leaderboard: {} },
      emojiracer: { participants: [], leaderboard: {} },
      dumpsterdive: { participants: [], leaderboard: {} },
    },
    updatedAt: new Date(),
    lastActivity: Date.now(),
  };

  await gamestate.updateOne(
    { sessionId, userId: socket.userId },
    { $set: resetState }
  );

  activeGames.get(sessionId).lastActivity = Date.now();
  io.to(sessionId).emit("stateReset", resetState.games);
};

// Socket authentication
io.use((socket, next) => {
  const session = socket.request.session;
  if (session && session.userId) {
    socket.userId = session.userId;
    next();
  } else {
    next(new Error("Authentication required"));
  }
});

// Socket connection handling
io.on("connection", async (socket) => {
  console.log("Host connected:", socket.id);

  const session = await initializeGameSession(socket.id, socket.userId);
  const sessionId = session.sessionId;

  socket.join(sessionId);
  socket.emit("sessionInitialized", {
    sessionId,
    state: session.games,
  });

  socket.on("addParticipant", (data) =>
    handleAddParticipant(socket, { ...data, sessionId })
  );
  socket.on("addWin", (data) => handleAddWin(socket, { ...data, sessionId }));
  socket.on("resetData", () => handleResetData(socket, { sessionId }));
  socket.on("authenticated", async ({ email }) => {
    console.log("User attempting to authenticate:", email);

    const user = await members.findOne({ email });

    if (user) {
      console.log("User authenticated successfully:", email);
      socket.emit("authenticated", true, email); // Notify client of success
    } else {
      console.log("Authentication failed for email:", email);
      socket.emit("authenticated", false); // Notify client of failure
    }
  });
  socket.on("disconnect", async () => {
    console.log("Host disconnected:", socket.id);
    // State persisted in DB, can cleanup memory
    activeGames.delete(sessionId);
  });
});

// Protected API Routes
app.get("/api/games/:sessionId", requireAuth, async (req, res) => {
  const session = await gamestate.findOne({
    sessionId: req.params.sessionId,
    userId: req.session.userId,
  });

  if (session) {
    res.json(session.games);
  } else {
    res.status(404).json({ error: "Game session not found" });
  }
});

app.get("/api/leaderboard/:game", requireAuth, async (req, res) => {
  const gameLeaderboard = await leaderboard.findOne({
    game: req.params.game,
    userId: req.session.userId,
  });
  res.json(gameLeaderboard || { participants: [] });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    error:
      process.env.NODE_ENV === "production"
        ? "Something went wrong!"
        : err.message,
  });
});

// Start server
const PORT = process.env.PORT || 3000;
httpServer.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

// Graceful shutdown
process.on("SIGTERM", async () => {
  console.log("SIGTERM received. Shutting down gracefully...");

  // Cleanup active games
  for (const [sessionId, game] of activeGames.entries()) {
    await gamestate.updateOne(
      { sessionId },
      { $set: { updatedAt: new Date() } }
    );
  }

  httpServer.close(() => {
    console.log("Server closed");
    process.exit(0);
  });
});
