import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import pool from '../../pool';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '../../../../env') });

interface Migration {
  id: number;
  name: string;
  executed_at: Date;
}

async function migrate(): Promise<void> {
  console.log('Starting database migration...');
  
  try {
    const migrationsDir = path.resolve(__dirname, '../../migrations');
    
    if (!fs.existsSync(migrationsDir)) {
      console.error(`Migrations directory not found: ${migrationsDir}`);
      process.exit(1);
    }
    
    const sqlFiles: string[] = fs.readdirSync(migrationsDir)
      .filter((file: string) => file.endsWith('.sql'))
      .sort();
    
    if (sqlFiles.length === 0) {
      console.log('No SQL files found in migrations directory');
      return;
    }
    
    console.log(`Found ${sqlFiles.length} migration files:`);
    sqlFiles.forEach((file: string) => console.log(`  - ${file}`));
    
    await pool.query(`
      CREATE TABLE IF NOT EXISTS migrations (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL UNIQUE,
        executed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    
    const { rows: executedMigrations } = await pool.query<Migration>(
      'SELECT name FROM migrations ORDER BY id'
    );
    const executedNames = new Set(executedMigrations.map((m: Migration) => m.name));
    
    let executedCount = 0;
    
    for (const sqlFile of sqlFiles) {
      if (executedNames.has(sqlFile)) {
        console.log(`Skipping ${sqlFile} (already executed)`);
        continue;
      }
      
      console.log(`Executing ${sqlFile}...`);
      
      const sqlPath = path.join(migrationsDir, sqlFile);
      const sql = fs.readFileSync(sqlPath, 'utf8');
      
      try {
        await pool.query(sql);
        
        await pool.query(
          'INSERT INTO migrations (name) VALUES ($1)',
          [sqlFile]
        );
        
        console.log(`Executed ${sqlFile}`);
        executedCount++;
      } catch (err: unknown) {
        const errorMessage = err instanceof Error ? err.message : String(err);
        console.error(`Error executing ${sqlFile}:`, errorMessage);
        throw err;
      }
    }
    
    if (executedCount === 0) {
      console.log('No new migrations to execute');
    } else {
      console.log(`Migration completed! Executed ${executedCount} new migration(s)`);
    }
    
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error('Migration failed:', errorMessage);
    throw error;
  } finally {
    await pool.end();
  }
}

migrate().catch(() => {
  process.exit(1);
});
