import { Request, Response, NextFunction } from 'express';
import type { SessionData } from 'express-session';

export class SessionUser {
  constructor(
    public readonly id: string,
    public readonly email: string,
    public readonly role: 'teacher' | 'student'
  ) {}

  isTeacher(): boolean {
    return this.role === 'teacher';
  }

  isStudent(): boolean {
    return this.role === 'student';
  }

  toJSON() {
    return {
      id: this.id,
      email: this.email,
      role: this.role
    };
  }
}

declare global {
  namespace Express {
    interface Request {
      user?: SessionUser;
    }
  }
}

export const authMiddleware = async (
  req: Request, 
  res: Response, 
  next: NextFunction
): Promise<void> => {
  try {
    const session = req.session as SessionData;
    
    if (!session.userId || !session.userEmail || !session.userRole) {
      res.status(401).json({
        success: false,
        message: 'Не авторизован'
      });
      return;
    }
    
    req.user = new SessionUser (
      session.userId,
      session.userEmail,
      session.userRole
    );
    
    next();
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Ошибка авторизации'
    });
  }
};