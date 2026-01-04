# AI Chatbot Portal

A comprehensive client portal for managing AI chatbot interactions, with features for human handoff, settings management, usage reports, and lead tracking.

## Features

- **Multi-Client Support**: Each client can log in and see only their own data
- **Chat Session Management**: View and monitor all chatbot conversations
- **Human Handoff**: Take over chats from AI and continue as a human agent
- **AI Settings**: Configure AI behavior, temperature, prompts, and handoff triggers
- **Usage Reports**: Detailed analytics with charts and statistics
- **Leads Management**: Track and manage leads generated from chatbot conversations
- **Webhook Integration**: Public endpoints for chatbot services to connect

## Tech Stack

- **Frontend**: React 18 + TypeScript + Tailwind CSS
- **Backend**: Node.js + Express
- **Database**: SQLite
- **Authentication**: JWT-based

## Quick Start

### 1. Install Dependencies

```bash
npm run install-all
```

### 2. Start Development Servers

```bash
npm run dev
```

This starts:
- Backend server on `http://localhost:5000`
- Frontend React app on `http://localhost:3001` (not 3000)

### 3. Login

- **Admin**: `admin@example.com` / `admin123`
- **Clients**: Create via admin panel or registration endpoint

## Project Structure

```
ai-chatbot-portal/
├── client/                 # React frontend
│   ├── src/
│   │   ├── components/    # React components
│   │   └── contexts/      # React contexts (Auth)
│   └── public/
├── server/                # Express backend
│   ├── index.js          # Main server file
│   └── chatbot.db        # SQLite database (auto-created)
└── package.json
```

## API Endpoints

### Authentication
- `POST /api/auth/login` - Login user
- `POST /api/auth/register` - Register new client

### Chat Sessions
- `GET /api/chat/sessions` - Get all chat sessions (filtered by client)
- `GET /api/chat/sessions/:id` - Get session details
- `GET /api/chat/sessions/:id/messages` - Get session messages
- `POST /api/chat/sessions/:id/handoff` - Take over chat
- `POST /api/chat/sessions/:id/messages` - Send message

### Leads
- `GET /api/leads` - Get all leads (filtered by client)
- `PUT /api/leads/:id/status` - Update lead status

### Settings (Admin Only)
- `GET /api/settings` - Get AI settings
- `POST /api/settings` - Update AI settings

### Reports
- `GET /api/reports/usage` - Get usage statistics (filtered by client)

### Webhook Endpoints (Public)
- `POST /api/webhook/chat/session` - Create chat session (requires user_id)
- `POST /api/webhook/chat/message` - Send message and get AI response
- `POST /api/webhook/chat/lead` - Create lead from chatbot

### Admin
- `POST /api/admin/clients` - Create client account
- `GET /api/admin/clients` - List all clients

## Connecting Your Chatbot

When creating chat sessions via webhook, you **must** include the client's `user_id`:

```bash
POST /api/webhook/chat/session
{
  "user_id": "client-user-id-here",  # REQUIRED
  "visitor_name": "John Doe",
  "visitor_email": "john@example.com"
}
```

## Environment Variables

Create `server/.env`:

```
PORT=5000
NODE_ENV=production
JWT_SECRET=your-strong-secret-key-here
DOMAIN=chat.apextsgroup.com
FRONTEND_URL=http://localhost:3001
```

## Changing the Frontend Port

The frontend is configured to run on port **3001** by default. To change it:

1. **Option 1**: Edit `client/package.json` and change the PORT in the start script
2. **Option 2**: Create `client/.env` file with `PORT=YOUR_PORT`

## Client Data Isolation

- Clients only see their own chat sessions, leads, and reports
- Admins see all data across all clients
- Settings page is admin-only

## Production Build

```bash
cd client
npm run build
```

The built files will be in `client/build/`.

## License

MIT
