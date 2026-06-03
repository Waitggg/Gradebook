import { Router } from 'express';
import { authMiddleware } from '../middlewares/auth_middleware.js';
import {
  getAllSubjects,
  createSubject,
  getAllClasses,
  getMyClasses,
  createClass,
  updateClass,
  deleteClass,
  addGrade,
  getStudentGrades,
  getAverageGrade,
  markAttendance,
  getStudentAttendance,
  createHomework,
  getHomework,
  submitHomework,
  assignTeacherToSubject,
  getMySubjects,
  createScheduleItem,
  getClassSchedule,
  getDashboardStats,
  getGradesBySubject,
  getAttendanceBySubject,
  getClassStudents,
  addStudentToClass,
  getAllStudents,
  createStudent,
  updateStudent,
  deleteStudent,
  getAllStudentClasses,
  deleteStudentClass,
  getAllTeachers,
  getAllTeacherSubjects,
  deleteTeacherSubject,
  createTeacher,
  updateTeacher,
  deleteTeacher,
  updateSubject,
  deleteSubject,
  getTeacherSchedule,
  deleteScheduleItem,
  deleteGrade,
  deleteAttendance,
  getTeacherScheduleWithChanges,
  getChangesForSubject,
  getClassGrades,
  getClassAverages,
  deleteGradeByDate,
  deleteAttendanceByDate
} from '../controllers/gradebook_controller.js';

const router = Router();

router.use(authMiddleware);

router.get('/subjects', getAllSubjects);
router.post('/subjects', createSubject);
router.put('/subjects/:id', updateSubject);
router.delete('/subjects/:id', deleteSubject);
router.get('/changes/class/:classId/subject/:subjectId', getChangesForSubject);

router.get('/classes', getAllClasses);
router.get('/myClasses', getMyClasses);
router.post('/classes', createClass);
router.put('/classes/:id', updateClass);
router.delete('/classes/:id', deleteClass);

router.get('/classes/:classId/grades', getClassGrades);
router.get('/classes/:classId/averages', getClassAverages);

router.get('/students', getAllStudents);
router.post('/students', createStudent);
router.put('/students/:id', updateStudent);
router.delete('/students/:id', deleteStudent);

router.get('/student-classes', getAllStudentClasses);
router.post('/student-classes', addStudentToClass);
router.delete('/student-classes/:id', deleteStudentClass);

router.get('/teachers', getAllTeachers);
router.post('/teachers', createTeacher);
router.put('/teachers/:id', updateTeacher);
router.delete('/teachers/:id', deleteTeacher);

router.get('/teacher-subjects', getAllTeacherSubjects);
router.post('/teacher-subjects', assignTeacherToSubject);
router.delete('/teacher-subjects/:id', deleteTeacherSubject);

router.post('/grades', addGrade);
router.get('/grades/student/:studentId?', getStudentGrades);
router.get('/grades/average/:studentId?', getAverageGrade);
router.get('/grades/subject/:subjectId', getGradesBySubject);
router.delete('/grades', deleteGrade);
router.delete('/grades', deleteGradeByDate);

router.post('/attendance', markAttendance);
router.get('/attendance/student/:studentId?', getStudentAttendance);
router.get('/attendance/subject/:subjectId', getAttendanceBySubject);
router.delete('/attendance', deleteAttendance);
router.delete('/attendance', deleteAttendanceByDate);

router.post('/homework', createHomework);
router.get('/homework', getHomework);
router.post('/homework/:id/submit', submitHomework);

router.get('/my-subjects', getMySubjects);
router.get('/classes/:classId/students', getClassStudents);

router.get('/schedule/class/:classId', getClassSchedule);
router.get('/teacher/schedule', getTeacherScheduleWithChanges);
router.get('/teacher/schedule', getTeacherSchedule);
router.post('/schedule', createScheduleItem);
router.delete('/schedule/:id', deleteScheduleItem);

router.get('/dashboard', getDashboardStats);

export default router;