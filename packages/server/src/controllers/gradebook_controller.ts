import { Request, Response } from 'express';
import bcrypt from 'bcrypt';
import { BaseController } from './base_controller';
import { BaseService } from '../services/base_service';

interface SubjectBody {
  name: string;
  description?: string;
}

interface ClassBody {
  name: string;
  year: number;
}

interface GradeBody {
  student_id: number;
  subject_id: number;
  grade: number;
  grade_date?: string | Date;
  semester?: 1 | 2;
  comment?: string;
  grade_type?: 'exam' | 'homework' | 'classwork' | 'test';
}

interface AttendanceBody {
  student_id: number;
  subject_id: number;
  date?: Date;
  status: 'present' | 'absent' | 'late' | 'excused';
}

interface HomeworkBody {
  subject_id: number;
  title: string;
  description?: string;
  due_date: Date;
}

interface HomeworkSubmissionBody {
  homework_id: number;
  submission_text?: string;
}

interface ScheduleBody {
  subject_id: number;
  class_id: number;
  day_of_week: number;
  lesson_number: number;
  room?: string;
}

class GradebookService extends BaseService {
  async getAllSubjects(): Promise<any[]> {
    return this.query('SELECT id, name, description, created_at FROM subjects ORDER BY name');
  }

  async getMySubjects(userId: string, role: string): Promise<any[]> {
    if (role === 'teacher') {
      return this.query(
        `SELECT DISTINCT s.id, s.name, s.description, array_agg(DISTINCT c.name) as classes
         FROM teacher_subjects ts
         JOIN subjects s ON ts.subject_id = s.id
         JOIN classes c ON ts.class_id = c.id
         WHERE ts.teacher_id = $1
         GROUP BY s.id`,
        [userId]
      );
    } else if (role === 'admin') {
      return this.query(
        `SELECT DISTINCT s.id, s.name, s.description, array_agg(DISTINCT c.name) as classes
         FROM teacher_subjects ts
         JOIN subjects s ON ts.subject_id = s.id
         JOIN classes c ON ts.class_id = c.id
         GROUP BY s.id`
      );
    } else {
      return this.query(
        `SELECT DISTINCT s.id, s.name, s.description
         FROM student_classes sc
         INNER JOIN teacher_subjects ts ON sc.class_id = ts.class_id
         INNER JOIN subjects s ON ts.subject_id = s.id
         WHERE sc.student_id = $1`,
        [userId]
      );
    }
  }

  async createSubject(name: string, description: string | null): Promise<any> {
    return this.single(
      'INSERT INTO subjects (name, description) VALUES ($1, $2) RETURNING *',
      [name.trim(), description]
    );
  }

  async getAllClasses(): Promise<any[]> {
    return this.query('SELECT id, name, year, created_at FROM classes ORDER BY year DESC, name');
  }

  async createClass(name: string, year: number): Promise<any> {
    return this.single(
      'INSERT INTO classes (name, year) VALUES ($1, $2) RETURNING id, name, year, created_at',
      [name, year]
    );
  }

  async checkStudentExists(studentId: number): Promise<boolean> {
    return this.exists('SELECT id FROM users WHERE id = $1 AND role = $2', [studentId, 'student']);
  }

  async checkClassExists(classId: number): Promise<boolean> {
    return this.exists('SELECT id FROM classes WHERE id = $1', [classId]);
  }

  async addStudentToClass(studentId: number, classId: number): Promise<any> {
    return this.single(
      `INSERT INTO student_classes (student_id, class_id)
       VALUES ($1, $2)
       ON CONFLICT (student_id, class_id) DO NOTHING
       RETURNING id, student_id, class_id, joined_at`,
      [studentId, classId]
    );
  }

  async getStudentGrades(studentId: string, subjectId?: string): Promise<any[]> {
    if (subjectId) {
      return this.query(
        `SELECT g.id, g.grade, to_char(g.grade_date, 'YYYY-MM-DD') as grade_date,
                g.semester, g.comment, g.grade_type, s.id as subject_id, s.name as subject_name
         FROM grades g
         JOIN subjects s ON g.subject_id = s.id
         WHERE g.student_id = $1 AND g.subject_id = $2
         ORDER BY g.grade_date DESC, g.id DESC`,
        [studentId, subjectId]
      );
    }
    return this.query(
      `SELECT g.id, g.grade, to_char(g.grade_date, 'YYYY-MM-DD') as grade_date,
              g.semester, g.comment, g.grade_type, s.id as subject_id, s.name as subject_name
       FROM grades g
       JOIN subjects s ON g.subject_id = s.id
       WHERE g.student_id = $1
       ORDER BY g.grade_date DESC, g.id DESC`,
      [studentId]
    );
  }

  async getAverageGrade(studentId: string): Promise<any[]> {
    return this.query(
      `SELECT s.id as subject_id, s.name as subject_name,
       AVG(g.grade) as average_grade, COUNT(g.id) as grades_count
       FROM grades g
       JOIN subjects s ON g.subject_id = s.id
       WHERE g.student_id = $1
       GROUP BY s.id, s.name
       ORDER BY s.name`,
      [studentId]
    );
  }

  async upsertGrade(data: any, teacherId: string, targetDate: string): Promise<any> {
    const existing = await this.single(
      `SELECT id FROM grades
       WHERE student_id = $1 AND subject_id = $2 AND grade_date::date = $3::date`,
      [data.student_id, data.subject_id, targetDate]
    );

    if (existing) {
      return this.single(
        `UPDATE grades
         SET grade = $1, teacher_id = $2, semester = $3, comment = $4,
             grade_type = $5, updated_at = CURRENT_TIMESTAMP
         WHERE student_id = $6 AND subject_id = $7 AND grade_date::date = $8::date
         RETURNING id, student_id, subject_id, grade,
                   to_char(grade_date, 'YYYY-MM-DD') as grade_date,
                   semester, comment, grade_type`,
        [data.grade, teacherId, data.semester, data.comment, data.grade_type,
         data.student_id, data.subject_id, targetDate]
      );
    }
    return this.single(
      `INSERT INTO grades (student_id, subject_id, teacher_id, grade, grade_date, semester, comment, grade_type)
       VALUES ($1, $2, $3, $4, $5::date, $6, $7, $8)
       RETURNING id, student_id, subject_id, grade,
                 to_char(grade_date, 'YYYY-MM-DD') as grade_date,
                 semester, comment, grade_type`,
      [data.student_id, data.subject_id, teacherId, data.grade, targetDate,
       data.semester, data.comment, data.grade_type]
    );
  }

  async getSubjectInfo(subjectId: number): Promise<any> {
    return this.single('SELECT name FROM subjects WHERE id = $1', [subjectId]);
  }

  async getUserInfo(userId: string): Promise<any> {
    return this.single('SELECT name FROM users WHERE id = $1', [userId]);
  }

  async markAttendance(studentId: number, subjectId: number, targetDate: string, status: string): Promise<any> {
    if (status === 'absent') {
      await this.mutation(
        'DELETE FROM grades WHERE student_id = $1 AND subject_id = $2 AND grade_date::date = $3::date',
        [studentId, subjectId, targetDate]
      );
    }
    return this.single(
      `INSERT INTO attendance (student_id, subject_id, date, status)
       VALUES ($1, $2, $3::date, $4)
       ON CONFLICT (student_id, subject_id, date)
       DO UPDATE SET status = $4
       RETURNING id, student_id, subject_id,
                 to_char(date, 'YYYY-MM-DD') as date,
                 status`,
      [studentId, subjectId, targetDate, status]
    );
  }

