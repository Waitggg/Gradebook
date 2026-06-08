
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

router.get('/program/:subjectId/:classId', getCourseProgram);
router.post('/program', createOrUpdateProgram);
router.delete('/program/:id', deleteProgram);

router.get('/lessons/:programId', getProgramLessons);
router.post('/lessons', createLesson);
router.put('/lessons/:id', updateLesson);
router.delete('/lessons/:id', deleteLesson);

router.get('/lesson-type/:subjectId/:classId/:date', getLessonTypeByDate);

router.post('/materials', addMaterial);
router.delete('/materials/:id', deleteMaterial);

router.post('/teams', createTeam);
router.delete('/teams/:id', deleteTeam);
router.post('/teams/members', addTeamMember);
router.delete('/teams/:teamId/members/:studentId', removeTeamMember);

export default router;