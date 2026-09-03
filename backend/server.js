import express from "express";
import { createServer } from "http";
import { Server } from "socket.io";
import cors from "cors";
import pg from "pg";
import dotenv from "dotenv";

dotenv.config();
const {Pool} = pg;
const app = express();

app.use(cors({
  origin:process.env.CLIENT_ORIGIN || 'http://localhost:5173',
  credentials:true
}));
app.use(express.json());

const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors:{ 
    origin:process.env.CLIENT_ORIGIN || 'http://localhost:5173',
    credentials:true
   }
});

const pool = new Pool({
  connectionString:process.env.DATABASE_URL
});

pool.connect()
  .then((client)=> {
    console.log("Connected to PostgreSQL database");
    client.release();
  })
  .catch((err) => {
    console.error("Error connecting to PostgreSQL database:", err);
  });

io.on("connection", (socket) => {
  console.log("Client connected:", socket.id);
  socket.on("game:join", async ({ gameId, playerId }) => {
    try{
      if(!gameId || !playerId){
        socket.emit("game:error", { 
          message:"Missing gameId or playerId"
        });
        return;
      }
      
      const roomResult=await pool.query("SELECT * FROM rooms WHERE id = $1",[gameId]);
      if(roomResult.rows.length===0){
        socket.emit("game:error", { message:"Game not found" });
        return;
      }
    
      socket.join(`game:${gameId}`);
      const playerResult=await pool.query("SELECT * FROM room_players WHERE room_id = $1 AND user_id = $2",[gameId, playerId]);
      if(playerResult.rows.length===0){
        await pool.query(`
          INSERT INTO room_players (room_id, user_id, role, is_alive)
          VALUES ($1, $2, 'DEVELOPER', true)`
          ,[gameId, playerId]);
      }

      const playersResult=await pool.query(`
        SELECT id, user_id, room_id, role, is_alive, joined_at 
        FROM room_players WHERE room_id = $1`,[gameId]);

      io.to(`game:${gameId}`).emit("player:joined", {
        playerId,
        players:playersResult.rows
      });
      console.log(`Player ${playerId} joined game ${gameId}`);
    } 
    catch (err) {
      console.error("Error occurred while joining game:", err);
      socket.emit("game:error", { 
        message:"An error occurred while joining the game" 
      });
    }
  });

  socket.on("vote:cast", async ({ gameId, voterId, targetId })=>{
    try{
      if(!gameId || !voterId){
        socket.emit("game:error", { 
          message:"Missing gameId or voterId"
        });
        return;
      }
      
      const voterResult=await pool.query(`
        SELECT * FROM room_players 
        WHERE room_id = $1 
        AND user_id = $2
        AND is_alive = TRUE`
        ,[gameId, voterId]);

      if(voterResult.rows.length===0){
        socket.emit("game:error", { 
          message:"Voter not found in the game"
        });
        return;
      }
      await pool.query(`
        INSERT INTO votes(room_id, voter_id, voted_for_id)
        VALUES ($1, $2, $3)`,[gameId, voterId, targetId]);

      await pool.query(`
        INSERT INTO game_logs(room_id, user_id, action_type, details)
        VALUES ($1, $2, 'VOTE_CAST', $3)`,[gameId, voterId, JSON.stringify({
            votedFor:targetId || null,
          })
        ]
      );

      const votesResult=await pool.query(`
        SELECT voter_id, voted_for_id, created_at
        FROM votes 
        WHERE room_id = $1
        ORDER BY created_at ASC`,
        [gameId]
      );

      io.to(`game:${gameId}`).emit("vote:updated", {
        voterId,
        targetId,
        votes:votesResult.rows
      });
    } 
    catch(err){
      console.error("Error occurred while casting vote:", err);
      socket.emit("vote:error", { 
        message:"An error occurred while casting the vote" 
      });
    }
  });

  socket.on("code:update", async ({ gameId, playerId, code }) => {
    try{
      if(!gameId || !playerId){
        return;
      }
      await pool.query(`
        INSERT INTO game_logs(room_id, user_id, action_type, details)
        VALUES ($1, $2, 'CODE_EDIT', $3)`,[gameId, playerId, code || ""]
      );

      socket.to(`game:${gameId}`)
      .emit("code:updated", { 
        playerId, 
        code 
      });
    } catch (err){
    console.error("Error occurred while updating code:", err);
    socket.emit("game:error", { 
      message:"An error occurred while updating the code" 
    });
    }
  });

  socket.on("code:run", async({gameId, playerId, code})=>{
    try{
      if(!gameId || !playerId){
        return;
      }
      await pool.query(`
        INSERT INTO game_logs(room_id, user_id, action_type, details)
        VALUES ($1, $2, 'RUN_TEST', $3)`,[gameId, playerId, code || ""]
      );

      io.to(`game:${gameId}`).emit("code:test:started", {
        playerId,
      });
    } catch (err) {
      console.error("Error occurred while running code:", err);
      socket.emit("code:error", {
        message:"An error occurred while running the code"
      });
    }
  });

  socket.on("disconnect", () => {
    console.log("Client disconnected:", socket.id);
  });
});

//app.use('/api/auth', authRouter);
app.get("/", (req, res) => { 
  res.json({ 
    message:"Code Mafia Game Server is running"
  });
});

app.get("/health", async (req, res) => { 
  try{ 
    await pool.query("SELECT 1"); 
    res.json({ 
      status:"ok", 
      database:"connected" 
    }); 
  } catch (err){
    console.error("Health check error:", err); 
    res.status(500).json({ 
      status:"error", 
      database:"disconnected", 
    });
  } 
});

"/api/rooms/:roomCode"

"/api/rooms/:roomId/players"

"/api/challenges"

"/api/challenges/:id"

const PORT = process.env.PORT || 5000;
httpServer.listen(PORT, () => {
  console.log(`Backend server active at http://localhost:${PORT}/api`);
});
