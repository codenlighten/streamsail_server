// server/index.js
import dotenv from "dotenv";
import express from "express";
import { createServer } from "http";
import { Server } from "socket.io";
import path from "path";
import { fileURLToPath } from "url";
import { v4 as uuidv4 } from "uuid";
import { members, leaderboard, gamestate } from "./mongo.js";
import session from "express-session";
import bcrypt from "bcrypt";

dotenv.config();

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer);
const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Middleware Setup
app.use(express.static("public"));
app.use(express.json());
app.use(
  session({
    secret: process.env.SESSION_SECRET || "streamsail-secret-key",
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: process.env.NODE_ENV === "production",
      maxAge: 24 * 60 * 60 * 1000, // 24 hours
    },
  })
);

// Authentication middleware
const requireAuth = (req, res, next) => {
  if (req.session && req.session.userId) {
    next();
  } else {
    res.redirect("/");
  }
};

// Auth routes
app.get("/", (req, res) => {
  if (req.session.userId) {
    res.redirect("/dashboard");
  } else {
    res.sendFile(path.join(__dirname, "public", "index.html"));
  }
});

app.post("/api/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await members.findMember({ email });

    if (!user || !(await bcrypt.compare(password, user.password))) {
      return res.status(401).json({ error: "Invalid email or password" });
    }

    req.session.userId = user._id;
    req.session.email = user.email;
    req.session.hasSubscription = user.activeSubscription;

    res.json({
      success: true,
      user: {
        email: user.email,
        hasSubscription: user.activeSubscription,
      },
    });
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

app.post("/api/register", async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: "Email and password required" });
    }

    const existingUser = await members.findMember({ email });
    if (existingUser) {
      return res.status(400).json({ error: "Email already registered" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const user = await members.insertMember({
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

app.post("/api/logout", (req, res) => {
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

// Protected game routes
const gameRoutes = [
  { path: "/games/mystery-pullbox", file: "mystery-pullbox.html" },
  { path: "/games/randomizer-wheel", file: "randomizer-wheel.html" },
  { path: "/games/sports-showdown", file: "sports-showdown.html" },
  { path: "/games/gpk-showdown", file: "gpk-showdown.html" },
  { path: "/games/emoji-racer", file: "emoji-racer.html" },
];

gameRoutes.forEach(({ path: routePath, file }) => {
  app.get(routePath, requireAuth, (req, res) => {
    res.sendFile(path.join(__dirname, "games", file));
  });
});

// Protected tool routes
const toolRoutes = [
  { path: "/tools/leaderboard", file: "leaderboard.html" },
  { path: "/tools/break-calculator", file: "break-calculator.html" },
  { path: "/tools/talk-flare", file: "talk-flare.html" },
  { path: "/tools/auto-host", file: "auto-host.html" },
  { path: "/tools/countdown", file: "countdown.html" },
  { path: "/tools/animation", file: "animation.html" },
  { path: "/tools/qr-codes", file: "qr-codes.html" },
];

toolRoutes.forEach(({ path: routePath, file }) => {
  app.get(routePath, requireAuth, (req, res) => {
    res.sendFile(path.join(__dirname, "tools", file));
  });
});

// Keep your existing socket.io and game state management code

// API Routes with authentication
app.get("/api/games/:sessionId", requireAuth, async (req, res) => {
  const session = await gamestate.findGameState({
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
  const gameLeaderboard = await leaderboard.findLeaderboard({
    game: req.params.game,
    userId: req.session.userId,
  });
  res.json(gameLeaderboard || { participants: [] });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: "Something went wrong!" });
});

// Start server
const PORT = process.env.PORT || 3000;
httpServer.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