  async getStudentAttendance(studentId: string, subjectId?: string): Promise<any[]> {
    if (subjectId) {
      return this.query(
        `SELECT a.id, to_char(a.date, 'YYYY-MM-DD') as date, a.status, s.name as subject_name
         FROM attendance a
         JOIN subjects s ON a.subject_id = s.id
         WHERE a.student_id = $1 AND a.subject_id = $2
         ORDER BY a.date DESC`,
        [studentId, subjectId]
      );
    }
    return this.query(
      `SELECT a.id, to_char(a.date, 'YYYY-MM-DD') as date, a.status, s.name as subject_name
       FROM attendance a
       JOIN subjects s ON a.subject_id = s.id
       WHERE a.student_id = $1
       ORDER BY a.date DESC`,
      [studentId]
    );
  }

  async createHomework(subjectId: number, teacherId: string, title: string, description: string, dueDate: Date): Promise<any> {
    return this.single(
      `INSERT INTO homework (subject_id, teacher_id, title, description, due_date)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, subject_id, teacher_id, title, description, due_date, created_at`,
      [subjectId, teacherId, title, description, dueDate]
    );
  }

  async getHomework(): Promise<any[]> {
    return this.query(
      `SELECT h.id, h.title, h.description, h.due_date, h.created_at,
              s.name as subject_name, u.name as teacher_name
       FROM homework h
       JOIN subjects s ON h.subject_id = s.id
       JOIN users u ON h.teacher_id = u.id
       WHERE h.due_date >= CURRENT_DATE
       ORDER BY h.due_date ASC`
    );
  }

  async submitHomework(homeworkId: number, studentId: string, submissionText: string): Promise<any> {
    return this.single(
      `INSERT INTO homework_submissions (homework_id, student_id, submission_text)
       VALUES ($1, $2, $3)
       ON CONFLICT (homework_id, student_id)
       DO UPDATE SET submission_text = $3, submitted_at = CURRENT_TIMESTAMP
       RETURNING id, homework_id, student_id, submission_text, submitted_at`,
      [homeworkId, studentId, submissionText]
    );
  }

  async getTeacherSchedule(teacherId: string): Promise<any[]> {
    return this.query(
      `SELECT s.id, s.day_of_week, s.lesson_number, s.room,
              sub.id as subject_id, sub.name as subject_name,
              c.id as class_id, c.name as class_name, c.year as class_year
       FROM schedule s
       JOIN subjects sub ON s.subject_id = sub.id
       JOIN classes c ON s.class_id = c.id
       WHERE s.teacher_id = $1
       ORDER BY s.day_of_week, s.lesson_number`,
      [teacherId]
    );
  }

  async getLessonTimes(): Promise<any[]> {
    return this.query('SELECT lesson_number, start_time, end_time FROM lesson_times ORDER BY lesson_number');
  }

  async getTeacherClasses(teacherId: string): Promise<any[]> {
    return this.query('SELECT DISTINCT class_id FROM schedule WHERE teacher_id = $1', [teacherId]);
  }

  async getScheduleChanges(classIds: number[], targetDate: string): Promise<any[]> {
    if (classIds.length === 0) return [];
    return this.query(
      `SELECT sc.*, c.name as class_name
       FROM schedule_changes sc
       JOIN classes c ON sc.class_id = c.id
       WHERE sc.class_id = ANY($1) AND sc.date = $2::date
       ORDER BY sc.class_id, sc.lesson_number`,
      [classIds, targetDate]
    );
  }

  async getTeacherSubjects(teacherId: string): Promise<any[]> {
    return this.query(
      `SELECT DISTINCT s.id, s.name, s.description, array_agg(DISTINCT c.name) as classes
       FROM teacher_subjects ts
       JOIN subjects s ON ts.subject_id = s.id
       JOIN classes c ON ts.class_id = c.id
       WHERE ts.teacher_id = $1
       GROUP BY s.id`,
      [teacherId]
    );
  }

  async getStudentSubjects(studentId: string): Promise<any[]> {
    return this.query(
      `SELECT DISTINCT s.id, s.name, s.description
       FROM student_classes sc
       INNER JOIN teacher_subjects ts ON sc.class_id = ts.class_id
       INNER JOIN subjects s ON ts.subject_id = s.id
       WHERE sc.student_id = $1`,
      [studentId]
    );
  }

  async getMyClasses(userId: string, role: string): Promise<any[]> {
    if (role === 'teacher') {
      return this.query(
        `SELECT DISTINCT c.id, c.name, c.year, c.created_at
         FROM teacher_subjects ts
         JOIN classes c ON ts.class_id = c.id
         WHERE ts.teacher_id = $1
         ORDER BY c.name`,
        [userId]
      );
    } else if (role === 'admin') {
      return this.query(
        `SELECT DISTINCT c.id, c.name, c.year, c.created_at
         FROM teacher_subjects ts
         JOIN classes c ON ts.class_id = c.id
         ORDER BY c.name`
      );
    }
    return this.query(
      `SELECT DISTINCT c.id, c.name, c.year, c.created_at
       FROM student_classes sc
       JOIN classes c ON sc.class_id = c.id
       WHERE sc.student_id = $1
       ORDER BY c.name`,
      [userId]
    );
  }

  async getClassStudents(classId: string): Promise<any[]> {
    return this.query(
      `SELECT u.id, u.name, u.email, COALESCE(u.isFired, false) as isFired
       FROM users u
       JOIN student_classes sc ON u.id = sc.student_id
       WHERE sc.class_id = $1 AND u.role = 'student'
       ORDER BY u.name`,
      [classId]
    );
  }

  async createScheduleItem(subjectId: number, teacherId: string, classId: number, dayOfWeek: number, lessonNumber: number, room: string): Promise<any> {
    return this.single(
      `INSERT INTO schedule (subject_id, teacher_id, class_id, day_of_week, lesson_number, room)
       VALUES ($1, $2, $3, $4, $5, $6)
       ON CONFLICT (class_id, day_of_week, lesson_number)
       DO UPDATE SET subject_id = $1, teacher_id = $2, room = $6
       RETURNING id`,
      [subjectId, teacherId, classId, dayOfWeek, lessonNumber, room]
    );
  }

  async getClassSchedule(classId: string): Promise<any[]> {
    return this.query(
      `SELECT s.id, s.day_of_week, s.lesson_number, s.room,
              sub.id as subject_id, sub.name as subject_name,
              u.id as teacher_id, u.name as teacher_name
       FROM schedule s
       JOIN subjects sub ON s.subject_id = sub.id
       JOIN users u ON s.teacher_id = u.id
       WHERE s.class_id = $1
       ORDER BY s.day_of_week, s.lesson_number`,
      [classId]
    );
  }

