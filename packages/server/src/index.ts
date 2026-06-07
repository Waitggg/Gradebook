import express from 'express';
import http from 'http';
import { Server as SocketServer } from 'socket.io';
import session from 'express-session';
import PgSession from 'connect-pg-simple';
import cors from 'cors';
import pool from './db/pool.js';
import authRoutes from './routes/auth_routes.js';
import gradebookRoutes from './routes/gradebook_routes.js';
import scheduleRoutes from './routes/schedule_routes.js';
import dotenv from 'dotenv';
import path from 'path';
import labRoutes from './routes/lab_routes';
import courseRoutes from './routes/course_routes';


dotenv.config({ path: path.resolve(process.cwd(), '../../.env') });

const app = express();
const server = http.createServer(app);
const io = new SocketServer(server, {
  cors: {
    origin: 'http://localhost:5173',
    credentials: true
  }
});

const PgStore = PgSession(session);

app.use(cors({
  origin: 'http://localhost:5173',
  credentials: true
}));
app.use(express.json());

const sessionMiddleware = session({
  store: new PgStore({
    pool: pool,
    tableName: 'user_sessions',
    createTableIfMissing: true,
  }),
  name: 'sessionId',
  secret: process.env.SESSION_SECRET || 'your-secret-key',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    maxAge: 1000 * 60 * 60 * 24,
    sameSite: 'lax',
  },
});

app.use(sessionMiddleware);

app.use('/api/auth', authRoutes);
app.use('/api/gradebook', gradebookRoutes);
app.use('/api/schedule', scheduleRoutes);
app.use('/api/labs', labRoutes);
app.use('/api/course', courseRoutes);
io.engine.use(sessionMiddleware);

const userSockets = new Map();

io.use((socket, next) => {
  const req = socket.request as any;
  const userId = req.session?.userId;
  
  if (userId) {
    (socket as any).userId = userId;
    next();
  } else {
    next(new Error('Unauthorized'));
  }
});

io.on('connection', (socket) => {
  const userId = (socket as any).userId;
  
  if (userId) {
    userSockets.set(userId, socket.id);
    console.log(`User ${userId} connected (socket: ${socket.id})`);
    console.log(`Total connected users: ${userSockets.size}`);
  }

  socket.on('disconnect', () => {
    if (userId) {
      userSockets.delete(userId);
      console.log(`User ${userId} disconnected`);
      console.log(`Total connected users: ${userSockets.size}`);
    }
  });
});

app.set('io', io);
app.set('userSockets', userSockets);

app.use('/api/auth', authRoutes);
app.use('/api/gradebook', gradebookRoutes);
app.use('/api/schedule', scheduleRoutes);
app.use('/api/course', courseRoutes);

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
