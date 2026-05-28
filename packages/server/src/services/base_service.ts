import { Pool, QueryResult } from 'pg';
import pool from '../db/pool';

export class BaseService {
  protected pool: Pool;

  constructor() {
    this.pool = pool;
  }

  async query<T>(sql: string, params?: any[]): Promise<T[]> {
    try {
      const result: QueryResult = await this.pool.query(sql, params);
      return result.rows;
    } catch (error) {
      console.error('Query error:', error);
      throw error;
    }
  }

  async single<T>(sql: string, params?: any[]): Promise<T | null> {
    const rows = await this.query<T>(sql, params);
    return rows.length > 0 ? rows[0] : null;
  }

  async mutation(sql: string, params?: any[]): Promise<QueryResult> {
    return await this.pool.query(sql, params);
  }

  async exists(sql: string, params?: any[]): Promise<boolean> {
    const result = await this.query<{ exists: boolean }>(
      `SELECT EXISTS(${sql}) as exists`,
      params
    );
    return result[0]?.exists || false;
  }

  async transaction<T>(callback: (client: any) => Promise<T>): Promise<T> {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      const result = await callback(client);
      await client.query('COMMIT');
      return result;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }
}