import express, { Application } from 'express';
import path from 'path';
import session from 'express-session';
import authRoutes from './routes/auth_routes';

const app: Application = express();
const PORT = 3000;

app.use(
  session({
    secret: 'your-secret-key-change-this', // Замените на надежный секрет
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: false, // true если используете HTTPS
      httpOnly: true,
      maxAge: 1000 * 60 * 60 * 24 // 24 часа
    }
  })
);


app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

app.use('/api/auth', authRoutes);

app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});