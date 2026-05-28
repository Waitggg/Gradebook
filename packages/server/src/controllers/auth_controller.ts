import { Request, Response } from 'express';
import bcrypt from 'bcrypt';
import { BaseController } from './base_controller';
import { BaseService } from '../services/base_service';
import { AuthResponseBody } from '../types/auth_types.js';

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

class AuthService extends BaseService {
  async findUserByEmail(email: string): Promise<UserRow | null> {
    return this.single<UserRow>(
      'SELECT id, email, password_hash, name, role FROM users WHERE email = $1',
      [email]
    );
  }

  async checkEmailExists(email: string): Promise<boolean> {
    return this.exists('SELECT id FROM users WHERE email = $1', [email]);
  }

  async createUser(email: string, hashedPassword: string, name: string, role: string): Promise<UserRow | null> {
    return this.single<UserRow>(
      `INSERT INTO users (email, password_hash, name, role, created_at) 
       VALUES ($1, $2, $3, $4, DEFAULT) 
       RETURNING id, email, name, role, created_at`,
      [email, hashedPassword, name, role]
    );
  }
}

class AuthController extends BaseController {
  private authService: AuthService;

  constructor() {
    super();
    this.authService = new AuthService();
  }

  async createUser(req: Request<{}, {}, CreateUserBody>, res: Response): Promise<Response> {
    const { email, password, name, role = 'student' } = req.body;

    if (!email || !password || !name) {
      return this.error(res, 'Все поля обязательны для заполнения', 400);
    }

    const emailExists = await this.authService.checkEmailExists(email);
    if (emailExists) {
      return this.error(res, 'Email уже существует', 400);
    }

    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    const newUser = await this.authService.createUser(email, hashedPassword, name, role);

    if (!newUser) {
      return this.error(res, 'Ошибка при создании пользователя');
    }

    const session = this.getSession(req);
    session.userId = newUser.id;
    session.userName = newUser.name;
    session.userEmail = newUser.email;
    session.userRole = newUser.role;

    return this.success(res, {
      message: 'Пользователь создан',
      user: {
        id: newUser.id,
        email: newUser.email,
        name: newUser.name,
        role: newUser.role
      }
    }, 201);
  }

  async authUser(req: Request<{}, {}, AuthUserBody>, res: Response): Promise<Response> {
    const { email, password } = req.body;

    if (!email || !password) {
      return this.error(res, 'Email и пароль обязательны', 400);
    }

    const user = await this.authService.findUserByEmail(email);

    if (!user) {
      return this.error(res, 'Неверный email или пароль', 401);
    }

    const isValid = await bcrypt.compare(password, user.password_hash);

    if (!isValid) {
      return this.error(res, 'Неверный email или пароль', 401);
    }

    const session = this.getSession(req);
    session.userId = user.id;
    session.userName = user.name;
    session.userEmail = user.email;
    session.userRole = user.role;

    return this.success(res, {
      message: 'Вы успешно вошли в аккаунт',
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role
      }
    });
  }

  async logoutUser(req: Request, res: Response): Promise<Response> {
    return new Promise((resolve) => {
      const session = this.getSession(req);
      
      session.destroy((err: Error | null) => {
        if (err) {
          return resolve(this.error(res, 'Ошибка при выходе из системы', 500));
        }

        res.clearCookie('sessionId');
        return resolve(this.success(res, { message: 'Вы вышли из аккаунта' }));
      });
    });
  }

  async getCurrentUser(req: Request, res: Response): Promise<Response> {
    const session = this.getSession(req);

    if (!session.userId) {
      return this.error(res, 'Не авторизован', 401);
    }

    return this.success(res, {
      user: {
        id: session.userId,
        name: session.userName,
        email: session.userEmail,
        role: session.userRole
      }
    });
  }
}

const authController = new AuthController();

export const createUser = (req: Request, res: Response) => {
  return authController.createUser(req, res).catch(error => {
    console.error('Create user error:', error);
    return res.status(500).json({ success: false, message: 'Внутренняя ошибка сервера' });
  });
};

export const authUser = (req: Request, res: Response) => {
  return authController.authUser(req, res).catch(error => {
    console.error('Auth error:', error);
    return res.status(500).json({ success: false, message: 'Внутренняя ошибка сервера' });
  });
};

export const logoutUser = (req: Request, res: Response) => {
  return authController.logoutUser(req, res).catch(error => {
    console.error('Logout error:', error);
    return res.status(500).json({ success: false, message: 'Внутренняя ошибка сервера' });
  });
};

export const getCurrentUser = (req: Request, res: Response) => {
  return authController.getCurrentUser(req, res).catch(error => {
    console.error('Get current user error:', error);
    return res.status(500).json({ success: false, message: 'Внутренняя ошибка сервера' });
  });
};