const express = require('express');
const cors = require('cors');
const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5000;
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';
const DOMAIN = process.env.DOMAIN || 'chat.apextsgroup.com';
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:3001';

// CORS configuration
const corsOptions = {
  origin: function (origin, callback) {
    if (!origin) return callback(null, true);
    const allowedOrigins = [
      FRONTEND_URL,
      `https://${DOMAIN}`,
      `http://${DOMAIN}`,
      'http://localhost:3001',
      'http://localhost:3000',
    ];
    if (allowedOrigins.indexOf(origin) !== -1 || origin.includes(DOMAIN)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  optionsSuccessStatus: 200
};

app.use(cors(corsOptions));
app.use(express.json());

// Initialize database
const dbPath = path.join(__dirname, 'chatbot.db');
const db = new sqlite3.Database(dbPath);

// Create tables
db.serialize(() => {
  // Users table
  db.run(`CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    name TEXT NOT NULL,
    role TEXT DEFAULT 'client',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);

  // Chat sessions table
  db.run(`CREATE TABLE IF NOT EXISTS chat_sessions (
    id TEXT PRIMARY KEY,
    user_id TEXT,
    visitor_name TEXT,
    visitor_email TEXT,
    status TEXT DEFAULT 'active',
    assigned_to TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id),
    FOREIGN KEY (assigned_to) REFERENCES users(id)
  )`);

  // Chat messages table
  db.run(`CREATE TABLE IF NOT EXISTS chat_messages (
    id TEXT PRIMARY KEY,
    session_id TEXT NOT NULL,
    sender_type TEXT NOT NULL,
    sender_id TEXT,
    message TEXT NOT NULL,
    is_ai BOOLEAN DEFAULT 0,
    is_human_handoff BOOLEAN DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (session_id) REFERENCES chat_sessions(id)
  )`);

  // Leads table
  db.run(`CREATE TABLE IF NOT EXISTS leads (
    id TEXT PRIMARY KEY,
    session_id TEXT,
    user_id TEXT,
    name TEXT NOT NULL,
    email TEXT NOT NULL,
    phone TEXT,
    company TEXT,
    message TEXT,
    source TEXT DEFAULT 'chatbot',
    status TEXT DEFAULT 'new',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (session_id) REFERENCES chat_sessions(id),
    FOREIGN KEY (user_id) REFERENCES users(id)
  )`);

  // AI settings table
  db.run(`CREATE TABLE IF NOT EXISTS ai_settings (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    setting_key TEXT NOT NULL,
    setting_value TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id),
    UNIQUE(user_id, setting_key)
  )`);

  // Create default admin user
  const defaultPassword = bcrypt.hashSync('admin123', 10);
  db.run(`INSERT OR IGNORE INTO users (id, email, password, name, role) 
    VALUES (?, ?, ?, ?, ?)`, 
    [uuidv4(), 'admin@example.com', defaultPassword, 'Admin User', 'admin']);
});

// Middleware for authentication
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ error: 'Invalid or expired token' });
    }
    req.user = user;
    next();
  });
};

// Auth routes
app.post('/api/auth/login', async (req, res) => {
  const { email, password } = req.body;

  db.get('SELECT * FROM users WHERE email = ?', [email], async (err, user) => {
    if (err) {
      return res.status(500).json({ error: 'Database error' });
    }

    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.json({
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role
      }
    });
  });
});

app.post('/api/auth/register', async (req, res) => {
  const { email, password, name } = req.body;

  if (!email || !password || !name) {
    return res.status(400).json({ error: 'Email, password, and name are required' });
  }

  db.get('SELECT * FROM users WHERE email = ?', [email], async (err, existingUser) => {
    if (err) {
      return res.status(500).json({ error: 'Database error' });
    }

    if (existingUser) {
      return res.status(400).json({ error: 'User already exists' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const userId = uuidv4();

    db.run(
      'INSERT INTO users (id, email, password, name, role) VALUES (?, ?, ?, ?, ?)',
      [userId, email, hashedPassword, name, 'client'],
      function(err) {
        if (err) {
          return res.status(500).json({ error: 'Failed to create user' });
        }

        const token = jwt.sign(
          { id: userId, email: email, role: 'client' },
          JWT_SECRET,
          { expiresIn: '24h' }
        );

        res.json({
          token,
          user: {
            id: userId,
            email: email,
            name: name,
            role: 'client'
          }
        });
      }
    );
  });
});

// Admin routes
app.post('/api/admin/clients', authenticateToken, async (req, res) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Admin access required' });
  }

  const { email, password, name } = req.body;

  if (!email || !password || !name) {
    return res.status(400).json({ error: 'Email, password, and name are required' });
  }

  db.get('SELECT * FROM users WHERE email = ?', [email], async (err, existingUser) => {
    if (err) {
      return res.status(500).json({ error: 'Database error' });
    }

    if (existingUser) {
      return res.status(400).json({ error: 'User already exists' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const userId = uuidv4();

    db.run(
      'INSERT INTO users (id, email, password, name, role) VALUES (?, ?, ?, ?, ?)',
      [userId, email, hashedPassword, name, 'client'],
      function(err) {
        if (err) {
          return res.status(500).json({ error: 'Failed to create client' });
        }

        res.json({
          success: true,
          user: {
            id: userId,
            email: email,
            name: name,
            role: 'client'
          }
        });
      }
    );
  });
});

app.get('/api/admin/clients', authenticateToken, (req, res) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Admin access required' });
  }

  db.all('SELECT id, email, name, role, created_at FROM users WHERE role = ? ORDER BY created_at DESC', ['client'], (err, rows) => {
    if (err) {
      return res.status(500).json({ error: 'Database error' });
    }
    res.json(rows);
  });
});

// Chat sessions routes
app.get('/api/chat/sessions', authenticateToken, (req, res) => {
  const { status, limit = 50, offset = 0 } = req.query;
  let query = 'SELECT * FROM chat_sessions WHERE 1=1';
  const params = [];

  // Filter by user_id for clients (admins see all)
  if (req.user.role === 'client') {
    query += ' AND user_id = ?';
    params.push(req.user.id);
  }

  if (status) {
    query += ' AND status = ?';
    params.push(status);
  }

  query += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
  params.push(parseInt(limit), parseInt(offset));

  db.all(query, params, (err, rows) => {
    if (err) {
      return res.status(500).json({ error: 'Database error' });
    }
    res.json(rows);
  });
});

app.get('/api/chat/sessions/:id', authenticateToken, (req, res) => {
  const { id } = req.params;

  let query = 'SELECT * FROM chat_sessions WHERE id = ?';
  const params = [id];

  if (req.user.role === 'client') {
    query += ' AND user_id = ?';
    params.push(req.user.id);
  }

  db.get(query, params, (err, session) => {
    if (err) {
      return res.status(500).json({ error: 'Database error' });
    }
    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }
    res.json(session);
  });
});

app.get('/api/chat/sessions/:id/messages', authenticateToken, (req, res) => {
  const { id } = req.params;

  let sessionQuery = 'SELECT user_id FROM chat_sessions WHERE id = ?';
  const sessionParams = [id];

  if (req.user.role === 'client') {
    sessionQuery += ' AND user_id = ?';
    sessionParams.push(req.user.id);
  }

  db.get(sessionQuery, sessionParams, (err, session) => {
    if (err) {
      return res.status(500).json({ error: 'Database error' });
    }
    if (!session) {
      return res.status(404).json({ error: 'Session not found or access denied' });
    }

    db.all(
      'SELECT * FROM chat_messages WHERE session_id = ? ORDER BY created_at ASC',
      [id],
      (err, messages) => {
        if (err) {
          return res.status(500).json({ error: 'Database error' });
        }
        res.json(messages);
      }
    );
  });
});

app.post('/api/chat/sessions/:id/handoff', authenticateToken, (req, res) => {
  const { id } = req.params;
  const { message } = req.body;

  db.run(
    'UPDATE chat_sessions SET status = ?, assigned_to = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
    ['human_handoff', req.user.id, id],
    function(err) {
      if (err) {
        return res.status(500).json({ error: 'Database error' });
      }

      if (message) {
        db.run(
          'INSERT INTO chat_messages (id, session_id, sender_type, sender_id, message, is_human_handoff) VALUES (?, ?, ?, ?, ?, ?)',
          [uuidv4(), id, 'human', req.user.id, message, 1],
          (err) => {
            if (err) {
              return res.status(500).json({ error: 'Failed to add message' });
            }
          }
        );
      }

      res.json({ success: true, message: 'Chat transferred to human' });
    }
  );
});

app.post('/api/chat/sessions/:id/messages', authenticateToken, (req, res) => {
  const { id } = req.params;
  const { message } = req.body;

  db.run(
    'INSERT INTO chat_messages (id, session_id, sender_type, sender_id, message, is_ai) VALUES (?, ?, ?, ?, ?, ?)',
    [uuidv4(), id, 'human', req.user.id, message, 0],
    function(err) {
      if (err) {
        return res.status(500).json({ error: 'Failed to send message' });
      }
      res.json({ success: true, id: this.lastID });
    }
  );
});

// Leads routes
app.get('/api/leads', authenticateToken, (req, res) => {
  const { status, limit = 100, offset = 0 } = req.query;
  let query = 'SELECT l.* FROM leads l';
  const params = [];

  if (req.user.role === 'client') {
    query += ' INNER JOIN chat_sessions cs ON l.session_id = cs.id WHERE cs.user_id = ?';
    params.push(req.user.id);
  } else {
    query += ' WHERE 1=1';
  }

  if (status) {
    query += ' AND l.status = ?';
    params.push(status);
  }

  query += ' ORDER BY l.created_at DESC LIMIT ? OFFSET ?';
  params.push(parseInt(limit), parseInt(offset));

  db.all(query, params, (err, rows) => {
    if (err) {
      return res.status(500).json({ error: 'Database error' });
    }
    res.json(rows);
  });
});

app.put('/api/leads/:id/status', authenticateToken, (req, res) => {
  const { id } = req.params;
  const { status } = req.body;

  db.run('UPDATE leads SET status = ? WHERE id = ?', [status, id], function(err) {
    if (err) {
      return res.status(500).json({ error: 'Database error' });
    }
    res.json({ success: true });
  });
});

// AI Settings routes
app.get('/api/settings', authenticateToken, (req, res) => {
  db.all(
    'SELECT setting_key, setting_value FROM ai_settings WHERE user_id = ?',
    [req.user.id],
    (err, rows) => {
      if (err) {
        return res.status(500).json({ error: 'Database error' });
      }

      const settings = {};
      rows.forEach(row => {
        try {
          settings[row.setting_key] = JSON.parse(row.setting_value);
        } catch {
          settings[row.setting_key] = row.setting_value;
        }
      });

      if (Object.keys(settings).length === 0) {
        settings.systemPrompt = 'You are a helpful assistant.';
        settings.temperature = 0.7;
        settings.maxTokens = 500;
        settings.enableHandoff = true;
        settings.handoffKeywords = 'speak to human, agent, representative';
      }

      res.json(settings);
    }
  );
});

app.post('/api/settings', authenticateToken, (req, res) => {
  const settings = req.body;

  const stmt = db.prepare(
    'INSERT OR REPLACE INTO ai_settings (id, user_id, setting_key, setting_value, updated_at) VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)'
  );

  Object.keys(settings).forEach(key => {
    const value = typeof settings[key] === 'object' 
      ? JSON.stringify(settings[key]) 
      : settings[key];
    stmt.run([uuidv4(), req.user.id, key, value]);
  });

  stmt.finalize((err) => {
    if (err) {
      return res.status(500).json({ error: 'Failed to save settings' });
    }
    res.json({ success: true });
  });
});

// Reports routes
app.get('/api/reports/usage', authenticateToken, (req, res) => {
  const { startDate, endDate } = req.query;

  let dateFilter = '';
  const params = [];
  
  if (req.user.role === 'client') {
    dateFilter = 'WHERE user_id = ?';
    params.push(req.user.id);
  }
  
  if (startDate && endDate) {
    dateFilter += dateFilter ? ' AND created_at BETWEEN ? AND ?' : 'WHERE created_at BETWEEN ? AND ?';
    params.push(startDate, endDate);
  }

  db.get(
    `SELECT COUNT(*) as total FROM chat_sessions ${dateFilter}`,
    params,
    (err, totalResult) => {
      if (err) {
        return res.status(500).json({ error: 'Database error' });
      }

      const activeFilter = req.user.role === 'client' 
        ? `WHERE user_id = ? AND status = 'active'`
        : `WHERE status = 'active'`;
      const activeParams = req.user.role === 'client' ? [req.user.id] : [];
      if (startDate && endDate) {
        activeParams.push(startDate, endDate);
      }
      db.get(
        `SELECT COUNT(*) as active FROM chat_sessions ${activeFilter} ${startDate && endDate ? 'AND created_at BETWEEN ? AND ?' : ''}`,
        activeParams,
        (err, activeResult) => {
          if (err) {
            return res.status(500).json({ error: 'Database error' });
          }

          const handoffFilter = req.user.role === 'client' 
            ? `WHERE user_id = ? AND status = 'human_handoff'`
            : `WHERE status = 'human_handoff'`;
          const handoffParams = req.user.role === 'client' ? [req.user.id] : [];
          if (startDate && endDate) {
            handoffParams.push(startDate, endDate);
          }
          db.get(
            `SELECT COUNT(*) as handoffs FROM chat_sessions ${handoffFilter} ${startDate && endDate ? 'AND created_at BETWEEN ? AND ?' : ''}`,
            handoffParams,
            (err, handoffResult) => {
              if (err) {
                return res.status(500).json({ error: 'Database error' });
              }

              let messagesFilter = '';
              let messagesParams = [];
              if (req.user.role === 'client') {
                messagesFilter = `WHERE session_id IN (SELECT id FROM chat_sessions WHERE user_id = ?)`;
                messagesParams.push(req.user.id);
                if (startDate && endDate) {
                  messagesFilter += ' AND created_at BETWEEN ? AND ?';
                  messagesParams.push(startDate, endDate);
                }
              } else {
                messagesFilter = dateFilter;
                messagesParams = params;
              }
              db.get(
                `SELECT COUNT(*) as messages FROM chat_messages ${messagesFilter}`,
                messagesParams,
                (err, messagesResult) => {
                  if (err) {
                    return res.status(500).json({ error: 'Database error' });
                  }

                  const dailyFilter = req.user.role === 'client' 
                    ? (dateFilter ? `WHERE user_id = ? AND created_at BETWEEN ? AND ?` : `WHERE user_id = ?`)
                    : dateFilter;
                  const dailyParams = req.user.role === 'client' 
                    ? (startDate && endDate ? [req.user.id, startDate, endDate] : [req.user.id])
                    : params;
                  db.all(
                    `SELECT DATE(created_at) as date, COUNT(*) as count 
                     FROM chat_sessions ${dailyFilter} 
                     GROUP BY DATE(created_at) 
                     ORDER BY date ASC`,
                    dailyParams,
                    (err, dailyStats) => {
                      if (err) {
                        return res.status(500).json({ error: 'Database error' });
                      }

                      res.json({
                        totalSessions: totalResult.total,
                        activeSessions: activeResult.active,
                        humanHandoffs: handoffResult.handoffs,
                        totalMessages: messagesResult.messages,
                        dailyStats: dailyStats
                      });
                    }
                  );
                }
              );
            }
          );
        }
      );
    }
  );
});

// ============================================
// PUBLIC CHATBOT INTEGRATION ENDPOINTS
// ============================================

// Create a new chat session (public endpoint for chatbot)
app.post('/api/webhook/chat/session', (req, res) => {
  const { visitor_name, visitor_email, user_id } = req.body;
  
  if (!user_id) {
    return res.status(400).json({ error: 'user_id is required to associate session with a client' });
  }

  db.get('SELECT id, role FROM users WHERE id = ?', [user_id], (err, user) => {
    if (err) {
      return res.status(500).json({ error: 'Database error' });
    }
    if (!user) {
      return res.status(404).json({ error: 'User not found. Please provide a valid user_id.' });
    }
    if (user.role !== 'client') {
      return res.status(400).json({ error: 'user_id must be a client account' });
    }

    const sessionId = uuidv4();
    db.run(
      'INSERT INTO chat_sessions (id, user_id, visitor_name, visitor_email, status) VALUES (?, ?, ?, ?, ?)',
      [sessionId, user_id, visitor_name || 'Anonymous', visitor_email || null, 'active'],
      function(err) {
        if (err) {
          return res.status(500).json({ error: 'Failed to create session', details: err.message });
        }
        res.json({ success: true, session_id: sessionId });
      }
    );
  });
});

// Send a message from visitor and get AI response (public endpoint)
app.post('/api/webhook/chat/message', async (req, res) => {
  const { session_id, message, visitor_name, visitor_email } = req.body;

  if (!session_id || !message) {
    return res.status(400).json({ error: 'session_id and message are required' });
  }

  db.get('SELECT * FROM chat_sessions WHERE id = ?', [session_id], async (err, session) => {
    if (err) {
      return res.status(500).json({ error: 'Database error' });
    }

    let currentSession = session;
    
    if (!currentSession) {
      return res.status(404).json({ error: 'Session not found' });
    }

    if (currentSession.status === 'human_handoff') {
      db.run(
        'INSERT INTO chat_messages (id, session_id, sender_type, message, is_ai) VALUES (?, ?, ?, ?, ?)',
        [uuidv4(), currentSession.id, 'visitor', message, 0],
        (err) => {
          if (err) {
            return res.status(500).json({ error: 'Failed to save message' });
          }
          res.json({ 
            success: true, 
            response: 'Message received. A human agent will respond shortly.',
            handoff: true 
          });
        }
      );
      return;
    }

    // Save visitor message
    db.run(
      'INSERT INTO chat_messages (id, session_id, sender_type, message, is_ai) VALUES (?, ?, ?, ?, ?)',
      [uuidv4(), currentSession.id, 'visitor', message, 0],
      async (err) => {
        if (err) {
          return res.status(500).json({ error: 'Failed to save message' });
        }

        // Get AI settings
        db.all(
          'SELECT setting_key, setting_value FROM ai_settings WHERE user_id = ?',
          [currentSession.user_id],
          async (err, rows) => {
            const settings = {};
            if (!err && rows.length > 0) {
              rows.forEach(row => {
                try {
                  settings[row.setting_key] = JSON.parse(row.setting_value);
                } catch {
                  settings[row.setting_key] = row.setting_value;
                }
              });
            } else {
              settings.systemPrompt = 'You are a helpful assistant.';
              settings.temperature = 0.7;
              settings.maxTokens = 500;
              settings.enableHandoff = true;
              settings.handoffKeywords = 'speak to human, agent, representative';
            }

            // Check for handoff keywords
            const handoffKeywords = settings.handoffKeywords || 'speak to human, agent, representative';
            const messageLower = message.toLowerCase();
            const keywords = handoffKeywords.split(',').map(k => k.trim().toLowerCase());
            const shouldHandoff = settings.enableHandoff && keywords.some(keyword => 
              messageLower.includes(keyword)
            );

            if (shouldHandoff) {
              db.run(
                'UPDATE chat_sessions SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
                ['human_handoff', currentSession.id],
                (err) => {
                  if (err) {
                    console.error('Failed to update session status:', err);
                  }
                }
              );

              const handoffMessage = 'I understand you\'d like to speak with a human agent. Let me transfer you now.';
              db.run(
                'INSERT INTO chat_messages (id, session_id, sender_type, message, is_ai, is_human_handoff) VALUES (?, ?, ?, ?, ?, ?)',
                [uuidv4(), currentSession.id, 'ai', handoffMessage, 1, 1],
                (err) => {
                  if (err) {
                    console.error('Failed to save handoff message:', err);
                  }
                }
              );

              return res.json({ 
                success: true, 
                response: handoffMessage,
                handoff: true 
              });
            }

            // Generate AI response (placeholder - integrate your AI service here)
            const aiResponse = `I received your message: "${message}". This is a placeholder response. Please integrate with your AI service (OpenAI, Anthropic, etc.) to generate real responses.`;

            // Save AI response
            db.run(
              'INSERT INTO chat_messages (id, session_id, sender_type, message, is_ai) VALUES (?, ?, ?, ?, ?)',
              [uuidv4(), currentSession.id, 'ai', aiResponse, 1],
              (err) => {
                if (err) {
                  return res.status(500).json({ error: 'Failed to save AI response' });
                }
                res.json({ success: true, response: aiResponse });
              }
            );
          }
        );
      }
    );
  });
});

// Create a lead from chatbot (public endpoint)
app.post('/api/webhook/chat/lead', (req, res) => {
  const { session_id, name, email, phone, company, message } = req.body;

  if (!name || !email) {
    return res.status(400).json({ error: 'name and email are required' });
  }

  // Get user_id from session
  db.get('SELECT user_id FROM chat_sessions WHERE id = ?', [session_id || ''], (err, session) => {
    if (err) {
      return res.status(500).json({ error: 'Database error' });
    }

    db.run(
      'INSERT INTO leads (id, session_id, user_id, name, email, phone, company, message, source, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [uuidv4(), session_id || null, session?.user_id || null, name, email, phone || null, company || null, message || null, 'chatbot', 'new'],
      function(err) {
        if (err) {
          return res.status(500).json({ error: 'Failed to create lead', details: err.message });
        }
        res.json({ success: true, lead_id: this.lastID });
      }
    );
  });
});

app.listen(PORT, () => {
  console.log(`\n🚀 AI Chatbot Portal Server Running`);
  console.log(`📍 Port: ${PORT}`);
  console.log(`🌐 Domain: ${DOMAIN}`);
  console.log(`🔗 Frontend URL: ${FRONTEND_URL}`);
  console.log(`\n📡 Chatbot webhook endpoints:`);
  console.log(`   POST ${FRONTEND_URL}/api/webhook/chat/session - Create chat session`);
  console.log(`   POST ${FRONTEND_URL}/api/webhook/chat/message - Send message and get AI response`);
  console.log(`   POST ${FRONTEND_URL}/api/webhook/chat/lead - Create lead from chatbot`);
  console.log(`\n✅ Server ready!\n`);
});