  async getDashboardStatsForStudent(studentId: string): Promise<any> {
    const gradesResult = await this.single<{ average: string; total: string }>(
      'SELECT AVG(grade) as average, COUNT(*) as total FROM grades WHERE student_id = $1',
      [studentId]
    );
    const attendanceResult = await this.single<{ present: string; total: string }>(
      `SELECT COUNT(CASE WHEN status = 'present' THEN 1 END) as present, COUNT(*) as total
       FROM attendance WHERE student_id = $1`,
      [studentId]
    );
    const subjectsResult = await this.single<{ count: string }>(
      `SELECT COUNT(DISTINCT s.id) as count
       FROM student_classes sc
       JOIN teacher_subjects ts ON sc.class_id = ts.class_id
       JOIN subjects s ON ts.subject_id = s.id
       WHERE sc.student_id = $1`,
      [studentId]
    );
    return {
      average_grade: parseFloat(gradesResult?.average || '0'),
      total_grades: parseInt(gradesResult?.total || '0'),
      attendance_rate: (parseInt(attendanceResult?.total || '0') > 0
        ? Math.round((parseInt(attendanceResult?.present || '0') / parseInt(attendanceResult?.total || '0')) * 100)
        : 0),
      subjects_count: parseInt(subjectsResult?.count || '0')
    };
  }

  async getDashboardStatsForTeacher(): Promise<any> {
    const studentsResult = await this.single<{ count: string }>('SELECT COUNT(*) FROM users WHERE role = $1', ['student']);
    const subjectsResult = await this.single<{ count: string }>('SELECT COUNT(*) FROM subjects');
    const gradesResult = await this.single<{ count: string }>('SELECT COUNT(*) FROM grades');
    return {
      total_students: parseInt(studentsResult?.count || '0'),
      total_subjects: parseInt(subjectsResult?.count || '0'),
      total_grades: parseInt(gradesResult?.count || '0')
    };
  }

  async getGradesBySubjectForTeacher(subjectId: string): Promise<any[]> {
    return this.query(
      `SELECT g.id, g.grade, to_char(g.grade_date, 'YYYY-MM-DD') as grade_date,
              g.comment, g.grade_type, u.id as student_id, u.name as student_name
       FROM grades g
       JOIN users u ON g.student_id = u.id
       WHERE g.subject_id = $1
       ORDER BY g.grade_date DESC, g.id DESC`,
      [subjectId]
    );
  }

  async getGradesBySubjectForStudent(subjectId: string, studentId: number): Promise<any[]> {
    return this.query(
      `SELECT id, grade, to_char(grade_date, 'YYYY-MM-DD') as grade_date, comment, grade_type
       FROM grades
       WHERE subject_id = $1 AND student_id = $2
       ORDER BY grade_date DESC`,
      [subjectId, studentId]
    );
  }

  async getAttendanceBySubjectForTeacher(subjectId: string): Promise<any[]> {
    return this.query(
      `SELECT a.id, to_char(a.date, 'YYYY-MM-DD') as date, a.status, u.id as student_id, u.name as student_name
       FROM attendance a
       JOIN users u ON a.student_id = u.id
       WHERE a.subject_id = $1
       ORDER BY a.date DESC`,
      [subjectId]
    );
  }

  async getAttendanceBySubjectForStudent(subjectId: string, studentId: number): Promise<any[]> {
    return this.query(
      `SELECT id, to_char(date, 'YYYY-MM-DD') as date, status, to_char(created_at, 'HH24:MI:SS') as created_time
       FROM attendance
       WHERE subject_id = $1 AND student_id = $2
       ORDER BY date DESC`,
      [subjectId, studentId]
    );
  }

  async getAllStudents(): Promise<any[]> {
    return this.query(
      `SELECT id, name, email, created_at
       FROM users
       WHERE role = 'student'
       ORDER BY name`
    );
  }

  async getAllTeachers(): Promise<any[]> {
    return this.query(
      `SELECT id, name, email, created_at
       FROM users
       WHERE role = 'teacher'
       ORDER BY name`
    );
  }

  async updateSubject(subjectId: string, name: string, description: string): Promise<any> {
    return this.single(
      `UPDATE subjects
       SET name = $1, description = $2
       WHERE id = $3
       RETURNING id, name, description, created_at`,
      [name, description, subjectId]
    );
  }

  async deleteSubject(subjectId: string): Promise<boolean> {
    const result = await this.mutation('DELETE FROM subjects WHERE id = $1 RETURNING id', [subjectId]);
    return (result.rowCount ?? 0) > 0;
  }

  async createUser(name: string, email: string, hashedPassword: string, role: string): Promise<any> {
    return this.single(
      `INSERT INTO users (name, email, password_hash, role, created_at)
       VALUES ($1, $2, $3, $4, DEFAULT)
       RETURNING id, name, email, created_at`,
      [name, email, hashedPassword, role]
    );
  }

  async updateUser(userId: string, name: string, email: string, role: string): Promise<any> {
    return this.single(
      `UPDATE users
       SET name = $1, email = $2
       WHERE id = $3 AND role = $4
       RETURNING id, name, email, created_at`,
      [name, email, userId, role]
    );
  }

  async deleteUser(userId: string, role: string): Promise<boolean> {
    const result = await this.mutation('DELETE FROM users WHERE id = $1 AND role = $2 RETURNING id', [userId, role]);
    return (result.rowCount ?? 0) > 0;
  }

  async getAllStudentClasses(): Promise<any[]> {
    return this.query(
      `SELECT sc.id, sc.student_id, sc.class_id, sc.joined_at,
              u.name as student_name, c.name as class_name
       FROM student_classes sc
       JOIN users u ON sc.student_id = u.id
       JOIN classes c ON sc.class_id = c.id
       ORDER BY c.name, u.name`
    );
  }

  async deleteStudentClass(id: string): Promise<boolean> {
    const result = await this.mutation('DELETE FROM student_classes WHERE id = $1 RETURNING id', [id]);
    return (result.rowCount ?? 0) > 0;
  }

  async getAllTeacherSubjects(): Promise<any[]> {
    return this.query(
      `SELECT ts.id, ts.teacher_id, ts.subject_id, ts.class_id,
              u.name as teacher_name, s.name as subject_name, c.name as class_name
       FROM teacher_subjects ts
       JOIN users u ON ts.teacher_id = u.id
       JOIN subjects s ON ts.subject_id = s.id
       JOIN classes c ON ts.class_id = c.id
       ORDER BY c.name, s.name`
    );
  }

  async deleteTeacherSubject(id: string): Promise<boolean> {
    const result = await this.mutation('DELETE FROM teacher_subjects WHERE id = $1 RETURNING id', [id]);
    return (result.rowCount ?? 0) > 0;
  }

  async updateClass(classId: string, name: string, year: number): Promise<any> {
    return this.single(
      `UPDATE classes
       SET name = $1, year = $2
       WHERE id = $3
       RETURNING id, name, year, created_at`,
      [name, year, classId]
    );
  }

  async deleteClass(classId: string): Promise<boolean> {
    const result = await this.mutation('DELETE FROM classes WHERE id = $1 RETURNING id', [classId]);
    return (result.rowCount ?? 0) > 0;
  }

  async deleteAttendanceRecord(studentId: number, subjectId: number, date: string): Promise<boolean> {
    const result = await this.mutation(
      'DELETE FROM attendance WHERE student_id = $1 AND subject_id = $2 AND date::date = $3::date RETURNING id',
      [studentId, subjectId, date]
    );
    return (result.rowCount ?? 0) > 0;
  }

