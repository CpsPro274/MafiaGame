import express from "express";
import authRouter from './routes/authRoutes.js';
import { createServer } from "http";
import { Server } from "socket.io";
import cors from "cors";
import pg from "pg";
import dotenv from "dotenv";
import { WebSocketServer } from "ws";
import runRoutes from './routes/runRoutes.js';
import utils from "y-websocket/bin/utils.cjs";
const { setupWSConnection } = utils;

dotenv.config();
const { Pool } = pg;
const app = express();

// 1. CORS Configuration (Allows localhost, Vite host, and local IP addresses)
const corsOptions = {
  origin: (origin, callback) => {
    // Allows requests from localhost, 127.0.0.1, LAN IPs (192.168.x.x, 10.x.x.x), or no origin (curl/mobile)
    callback(null, true);
  },
  credentials: true
};

app.use(cors(corsOptions));
app.use(express.json());

const httpServer = createServer(app);

// 2. Socket.io setup
const io = new Server(httpServer, {
  cors: corsOptions
});

// 3. Yjs WebSocket setup (For real-time code editor synchronization)
const wss = new WebSocketServer({ noServer: true });

wss.on("connection", (conn, req) => {
  // Extract document room name from path (e.g., /yjs/room_42)
  const docName = req.url.slice(1).split("?")[0] || "default-room";
  console.log(`[Yjs] Peer connected to doc: ${docName}`);
  setupWSConnection(conn, req, { docName });
});

// Route HTTP Upgrade headers: /yjs goes to Yjs; everything else falls through to Socket.io
httpServer.on("upgrade", (request, socket, head) => {
  const url = request.url || "";
  if (url.startsWith("/yjs")) {
    wss.handleUpgrade(request, socket, head, (ws) => {
      wss.emit("connection", ws, request);
    });
  }
});

// 4. PostgreSQL Database Pool Configuration
const pool = new Pool(
  process.env.DATABASE_URL
    ? { connectionString: process.env.DATABASE_URL }
    : {
        user: process.env.DB_USER || process.env.PGUSER || "postgres",
        host: process.env.DB_HOST || process.env.PGHOST || "localhost",
        database: process.env.DB_NAME || process.env.PGDATABASE || "mafiagame",
        password: String(process.env.DB_PASSWORD || process.env.PGPASSWORD || ""),
        port: Number(process.env.DB_PORT || process.env.PGPORT) || 5432,
      }
);

pool.connect()
  .then((client) => {
    console.log("Connected to PostgreSQL database");
    client.release();
  })
  .catch((err) => {
    console.error("Error connecting to PostgreSQL database:", err);
  });

