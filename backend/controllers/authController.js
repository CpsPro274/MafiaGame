import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import db from '../config/db.js';

const JWT_SECRET = process.env.JWT_SECRET || 'fallback_secret_key';

// POST /api/auth/register
export async function register(req, res) {
  try {
    const { username, email, password } = req.body;

    if (!username || !email || !password) {
      return res.status(400).json({ error: 'Username, email, and password are required.' });
    }

    if (password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters long.' });
    }

    // Check if username or email already exists
    const existing = await db.query(
      'SELECT id, username, email FROM users WHERE username = $1 OR email = $2',
      [username.trim(), email.toLowerCase().trim()]
    );

    if (existing.rows.length > 0) {
      const match = existing.rows[0];
      const conflictField = match.username === username.trim() ? 'Username' : 'Email';
      return res.status(409).json({ error: `${conflictField} is already registered.` });
    }

    // Hash the password
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    // Insert user into PostgreSQL matching schema
    const insertQuery = `
      INSERT INTO users (username, email, password)
      VALUES ($1, $2, $3)
      RETURNING id, username, email, games_played AS "gamesPlayed", dev_wins AS "devWins", mafia_wins AS "mafiaWins", created_at AS "createdAt";
    `;

    const { rows } = await db.query(insertQuery, [
      username.trim(),
      email.toLowerCase().trim(),
      hashedPassword,
    ]);

    const user = rows[0];

    // Generate JWT token
    const token = jwt.sign(
      { id: user.id, username: user.username },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    return res.status(201).json({
      message: 'User registered successfully',
      token,
      user,
    });
  } catch (error) {
    console.error('Error during registration:', error);
    return res.status(500).json({ error: 'Internal server error during registration.' });
  }
}

// POST /api/auth/login
export async function login(req, res) {
  try {
    const { identifier, password } = req.body; // identifier can be username OR email

    if (!identifier || !password) {
      return res.status(400).json({ error: 'Username/email and password are required.' });
    }

    // Lookup user by either username or email
    const query = `
      SELECT id, username, email, password, games_played AS "gamesPlayed", dev_wins AS "devWins", mafia_wins AS "mafiaWins"
      FROM users
      WHERE username = $1 OR email = $1;
    `;

    const { rows } = await db.query(query, [identifier.trim()]);
    if (rows.length === 0) {
      return res.status(401).json({ error: 'Invalid credentials.' });
    }

    const user = rows[0];

    // Compare hash with submitted plain text password
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ error: 'Invalid credentials.' });
    }

    // Generate JWT token
    const token = jwt.sign(
      { id: user.id, username: user.username },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    return res.status(200).json({
      message: 'Login successful',
      token,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        gamesPlayed: user.gamesPlayed,
        devWins: user.devWins,
        mafiaWins: user.mafiaWins,
      },
    });
  } catch (error) {
    console.error('Error during login:', error);
    return res.status(500).json({ error: 'Internal server error during login.' });
  }
}