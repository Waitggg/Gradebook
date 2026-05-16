import express, { Application } from 'express';
import path from 'path';
import session from 'express-session';
import authRoutes from './routes/auth_routes';
import dotenv from 'dotenv';    
import PgSession from 'connect-pg-simple';
import pool from './db/client'; 

dotenv.config();

const app: Application = express();
const PORT = process.env.PORT || 3000;

const PgStore = PgSession(session);

app.use(
  session({
    store: new PgStore({
      pool: pool,
      tableName: 'user_sessions',
      createTableIfMissing: true,
    }),
    name: 'sessionId',
    secret: process.env.SECRET || '1250005252',
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: process.env.NODE_ENV === 'production',
      httpOnly: true,
      maxAge: 1000 * 60 * 60 * 24,   // 24 часа
      sameSite: 'lax',
    },
  })
);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

app.use('/api/', authRoutes);

app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});