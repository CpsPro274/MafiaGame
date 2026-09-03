import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'fallback_secret_key';

export function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Expects format: "Bearer <token>"

  if (!token) {
    return res.status(401).json({ error: 'Access token is missing.' });
  }

  jwt.verify(token, JWT_SECRET, (err, decodedUser) => {
    if (err) {
      return res.status(403).json({ error: 'Token is invalid or has expired.' });
    }
    req.user = decodedUser;
    next();
  });
}