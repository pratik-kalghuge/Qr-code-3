import express from 'express';
import { createServer } from 'http';
import { Server, Socket } from 'socket.io';
import cors from 'cors';
import { v4 as uuidv4 } from 'uuid';

const CORS_ORIGIN = process.env.CORS_ORIGIN || '*';

const app = express();
app.use(cors({ origin: CORS_ORIGIN }));
app.use(express.json());

const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: CORS_ORIGIN,
    methods: ['GET', 'POST'],
  },
});

interface Session {
  senderSocketId: string | null;
  receiverSocketId: string | null;
  createdAt: number;
}

const sessions = new Map<string, Session>();

// Cleanup stale sessions every 5 minutes
setInterval(() => {
  const now = Date.now();
  for (const [id, session] of sessions.entries()) {
    if (now - session.createdAt > 30 * 60 * 1000) {
      sessions.delete(id);
    }
  }
}, 5 * 60 * 1000);

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', sessions: sessions.size });
});

app.post('/api/session', (_req, res) => {
  const sessionId = uuidv4();
  sessions.set(sessionId, {
    senderSocketId: null,
    receiverSocketId: null,
    createdAt: Date.now(),
  });
  res.json({ sessionId });
});

io.on('connection', (socket: Socket) => {
  console.log('Client connected:', socket.id);

  socket.on('join-as-sender', (sessionId: string) => {
    const session = sessions.get(sessionId);
    if (!session) {
      socket.emit('error', 'Session not found');
      return;
    }
    session.senderSocketId = socket.id;
    socket.join(sessionId);
    socket.data.sessionId = sessionId;
    socket.data.role = 'sender';
    socket.emit('joined', { role: 'sender', sessionId });
    console.log(`Sender joined session ${sessionId}`);
  });

  socket.on('join-as-receiver', (sessionId: string) => {
    const session = sessions.get(sessionId);
    if (!session) {
      socket.emit('error', 'Session not found');
      return;
    }
    session.receiverSocketId = socket.id;
    socket.join(sessionId);
    socket.data.sessionId = sessionId;
    socket.data.role = 'receiver';
    socket.emit('joined', { role: 'receiver', sessionId });

    // Notify sender that receiver joined
    if (session.senderSocketId) {
      io.to(session.senderSocketId).emit('receiver-joined');
    }
    console.log(`Receiver joined session ${sessionId}`);
  });

  // Relay WebRTC signaling data
  socket.on('signal', (data: { sessionId: string; signal: unknown }) => {
    const session = sessions.get(data.sessionId);
    if (!session) return;

    const role = socket.data.role;
    if (role === 'sender' && session.receiverSocketId) {
      io.to(session.receiverSocketId).emit('signal', data.signal);
    } else if (role === 'receiver' && session.senderSocketId) {
      io.to(session.senderSocketId).emit('signal', data.signal);
    }
  });

  socket.on('disconnect', () => {
    const sessionId = socket.data.sessionId;
    const role = socket.data.role;
    if (sessionId && role) {
      const session = sessions.get(sessionId);
      if (session) {
        if (role === 'sender') {
          session.senderSocketId = null;
          if (session.receiverSocketId) {
            io.to(session.receiverSocketId).emit('peer-disconnected');
          }
        } else {
          session.receiverSocketId = null;
          if (session.senderSocketId) {
            io.to(session.senderSocketId).emit('peer-disconnected');
          }
        }
      }
    }
    console.log('Client disconnected:', socket.id);
  });
});

const PORT = process.env.PORT || 3001;
httpServer.listen(PORT, () => {
  console.log(`Signaling server running on port ${PORT}`);
});