// 5. Socket.io Gameplay & Room Handlers
io.on("connection", (socket) => {
  console.log("Client connected via Socket.io:", socket.id);

  socket.on("game:join", async ({ gameId, playerId }) => {
    try {
      if (!gameId || !playerId) {
        socket.emit("game:error", { message: "Missing gameId or playerId" });
        return;
      }
      
      const roomResult = await pool.query("SELECT * FROM rooms WHERE id = $1", [gameId]);
      if (roomResult.rows.length === 0) {
        socket.emit("game:error", { message: "Game not found" });
        return;
      }
    
      socket.join(`game:${gameId}`);
      const playerResult = await pool.query(
        "SELECT * FROM room_players WHERE room_id = $1 AND user_id = $2",
        [gameId, playerId]
      );
      if (playerResult.rows.length === 0) {
        await pool.query(
          `INSERT INTO room_players (room_id, user_id, role, is_alive)
           VALUES ($1, $2, 'DEVELOPER', true)`,
          [gameId, playerId]
        );
      }

      const playersResult = await pool.query(
        `SELECT id, user_id, room_id, role, is_alive, joined_at 
         FROM room_players WHERE room_id = $1`,
        [gameId]
      );

      io.to(`game:${gameId}`).emit("player:joined", {
        playerId,
        players: playersResult.rows
      });
      console.log(`Player ${playerId} joined game room ${gameId}`);
    } catch (err) {
      console.error("Error occurred while joining game:", err);
      socket.emit("game:error", { 
        message: "An error occurred while joining the game" 
      });
    }
  });

  socket.on("vote:cast", async ({ gameId, voterId, targetId }) => {
    try {
      if (!gameId || !voterId) {
        socket.emit("game:error", { message: "Missing gameId or voterId" });
        return;
      }
      
      const voterResult = await pool.query(
        `SELECT * FROM room_players 
         WHERE room_id = $1 AND user_id = $2 AND is_alive = TRUE`,
        [gameId, voterId]
      );

      if (voterResult.rows.length === 0) {
        socket.emit("game:error", { message: "Voter not found or not active in the game" });
        return;
      }

      await pool.query(
        `INSERT INTO votes(room_id, voter_id, voted_for_id) VALUES ($1, $2, $3)`,
        [gameId, voterId, targetId]
      );

      await pool.query(
        `INSERT INTO game_logs(room_id, user_id, action_type, details)
         VALUES ($1, $2, 'VOTE_CAST', $3)`,
        [gameId, voterId, JSON.stringify({ votedFor: targetId || null })]
      );

      const votesResult = await pool.query(
        `SELECT voter_id, voted_for_id, created_at
         FROM votes 
         WHERE room_id = $1
         ORDER BY created_at ASC`,
        [gameId]
      );

      io.to(`game:${gameId}`).emit("vote:updated", {
        voterId,
        targetId,
        votes: votesResult.rows
      });
    } catch (err) {
      console.error("Error occurred while casting vote:", err);
      socket.emit("vote:error", { 
        message: "An error occurred while casting the vote" 
      });
    }
  });

  socket.on("code:update", async ({ gameId, playerId, code }) => {
    try {
      if (!gameId || !playerId) return;

      await pool.query(
        `INSERT INTO game_logs(room_id, user_id, action_type, details)
         VALUES ($1, $2, 'CODE_EDIT', $3)`,
        [gameId, playerId, code || ""]
      );

      socket.to(`game:${gameId}`).emit("code:updated", { 
        playerId, 
        code 
      });
    } catch (err) {
      console.error("Error occurred while updating code:", err);
      socket.emit("game:error", { 
        message: "An error occurred while updating the code" 
      });
    }
  });

  socket.on("code:run", async ({ gameId, playerId, code }) => {
    try {
      if (!gameId || !playerId) return;

      await pool.query(
        `INSERT INTO game_logs(room_id, user_id, action_type, details)
         VALUES ($1, $2, 'RUN_TEST', $3)`,
        [gameId, playerId, code || ""]
      );

      io.to(`game:${gameId}`).emit("code:test:started", { playerId });
    } catch (err) {
      console.error("Error occurred while running code:", err);
      socket.emit("code:error", {
        message: "An error occurred while running the code"
      });
    }
  });

  socket.on("disconnect", () => {
    console.log("Client disconnected:", socket.id);
  });
});

// 6. Basic Health Routes
app.get("/", (req, res) => { 
  res.json({ message: "Code Mafia Game Server is running" });
});

app.get("/health", async (req, res) => { 
  try { 
    await pool.query("SELECT 1"); 
    res.json({ status: "ok", database: "connected" }); 
  } catch (err) {
    console.error("Health check error:", err); 
    res.status(500).json({ status: "error", database: "disconnected" });
  } 
});