  async deleteGradeRecord(studentId: number, subjectId: number, gradeDate: string): Promise<boolean> {
    const result = await this.mutation(
      'DELETE FROM grades WHERE student_id = $1 AND subject_id = $2 AND grade_date::date = $3::date RETURNING id',
      [studentId, subjectId, gradeDate]
    );
    return (result.rowCount ?? 0) > 0;
  }

  async deleteScheduleItemRecord(scheduleId: string): Promise<boolean> {
    const result = await this.mutation('DELETE FROM schedule WHERE id = $1 RETURNING id', [scheduleId]);
    return (result.rowCount ?? 0) > 0;
  }

  async assignTeacherToSubject(teacherId: number, subjectId: number, classId: number): Promise<any> {
    return this.single(
      `INSERT INTO teacher_subjects (teacher_id, subject_id, class_id)
       VALUES ($1, $2, $3)
       ON CONFLICT (teacher_id, subject_id, class_id) DO NOTHING
       RETURNING *`,
      [teacherId, subjectId, classId]
    );
  }

  async getTeacherSubjectAssignment(id: number): Promise<any> {
    return this.single(
      `SELECT ts.*, u.name as teacher_name, s.name as subject_name, c.name as class_name
       FROM teacher_subjects ts
       JOIN users u ON ts.teacher_id = u.id
       JOIN subjects s ON ts.subject_id = s.id
       JOIN classes c ON ts.class_id = c.id
       WHERE ts.id = $1`,
      [id]
    );
  }

  async checkUserExists(email: string): Promise<boolean> {
    return this.exists('SELECT id FROM users WHERE email = $1', [email]);
  }

  async getClassGrades(classId: string): Promise<any[]> {
    return this.query(
      `SELECT g.id, g.grade, to_char(g.grade_date, 'YYYY-MM-DD') as date,
              s.name as subject_name, u.name as student_name
       FROM grades g
       JOIN users u ON g.student_id = u.id
       JOIN subjects s ON g.subject_id = s.id
       JOIN student_classes sc ON u.id = sc.student_id
       WHERE sc.class_id = $1
       ORDER BY g.grade_date DESC, s.name`,
      [classId]
    );
  }

  async getClassAverages(classId: string): Promise<any[]> {
    return this.query(
      `SELECT s.name as subject_name,
              AVG(g.grade) as average_grade,
              COUNT(g.id) as grades_count
       FROM grades g
       JOIN users u ON g.student_id = u.id
       JOIN subjects s ON g.subject_id = s.id
       JOIN student_classes sc ON u.id = sc.student_id
       WHERE sc.class_id = $1
       GROUP BY s.id, s.name
       ORDER BY s.name`,
      [classId]
    );
  }

  async getChangesForSubject(classId: string, subjectId: string, startDate: string, endDate: string): Promise<any[]> {
    return this.query(
      `SELECT sc.id, to_char(sc.date, 'YYYY-MM-DD') as date, sc.lesson_number, sc.room, sc.change_type,
              sc.subject_id, sc.teacher_id, sc.notes, sub.name as subject_name, u.name as teacher_name,
              sc.original_subject_id, sc.original_teacher_id
       FROM schedule_changes sc
       LEFT JOIN subjects sub ON sc.subject_id = sub.id
       LEFT JOIN users u ON sc.teacher_id = u.id
       WHERE sc.class_id = $1 AND sc.subject_id = $2
         AND sc.date BETWEEN $3::date AND $4::date
         AND sc.change_type IN ('replace', 'added')
       ORDER BY sc.date, sc.lesson_number`,
      [classId, subjectId, startDate, endDate]
    );
  }
}

class GradebookController extends BaseController {
  private service: GradebookService;

  constructor() {
    super();
    this.service = new GradebookService();
  }

  async getAllSubjects(req: Request, res: Response): Promise<Response> {
    const auth = this.checkAuth(req);
    if (!auth.success) return this.error(res, auth.message!, 401);

    const subjects = await this.service.getAllSubjects();
    return this.success(res, { subjects });
  }

  async createSubject(req: Request<{}, {}, SubjectBody>, res: Response): Promise<Response> {
    const auth = this.checkAuth(req);
    if (!auth.success) return this.error(res, auth.message!, 401);

    const teacherCheck = this.checkTeacher(req);
    if (!teacherCheck.success) return this.error(res, teacherCheck.message!, 403);

    const { name, description } = req.body;
    if (!name?.trim()) {
      return this.error(res, 'Название предмета обязательно', 400);
    }

    const subject = await this.service.createSubject(name, description || null);
    return this.success(res, { subject }, 201);
  }

  async getAllClasses(req: Request, res: Response): Promise<Response> {
    const auth = this.checkAuth(req);
    if (!auth.success) return this.error(res, auth.message!, 401);

    const classes = await this.service.getAllClasses();
    return this.success(res, { classes });
  }

  async createClass(req: Request<{}, {}, ClassBody>, res: Response): Promise<Response> {
    const auth = this.checkAuth(req);
    if (!auth.success) return this.error(res, auth.message!, 401);

    const teacherCheck = this.checkTeacher(req);
    if (!teacherCheck.success) return this.error(res, teacherCheck.message!, 403);

    const { name, year } = req.body;
    const newClass = await this.service.createClass(name, year);
    return this.success(res, { class: newClass }, 201);
  }

  async addStudentToClass(req: Request, res: Response): Promise<Response> {
    const auth = this.checkAuth(req);
    if (!auth.success) return this.error(res, auth.message!, 401);

    const teacherCheck = this.checkTeacher(req);
    if (!teacherCheck.success) return this.error(res, teacherCheck.message!, 403);

    const { student_id, class_id } = req.body;
    if (!student_id || !class_id) {
      return this.error(res, 'Необходимо указать student_id и class_id', 400);
    }

    const studentExists = await this.service.checkStudentExists(student_id);
    if (!studentExists) return this.error(res, 'Студент не найден', 404);

    const classExists = await this.service.checkClassExists(class_id);
    if (!classExists) return this.error(res, 'Класс не найден', 404);

    const result = await this.service.addStudentToClass(student_id, class_id);
    if (!result) {
      return this.error(res, 'Студент уже привязан к этому классу', 409);
    }

    return this.success(res, { student_class: result, message: 'Студент успешно добавлен в класс' }, 201);
  }

  async addGrade(req: Request, res: Response): Promise<Response> {
    const auth = this.checkAuth(req);
    if (!auth.success) return this.error(res, auth.message!, 401);

    const teacherCheck = this.checkTeacher(req);
    if (!teacherCheck.success) return this.error(res, teacherCheck.message!, 403);

    const { student_id, subject_id, grade, grade_date, semester, comment, grade_type = 'classwork' } = req.body;
    const targetDate = grade_date ? new Date(grade_date).toISOString().split('T')[0] : new Date().toISOString().split('T')[0];

    await this.service.mutation(
      'DELETE FROM attendance WHERE student_id = $1 AND subject_id = $2 AND date::date = $3::date',
      [student_id, subject_id, targetDate]
    );

    const result = await this.service.upsertGrade(
      { student_id, subject_id, grade, semester, comment, grade_type },
      auth.userId!,
      targetDate
    );

    const subjectInfo = await this.service.getSubjectInfo(subject_id);
    const teacherInfo = await this.service.getUserInfo(auth.userId!);

    const io = req.app.get('io');
    const userSockets = req.app.get('userSockets');
    const studentSocketId = userSockets.get(student_id);

    if (studentSocketId && io) {
      io.to(studentSocketId).emit('new_grade', {
        id: result.id,
        grade,
        subject_name: subjectInfo?.name || 'Предмет',
        teacher_name: teacherInfo?.name || 'Учитель',
        date: targetDate,
        grade_type,
        comment: comment || null,
        timestamp: new Date().toISOString()
      });
    }

    return this.success(res, { grade: result }, 201);
  }

