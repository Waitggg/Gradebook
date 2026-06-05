
import { Router } from 'express';
import { authMiddleware } from '../middlewares/auth_middleware.js';
import {
  getCourseProgram,
  createOrUpdateProgram,
  deleteProgram,
  getProgramLessons,
  createLesson,
  updateLesson,
  deleteLesson,
  getLessonTypeByDate,
  addMaterial,
  deleteMaterial,
  createTeam,
  addTeamMember,
  removeTeamMember,
  deleteTeam
} from '../controllers/course_controller.js';

const router = Router();

router.use(authMiddleware);

// Программа
router.get('/program/:subjectId/:classId', getCourseProgram);
router.post('/program', createOrUpdateProgram);
router.delete('/program/:id', deleteProgram);

// Занятия
router.get('/lessons/:programId', getProgramLessons);
router.post('/lessons', createLesson);
router.put('/lessons/:id', updateLesson);
router.delete('/lessons/:id', deleteLesson);

// Тип урока по дате 
router.get('/lesson-type/:subjectId/:classId/:date', getLessonTypeByDate);

// Материалы
router.post('/materials', addMaterial);
router.delete('/materials/:id', deleteMaterial);

// Команды
router.post('/teams', createTeam);
router.delete('/teams/:id', deleteTeam);
router.post('/teams/members', addTeamMember);
router.delete('/teams/:teamId/members/:studentId', removeTeamMember);

export default router;