// 7. REST Endpoints
app.get("/api/rooms/:roomCode", async (req, res) => {
  try {
    const { roomCode } = req.params;
    const query = `
      SELECT 
        r.id,
        r.room_code AS "roomCode",
        r.status,
        r.host_id AS "hostId",
        r.winner_team AS "winnerTeam",
        r.created_at AS "createdAt",
        c.id AS "challengeId",
        c.title AS "challengeTitle",
        c.description AS "challengeDescription",
        c.language AS "challengeLanguage",
        (SELECT COUNT(*)::int FROM room_players rp WHERE rp.room_id = r.id) AS "playerCount"
      FROM rooms r
      LEFT JOIN challenges c ON r.challenge_id = c.id
      WHERE r.room_code = $1;
    `;

    const { rows } = await pool.query(query, [roomCode]);
    if (rows.length === 0) {
      return res.status(404).json({ error: `Room with code '${roomCode}' not found` });
    }

    const row = rows[0];
    return res.json({
      room: {
        id: row.id,
        roomCode: row.roomCode,
        status: row.status,
        hostId: row.hostId,
        winnerTeam: row.winnerTeam,
        createdAt: row.createdAt,
        playerCount: row.playerCount,
        challenge: row.challengeId ? {
          id: row.challengeId,
          title: row.challengeTitle,
          description: row.challengeDescription,
          language: row.challengeLanguage
        } : null
      }
    });
  } catch (err) {
    console.error("Error fetching room by code:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

app.get("/api/rooms/:roomId/players", async (req, res) => {
  try {
    const { roomId } = req.params;
    const requestingUserId = req.query.userId ? Number(req.query.userId) : null;

    const query = `
      SELECT 
        rp.user_id AS "userId",
        u.username,
        rp.is_alive AS "isAlive",
        rp.role,
        (r.host_id = rp.user_id) AS "isHost"
      FROM room_players rp
      JOIN users u ON rp.user_id = u.id
      JOIN rooms r ON rp.room_id = r.id
      WHERE rp.room_id = $1
      ORDER BY rp.joined_at ASC;
    `;

    const { rows } = await pool.query(query, [roomId]);

    // Security check: Mask the MAFIA role unless the caller requests their own profile[cite: 1, 5]
    const players = rows.map((p) => {
      const isSelf = requestingUserId && requestingUserId === p.userId;
      return {
        userId: p.userId,
        username: p.username,
        isAlive: p.isAlive,
        isHost: p.isHost,
        role: isSelf ? p.role : null
      };
    });

    return res.json({ players });
  } catch (err) {
    console.error("Error fetching room players:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

app.get("/api/challenges", async (req, res) => {
  try {
    const query = `
      SELECT 
        id,
        title,
        description,
        language,
        jsonb_array_length(test_cases) AS "totalTests"
      FROM challenges
      ORDER BY id ASC;
    `;

    const { rows } = await pool.query(query);
    return res.json({
      challenges: rows.map((r) => ({
        id: r.id,
        title: r.title,
        description: r.description,
        language: r.language,
        totalTests: r.totalTests || 0
      }))
    });
  } catch (err) {
    console.error("Error fetching challenges:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

app.get("/api/challenges/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const query = `
      SELECT 
        id,
        title,
        description,
        language,
        buggy_code AS "buggyCode",
        test_cases AS "testCases"
      FROM challenges
      WHERE id = $1;
    `;

    const { rows } = await pool.query(query, [id]);
    if (rows.length === 0) {
      return res.status(404).json({ error: `Challenge with ID ${id} not found` });
    }

    const ch = rows[0];
    const testCases = Array.isArray(ch.testCases) ? ch.testCases : [];

    // Filter out hidden tests and omit solution_code completely[cite: 1, 5]
    const publicTestCases = testCases
      .filter((tc) => !tc.hidden)
      .map((tc) => ({
        input: tc.input,
        expected: tc.expected
      }));

    return res.json({
      challenge: {
        id: ch.id,
        title: ch.title,
        description: ch.description,
        language: ch.language,
        buggyCode: ch.buggyCode,
        publicTestCases,
        hiddenTestCount: testCases.filter((tc) => tc.hidden).length
      }
    });
  } catch (err) {
    console.error("Error fetching challenge by ID:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

// 8. Auth Router Mount
app.use('/api/auth', authRouter);
app.use('/api', runRoutes);

// 9. Start Server on 0.0.0.0 (Accepts all interfaces / network hosts)
const PORT = process.env.PORT || 5000;
httpServer.listen(PORT, '0.0.0.0', () => {
  console.log(`Backend server active on all interfaces at http://0.0.0.0:${PORT}`);
});