  async getStudentGrades(req: Request, res: Response): Promise<Response> {
    const auth = this.checkAuth(req);
    if (!auth.success) return this.error(res, auth.message!, 401);

    const studentId = req.params.studentId || auth.userId!;
    const subjectId = req.query.subject_id as string | undefined;
    const grades = await this.service.getStudentGrades(studentId, subjectId);
    return this.success(res, { grades });
  }

  async getAverageGrade(req: Request, res: Response): Promise<Response> {
    const auth = this.checkAuth(req);
    if (!auth.success) return this.error(res, auth.message!, 401);

    const studentId = req.params.studentId || auth.userId!;
    const averages = await this.service.getAverageGrade(studentId);
    return this.success(res, { averages });
  }

  async markAttendance(req: Request<{}, {}, AttendanceBody>, res: Response): Promise<Response> {
    const auth = this.checkAuth(req);
    if (!auth.success) return this.error(res, auth.message!, 401);

    const teacherCheck = this.checkTeacher(req);
    if (!teacherCheck.success) return this.error(res, teacherCheck.message!, 403);

    const { student_id, subject_id, date, status } = req.body;
    const targetDate = date ? new Date(date).toISOString().split('T')[0] : new Date().toISOString().split('T')[0];

    const attendance = await this.service.markAttendance(student_id, subject_id, targetDate, status);
    return this.success(res, { attendance }, 201);
  }

  async getStudentAttendance(req: Request, res: Response): Promise<Response> {
    const auth = this.checkAuth(req);
    if (!auth.success) return this.error(res, auth.message!, 401);

    const studentId = req.params.studentId || auth.userId!;
    const subjectId = req.query.subject_id as string | undefined;
    const attendance = await this.service.getStudentAttendance(studentId, subjectId);
    return this.success(res, { attendance });
  }

  async createHomework(req: Request<{}, {}, HomeworkBody>, res: Response): Promise<Response> {
    const auth = this.checkAuth(req);
    if (!auth.success) return this.error(res, auth.message!, 401);

    const teacherCheck = this.checkTeacher(req);
    if (!teacherCheck.success) return this.error(res, teacherCheck.message!, 403);

    const { subject_id, title, description, due_date } = req.body;
    const homework = await this.service.createHomework(subject_id, auth.userId!, title, description || '', due_date);
    return this.success(res, { homework }, 201);
  }

  async getHomework(req: Request, res: Response): Promise<Response> {
    const auth = this.checkAuth(req);
    if (!auth.success) return this.error(res, auth.message!, 401);

    const homework = await this.service.getHomework();
    return this.success(res, { homework });
  }

  async submitHomework(req: Request<{ id: string }, {}, HomeworkSubmissionBody>, res: Response): Promise<Response> {
    const auth = this.checkAuth(req);
    if (!auth.success) return this.error(res, auth.message!, 401);

    const homeworkId = parseInt(req.params.id);
    const { submission_text } = req.body;
    const submission = await this.service.submitHomework(homeworkId, auth.userId!, submission_text || '');
    return this.success(res, { submission }, 201);
  }

  async getTeacherScheduleWithChanges(req: Request, res: Response): Promise<Response> {
    const auth = this.checkAuth(req);
    if (!auth.success) return this.error(res, auth.message!, 401);

    const teacherCheck = this.checkTeacher(req);
    if (!teacherCheck.success) return this.error(res, teacherCheck.message!, 403);

    const targetDate = (req.query.date as string) || new Date().toISOString().split('T')[0];
    const schedule = await this.service.getTeacherSchedule(auth.userId!);
    const teacherClasses = await this.service.getTeacherClasses(auth.userId!);
    const classIds = teacherClasses.map((row: any) => row.class_id);
    const changes = await this.service.getScheduleChanges(classIds, targetDate);

    const changesMap = new Map();
    changes.forEach((change: any) => {
      changesMap.set(`${change.class_id}_${change.lesson_number}`, change);
    });

    const finalSchedule = schedule.map((item: any) => {
      const key = `${item.class_id}_${item.lesson_number}`;
      const change = changesMap.get(key);

      if (change) {
        if (change.change_type === 'cancel') {
          return { ...item, is_canceled: true, change_type: 'cancel', notes: change.notes };
        } else if (change.change_type === 'replace') {
          return {
            id: change.id,
            day_of_week: item.day_of_week,
            lesson_number: item.lesson_number,
            subject_id: change.subject_id,
            subject_name: change.subject_name || 'Замена',
            teacher_id: change.teacher_id,
            teacher_name: change.teacher_name || 'Учитель',
            class_id: item.class_id,
            class_name: item.class_name,
            class_year: item.class_year,
            room: change.room || item.room,
            is_changed: true,
            change_type: 'replace',
            original_subject: item.subject_name,
            original_teacher: item.teacher_name,
            notes: change.notes
          };
        }
      }
      return { ...item, is_regular: true };
    });

    for (const change of changes) {
      if (change.change_type === 'added') {
        const dateObj = new Date(targetDate);
        let dayOfWeek = dateObj.getDay();
        if (dayOfWeek === 0) dayOfWeek = 7;
        finalSchedule.push({
          id: change.id,
          day_of_week: dayOfWeek,
          lesson_number: change.lesson_number,
          subject_id: change.subject_id,
          subject_name: change.subject_name || 'Добавленный урок',
          teacher_id: change.teacher_id,
          teacher_name: change.teacher_name || 'Учитель',
          class_id: change.class_id,
          class_name: change.class_name,
          room: change.room,
          is_added: true,
          change_type: 'added',
          notes: change.notes
        });
      }
    }

    finalSchedule.sort((a: any, b: any) => {
      if (a.day_of_week !== b.day_of_week) return a.day_of_week - b.day_of_week;
      return a.lesson_number - b.lesson_number;
    });

    const lessonTimes = await this.service.getLessonTimes();
    return this.success(res, { schedule: finalSchedule, lesson_times: lessonTimes, date: targetDate });
  }

  async getTeacherSchedule(req: Request, res: Response): Promise<Response> {
    const auth = this.checkAuth(req);
    if (!auth.success) return this.error(res, auth.message!, 401);

    const teacherCheck = this.checkTeacher(req);
    if (!teacherCheck.success) return this.error(res, teacherCheck.message!, 403);

    const schedule = await this.service.getTeacherSchedule(auth.userId!);
    const lessonTimes = await this.service.getLessonTimes();
    return this.success(res, { schedule, lesson_times: lessonTimes });
  }

  async getClassSchedule(req: Request, res: Response): Promise<Response> {
    const auth = this.checkAuth(req);
    if (!auth.success) return this.error(res, auth.message!, 401);

    const classId = req.params.classId;
    const schedule = await this.service.getClassSchedule(classId);
    const lessonTimes = await this.service.getLessonTimes();
    return this.success(res, { schedule, lesson_times: lessonTimes });
  }

