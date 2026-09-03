import express from 'express';
import cors from 'cors';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';
import { query } from './db.js';

dotenv.config();

const app = express();

app.use(cors({
  origin: process.env.CLIENT_ORIGIN || 'http://localhost:5173',
  credentials: true
}));

app.use(express.json());

const authRouter = express.Router();

// ----------------------------------------------------
// REGISTER (POST /api/auth/register)
// ----------------------------------------------------
authRouter.post('/register', async (req, res) => {
  const { username, role, password } = req.body;

  if (!username?.trim() || !password?.trim()) {
    return res.status(400).json({ 
      success: false, 
      message: 'Username and Password are Required' 
    });
  }

  if (password.length < 6) {
    return res.status(400).json({ 
      success: false, 
      message: 'Password must be atleast 6 characters' 
    });
  }

  try {
    const saltRounds = 10;
    const passwordHash = await bcrypt.hash(password, saltRounds);

    const insertQuery = `
      INSERT INTO users (username, password_hash, role)
      VALUES ($1, $2, $3)
      RETURNING id, username, role, student_id, counselor_id, onboarding_completed;
    `;
    const result = await query(insertQuery, [username.trim(), passwordHash, role || 'Student']);
    const newUser = result.rows[0];

    const token = jwt.sign(
      { id: newUser.id, username: newUser.username, role: newUser.role },
      process.env.JWT_SECRET || 'dev_secret',
      { expiresIn: '7d' }
    );

    return res.status(201).json({
      success: true,
      token,
      user: {
        id: newUser.id,
        username: newUser.username,
        role: newUser.role,
        student_id: newUser.student_id,
        counselor_id: newUser.counselor_id,
        onboardingCompleted: newUser.onboarding_completed
      }
    });
  } catch (err) {
    if (err.code === '23505') {
      return res.status(409).json({ 
        success: false, 
        message: 'Username is already taken' 
      });
    }
    console.error('Register error:', err);
    return res.status(500).json({ 
      success: false, 
      message: 'Registration Failed' 
    });
  }
});

// ----------------------------------------------------
// LOGIN (POST /api/auth/login)
// ----------------------------------------------------
authRouter.post('/login', async (req, res) => {
  const { username, password } = req.body;

  if (!username?.trim() || !password?.trim()) {
    return res.status(400).json({ 
      success: false, 
      message: 'Username and Password are required' 
    });
  }

  try {
    const findQuery = `
      SELECT id, username, password_hash, role, student_id, counselor_id, onboarding_completed, locked_until, failed_login_attempts
      FROM users 
      WHERE username = $1;
    `;
    const result = await query(findQuery, [username.trim()]);

    if (result.rows.length === 0) {
      return res.status(401).json({ 
        success: false, 
        message: 'Invalid username or password' 
      });
    }

    const user = result.rows[0];

    // Check account lockout
    if (user.locked_until && new Date(user.locked_until) > new Date()) {
      return res.status(403).json({
        success: false,
        message: 'Account is temporarily locked. Try again later.'
      });
    }

    const isMatch = await bcrypt.compare(password, user.password_hash);

    if (!isMatch) {
      await query(
        `UPDATE users SET failed_login_attempts = failed_login_attempts + 1 WHERE id = $1`,
        [user.id]
      );
      return res.status(401).json({ 
        success: false, 
        message: 'Invalid username or password' 
      });
    }

    // Reset failed login count and record login timestamp
    await query(
      `UPDATE users SET failed_login_attempts = 0, last_login_at = CURRENT_TIMESTAMP WHERE id = $1`,
      [user.id]
    );

    const token = jwt.sign(
      { id: user.id, username: user.username, role: user.role },
      process.env.JWT_SECRET || 'dev_secret',
      { expiresIn: '7d' }
    );

    return res.json({
      success: true,
      token,
      user: {
        id: user.id,
        username: user.username,
        role: user.role,
        student_id: user.student_id,
        counselor_id: user.counselor_id,
        onboardingCompleted: user.onboarding_completed
      }
    });
  } catch (err) {
    console.error('Login error:', err);
    return res.status(500).json({ 
      success: false, 
      message: 'Login Failed' 
    });
  }
});

// ----------------------------------------------------
// LOGOUT (POST /api/auth/logout)
// ----------------------------------------------------
authRouter.post('/logout', (req, res) => {
  return res.json({ 
    success: true, 
    message: 'Logged out successfully' 
  });
});

// Mount router under /api/auth
app.use('/api/auth', authRouter);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Backend server active at http://localhost:${PORT}/api`);
});