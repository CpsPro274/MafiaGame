import express from "express";
import { createServer } from "http";
import { Server } from "socket.io";
import cors from "cors";
import mongoose from "mongoose";
import dotenv from "dotenv";

dotenv.config();
const {Pool} = pg;
const app = express();

app.use(cors({
  origin: process.env.CLIENT_ORIGIN || 'http://localhost:5173',
  credentials: true
}));

app.use(express.json());

const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: { origin: "*" }
});

// Database connection
const MONGO_URI = process.env.MONGO_URI || "mongodb://127.0.0.1:27017/codemafia";
mongoose.connect(MONGO_URI)
  .then(() => console.log("MongoDB Connected"))
  .catch(err => console.error("Mongo Error:", err));

// Real-time Game Events (Socket.IO)
io.on("connection", (socket) => {
  console.log("Client connected:", socket.id);

  socket.on("game:join", ({ gameId, playerId }) => {
    socket.join(gameId);
    io.to(gameId).emit("player:joined", { playerId });
  });

  socket.on("vote:cast", ({ gameId, voterId, targetId }) => {
    io.to(gameId).emit("vote:updated", { voterId, targetId });
  });

  socket.on("disconnect", () => {
    console.log("Client disconnected:", socket.id);
  });
});

// Mount router under /api/auth
app.use('/api/auth', authRouter);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Backend server active at http://localhost:${PORT}/api`);
});
