import { Router } from 'express';
import { createUser, authUser, logoutUser, getCurrentUser } from '../controllers/auth_controller';
import { authMiddleware } from '../middlewares/auth_middleware';

const router = Router();

router.post('/register', createUser);

router.post('/login', authUser);

router.get('/profile', authMiddleware, getCurrentUser);

router.post('/logout', authMiddleware, logoutUser);

export default router;