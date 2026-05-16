import { Request, Response } from 'express';
import bcrypt from 'bcrypt';
import pool from '../db/client';
import { AuthResponseBody } from '../types/auth_types.js';
import { QueryResult } from 'pg';

interface CreateUserBody {
  email: string;
  password: string;
  name: string;
  role?: 'teacher' | 'student';
}

interface AuthUserBody {
  email: string;
  password: string;
}

interface UserRow {
  id: string;
  email: string;
  name: string;
  role: 'teacher' | 'student';
  password_hash: string;
  created_at: Date;
}

interface ExistingUserRow {
  id: string;
}

interface SessionWithUser {
  userId?: string;
  userEmail?: string;
  userRole?: 'teacher' | 'student';
  destroy: (callback: (err: Error | null) => void) => void;
}

export async function createUser(req: Request<{}, {}, CreateUserBody>, res: Response): Promise<Response> {
  const { email, password, name, role = 'student' } = req.body;

  try {
    const existingUser: QueryResult<ExistingUserRow> = await pool.query(
      'SELECT id FROM users WHERE email = $1',
      [email]
    );

    if (existingUser.rows.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Email уже существует'
      } as AuthResponseBody);
    }

    const hashedPassword: string = await bcrypt.hash(password, 10);
    const result: QueryResult<UserRow> = await pool.query(
      `INSERT INTO users (email, password_hash, name, role, created_at) 
       VALUES ($1, $2, $3, $4, DEFAULT) 
       RETURNING id, email, name, role, created_at`,
      [email, hashedPassword, name, role]
    );

    const newUser: UserRow = result.rows[0];

    const session = req.session as SessionWithUser;
    session.userId = newUser.id;
    session.userEmail = newUser.email;
    session.userRole = newUser.role;

    return res.status(201).json({
      success: true,
      message: 'Пользователь создан',
      user: {
        id: newUser.id,
        email: newUser.email,
        name: newUser.name,
        role: newUser.role
      }
    } as AuthResponseBody);

  } catch (error) {
    console.error('Create user error:', error);
    return res.status(500).json({
      success: false,
      message: 'Ошибка при создании пользователя'
    } as AuthResponseBody);
  }
}

export async function authUser(req: Request<{}, {}, AuthUserBody>, res: Response): Promise<Response> {
  const { email, password } = req.body;

  try {
    const result: QueryResult<UserRow> = await pool.query(
      'SELECT id, email, password_hash, name, role FROM users WHERE email = $1',
      [email]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({
        success: false,
        message: 'Неверный email или пароль'
      } as AuthResponseBody);
    }

    const user: UserRow = result.rows[0];
    const isValid: boolean = await bcrypt.compare(password, user.password_hash);

    if (!isValid) {
      return res.status(401).json({
        success: false,
        message: 'Неверный email или пароль'
      } as AuthResponseBody);
    }

    const session = req.session as SessionWithUser;
    session.userId = user.id;
    session.userEmail = user.email;
    session.userRole = user.role;

    return res.json({
      success: true,
      message: 'Вы успешно вошли в аккаунт',
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role
      }
    } as AuthResponseBody);

  } catch (error) {
    console.error('Auth error:', error);
    return res.status(500).json({
      success: false,
      message: 'Ошибка при авторизации'
    } as AuthResponseBody);
  }
}

export async function logoutUser(req: Request, res: Response): Promise<Response> {
  return new Promise((resolve) => {
    const session = req.session as SessionWithUser;
    
    session.destroy((err: Error | null) => {
      if (err) {
        return resolve(res.status(500).json({
          success: false,
          message: 'Ошибка при выходе из системы'
        } as AuthResponseBody));
      }

      res.clearCookie('sessionId');
      return resolve(res.json({
        success: true,
        message: 'Вы вышли из аккаунта'
      } as AuthResponseBody));
    });
  });
}

export async function getCurrentUser(req: Request, res: Response): Promise<Response> {
  const session = req.session as SessionWithUser;

  if (!session.userId) {
    return res.status(401).json({
      success: false,
      message: 'Не авторизован'
    } as AuthResponseBody);
  }

  return res.json({
    success: true,
    user: {
      id: session.userId,
      email: session.userEmail,
      role: session.userRole
    }
  } as AuthResponseBody);
}