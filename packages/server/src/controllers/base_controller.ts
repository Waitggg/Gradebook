// controllers/BaseController.ts
import { Request, Response } from 'express';

interface SessionWithUser {
  userId?: string;
  userName?: string;
  userEmail?: string;
  userRole?: 'teacher' | 'student';
  destroy: (callback: (err: Error | null) => void) => void;
}

export class BaseController {
  protected getSession(req: Request): SessionWithUser {
    return req.session as SessionWithUser;
  }

  protected checkAuth(req: Request): { success: boolean; userId?: string; userRole?: string; message?: string } {
    const session = this.getSession(req);
    if (!session.userId) {
      return { success: false, message: 'Не авторизован' };
    }
    return { success: true, userId: session.userId, userRole: session.userRole };
  }

  protected checkTeacher(req: Request): { success: boolean; message?: string } {
    const session = this.getSession(req);
    if (session.userRole !== 'teacher') {
      return { success: false, message: 'Доступ запрещен' };
    }
    return { success: true };
  }

  protected success(res: Response, data: any, status: number = 200): Response {
    return res.status(status).json({ success: true, ...data });
  }

  protected error(res: Response, message: string, status: number = 500): Response {
    return res.status(status).json({ success: false, message });
  }

  protected handleError(res: Response, error: any, defaultMessage: string): Response {
    console.error(defaultMessage, error);
    return this.error(res, defaultMessage);
  }

  protected async safeExecute<T>(
    res: Response,
    action: () => Promise<T>,
    successMessage?: string
  ): Promise<Response> {
    try {
      const result = await action();
      return this.success(res, result);
    } catch (error) {
      return this.handleError(res, error, successMessage || 'Ошибка выполнения операции');
    }
  }
}