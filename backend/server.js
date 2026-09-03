import express from "express";
import { createServer } from "http";
import { Server } from "socket.io";
import cors from "cors";
import mongoose from "mongoose";
import dotenv from "dotenv";

dotenv.config();

const app = express();
app.use(cors());
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

const PORT = process.env.PORT || 5000;
httpServer.listen(PORT, () => {
  console.log(`Game Server running on port ${PORT}`);
});