  async getMySubjects(req: Request, res: Response): Promise<Response> {
    const auth = this.checkAuth(req);
    if (!auth.success) return this.error(res, auth.message!, 401);

    const subjects = await this.service.getMySubjects(auth.userId!, auth.userRole!);
    return this.success(res, { subjects });
  }

  async getMyClasses(req: Request, res: Response): Promise<Response> {
    const auth = this.checkAuth(req);
    if (!auth.success) return this.error(res, auth.message!, 401);

    const classes = await this.service.getMyClasses(auth.userId!, auth.userRole!);
    return this.success(res, { classes });
  }

  async getClassStudents(req: Request, res: Response): Promise<Response> {
    const auth = this.checkAuth(req);
    if (!auth.success) return this.error(res, auth.message!, 401);

    const classId = req.params.classId;
    const students = await this.service.getClassStudents(classId);
    return this.success(res, { students });
  }

  async createScheduleItem(req: Request<{}, {}, ScheduleBody>, res: Response): Promise<Response> {
    const auth = this.checkAuth(req);
    if (!auth.success) return this.error(res, auth.message!, 401);

    const teacherCheck = this.checkTeacher(req);
    if (!teacherCheck.success) return this.error(res, teacherCheck.message!, 403);

    const { subject_id, class_id, day_of_week, lesson_number, room } = req.body;
    const schedule = await this.service.createScheduleItem(subject_id, auth.userId!, class_id, day_of_week, lesson_number, room || '');
    return this.success(res, { schedule }, 201);
  }

  async getDashboardStats(req: Request, res: Response): Promise<Response> {
    const auth = this.checkAuth(req);
    if (!auth.success) return this.error(res, auth.message!, 401);

    let stats;
    if (auth.userRole === 'student') {
      stats = await this.service.getDashboardStatsForStudent(auth.userId!);
    } else {
      stats = await this.service.getDashboardStatsForTeacher();
    }
    return this.success(res, { stats });
  }

  async getGradesBySubject(req: Request, res: Response): Promise<Response> {
    const auth = this.checkAuth(req);
    if (!auth.success) return this.error(res, auth.message!, 401);

    const subjectId = req.params.subjectId;
    let grades;
    if (auth.userRole === 'teacher') {
      grades = await this.service.getGradesBySubjectForTeacher(subjectId);
    } else {
      grades = await this.service.getGradesBySubjectForStudent(subjectId, parseInt(auth.userId!));
    }
    return this.success(res, { grades });
  }

  async getAttendanceBySubject(req: Request, res: Response): Promise<Response> {
    const auth = this.checkAuth(req);
    if (!auth.success) return this.error(res, auth.message!, 401);

    const subjectId = req.params.subjectId;
    let attendance;
    if (auth.userRole === 'teacher') {
      attendance = await this.service.getAttendanceBySubjectForTeacher(subjectId);
    } else {
      attendance = await this.service.getAttendanceBySubjectForStudent(subjectId, parseInt(auth.userId!));
    }
    return this.success(res, { attendance });
  }

  async getAllStudents(req: Request, res: Response): Promise<Response> {
    const auth = this.checkAuth(req);
    if (!auth.success) return this.error(res, auth.message!, 401);

    const teacherCheck = this.checkTeacher(req);
    if (!teacherCheck.success) return this.error(res, teacherCheck.message!, 403);

    const students = await this.service.getAllStudents();
    return this.success(res, { students });
  }

  async getAllTeachers(req: Request, res: Response): Promise<Response> {
    const auth = this.checkAuth(req);
    if (!auth.success) return this.error(res, auth.message!, 401);

    const teacherCheck = this.checkTeacher(req);
    if (!teacherCheck.success) return this.error(res, teacherCheck.message!, 403);

    const teachers = await this.service.getAllTeachers();
    return this.success(res, { teachers });
  }

  async updateSubject(req: Request, res: Response): Promise<Response> {
    const auth = this.checkAuth(req);
    if (!auth.success) return this.error(res, auth.message!, 401);

    const teacherCheck = this.checkTeacher(req);
    if (!teacherCheck.success) return this.error(res, teacherCheck.message!, 403);

    const subjectId = req.params.id;
    const { name, description } = req.body;
    const subject = await this.service.updateSubject(subjectId, name, description);
    if (!subject) return this.error(res, 'Предмет не найден', 404);
    return this.success(res, { subject });
  }

  async deleteSubject(req: Request, res: Response): Promise<Response> {
    const auth = this.checkAuth(req);
    if (!auth.success) return this.error(res, auth.message!, 401);

    const teacherCheck = this.checkTeacher(req);
    if (!teacherCheck.success) return this.error(res, teacherCheck.message!, 403);

    const subjectId = req.params.id;
    const deleted = await this.service.deleteSubject(subjectId);
    if (!deleted) return this.error(res, 'Предмет не найден', 404);
    return this.success(res, { message: 'Предмет удален' });
  }

  async createTeacher(req: Request, res: Response): Promise<Response> {
    const auth = this.checkAuth(req);
    if (!auth.success) return this.error(res, auth.message!, 401);

    const teacherCheck = this.checkTeacher(req);
    if (!teacherCheck.success) return this.error(res, teacherCheck.message!, 403);

    const { name, email, password } = req.body;
    if (!name || !email || !password) {
      return this.error(res, 'Все поля обязательны', 400);
    }

    const userExists = await this.service.checkUserExists(email);
    if (userExists) return this.error(res, 'Пользователь с таким email уже существует', 400);

    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(password, saltRounds);
    const teacher = await this.service.createUser(name, email, hashedPassword, 'teacher');
    return this.success(res, { teacher }, 201);
  }

  async updateTeacher(req: Request, res: Response): Promise<Response> {
    const auth = this.checkAuth(req);
    if (!auth.success) return this.error(res, auth.message!, 401);

    const teacherCheck = this.checkTeacher(req);
    if (!teacherCheck.success) return this.error(res, teacherCheck.message!, 403);

    const teacherId = req.params.id;
    const { name, email } = req.body;
    const teacher = await this.service.updateUser(teacherId, name, email, 'teacher');
    if (!teacher) return this.error(res, 'Учитель не найден', 404);
    return this.success(res, { teacher });
  }

  async deleteTeacher(req: Request, res: Response): Promise<Response> {
    const auth = this.checkAuth(req);
    if (!auth.success) return this.error(res, auth.message!, 401);

    const teacherCheck = this.checkTeacher(req);
    if (!teacherCheck.success) return this.error(res, teacherCheck.message!, 403);

    const teacherId = req.params.id;
    const deleted = await this.service.deleteUser(teacherId, 'teacher');
    if (!deleted) return this.error(res, 'Учитель не найден', 404);
    return this.success(res, { message: 'Учитель удален' });
  }

  async createStudent(req: Request, res: Response): Promise<Response> {
    const auth = this.checkAuth(req);
    if (!auth.success) return this.error(res, auth.message!, 401);

    const teacherCheck = this.checkTeacher(req);
    if (!teacherCheck.success) return this.error(res, teacherCheck.message!, 403);

    const { name, email, password } = req.body;
    if (!name || !email || !password) {
      return this.error(res, 'Все поля обязательны', 400);
    }

    const userExists = await this.service.checkUserExists(email);
    if (userExists) return this.error(res, 'Пользователь с таким email уже существует', 400);

    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(password, saltRounds);
    const student = await this.service.createUser(name, email, hashedPassword, 'student');
    return this.success(res, { student }, 201);
  }

