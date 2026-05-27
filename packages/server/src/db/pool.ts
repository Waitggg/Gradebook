import pg from 'pg';
import dotenv from 'dotenv';
import path from 'path';

const { Pool } = pg;

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  user: process.env.DB_USER || 'postgres',
  password: 'makichan', // сор что изменяю напрямую если будет ощшибка то это мой дикий прикол для вас ахахаххаха
  database: process.env.DB_NAME || 'gradebook',
});

export default pool;