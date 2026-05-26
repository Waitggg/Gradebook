import { Router } from 'express';
import { authMiddleware } from '../middlewares/auth_middleware.js';
import {
  getClassSchedule,
  getAllClassesSchedule,
  createScheduleItem,
  updateScheduleItem,
  deleteScheduleItem,
  getAvailableSubjects,
  getLessonTimes,
  getTeacherSchedule,
  getAllSubjectsForTeacher,
  getAllClassesForTeacher,
  getScheduleWithChanges,
  createScheduleChange,
  deleteScheduleChange,
  getScheduleChangesForDate,
  copyScheduleToDate,
  getWeekScheduleWithChanges
} from '../controllers/schedule_controller.js';

const router = Router();

router.use(authMiddleware);

router.get('/class/:classId/date/:date', getScheduleWithChanges);
router.get('/class/:classId/week/:date', getWeekScheduleWithChanges);

router.post('/changes', createScheduleChange);
router.delete('/changes/:id', deleteScheduleChange);
router.get('/changes/:classId/:date', getScheduleChangesForDate);
router.post('/copy', copyScheduleToDate);

router.get('/class/:classId', getClassSchedule);
router.get('/classes', getAllClassesSchedule);
router.get('/schedule', getClassSchedule);
router.get('/teacher/schedule', getTeacherSchedule);
router.post('/schedule', createScheduleItem);
router.delete('/schedule/:id', deleteScheduleItem);

router.get('/teacher/all-subjects', getAllSubjectsForTeacher);
router.get('/teacher/all-classes', getAllClassesForTeacher);

router.get('/subjects', getAvailableSubjects);
router.get('/lesson-times', getLessonTimes);

router.post('/', createScheduleItem);
router.put('/:id', updateScheduleItem);
router.delete('/:id', deleteScheduleItem);

export default router;