import { Request, Response, NextFunction } from 'express';

type AsyncHandler = (req: Request, res: Response) => Promise<Response>;

interface SessionWithUser {
  userId?: string;
  userEmail?: string;
  userRole?: 'teacher' | 'student';
}

export const asyncHandler = (fn: AsyncHandler) => {
  return async (req: Request, res: Response) => {
    try {
      return await fn(req, res);
    } catch (error) {
      console.error(`Error in ${fn.name}:`, error);
      return res.status(500).json({ 
        success: false, 
        message: 'Внутренняя ошибка сервера' 
      });
    }
  };
};

export const withAuth = (fn: AsyncHandler, requireTeacher: boolean = false) => {
  return async (req: Request, res: Response) => {
    const session = req.session as SessionWithUser;
    
    if (!session.userId) {
      return res.status(401).json({ success: false, message: 'Не авторизован' });
    }
    
    if (requireTeacher && session.userRole !== 'teacher') {
      return res.status(403).json({ success: false, message: 'Доступ запрещен' });
    }
    
    return asyncHandler(fn)(req, res);
  };
};