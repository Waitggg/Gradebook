import { Request, Response } from 'express';

interface SessionWithUser {
  userId?: string;
  userName?: string;
  userEmail?: string;
  userRole?: 'teacher' | 'student' | 'admin';
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

  protected checkTeacher(req: Request): { success: boolean; message?: string; userId?: string } {
    const session = this.getSession(req);
    if (session.userRole !== 'teacher' && session.userRole !== 'admin') {
      return { success: false, message: 'Доступ запрещен' };
    }
    return { success: true, userId: session.userId?.toString() };
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
  
  protected parseId(idParam: string): number | null {
    const id = parseInt(idParam);
    return isNaN(id) ? null : id;
  }
  
  protected validateRequiredFields(fields: Record<string, any>): { valid: boolean; missing?: string[] } {
    const missing = Object.entries(fields)
      .filter(([, value]) => !value)
      .map(([key]) => key);
    
    return missing.length > 0
      ? { valid: false, missing }
      : { valid: true };
  }
  
  protected getPaginationParams(req: Request): { limit: number; offset: number } {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const offset = (page - 1) * limit;
    return { limit, offset };
  }
}