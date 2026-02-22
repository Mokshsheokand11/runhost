import express from 'express';
import { createServer as createViteServer } from 'vite';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const db = new Database('marathon.db');
const JWT_SECRET = process.env.JWT_SECRET || 'marathon-connect-secret-key-2026';

// Initialize Database
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    phone TEXT UNIQUE NOT NULL,
    instaId TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS marathons (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    description TEXT,
    date TEXT NOT NULL,
    location TEXT NOT NULL,
    prize TEXT,
    hostedBy INTEGER NOT NULL,
    winnerId INTEGER,
    FOREIGN KEY (hostedBy) REFERENCES users(id),
    FOREIGN KEY (winnerId) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS participants (
    marathonId INTEGER NOT NULL,
    userId INTEGER NOT NULL,
    PRIMARY KEY (marathonId, userId),
    FOREIGN KEY (marathonId) REFERENCES marathons(id),
    FOREIGN KEY (userId) REFERENCES users(id)
  );
`);

async function startServer() {
  const app = express();
  app.use(express.json());

  // --- Auth Middleware ---
  const authenticateToken = (req: any, res: any, next: any) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    if (!token) return res.sendStatus(401);

    jwt.verify(token, JWT_SECRET, (err: any, user: any) => {
      if (err) return res.sendStatus(403);
      req.user = user;
      next();
    });
  };

  // --- Auth Routes ---
  app.post('/api/auth/signup', async (req, res) => {
    const { name, phone, instaId, password } = req.body;
    try {
      const hashedPassword = await bcrypt.hash(password, 10);
      const stmt = db.prepare('INSERT INTO users (name, phone, instaId, password) VALUES (?, ?, ?, ?)');
      const result = stmt.run(name, phone, instaId, hashedPassword);
      res.status(201).json({ id: result.lastInsertRowid });
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.post('/api/auth/login', async (req, res) => {
    const { identifier, password } = req.body; // identifier can be phone or instaId
    const user: any = db.prepare('SELECT * FROM users WHERE phone = ? OR instaId = ?').get(identifier, identifier);
    
    if (!user || !(await bcrypt.compare(password, user.password))) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const token = jwt.sign({ id: user.id, name: user.name }, JWT_SECRET, { expiresIn: '24h' });
    res.json({ token, user: { id: user.id, name: user.name, phone: user.phone, instaId: user.instaId } });
  });

  // --- User Routes ---
  app.get('/api/users/profile', authenticateToken, (req: any, res) => {
    const user: any = db.prepare('SELECT id, name, phone, instaId FROM users WHERE id = ?').get(req.user.id);
    const hosted = db.prepare('SELECT * FROM marathons WHERE hostedBy = ?').all(req.user.id);
    const participated = db.prepare(`
      SELECT m.* FROM marathons m 
      JOIN participants p ON m.id = p.marathonId 
      WHERE p.userId = ?
    `).all(req.user.id);
    const won = db.prepare('SELECT * FROM marathons WHERE winnerId = ?').all(req.user.id);

    res.json({ ...user, hosted, participated, won });
  });

  // --- Marathon Routes ---
  app.get('/api/marathons', (req, res) => {
    const marathons = db.prepare(`
      SELECT m.*, u.name as hostName 
      FROM marathons m 
      JOIN users u ON m.hostedBy = u.id
    `).all();
    res.json(marathons);
  });

  app.post('/api/marathons', authenticateToken, (req: any, res) => {
    const { title, description, date, location, prize } = req.body;
    const stmt = db.prepare('INSERT INTO marathons (title, description, date, location, prize, hostedBy) VALUES (?, ?, ?, ?, ?, ?)');
    const result = stmt.run(title, description, date, location, prize, req.user.id);
    res.status(201).json({ id: result.lastInsertRowid });
  });

  app.get('/api/marathons/:id', (req, res) => {
    const marathon: any = db.prepare(`
      SELECT m.*, u.name as hostName, u.instaId as hostInsta 
      FROM marathons m 
      JOIN users u ON m.hostedBy = u.id 
      WHERE m.id = ?
    `).get(req.params.id);
    
    if (!marathon) return res.status(404).json({ error: 'Marathon not found' });

    const participants = db.prepare(`
      SELECT u.id, u.name, u.instaId, u.phone 
      FROM users u 
      JOIN participants p ON u.id = p.userId 
      WHERE p.marathonId = ?
    `).all(req.params.id);

    res.json({ ...marathon, participants });
  });

  app.post('/api/marathons/:id/join', authenticateToken, (req: any, res) => {
    try {
      const stmt = db.prepare('INSERT INTO participants (marathonId, userId) VALUES (?, ?)');
      stmt.run(req.params.id, req.user.id);
      res.json({ message: 'Joined successfully' });
    } catch (error: any) {
      res.status(400).json({ error: 'Already joined or error occurred' });
    }
  });

  app.post('/api/marathons/:id/winner', authenticateToken, (req: any, res) => {
    const { winnerId } = req.body;
    const marathon: any = db.prepare('SELECT hostedBy FROM marathons WHERE id = ?').get(req.params.id);
    
    if (marathon.hostedBy !== req.user.id) {
      return res.status(403).json({ error: 'Only host can declare winner' });
    }

    db.prepare('UPDATE marathons SET winnerId = ? WHERE id = ?').run(winnerId, req.params.id);
    res.json({ message: 'Winner declared' });
  });

  app.get('/api/leaderboard', (req, res) => {
    const leaderboard = db.prepare(`
      SELECT u.id, u.name, u.instaId, COUNT(m.id) as wins
      FROM users u
      LEFT JOIN marathons m ON u.id = m.winnerId
      GROUP BY u.id
      ORDER BY wins DESC
      LIMIT 10
    `).all();
    res.json(leaderboard);
  });

  // --- Vite Integration ---
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.join(__dirname, 'dist')));
    app.get('*', (req, res) => {
      res.sendFile(path.join(__dirname, 'dist', 'index.html'));
    });
  }

  const PORT = 3000;
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
