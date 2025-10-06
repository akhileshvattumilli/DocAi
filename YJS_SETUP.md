# Yjs Collaborative Editor Setup

## Overview
CKEditor has been replaced with a cost-effective collaborative editor using Yjs and TipTap. This setup provides real-time collaborative editing without expensive licensing fees.

## Components
- **Frontend**: TipTap editor with Yjs integration
- **Backend**: Simple WebSocket server for Yjs collaboration
- **Real-time sync**: WebSocket-based document synchronization

## Environment Variables

Add these to your `.env` files:

### Frontend (.env.local)
```env
NEXT_PUBLIC_WS_URL=ws://localhost:1234
```

### Backend (.env)
```env
YJS_HOST=localhost
YJS_PORT=1234
```

## Installation & Setup

### 1. Install Dependencies
```bash
# Frontend
cd frontend
npm install

# Backend
cd backend
pip install -r requirements.txt
```

### 2. Start Development Servers

#### Option A: Use the startup script (Recommended)
```bash
cd backend
./start_dev.sh
```

#### Option B: Start servers separately
```bash
# Terminal 1: Django server
cd backend/src
python manage.py runserver 8000

# Terminal 2: Yjs WebSocket server
cd backend
python yjs_server.py

# Terminal 3: Next.js frontend
cd frontend
npm run dev
```

### 3. Access the Application
- Frontend: http://localhost:3000
- Backend: http://localhost:8000
- Yjs WebSocket: ws://localhost:1234

## Features
- ✅ Real-time collaborative editing
- ✅ Rich text formatting (bold, italic, underline, headings, links)
- ✅ Auto-save functionality
- ✅ Document persistence
- ✅ Multi-user presence (shows when others are editing)
- ✅ Conflict-free collaborative editing using CRDTs

## Architecture
```
Frontend (TipTap + Yjs) ←→ WebSocket Server ←→ Multiple Clients
         ↓
    Django Backend (Document Storage)
```

## Benefits over CKEditor
- **Cost**: Free and open-source
- **Performance**: Faster rendering and collaboration
- **Flexibility**: Easily customizable
- **Scalability**: Better handling of concurrent users
- **No licensing**: No monthly fees or user limits

## Troubleshooting

### WebSocket Connection Issues
- Ensure the Yjs server is running on port 1234
- Check that `NEXT_PUBLIC_WS_URL` is set correctly
- Verify firewall settings allow WebSocket connections

### Editor Not Loading
- Check browser console for JavaScript errors
- Ensure all TipTap dependencies are installed
- Verify the editor component is properly imported

### Collaboration Not Working
- Check WebSocket server logs
- Ensure multiple clients connect to the same room (document ID)
- Verify network connectivity between clients

## Production Deployment

For production, consider:
1. Using a more robust WebSocket provider (like Socket.io)
2. Implementing proper authentication for WebSocket connections
3. Adding persistence to a database
4. Using a reverse proxy (nginx) for WebSocket connections
5. Implementing rate limiting and connection limits
