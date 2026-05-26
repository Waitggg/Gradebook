import pg from 'pg';
import dotenv from 'dotenv';
import path from 'path';

const { Pool } = pg;

dotenv.config({ path: path.resolve(__dirname, '../../../.env') });

export interface DbConfig {
  host: string;
  port: number;
  user: string;
  password: string;
  database: string;
  max: number;
  idleTimeoutMillis: number;
  connectionTimeoutMillis: number;
}

const config: DbConfig = {
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || '1812',
  database: process.env.DB_NAME || 'gradebook',
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
};

const pool = new Pool(config);

export default pool;