  async updateStudent(req: Request, res: Response): Promise<Response> {
    const auth = this.checkAuth(req);
    if (!auth.success) return this.error(res, auth.message!, 401);

    const teacherCheck = this.checkTeacher(req);
    if (!teacherCheck.success) return this.error(res, teacherCheck.message!, 403);

    const studentId = req.params.id;
    const { name, email } = req.body;
    const student = await this.service.updateUser(studentId, name, email, 'student');
    if (!student) return this.error(res, 'Студент не найден', 404);
    return this.success(res, { student });
  }

  async deleteStudent(req: Request, res: Response): Promise<Response> {
    const auth = this.checkAuth(req);
    if (!auth.success) return this.error(res, auth.message!, 401);

    const teacherCheck = this.checkTeacher(req);
    if (!teacherCheck.success) return this.error(res, teacherCheck.message!, 403);

    const studentId = req.params.id;
    const deleted = await this.service.deleteUser(studentId, 'student');
    if (!deleted) return this.error(res, 'Студент не найден', 404);
    return this.success(res, { message: 'Студент удален' });
  }

  async getAllStudentClasses(req: Request, res: Response): Promise<Response> {
    const auth = this.checkAuth(req);
    if (!auth.success) return this.error(res, auth.message!, 401);

    const teacherCheck = this.checkTeacher(req);
    if (!teacherCheck.success) return this.error(res, teacherCheck.message!, 403);

    const studentClasses = await this.service.getAllStudentClasses();
    return this.success(res, { student_classes: studentClasses });
  }

  async deleteStudentClass(req: Request, res: Response): Promise<Response> {
    const auth = this.checkAuth(req);
    if (!auth.success) return this.error(res, auth.message!, 401);

    const teacherCheck = this.checkTeacher(req);
    if (!teacherCheck.success) return this.error(res, teacherCheck.message!, 403);

    const id = req.params.id;
    const deleted = await this.service.deleteStudentClass(id);
    if (!deleted) return this.error(res, 'Запись не найдена', 404);
    return this.success(res, { message: 'Студент удален из класса' });
  }

  async getAllTeacherSubjects(req: Request, res: Response): Promise<Response> {
    const auth = this.checkAuth(req);
    if (!auth.success) return this.error(res, auth.message!, 401);

    const teacherCheck = this.checkTeacher(req);
    if (!teacherCheck.success) return this.error(res, teacherCheck.message!, 403);

    const teacherSubjects = await this.service.getAllTeacherSubjects();
    return this.success(res, { teacher_subjects: teacherSubjects });
  }

  async deleteTeacherSubject(req: Request, res: Response): Promise<Response> {
    const auth = this.checkAuth(req);
    if (!auth.success) return this.error(res, auth.message!, 401);

    const teacherCheck = this.checkTeacher(req);
    if (!teacherCheck.success) return this.error(res, teacherCheck.message!, 403);

    const id = req.params.id;
    const deleted = await this.service.deleteTeacherSubject(id);
    if (!deleted) return this.error(res, 'Запись не найдена', 404);
    return this.success(res, { message: 'Назначение удалено' });
  }

  async assignTeacherToSubject(req: Request, res: Response): Promise<Response> {
    const auth = this.checkAuth(req);
    if (!auth.success) return this.error(res, auth.message!, 401);

    const teacherCheck = this.checkTeacher(req);
    if (!teacherCheck.success) return this.error(res, teacherCheck.message!, 403);

    const { teacher_id, subject_id, class_id } = req.body;
    if (!teacher_id || !subject_id || !class_id) {
      return this.error(res, 'Необходимо указать teacher_id, subject_id и class_id', 400);
    }

    const result = await this.service.assignTeacherToSubject(teacher_id, subject_id, class_id);
    if (!result) {
      return this.error(res, 'Такая связь уже существует', 409);
    }

    const assignment = await this.service.getTeacherSubjectAssignment(result.id);
    return this.success(res, { assignment, message: 'Учитель успешно назначен' }, 201);
  }

  async updateClass(req: Request, res: Response): Promise<Response> {
    const auth = this.checkAuth(req);
    if (!auth.success) return this.error(res, auth.message!, 401);

    const teacherCheck = this.checkTeacher(req);
    if (!teacherCheck.success) return this.error(res, teacherCheck.message!, 403);

    const classId = req.params.id;
    const { name, year } = req.body;
    const updatedClass = await this.service.updateClass(classId, name, year);
    if (!updatedClass) return this.error(res, 'Класс не найден', 404);
    return this.success(res, { class: updatedClass });
  }

  async deleteClass(req: Request, res: Response): Promise<Response> {
    const auth = this.checkAuth(req);
    if (!auth.success) return this.error(res, auth.message!, 401);

    const teacherCheck = this.checkTeacher(req);
    if (!teacherCheck.success) return this.error(res, teacherCheck.message!, 403);

    const classId = req.params.id;
    const deleted = await this.service.deleteClass(classId);
    if (!deleted) return this.error(res, 'Класс не найден', 404);
    return this.success(res, { message: 'Класс удален' });
  }

  async deleteAttendance(req: Request, res: Response): Promise<Response> {
    const auth = this.checkAuth(req);
    if (!auth.success) return this.error(res, auth.message!, 401);

    const teacherCheck = this.checkTeacher(req);
    if (!teacherCheck.success) return this.error(res, teacherCheck.message!, 403);

    const { student_id, subject_id, date } = req.body;
    if (!student_id || !subject_id || !date) {
      return this.error(res, 'Не указаны обязательные параметры', 400);
    }

    const deleted = await this.service.deleteAttendanceRecord(student_id, subject_id, date);
    if (!deleted) return this.error(res, 'Запись о посещаемости не найдена', 404);
    return this.success(res, { message: 'Запись удалена' });
  }

  async deleteGrade(req: Request, res: Response): Promise<Response> {
    const auth = this.checkAuth(req);
    if (!auth.success) return this.error(res, auth.message!, 401);

    const teacherCheck = this.checkTeacher(req);
    if (!teacherCheck.success) return this.error(res, teacherCheck.message!, 403);

    const { student_id, subject_id, grade_date } = req.body;
    if (!student_id || !subject_id || !grade_date) {
      return this.error(res, 'Не указаны обязательные параметры', 400);
    }

    const deleted = await this.service.deleteGradeRecord(student_id, subject_id, grade_date);
    if (!deleted) return this.error(res, 'Оценка не найдена', 404);
    return this.success(res, { message: 'Оценка удалена' });
  }

  async deleteScheduleItem(req: Request, res: Response): Promise<Response> {
    const auth = this.checkAuth(req);
    if (!auth.success) return this.error(res, auth.message!, 401);

    const teacherCheck = this.checkTeacher(req);
    if (!teacherCheck.success) return this.error(res, teacherCheck.message!, 403);

    const scheduleId = req.params.id;
    const deleted = await this.service.deleteScheduleItemRecord(scheduleId);
    if (!deleted) return this.error(res, 'Запись не найдена', 404);
    return this.success(res, { message: 'Запись удалена' });
  }

