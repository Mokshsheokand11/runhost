import express from 'express';
import { createServer as createViteServer } from 'vite';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';
import multer from 'multer';
import fs from 'fs';
import axios from 'axios';
import dotenv from 'dotenv';

dotenv.config();

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const db = new Database('marathon.db');
const JWT_SECRET = process.env.JWT_SECRET || 'marathon-connect-secret-key-2026';
const STRAVA_CLIENT_ID = process.env.STRAVA_CLIENT_ID;
const STRAVA_CLIENT_SECRET = process.env.STRAVA_CLIENT_SECRET;
const APP_URL = process.env.APP_URL || 'http://localhost:3000';

// Initialize Database
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir);
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/');
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + '-' + file.originalname);
  }
});
const upload = multer({ storage });

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

  CREATE TABLE IF NOT EXISTS photos (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    marathonId INTEGER NOT NULL,
    userId INTEGER NOT NULL,
    imageUrl TEXT NOT NULL,
    caption TEXT,
    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (marathonId) REFERENCES marathons(id),
    FOREIGN KEY (userId) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS photo_likes (
    photoId INTEGER NOT NULL,
    userId INTEGER NOT NULL,
    PRIMARY KEY (photoId, userId),
    FOREIGN KEY (photoId) REFERENCES photos(id),
    FOREIGN KEY (userId) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS photo_comments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    photoId INTEGER NOT NULL,
    userId INTEGER NOT NULL,
    text TEXT NOT NULL,
    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (photoId) REFERENCES photos(id),
    FOREIGN KEY (userId) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS user_integrations (
    userId INTEGER NOT NULL,
    provider TEXT NOT NULL,
    providerUserId TEXT,
    accessToken TEXT,
    refreshToken TEXT,
    expiresAt INTEGER,
    lastSyncAt DATETIME,
    PRIMARY KEY (userId, provider),
    FOREIGN KEY (userId) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS activities (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    userId INTEGER NOT NULL,
    provider TEXT NOT NULL,
    externalId TEXT,
    type TEXT,
    distance FLOAT,
    duration INTEGER,
    startDate DATETIME,
    sourceData TEXT,
    FOREIGN KEY (userId) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS communities (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    description TEXT,
    image TEXT,
    category TEXT,
    ownerId INTEGER,
    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (ownerId) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS community_members (
    communityId INTEGER NOT NULL,
    userId INTEGER NOT NULL,
    joinedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (communityId, userId),
    FOREIGN KEY (communityId) REFERENCES communities(id),
    FOREIGN KEY (userId) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS community_messages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    communityId INTEGER NOT NULL,
    userId INTEGER NOT NULL,
    text TEXT NOT NULL,
    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (communityId) REFERENCES communities(id),
    FOREIGN KEY (userId) REFERENCES users(id)
  );
`);

// Seed communities if empty
const communityCount = db.prepare('SELECT COUNT(*) as count FROM communities').get() as { count: number };
if (communityCount.count === 0) {
  const initialCommunities = [
    { name: "Midnight Striders", description: "For those who find their pace under the city lights. Night runs every Tuesday.", image: "https://picsum.photos/seed/nightrun/400/300", category: "Night Running" },
    { name: "Mountain Goats", description: "Trail running enthusiasts conquering the steepest peaks. Weekend excursions.", image: "https://picsum.photos/seed/trail/400/300", category: "Trail" },
    { name: "Elite Sprinters", description: "Focusing on speed, form, and explosive power. Track sessions daily.", image: "https://picsum.photos/seed/sprint/400/300", category: "Track" },
    { name: "Morning Glory Club", description: "Start your day with a 5K and a coffee. Sunrise runs at the park.", image: "https://picsum.photos/seed/morning/400/300", category: "Social" },
    { name: "Coastal Cruisers", description: "Breezy ocean-side runs for all levels. Perfect for recovery days.", image: "https://picsum.photos/seed/beach/400/300", category: "Scenic" },
    { name: "Iron Lungs", description: "High-altitude training for serious endurance athletes. Oxygen is optional.", image: "https://picsum.photos/seed/mountain/400/300", category: "Endurance" },
    { name: "Urban Explorers", description: "Discover hidden gems in the city through running. Every run is a new route.", image: "https://picsum.photos/seed/city/400/300", category: "Adventure" },
    { name: "The 5AM Crew", description: "The earliest birds in the city. Beat the traffic and the sun.", image: "https://picsum.photos/seed/early/400/300", category: "Early Bird" },
    { name: "Neon Knights", description: "Illuminating the streets with glow sticks and high-vis gear. Safety first, speed second.", image: "https://picsum.photos/seed/neon/400/300", category: "Night Running" },
    { name: "Peak Performers", description: "Serious vertical gain for those who love a challenge. Mountain trails only.", image: "https://picsum.photos/seed/peak/400/300", category: "Trail" },
    { name: "Track Titans", description: "Precision interval training on the oval. Hit your splits, find your limits.", image: "https://picsum.photos/seed/track/400/300", category: "Track" },
    { name: "Brunch Runners", description: "We run so we can eat. 5k social run followed by the best pancakes in town.", image: "https://picsum.photos/seed/brunch/400/300", category: "Social" },
    { name: "River Rapids", description: "Fast-paced runs along the winding river paths. Catch the breeze.", image: "https://picsum.photos/seed/river/400/300", category: "Scenic" },
    { name: "Grit & Glory", description: "Mental toughness training for ultra-marathoners. Long miles, no complaints.", image: "https://picsum.photos/seed/grit/400/300", category: "Endurance" },
    { name: "Alley Cats", description: "Navigation-based runs through the city's hidden shortcuts and urban jungles.", image: "https://picsum.photos/seed/alley/400/300", category: "Adventure" },
    { name: "First Light Flyers", description: "Catch the very first rays of sun on the move. The city is yours.", image: "https://picsum.photos/seed/sunrise/400/300", category: "Early Bird" }
  ];

  const insertStmt = db.prepare('INSERT INTO communities (name, description, image, category) VALUES (?, ?, ?, ?)');
  initialCommunities.forEach(c => insertStmt.run(c.name, c.description, c.image, c.category));
}

async function startServer() {
  const app = express();
  app.use(express.json());
  app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

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

  // --- Photo Gallery Routes ---
  app.get('/api/marathons/:id/photos', (req: any, res) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    let userId = null;
    if (token) {
      try {
        const decoded: any = jwt.verify(token, JWT_SECRET);
        userId = (decoded as any).id;
      } catch (e) {}
    }

    const photos = db.prepare(`
      SELECT p.*, u.name as userName,
      (SELECT COUNT(*) FROM photo_likes WHERE photoId = p.id) as likeCount,
      (SELECT COUNT(*) FROM photo_comments WHERE photoId = p.id) as commentCount,
      (SELECT COUNT(*) FROM photo_likes WHERE photoId = p.id AND userId = ?) as isLiked
      FROM photos p 
      JOIN users u ON p.userId = u.id 
      WHERE p.marathonId = ?
      ORDER BY p.createdAt DESC
    `).all(userId, req.params.id);
    res.json(photos);
  });

  app.post('/api/photos/:id/like', authenticateToken, (req: any, res) => {
    const photoId = req.params.id;
    const userId = req.user.id;
    
    const existing = db.prepare('SELECT 1 FROM photo_likes WHERE photoId = ? AND userId = ?').get(photoId, userId);
    if (existing) {
      db.prepare('DELETE FROM photo_likes WHERE photoId = ? AND userId = ?').run(photoId, userId);
      res.json({ liked: false });
    } else {
      db.prepare('INSERT INTO photo_likes (photoId, userId) VALUES (?, ?)').run(photoId, userId);
      res.json({ liked: true });
    }
  });

  app.get('/api/photos/:id/comments', (req, res) => {
    const comments = db.prepare(`
      SELECT c.*, u.name as userName 
      FROM photo_comments c 
      JOIN users u ON c.userId = u.id 
      WHERE c.photoId = ? 
      ORDER BY c.createdAt ASC
    `).all(req.params.id);
    res.json(comments);
  });

  app.post('/api/photos/:id/comments', authenticateToken, (req: any, res) => {
    const { text } = req.body;
    if (!text) return res.status(400).json({ error: 'Comment text is required' });
    
    const stmt = db.prepare('INSERT INTO photo_comments (photoId, userId, text) VALUES (?, ?, ?)');
    const result = stmt.run(req.params.id, req.user.id, text);
    res.status(201).json({ id: result.lastInsertRowid });
  });

  app.post('/api/marathons/:id/photos', authenticateToken, upload.single('photo'), (req: any, res) => {
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
    
    // Check if user is participant or host
    const marathon: any = db.prepare('SELECT hostedBy FROM marathons WHERE id = ?').get(req.params.id);
    const participant = db.prepare('SELECT 1 FROM participants WHERE marathonId = ? AND userId = ?').get(req.params.id, req.user.id);
    
    if (marathon.hostedBy !== req.user.id && !participant) {
      return res.status(403).json({ error: 'Only participants can upload photos' });
    }

    const { caption } = req.body;
    const imageUrl = `/uploads/${req.file.filename}`;
    const stmt = db.prepare('INSERT INTO photos (marathonId, userId, imageUrl, caption) VALUES (?, ?, ?, ?)');
    const result = stmt.run(req.params.id, req.user.id, imageUrl, caption || '');
    
    res.status(201).json({ id: result.lastInsertRowid, imageUrl });
  });

  // --- Integration & Activity Routes ---
  app.get('/api/auth/strava', authenticateToken, (req: any, res) => {
    if (!STRAVA_CLIENT_ID) return res.status(500).json({ error: 'Strava NOT configured' });
    const scope = 'activity:read_all';
    const redirectUri = `${APP_URL}/api/auth/strava/callback`;
    const state = Buffer.from(JSON.stringify({ userId: req.user.id })).toString('base64');
    const authUrl = `https://www.strava.com/oauth/authorize?client_id=${STRAVA_CLIENT_ID}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=code&scope=${scope}&state=${state}`;
    res.redirect(authUrl);
  });

  app.get('/api/auth/strava/callback', async (req, res) => {
    const { code, state } = req.query;
    if (!code || !state) return res.status(400).send('Invalid request');

    try {
      const { userId } = JSON.parse(Buffer.from(state as string, 'base64').toString());
      
      const response = await axios.post('https://www.strava.com/api/v3/oauth/token', {
        client_id: STRAVA_CLIENT_ID,
        client_secret: STRAVA_CLIENT_SECRET,
        code,
        grant_type: 'authorization_code',
      });

      const { access_token, refresh_token, expires_at, athlete } = response.data;

      db.prepare(`
        INSERT OR REPLACE INTO user_integrations 
        (userId, provider, providerUserId, accessToken, refreshToken, expiresAt) 
        VALUES (?, ?, ?, ?, ?, ?)
      `).run(userId, 'strava', athlete.id.toString(), access_token, refresh_token, expires_at);

      res.send(`
        <html>
          <body style="font-family: sans-serif; display: flex; align-items: center; justify-content: center; height: 100vh; background: #f4f4f5;">
            <div style="background: white; padding: 2rem; border-radius: 1rem; box-shadow: 0 10px 15px -3px rgba(0,0,0,0.1); text-align: center;">
              <h1 style="color: #059669;">Success!</h1>
              <p>Your Strava account has been connected.</p>
              <button onclick="window.close()" style="background: #059669; color: white; border: none; padding: 0.75rem 1.5rem; border-radius: 0.5rem; font-weight: bold; cursor: pointer;">Close Window</button>
              <script>setTimeout(() => { try { window.opener.location.reload(); } catch(e) {} window.close(); }, 2000)</script>
            </div>
          </body>
        </html>
      `);
    } catch (error) {
      console.error('Strava Auth Error:', error);
      res.status(500).send('Authentication failed');
    }
  });

  app.get('/api/integrations', authenticateToken, (req: any, res) => {
    const integrations = db.prepare('SELECT provider, lastSyncAt FROM user_integrations WHERE userId = ?').all(req.user.id);
    res.json(integrations);
  });

  app.post('/api/sync', authenticateToken, async (req: any, res) => {
    const strava = db.prepare('SELECT * FROM user_integrations WHERE userId = ? AND provider = ?').get(req.user.id, 'strava');
    
    if (strava) {
      // Logic would go here to fetch activities from Strava API
      // For this demo, we'll insert a mock activity if successful
      const mockActivity = {
        externalId: 'strava_' + Date.now(),
        type: 'Run',
        distance: 5200, // 5.2km
        duration: 1800, // 30m
        startDate: new Date().toISOString()
      };

      db.prepare(`
        INSERT INTO activities (userId, provider, externalId, type, distance, duration, startDate)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `).run(req.user.id, 'strava', mockActivity.externalId, mockActivity.type, mockActivity.distance, mockActivity.duration, mockActivity.startDate);

      db.prepare('UPDATE user_integrations SET lastSyncAt = CURRENT_TIMESTAMP WHERE userId = ? AND provider = ?').run(req.user.id, 'strava');
    }

    res.json({ message: 'Sync complete' });
  });

  app.get('/api/activities', authenticateToken, (req: any, res) => {
    const activities = db.prepare('SELECT * FROM activities WHERE userId = ? ORDER BY startDate DESC LIMIT 20').all(req.user.id);
    res.json(activities);
  });

  app.post('/api/activities/import', authenticateToken, (req: any, res) => {
    // Manual import logic - mock for now
    const { type, distance, duration, date } = req.body;
    db.prepare(`
      INSERT INTO activities (userId, provider, type, distance, duration, startDate)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(req.user.id, 'manual', type || 'Run', distance, duration, date || new Date().toISOString());
    
    res.json({ message: 'Activity imported' });
  });

  // --- Community Routes ---
  app.get('/api/communities', (req, res) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    let userId = null;
    if (token) {
      try {
        const decoded: any = jwt.verify(token, JWT_SECRET);
        userId = (decoded as any).id;
      } catch (e) {}
    }

    const communities = db.prepare(`
      SELECT c.*, 
      (SELECT COUNT(*) FROM community_members WHERE communityId = c.id) as members,
      (SELECT 1 FROM community_members WHERE communityId = c.id AND userId = ?) as isJoined
      FROM communities c
      ORDER BY c.createdAt DESC
    `).all(userId);
    res.json(communities);
  });

  app.post('/api/communities', authenticateToken, (req: any, res) => {
    const { name, description, category, image } = req.body;
    if (!name) return res.status(400).json({ error: 'Name is required' });
    
    try {
      const stmt = db.prepare('INSERT INTO communities (name, description, category, image, ownerId) VALUES (?, ?, ?, ?, ?)');
      const result = stmt.run(name, description || '', category || 'Social', image || `https://picsum.photos/seed/${Date.now()}/400/300`, req.user.id);
      
      // Auto-join the creator
      db.prepare('INSERT INTO community_members (communityId, userId) VALUES (?, ?)').run(result.lastInsertRowid, req.user.id);
      
      res.status(201).json({ id: result.lastInsertRowid });
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.post('/api/communities/:id/join', authenticateToken, (req: any, res) => {
    try {
      const existing = db.prepare('SELECT 1 FROM community_members WHERE communityId = ? AND userId = ?').get(req.params.id, req.user.id);
      if (existing) {
        db.prepare('DELETE FROM community_members WHERE communityId = ? AND userId = ?').run(req.params.id, req.user.id);
        return res.json({ joined: false });
      } else {
        db.prepare('INSERT INTO community_members (communityId, userId) VALUES (?, ?)').run(req.params.id, req.user.id);
        return res.json({ joined: true });
      }
    } catch (error: any) {
      res.status(400).json({ error: 'Error joining community' });
    }
  });

  app.get('/api/communities/:id/messages', (req, res) => {
    const messages = db.prepare(`
      SELECT m.*, u.name as sender 
      FROM community_messages m
      JOIN users u ON m.userId = u.id
      WHERE m.communityId = ?
      ORDER BY m.createdAt ASC
      LIMIT 100
    `).all(req.params.id);
    res.json(messages);
  });

  app.post('/api/communities/:id/messages', authenticateToken, (req: any, res) => {
    const { text } = req.body;
    if (!text) return res.status(400).json({ error: 'Text is required' });

    try {
      const stmt = db.prepare('INSERT INTO community_messages (communityId, userId, text) VALUES (?, ?, ?)');
      const result = stmt.run(req.params.id, req.user.id, text);
      res.status(201).json({ id: result.lastInsertRowid });
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
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
