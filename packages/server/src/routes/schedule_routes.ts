import { Router } from 'express';
import { authMiddleware } from '../middlewares/auth_middleware.js';
import {
  getClassSchedule,
  getAllClassesSchedule,
  createScheduleItem,
  updateScheduleItem,
  deleteScheduleItem,
  getAvailableSubjects,
  getLessonTimes
} from '../controllers/schedule_controller.js';

const router = Router();

router.use(authMiddleware);

router.get('/class/:classId', getClassSchedule);
router.get('/classes', getAllClassesSchedule);

router.get('/subjects', getAvailableSubjects);
router.get('/lesson-times', getLessonTimes);

router.post('/', createScheduleItem);
router.put('/:id', updateScheduleItem);
router.delete('/:id', deleteScheduleItem);

export default router;