  async getClassGrades(req: Request, res: Response): Promise<Response> {
    const auth = this.checkAuth(req);
    if (!auth.success) return this.error(res, auth.message!, 401);

    const teacherCheck = this.checkTeacher(req);
    if (!teacherCheck.success) return this.error(res, teacherCheck.message!, 403);

    const classId = req.params.classId;
    const grades = await this.service.getClassGrades(classId);
    return this.success(res, { grades });
  }

  async getClassAverages(req: Request, res: Response): Promise<Response> {
    const auth = this.checkAuth(req);
    if (!auth.success) return this.error(res, auth.message!, 401);

    const teacherCheck = this.checkTeacher(req);
    if (!teacherCheck.success) return this.error(res, teacherCheck.message!, 403);

    const classId = req.params.classId;
    const averages = await this.service.getClassAverages(classId);
    return this.success(res, { averages });
  }
  
  async deleteGradeByDate(req: Request, res: Response) {
    const { student_id, subject_id, grade_date } = req.body;
    
    const success = await this.service.deleteGradeRecord(
      parseInt(student_id),
      parseInt(subject_id),
      grade_date
    );
    
    if (!success) {
      return res.status(404).json({ success: false, message: 'Оценка не найдена' });
    }
    return res.json({ success: true, message: 'Оценка успешно удалена' });
  }
  
  async deleteAttendanceByDate(req: Request, res: Response) {
    const { student_id, subject_id, date } = req.body;
    
    const success = await this.service.deleteAttendanceRecord(
      parseInt(student_id),
      parseInt(subject_id),
      date
    );
    
    if (!success) {
      return res.status(404).json({ success: false, message: 'Запись посещаемости не найдена' });
    }
    return res.json({ success: true, message: 'Запись посещаемости успешно удалена' });
  }

  async getChangesForSubject(req: Request, res: Response): Promise<Response> {
    const auth = this.checkAuth(req);
    if (!auth.success) return this.error(res, auth.message!, 401);

    const classId = req.params.classId;
    const subjectId = req.params.subjectId;
    const startDate = req.query.start as string;
    const endDate = req.query.end as string;

    if (!startDate || !endDate) {
      return this.error(res, 'Не указаны даты начала и окончания', 400);
    }

    const changes = await this.service.getChangesForSubject(classId, subjectId, startDate, endDate);
    return this.success(res, { changes });
  }
}

const gradebookController = new GradebookController();

const wrap = (fn: Function) => {
  return async (req: Request, res: Response) => {
    try {
      return await fn(req, res);
    } catch (error) {
      console.error('Error:', error);
      return res.status(500).json({ success: false, message: 'Внутренняя ошибка сервера' });
    }
  };
};

export const getAllSubjects = wrap(gradebookController.getAllSubjects.bind(gradebookController));
export const createSubject = wrap(gradebookController.createSubject.bind(gradebookController));
export const getAllClasses = wrap(gradebookController.getAllClasses.bind(gradebookController));
export const createClass = wrap(gradebookController.createClass.bind(gradebookController));
export const addStudentToClass = wrap(gradebookController.addStudentToClass.bind(gradebookController));
export const addGrade = wrap(gradebookController.addGrade.bind(gradebookController));
export const getStudentGrades = wrap(gradebookController.getStudentGrades.bind(gradebookController));
export const getAverageGrade = wrap(gradebookController.getAverageGrade.bind(gradebookController));
export const markAttendance = wrap(gradebookController.markAttendance.bind(gradebookController));
export const getStudentAttendance = wrap(gradebookController.getStudentAttendance.bind(gradebookController));
export const createHomework = wrap(gradebookController.createHomework.bind(gradebookController));
export const getHomework = wrap(gradebookController.getHomework.bind(gradebookController));
export const submitHomework = wrap(gradebookController.submitHomework.bind(gradebookController));
export const getTeacherScheduleWithChanges = wrap(gradebookController.getTeacherScheduleWithChanges.bind(gradebookController));
export const getTeacherSchedule = wrap(gradebookController.getTeacherSchedule.bind(gradebookController));
export const getClassSchedule = wrap(gradebookController.getClassSchedule.bind(gradebookController));
export const getMySubjects = wrap(gradebookController.getMySubjects.bind(gradebookController));
export const getMyClasses = wrap(gradebookController.getMyClasses.bind(gradebookController));
export const getClassStudents = wrap(gradebookController.getClassStudents.bind(gradebookController));
export const createScheduleItem = wrap(gradebookController.createScheduleItem.bind(gradebookController));
export const getDashboardStats = wrap(gradebookController.getDashboardStats.bind(gradebookController));
export const getGradesBySubject = wrap(gradebookController.getGradesBySubject.bind(gradebookController));
export const getAttendanceBySubject = wrap(gradebookController.getAttendanceBySubject.bind(gradebookController));
export const getAllStudents = wrap(gradebookController.getAllStudents.bind(gradebookController));
export const getAllTeachers = wrap(gradebookController.getAllTeachers.bind(gradebookController));
export const updateSubject = wrap(gradebookController.updateSubject.bind(gradebookController));
export const deleteSubject = wrap(gradebookController.deleteSubject.bind(gradebookController));
export const createTeacher = wrap(gradebookController.createTeacher.bind(gradebookController));
export const updateTeacher = wrap(gradebookController.updateTeacher.bind(gradebookController));
export const deleteTeacher = wrap(gradebookController.deleteTeacher.bind(gradebookController));
export const createStudent = wrap(gradebookController.createStudent.bind(gradebookController));
export const updateStudent = wrap(gradebookController.updateStudent.bind(gradebookController));
export const deleteStudent = wrap(gradebookController.deleteStudent.bind(gradebookController));
export const getAllStudentClasses = wrap(gradebookController.getAllStudentClasses.bind(gradebookController));
export const deleteStudentClass = wrap(gradebookController.deleteStudentClass.bind(gradebookController));
export const getAllTeacherSubjects = wrap(gradebookController.getAllTeacherSubjects.bind(gradebookController));
export const deleteTeacherSubject = wrap(gradebookController.deleteTeacherSubject.bind(gradebookController));
export const assignTeacherToSubject = wrap(gradebookController.assignTeacherToSubject.bind(gradebookController));
export const updateClass = wrap(gradebookController.updateClass.bind(gradebookController));
export const deleteClass = wrap(gradebookController.deleteClass.bind(gradebookController));
export const deleteAttendance = wrap(gradebookController.deleteAttendance.bind(gradebookController));
export const deleteGrade = wrap(gradebookController.deleteGrade.bind(gradebookController));
export const deleteScheduleItem = wrap(gradebookController.deleteScheduleItem.bind(gradebookController));
export const getClassGrades = wrap(gradebookController.getClassGrades.bind(gradebookController));
export const getClassAverages = wrap(gradebookController.getClassAverages.bind(gradebookController));
export const getChangesForSubject = wrap(gradebookController.getChangesForSubject.bind(gradebookController));
export const deleteGradeByDate = wrap(gradebookController.deleteGradeByDate.bind(gradebookController));
export const deleteAttendanceByDate = wrap(gradebookController.deleteAttendanceByDate.bind(gradebookController));
