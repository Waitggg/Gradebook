import { Request, Response } from 'express';
import pool from '../db/pool';
import { QueryResult } from 'pg';
import bcrypt from 'bcrypt';

interface SessionWithUser {
  userId?: string;
  userEmail?: string;
  userRole?: 'teacher' | 'student';
  destroy: (callback: (err: Error | null) => void) => void;
}

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

export async function getAllSubjects(req: Request, res: Response): Promise<Response> {
  const session = req.session as SessionWithUser;
  if (!session.userId) {
    return res.status(401).json({ success: false, message: 'Не авторизован' });
  }

  try {
    const result: QueryResult = await pool.query(
      'SELECT id, name, description, created_at FROM subjects ORDER BY name'
    );
    return res.json({ success: true, subjects: result.rows });
  } catch (error) {
    console.error('Get subjects error:', error);
    return res.status(500).json({ success: false, message: 'Ошибка получения предметов' });
  }
}

export async function createSubject(req: Request<{}, {}, SubjectBody>, res: Response): Promise<Response> {
  const session = req.session as SessionWithUser;
  if (!session.userId || session.userRole !== 'teacher') {
    return res.status(403).json({ success: false, message: 'Доступ запрещен' });
  }

  const { name, description } = req.body;

  if (!name || name.trim() === '') {
    return res.status(400).json({ 
      success: false, 
      message: 'Название предмета обязательно' 
    });
  }

  try {
    const result: QueryResult = await pool.query(
      'INSERT INTO subjects (name, description) VALUES ($1, $2) RETURNING *',
      [name.trim(), description || null] 
    );
        
    return res.status(201).json({ 
      success: true, 
      subject: result.rows[0] 
    });
  } catch (error) {
    console.error('Create subject error:', error);
    return res.status(500).json({ 
      success: false, 
      message: 'Ошибка создания предмета' 
    });
  }
}

export async function getAllClasses(req: Request, res: Response): Promise<Response> {
  const session = req.session as SessionWithUser;
  if (!session.userId) {
    return res.status(401).json({ success: false, message: 'Не авторизован' });
  }

  try {
    const result: QueryResult = await pool.query(
      'SELECT id, name, year, created_at FROM classes ORDER BY year DESC, name'
    );
    return res.json({ success: true, classes: result.rows });
  } catch (error) {
    console.error('Get classes error:', error);
    return res.status(500).json({ success: false, message: 'Ошибка получения классов' });
  }
}

export async function createClass(req: Request<{}, {}, ClassBody>, res: Response): Promise<Response> {
  const session = req.session as SessionWithUser;
  if (!session.userId || session.userRole !== 'teacher') {
    return res.status(403).json({ success: false, message: 'Доступ запрещен' });
  }

  const { name, year } = req.body;

  try {
    const result: QueryResult = await pool.query(
      'INSERT INTO classes (name, year) VALUES ($1, $2) RETURNING id, name, year, created_at',
      [name, year]
    );
    return res.status(201).json({ success: true, class: result.rows[0] });
  } catch (error) {
    console.error('Create class error:', error);
    return res.status(500).json({ success: false, message: 'Ошибка создания класса' });
  }
}

export async function addStudentToClass(req: Request, res: Response): Promise<Response> {
  const session = req.session as SessionWithUser;
  if (!session.userId || session.userRole !== 'teacher') {
    return res.status(403).json({ success: false, message: 'Доступ запрещен' });
  }

  const { student_id, class_id } = req.body;

  if (!student_id || !class_id) {
    return res.status(400).json({ 
      success: false, 
      message: 'Необходимо указать student_id и class_id' 
    });
  }

  try {
    const studentCheck = await pool.query(
      'SELECT id FROM users WHERE id = $1 AND role = $2',
      [student_id, 'student']
    );
    
    if (studentCheck.rows.length === 0) {
      return res.status(404).json({ 
        success: false, 
        message: 'Студент не найден' 
      });
    }

    const classCheck = await pool.query(
      'SELECT id FROM classes WHERE id = $1',
      [class_id]
    );
    
    if (classCheck.rows.length === 0) {
      return res.status(404).json({ 
        success: false, 
        message: 'Класс не найден' 
      });
    }

    const result = await pool.query(
      `INSERT INTO student_classes (student_id, class_id) 
       VALUES ($1, $2) 
       ON CONFLICT (student_id, class_id) DO NOTHING
       RETURNING id, student_id, class_id, joined_at`,
      [student_id, class_id]
    );
    
    if (result.rows.length === 0) {
      return res.status(409).json({ 
        success: false, 
        message: 'Студент уже привязан к этому классу' 
      });
    }
    
    return res.status(201).json({ 
      success: true, 
      student_class: result.rows[0],
      message: 'Студент успешно добавлен в класс'
    });
  } catch (error) {
    console.error('Add student to class error:', error);
    return res.status(500).json({ 
      success: false, 
      message: 'Ошибка привязки студента к классу' 
    });
  }
}

export async function addGrade(req: Request<{}, {}, GradeBody>, res: Response): Promise<Response> {
  const session = req.session as SessionWithUser;
  if (!session.userId || session.userRole !== 'teacher') {
    return res.status(403).json({ success: false, message: 'Доступ запрещен' });
  }

  const {
    student_id,
    subject_id,
    grade,
    grade_date,
    semester,
    comment,
    grade_type = 'classwork'
  } = req.body;

  const targetDate = grade_date || new Date().toISOString().split('T')[0];

  try {
    await pool.query(
      'DELETE FROM attendance WHERE student_id = $1 AND subject_id = $2 AND date::date = $3::date',
      [student_id, subject_id, targetDate]
    );

    const existing = await pool.query(
      `SELECT id FROM grades WHERE student_id = $1 AND subject_id = $2 AND grade_date::date = $3::date`,
      [student_id, subject_id, targetDate]
    );

    let result: QueryResult;
    if (existing.rows.length > 0) {
      result = await pool.query(
        `UPDATE grades
         SET grade = $1,
             teacher_id = $2,
             semester = $3,
             comment = $4,
             grade_type = $5
         WHERE student_id = $6 AND subject_id = $7 AND grade_date::date = $8::date
         RETURNING id, student_id, subject_id, grade, 
                   to_char(grade_date, 'YYYY-MM-DD') as grade_date, 
                   semester, comment, grade_type`,
        [grade, session.userId, semester, comment, grade_type, student_id, subject_id, targetDate]
      );
    } else {
      result = await pool.query(
        `INSERT INTO grades (student_id, subject_id, teacher_id, grade, grade_date, semester, comment, grade_type) 
         VALUES ($1, $2, $3, $4, $5::date, $6, $7, $8) 
         RETURNING id, student_id, subject_id, grade, 
                   to_char(grade_date, 'YYYY-MM-DD') as grade_date, 
                   semester, comment, grade_type`,
        [student_id, subject_id, session.userId, grade, targetDate, semester, comment, grade_type]
      );
    }

    return res.status(201).json({ success: true, grade: result.rows[0] });
  } catch (error) {
    console.error('Add grade error:', error);
    return res.status(500).json({ success: false, message: 'Ошибка добавления оценки' });
  }
}

export async function getStudentGrades(req: Request, res: Response): Promise<Response> {
  const session = req.session as SessionWithUser;
  if (!session.userId) {
    return res.status(401).json({ success: false, message: 'Не авторизован' });
  }

  const studentId = req.params.studentId || session.userId;
  const subjectId = req.query.subject_id;

  try {
    let query: string;
    let params: any[];
    
    if (subjectId) {
      query = `
        SELECT g.id, g.grade, 
               to_char(g.grade_date, 'YYYY-MM-DD') as grade_date,
               g.semester, g.comment, g.grade_type,
               s.id as subject_id, s.name as subject_name
        FROM grades g
        JOIN subjects s ON g.subject_id = s.id
        WHERE g.student_id = $1 AND g.subject_id = $2
        ORDER BY g.grade_date DESC, g.id DESC
      `;
      params = [studentId, subjectId];
    } else {
      query = `
        SELECT g.id, g.grade, 
               to_char(g.grade_date, 'YYYY-MM-DD') as grade_date,
               g.semester, g.comment, g.grade_type,
               s.id as subject_id, s.name as subject_name
        FROM grades g
        JOIN subjects s ON g.subject_id = s.id
        WHERE g.student_id = $1
        ORDER BY g.grade_date DESC, g.id DESC
      `;
      params = [studentId];
    }
    
    const result: QueryResult = await pool.query(query, params);
    return res.json({ success: true, grades: result.rows });
  } catch (error) {
    console.error('Get student grades error:', error);
    return res.status(500).json({ success: false, message: 'Ошибка получения оценок' });
  }
}

export async function getAverageGrade(req: Request, res: Response): Promise<Response> {
  const session = req.session as SessionWithUser;
  if (!session.userId) {
    return res.status(401).json({ success: false, message: 'Не авторизован' });
  }

  const studentId = req.params.studentId || session.userId;

  try {
    const result: QueryResult = await pool.query(
      `SELECT s.id as subject_id, s.name as subject_name,
       AVG(g.grade) as average_grade, COUNT(g.id) as grades_count
       FROM grades g
       JOIN subjects s ON g.subject_id = s.id
       WHERE g.student_id = $1
       GROUP BY s.id, s.name
       ORDER BY s.name`,
      [studentId]
    );
    return res.json({ success: true, averages: result.rows });
  } catch (error) {
    console.error('Get average grade error:', error);
    return res.status(500).json({ success: false, message: 'Ошибка получения среднего балла' });
  }
}

export async function markAttendance(req: Request<{}, {}, AttendanceBody>, res: Response): Promise<Response> {
  const session = req.session as SessionWithUser;
  if (!session.userId || session.userRole !== 'teacher') {
    return res.status(403).json({ success: false, message: 'Доступ запрещен' });
  }

  const { student_id, subject_id, date, status } = req.body;
  
  const targetDate = date || new Date().toISOString().split('T')[0];

  try {
    if (status === 'absent') {
      await pool.query(
        'DELETE FROM grades WHERE student_id = $1 AND subject_id = $2 AND grade_date::date = $3::date',
        [student_id, subject_id, targetDate]
      );
    }

    const result: QueryResult = await pool.query(
      `INSERT INTO attendance (student_id, subject_id, date, status) 
       VALUES ($1, $2, $3::date, $4) 
       ON CONFLICT (student_id, subject_id, date) 
       DO UPDATE SET status = $4
       RETURNING id, student_id, subject_id, 
                 to_char(date, 'YYYY-MM-DD') as date, 
                 status`,
      [student_id, subject_id, targetDate, status]
    );
    return res.status(201).json({ success: true, attendance: result.rows[0] });
  } catch (error) {
    console.error('Mark attendance error:', error);
    return res.status(500).json({ success: false, message: 'Ошибка отметки посещаемости' });
  }
}

export async function getStudentAttendance(req: Request, res: Response): Promise<Response> {
  const session = req.session as SessionWithUser;
  if (!session.userId) {
    return res.status(401).json({ success: false, message: 'Не авторизован' });
  }

  const studentId = req.params.studentId || session.userId;
  const subjectId = req.query.subject_id;

  try {
    let query: string;
    let params: any[];
    
    if (subjectId) {
      query = `
        SELECT a.id, 
               to_char(a.date, 'YYYY-MM-DD') as date,
               a.status, 
               s.name as subject_name
        FROM attendance a
        JOIN subjects s ON a.subject_id = s.id
        WHERE a.student_id = $1 AND a.subject_id = $2
        ORDER BY a.date DESC
      `;
      params = [studentId, subjectId];
    } else {
      query = `
        SELECT a.id, 
               to_char(a.date, 'YYYY-MM-DD') as date,
               a.status, 
               s.name as subject_name
        FROM attendance a
        JOIN subjects s ON a.subject_id = s.id
        WHERE a.student_id = $1
        ORDER BY a.date DESC
      `;
      params = [studentId];
    }

    const result: QueryResult = await pool.query(query, params);
    return res.json({ success: true, attendance: result.rows });
  } catch (error) {
    console.error('Get student attendance error:', error);
    return res.status(500).json({ success: false, message: 'Ошибка получения посещаемости' });
  }
}

export async function createHomework(req: Request<{}, {}, HomeworkBody>, res: Response): Promise<Response> {
  const session = req.session as SessionWithUser;
  if (!session.userId || session.userRole !== 'teacher') {
    return res.status(403).json({ success: false, message: 'Доступ запрещен' });
  }

  const { subject_id, title, description, due_date } = req.body;

  try {
    const result: QueryResult = await pool.query(
      `INSERT INTO homework (subject_id, teacher_id, title, description, due_date) 
       VALUES ($1, $2, $3, $4, $5) 
       RETURNING id, subject_id, teacher_id, title, description, due_date, created_at`,
      [subject_id, session.userId, title, description, due_date]
    );
    return res.status(201).json({ success: true, homework: result.rows[0] });
  } catch (error) {
    console.error('Create homework error:', error);
    return res.status(500).json({ success: false, message: 'Ошибка создания домашнего задания' });
  }
}

export async function getHomework(req: Request, res: Response): Promise<Response> {
  const session = req.session as SessionWithUser;
  if (!session.userId) {
    return res.status(401).json({ success: false, message: 'Не авторизован' });
  }

  try {
    const result: QueryResult = await pool.query(
      `SELECT h.id, h.title, h.description, h.due_date, h.created_at,
              s.name as subject_name, u.name as teacher_name
       FROM homework h
       JOIN subjects s ON h.subject_id = s.id
       JOIN users u ON h.teacher_id = u.id
       WHERE h.due_date >= CURRENT_DATE
       ORDER BY h.due_date ASC`
    );
    return res.json({ success: true, homework: result.rows });
  } catch (error) {
    console.error('Get homework error:', error);
    return res.status(500).json({ success: false, message: 'Ошибка получения заданий' });
  }
}

export async function submitHomework(req: Request<{ id: string }, {}, HomeworkSubmissionBody>, res: Response): Promise<Response> {
  const session = req.session as SessionWithUser;
  if (!session.userId) {
    return res.status(401).json({ success: false, message: 'Не авторизован' });
  }

  const homeworkId = parseInt(req.params.id);
  const { submission_text } = req.body;

  try {
    const result: QueryResult = await pool.query(
      `INSERT INTO homework_submissions (homework_id, student_id, submission_text) 
       VALUES ($1, $2, $3) 
       ON CONFLICT (homework_id, student_id) 
       DO UPDATE SET submission_text = $3, submitted_at = CURRENT_TIMESTAMP
       RETURNING id, homework_id, student_id, submission_text, submitted_at`,
      [homeworkId, session.userId, submission_text]
    );
    return res.status(201).json({ success: true, submission: result.rows[0] });
  } catch (error) {
    console.error('Submit homework error:', error);
    return res.status(500).json({ success: false, message: 'Ошибка отправки задания' });
  }
}

export async function getTeacherScheduleWithChanges(req: Request, res: Response): Promise<Response> {
  const session = req.session as SessionWithUser;
  if (!session.userId || session.userRole !== 'teacher') {
    return res.status(403).json({ success: false, message: 'Доступ запрещен' });
  }

  const targetDate = req.query.date as string || new Date().toISOString().split('T')[0];

  try {
    const scheduleResult: QueryResult = await pool.query(
      `SELECT s.id, s.day_of_week, s.lesson_number, s.room,
              sub.id as subject_id, sub.name as subject_name,
              c.id as class_id, c.name as class_name,
              c.year as class_year
       FROM schedule s
       JOIN subjects sub ON s.subject_id = sub.id
       JOIN classes c ON s.class_id = c.id
       WHERE s.teacher_id = $1
       ORDER BY s.day_of_week, s.lesson_number`,
      [session.userId]
    );

    const teacherClasses = await pool.query(
      `SELECT DISTINCT class_id FROM schedule WHERE teacher_id = $1`,
      [session.userId]
    );

    const classIds = teacherClasses.rows.map(row => row.class_id);
    
    let changes: any[] = [];
    
    if (classIds.length > 0) {
      const changesResult = await pool.query(
        `SELECT sc.*, c.name as class_name
         FROM schedule_changes sc
         JOIN classes c ON sc.class_id = c.id
         WHERE sc.class_id = ANY($1) AND sc.date = $2::date
         ORDER BY sc.class_id, sc.lesson_number`,
        [classIds, targetDate]
      );
      changes = changesResult.rows;
    }

    const changesMap = new Map();
    changes.forEach((change: any) => {
      const key = `${change.class_id}_${change.lesson_number}`;
      changesMap.set(key, change);
    });

    const finalSchedule = scheduleResult.rows.map((item: any) => {
      const key = `${item.class_id}_${item.lesson_number}`;
      const change = changesMap.get(key);

      if (change) {
        if (change.change_type === 'cancel') {
          return {
            ...item,
            is_canceled: true,
            change_type: 'cancel',
            notes: change.notes
          };
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
      
      return {
        ...item,
        is_regular: true
      };
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
    
    finalSchedule.sort((a, b) => {
      if (a.day_of_week !== b.day_of_week) return a.day_of_week - b.day_of_week;
      return a.lesson_number - b.lesson_number;
    });

    const lessonTimesResult: QueryResult = await pool.query(
      'SELECT lesson_number, start_time, end_time FROM lesson_times ORDER BY lesson_number'
    );
    
    return res.json({ 
      success: true, 
      schedule: finalSchedule,
      lesson_times: lessonTimesResult.rows,
      date: targetDate
    });
  } catch (error) {
    console.error('Get teacher schedule with changes error:', error);
    return res.status(500).json({ success: false, message: 'Ошибка получения расписания' });
  }
}

export async function getChangesForSubject(req: Request, res: Response): Promise<Response> {
  const session = req.session as SessionWithUser;
  if (!session.userId) {
    return res.status(401).json({ success: false, message: 'Не авторизован' });
  }

  const classId = req.params.classId;
  const subjectId = req.params.subjectId;
  const startDate = req.query.start as string;
  const endDate = req.query.end as string;

  try {
    const result = await pool.query(
      `SELECT sc.id, 
              to_char(sc.date, 'YYYY-MM-DD') as date,
              sc.lesson_number, 
              sc.room, 
              sc.change_type, 
              sc.subject_id,
              sc.teacher_id,
              sc.notes,
              sub.name as subject_name, 
              u.name as teacher_name,
              sc.original_subject_id,
              sc.original_teacher_id
       FROM schedule_changes sc
       LEFT JOIN subjects sub ON sc.subject_id = sub.id
       LEFT JOIN users u ON sc.teacher_id = u.id
       WHERE sc.class_id = $1 
         AND sc.subject_id = $2
         AND sc.date BETWEEN $3::date AND $4::date
         AND sc.change_type IN ('replace', 'added')
       ORDER BY sc.date, sc.lesson_number`,
      [classId, subjectId, startDate, endDate]
    );
    
    console.log('Changes found:', result.rows.map((row: any) => ({
      id: row.id,
      date: row.date,
      lesson_number: row.lesson_number,
      change_type: row.change_type,
      subject_id: row.subject_id
    })));
    
    return res.json({ success: true, changes: result.rows });
  } catch (error) {
    console.error('Get changes for subject error:', error);
    return res.status(500).json({ success: false, message: 'Ошибка получения изменений' });
  }
}
export async function getTeacherSchedule(req: Request, res: Response): Promise<Response> {
  const session = req.session as SessionWithUser;
  if (!session.userId || session.userRole !== 'teacher') {
    return res.status(403).json({ success: false, message: 'Доступ запрещен' });
  }

  try {
    const scheduleResult: QueryResult = await pool.query(
      `SELECT s.id, s.day_of_week, s.lesson_number, s.room,
              sub.id as subject_id, sub.name as subject_name,
              c.id as class_id, c.name as class_name,
              c.year as class_year
       FROM schedule s
       JOIN subjects sub ON s.subject_id = sub.id
       JOIN classes c ON s.class_id = c.id
       WHERE s.teacher_id = $1
       ORDER BY s.day_of_week, s.lesson_number`,
      [session.userId]
    );
    
    const lessonTimesResult: QueryResult = await pool.query(
      'SELECT lesson_number, start_time, end_time FROM lesson_times ORDER BY lesson_number'
    );
    
    return res.json({ 
      success: true, 
      schedule: scheduleResult.rows,
      lesson_times: lessonTimesResult.rows
    });
  } catch (error) {
    console.error('Get teacher schedule error:', error);
    return res.status(500).json({ success: false, message: 'Ошибка получения расписания' });
  }
}
export async function assignTeacherToSubject(req: Request, res: Response): Promise<Response> {
  const session = req.session as SessionWithUser;
  if (!session.userId || session.userRole !== 'teacher') {
    return res.status(403).json({ success: false, message: 'Доступ запрещен' });
  }

  const { teacher_id, subject_id, class_id } = req.body;

  if (!teacher_id || !subject_id || !class_id) {
    return res.status(400).json({ 
      success: false, 
      message: 'Необходимо указать teacher_id, subject_id и class_id',
      received: { teacher_id, subject_id, class_id }
    });
  }

  try {
    const result: QueryResult = await pool.query(
      `INSERT INTO teacher_subjects (teacher_id, subject_id, class_id) 
       VALUES ($1, $2, $3) 
       ON CONFLICT (teacher_id, subject_id, class_id) DO NOTHING
       RETURNING *`,
      [teacher_id, subject_id, class_id]
    );
    
    if (result.rows.length === 0) {
      return res.status(409).json({ 
        success: false, 
        message: 'Такая связь уже существует' 
      });
    }
    
    const assignment = await pool.query(
      `SELECT ts.*, 
              u.name as teacher_name,
              s.name as subject_name,
              c.name as class_name
       FROM teacher_subjects ts
       JOIN users u ON ts.teacher_id = u.id
       JOIN subjects s ON ts.subject_id = s.id
       JOIN classes c ON ts.class_id = c.id
       WHERE ts.id = $1`,
      [result.rows[0].id]
    );
    
    return res.status(201).json({ 
      success: true, 
      assignment: assignment.rows[0],
      message: 'Учитель успешно назначен'
    });
  } catch (error) {
    console.error('Assign teacher error:', error);
    return res.status(500).json({ 
      success: false, 
      message: 'Ошибка назначения учителя',
      error: error instanceof Error ? error.message : String(error)
    });
  }
}

export async function getMySubjects(req: Request, res: Response): Promise<Response> {
  const session = req.session as SessionWithUser;
  if (!session.userId) {
    return res.status(401).json({ success: false, message: 'Не авторизован' });
  }

  const isTeacher = session.userRole === 'teacher';

  try {
    if (isTeacher) {
      const query = `
        SELECT DISTINCT s.id, s.name, s.description, 
               array_agg(DISTINCT c.name) as classes
        FROM teacher_subjects ts
        JOIN subjects s ON ts.subject_id = s.id
        JOIN classes c ON ts.class_id = c.id
        WHERE ts.teacher_id = $1
        GROUP BY s.id
      `;
      const result: QueryResult = await pool.query(query, [session.userId]);
      return res.json({ success: true, subjects: result.rows });
    } else {
      const studentId = session.userId;
            
      const query = `
        SELECT DISTINCT s.id, s.name, s.description
        FROM student_classes sc
        INNER JOIN teacher_subjects ts ON sc.class_id = ts.class_id
        INNER JOIN subjects s ON ts.subject_id = s.id
        WHERE sc.student_id = $1
      `;
      
      const result: QueryResult = await pool.query(query, [studentId]);
      
      return res.json({ success: true, subjects: result.rows });
    }
  } catch (error) {
    console.error('Get my subjects error:', error);
    return res.status(500).json({ success: false, message: 'Ошибка получения предметов' });
  }
}
export async function getMyClasses(req: Request, res: Response): Promise<Response> {
  const session = req.session as SessionWithUser;
  if (!session.userId) {
    return res.status(401).json({ success: false, message: 'Не авторизован' });
  }

  try {
    let query: string;
    let params: any[];

    if (session.userRole === 'teacher') {
      query = `
        SELECT DISTINCT c.id, c.name, c.year, c.created_at
        FROM teacher_subjects ts
        JOIN classes c ON ts.class_id = c.id
        WHERE ts.teacher_id = $1
        ORDER BY c.name
      `;
      params = [session.userId];
    } else {
      query = `
        SELECT DISTINCT c.id, c.name, c.year, c.created_at
        FROM student_classes sc
        JOIN classes c ON sc.class_id = c.id
        WHERE sc.student_id = $1
        ORDER BY c.name
      `;
      params = [session.userId];
    }

    const result = await pool.query(query, params);
    return res.json({ success: true, classes: result.rows });
  } catch (error) {
    console.error('Get my classes error:', error);
    return res.status(500).json({ success: false, message: 'Ошибка получения данных' });
  }
}

export async function getClassStudents(req: Request, res: Response): Promise<Response> {
  const session = req.session as SessionWithUser;
  if (!session.userId) {
    return res.status(401).json({ success: false, message: 'Не авторизован' });
  }

  const classId = req.params.classId;

  try {
    const result = await pool.query(
      `SELECT u.id, u.name, u.email, COALESCE(u.isFired, false) as isFired
       FROM users u
       JOIN student_classes sc ON u.id = sc.student_id
       WHERE sc.class_id = $1 AND u.role = 'student'
       ORDER BY u.name`,
      [classId]
    );
    
    return res.json({ success: true, students: result.rows });
  } catch (error) {
    console.error('Get class students error:', error);
    return res.status(500).json({ 
      success: false, 
      message: 'Ошибка получения студентов класса' 
    });
  }
}

export async function createScheduleItem(req: Request<{}, {}, ScheduleBody>, res: Response): Promise<Response> {
  const session = req.session as SessionWithUser;
  if (!session.userId || session.userRole !== 'teacher') {
    return res.status(403).json({ success: false, message: 'Доступ запрещен' });
  }

  const { subject_id, class_id, day_of_week, lesson_number, room } = req.body;

  try {
    const result: QueryResult = await pool.query(
      `INSERT INTO schedule (subject_id, teacher_id, class_id, day_of_week, lesson_number, room) 
       VALUES ($1, $2, $3, $4, $5, $6) 
       ON CONFLICT (class_id, day_of_week, lesson_number) 
       DO UPDATE SET subject_id = $1, teacher_id = $2, room = $6
       RETURNING id`,
      [subject_id, session.userId, class_id, day_of_week, lesson_number, room]
    );
    return res.status(201).json({ success: true, schedule: result.rows[0] });
  } catch (error) {
    console.error('Create schedule error:', error);
    return res.status(500).json({ success: false, message: 'Ошибка создания расписания' });
  }
}

export async function deleteAttendanceByDate(req: Request, res: Response): Promise<Response> {
  const session = req.session as SessionWithUser;
  if (!session.userId || session.userRole !== 'teacher') {
    return res.status(403).json({ success: false, message: 'Доступ запрещен' });
  }

  const { student_id, subject_id, date } = req.body;

  if (!student_id || !subject_id || !date) {
    return res.status(400).json({ success: false, message: 'Не указаны обязательные параметры' });
  }

  try {
    const result = await pool.query(
      'DELETE FROM attendance WHERE student_id = $1 AND subject_id = $2 AND date::date = $3::date RETURNING id',
      [student_id, subject_id, date]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Запись не найдена' });
    }
    
    return res.json({ success: true, message: 'Запись удалена' });
  } catch (error) {
    console.error('Delete attendance error:', error);
    return res.status(500).json({ success: false, message: 'Ошибка удаления' });
  }
}

export async function deleteGradeByDate(req: Request, res: Response): Promise<Response> {
  const session = req.session as SessionWithUser;
  if (!session.userId || session.userRole !== 'teacher') {
    return res.status(403).json({ success: false, message: 'Доступ запрещен' });
  }

  const { student_id, subject_id, grade_date } = req.body;

  if (!student_id || !subject_id || !grade_date) {
    return res.status(400).json({ success: false, message: 'Не указаны обязательные параметры' });
  }

  try {
    const result = await pool.query(
      'DELETE FROM grades WHERE student_id = $1 AND subject_id = $2 AND grade_date::date = $3::date RETURNING id',
      [student_id, subject_id, grade_date]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Оценка не найдена' });
    }
    
    return res.json({ success: true, message: 'Оценка удалена' });
  } catch (error) {
    console.error('Delete grade error:', error);
    return res.status(500).json({ success: false, message: 'Ошибка удаления оценки' });
  }
}

export async function deleteScheduleItem(req: Request, res: Response): Promise<Response> {
  const session = req.session as SessionWithUser;
  if (!session.userId || session.userRole !== 'teacher') {
    return res.status(403).json({ success: false, message: 'Доступ запрещен' });
  }

  const scheduleId = req.params.id;

  try {
    const result: QueryResult = await pool.query(
      'DELETE FROM schedule WHERE id = $1 RETURNING id',
      [scheduleId]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Запись не найдена' });
    }
    
    return res.json({ success: true, message: 'Запись удалена' });
  } catch (error) {
    console.error('Delete schedule error:', error);
    return res.status(500).json({ success: false, message: 'Ошибка удаления' });
  }
}


export async function getClassSchedule(req: Request, res: Response): Promise<Response> {
  const session = req.session as SessionWithUser;
  if (!session.userId) {
    return res.status(401).json({ success: false, message: 'Не авторизован' });
  }

  const classId = req.params.classId;

  try {
    const scheduleResult: QueryResult = await pool.query(
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
    const lessonTimesResult: QueryResult = await pool.query(
      'SELECT lesson_number, start_time, end_time FROM lesson_times ORDER BY lesson_number'
    );
    
    return res.json({ 
      success: true, 
      schedule: scheduleResult.rows,
      lesson_times: lessonTimesResult.rows
    });  } catch (error) {
    console.error('Get schedule error:', error);
    return res.status(500).json({ success: false, message: 'Ошибка получения расписания' });
  }
}

export async function getDashboardStats(req: Request, res: Response): Promise<Response> {
  const session = req.session as SessionWithUser;
  if (!session.userId) {
    return res.status(401).json({ success: false, message: 'Не авторизован' });
  }

  try {
    if (session.userRole === 'student') {
      const gradesResult = await pool.query(
        'SELECT AVG(grade) as average, COUNT(*) as total FROM grades WHERE student_id = $1',
        [session.userId]
      );
      
      const attendanceResult = await pool.query(
        `SELECT 
           COUNT(CASE WHEN status = 'present' THEN 1 END) as present,
           COUNT(*) as total
         FROM attendance WHERE student_id = $1`,
        [session.userId]
      );

      const subjectsResult = await pool.query(
        `SELECT COUNT(DISTINCT s.id) as count
         FROM student_classes sc
         JOIN teacher_subjects ts ON sc.class_id = ts.class_id
         JOIN subjects s ON ts.subject_id = s.id
         WHERE sc.student_id = $1`,
        [session.userId]
      );

      return res.json({
        success: true,
        stats: {
          average_grade: parseFloat(gradesResult.rows[0].average) || 0,
          total_grades: parseInt(gradesResult.rows[0].total) || 0,
          attendance_rate: attendanceResult.rows[0].total > 0 
            ? Math.round((attendanceResult.rows[0].present / attendanceResult.rows[0].total) * 100)
            : 0,
          subjects_count: parseInt(subjectsResult.rows[0].count) || 0
        }
      });
    } else {
      const studentsResult = await pool.query('SELECT COUNT(*) FROM users WHERE role = $1', ['student']);
      const subjectsResult = await pool.query('SELECT COUNT(*) FROM subjects');
      const gradesResult = await pool.query('SELECT COUNT(*) FROM grades');
      
      return res.json({
        success: true,
        stats: {
          total_students: parseInt(studentsResult.rows[0].count),
          total_subjects: parseInt(subjectsResult.rows[0].count),
          total_grades: parseInt(gradesResult.rows[0].count)
        }
      });
    }
  } catch (error) {
    console.error('Get dashboard stats error:', error);
    return res.status(500).json({ success: false, message: 'Ошибка получения статистики' });
  }
}

export async function getGradesBySubject(req: Request, res: Response): Promise<Response> {
  const session = req.session as SessionWithUser;
  if (!session.userId) {
    return res.status(401).json({ success: false, message: 'Не авторизован' });
  }

  const subjectId = req.params.subjectId;

  try {
    let query: string;
    let params: any[];

    if (session.userRole === 'teacher') {
      query = `
        SELECT g.id, g.grade, 
               to_char(g.grade_date, 'YYYY-MM-DD') as grade_date,
               g.comment, g.grade_type,
               u.id as student_id, u.name as student_name
        FROM grades g
        JOIN users u ON g.student_id = u.id
        WHERE g.subject_id = $1
        ORDER BY g.grade_date DESC, g.id DESC
      `;
      params = [subjectId];
    } else {
      const studentIdInt = parseInt(session.userId, 10);
      query = `
        SELECT id, grade, 
               to_char(grade_date, 'YYYY-MM-DD') as grade_date,
               comment, grade_type
        FROM grades
        WHERE subject_id = $1 AND student_id = $2
        ORDER BY grade_date DESC
      `;
      params = [subjectId, studentIdInt];
    }

    const result: QueryResult = await pool.query(query, params);
    return res.json({ success: true, grades: result.rows });
  } catch (error) {
    console.error('Get grades by subject error:', error);
    return res.status(500).json({ success: false, message: 'Ошибка получения оценок' });
  }
}

export async function getAttendanceBySubject(req: Request, res: Response): Promise<Response> {
  const session = req.session as SessionWithUser;
  if (!session.userId) {
    return res.status(401).json({ success: false, message: 'Не авторизован' });
  }

  const subjectId = req.params.subjectId;

  try {
    let query: string;
    let params: any[];

    if (session.userRole === 'teacher') {
      query = `
        SELECT a.id, 
               to_char(a.date, 'YYYY-MM-DD') as date,
               a.status, 
               u.id as student_id, 
               u.name as student_name
        FROM attendance a
        JOIN users u ON a.student_id = u.id
        WHERE a.subject_id = $1
        ORDER BY a.date DESC
      `;
      params = [subjectId];
    } else {
      const studentIdInt = parseInt(session.userId, 10);
      query = `
        SELECT id, 
               to_char(date, 'YYYY-MM-DD') as date,
               status,
                to_char(created_at, 'HH24:MI:SS') as created_time
        FROM attendance
        WHERE subject_id = $1 AND student_id = $2
        ORDER BY date DESC
      `;
      params = [subjectId, studentIdInt];
    }

    const result: QueryResult = await pool.query(query, params);
    return res.json({ success: true, attendance: result.rows });
  } catch (error) {
    console.error('Get attendance by subject error:', error);
    return res.status(500).json({ success: false, message: 'Ошибка получения посещаемости' });
  }
}

export async function deleteGrade(req: Request, res: Response): Promise<Response> {
  const session = req.session as SessionWithUser;
  if (!session.userId || session.userRole !== 'teacher') {
    return res.status(403).json({ success: false, message: 'Доступ запрещен' });
  }

  const { student_id, subject_id, grade_date } = req.body;

  try {
    const result = await pool.query(
      'DELETE FROM grades WHERE student_id = $1 AND subject_id = $2 AND grade_date::date = $3::date RETURNING id',
      [student_id, subject_id, grade_date]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Оценка не найдена' });
    }
    
    return res.json({ success: true, message: 'Оценка удалена' });
  } catch (error) {
    console.error('Delete grade error:', error);
    return res.status(500).json({ success: false, message: 'Ошибка удаления оценки' });
  }
}

export async function deleteAttendance(req: Request, res: Response): Promise<Response> {
  const session = req.session as SessionWithUser;
  if (!session.userId || session.userRole !== 'teacher') {
    return res.status(403).json({ success: false, message: 'Доступ запрещен' });
  }

  const { student_id, subject_id, date } = req.body;

  if (!student_id || !subject_id || !date) {
    return res.status(400).json({ success: false, message: 'Не указаны обязательные параметры' });
  }

  try {
    const result = await pool.query(
      'DELETE FROM attendance WHERE student_id = $1 AND subject_id = $2 AND date::date = $3::date RETURNING id',
      [student_id, subject_id, date]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Запись о посещаемости не найдена' });
    }
    
    return res.json({ success: true, message: 'Запись удалена' });
  } catch (error) {
    console.error('Delete attendance error:', error);
    return res.status(500).json({ success: false, message: 'Ошибка удаления' });
  }
}

export async function getAllStudents(req: Request, res: Response): Promise<Response> {
  const session = req.session as SessionWithUser;
  if (!session.userId || session.userRole !== 'teacher') {
    return res.status(403).json({ success: false, message: 'Доступ запрещен' });
  }

  try {
    const result: QueryResult = await pool.query(
      `SELECT id, name, email, created_at 
       FROM users 
       WHERE role = 'student' 
       ORDER BY name`
    );
    return res.json({ success: true, students: result.rows });
  } catch (error) {
    console.error('Get all students error:', error);
    return res.status(500).json({ success: false, message: 'Ошибка получения студентов' });
  }
}

export async function updateSubject(req: Request, res: Response): Promise<Response> {
  const session = req.session as SessionWithUser;
  if (!session.userId || session.userRole !== 'teacher') {
    return res.status(403).json({ success: false, message: 'Доступ запрещен' });
  }

  const subjectId = req.params.id;
  const { name, description } = req.body;

  try {
    const result: QueryResult = await pool.query(
      `UPDATE subjects 
       SET name = $1, description = $2 
       WHERE id = $3 
       RETURNING id, name, description, created_at`,
      [name, description, subjectId]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Предмет не найден' });
    }
    
    return res.json({ success: true, subject: result.rows[0] });
  } catch (error) {
    console.error('Update subject error:', error);
    return res.status(500).json({ success: false, message: 'Ошибка обновления предмета' });
  }
}

export async function deleteSubject(req: Request, res: Response): Promise<Response> {
  const session = req.session as SessionWithUser;
  if (!session.userId || session.userRole !== 'teacher') {
    return res.status(403).json({ success: false, message: 'Доступ запрещен' });
  }

  const subjectId = req.params.id;

  try {
    const result: QueryResult = await pool.query(
      'DELETE FROM subjects WHERE id = $1 RETURNING id',
      [subjectId]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Предмет не найден' });
    }
    
    return res.json({ success: true, message: 'Предмет удален' });
  } catch (error) {
    console.error('Delete subject error:', error);
    return res.status(500).json({ success: false, message: 'Ошибка удаления предмета' });
  }
}

export async function createTeacher(req: Request, res: Response): Promise<Response> {
  const session = req.session as SessionWithUser;
  if (!session.userId || session.userRole !== 'teacher') {
    return res.status(403).json({ success: false, message: 'Доступ запрещен' });
  }

  const { name, email, password } = req.body;

  if (!name || !email || !password) {
    return res.status(400).json({ success: false, message: 'Все поля обязательны' });
  }

  try {
    const existingUser = await pool.query(
      'SELECT id FROM users WHERE email = $1',
      [email]
    );

    if (existingUser.rows.length > 0) {
      return res.status(400).json({ success: false, message: 'Пользователь с таким email уже существует' });
    }

    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    const result: QueryResult = await pool.query(
      `INSERT INTO users (name, email, password_hash, role, created_at) 
       VALUES ($1, $2, $3, 'teacher', DEFAULT) 
       RETURNING id, name, email, created_at`,
      [name, email, hashedPassword]
    );
    return res.status(201).json({ success: true, teacher: result.rows[0] });
  } catch (error) {
    console.error('Create teacher error:', error);
    return res.status(500).json({ success: false, message: 'Ошибка создания учителя' });
  }
}
export async function updateTeacher(req: Request, res: Response): Promise<Response> {
  const session = req.session as SessionWithUser;
  if (!session.userId || session.userRole !== 'teacher') {
    return res.status(403).json({ success: false, message: 'Доступ запрещен' });
  }

  const teacherId = req.params.id;
  const { name, email } = req.body;

  try {
    const result: QueryResult = await pool.query(
      `UPDATE users 
       SET name = $1, email = $2 
       WHERE id = $3 AND role = 'teacher' 
       RETURNING id, name, email, created_at`,
      [name, email, teacherId]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Учитель не найден' });
    }
    
    return res.json({ success: true, teacher: result.rows[0] });
  } catch (error) {
    console.error('Update teacher error:', error);
    return res.status(500).json({ success: false, message: 'Ошибка обновления учителя' });
  }
}

export async function deleteTeacher(req: Request, res: Response): Promise<Response> {
  const session = req.session as SessionWithUser;
  if (!session.userId || session.userRole !== 'teacher') {
    return res.status(403).json({ success: false, message: 'Доступ запрещен' });
  }

  const teacherId = req.params.id;

  try {
    const result: QueryResult = await pool.query(
      'DELETE FROM users WHERE id = $1 AND role = $2 RETURNING id',
      [teacherId, 'teacher']
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Учитель не найден' });
    }
    
    return res.json({ success: true, message: 'Учитель удален' });
  } catch (error) {
    console.error('Delete teacher error:', error);
    return res.status(500).json({ success: false, message: 'Ошибка удаления учителя' });
  }
}

export async function createStudent(req: Request, res: Response): Promise<Response> {
  const session = req.session as SessionWithUser;
  if (!session.userId || session.userRole !== 'teacher') {
    return res.status(403).json({ success: false, message: 'Доступ запрещен' });
  }

  const { name, email, password } = req.body;

  if (!name || !email || !password) {
    return res.status(400).json({ success: false, message: 'Все поля обязательны' });
  }

  try {
    const existingUser = await pool.query(
      'SELECT id FROM users WHERE email = $1',
      [email]
    );

    if (existingUser.rows.length > 0) {
      return res.status(400).json({ success: false, message: 'Пользователь с таким email уже существует' });
    }

    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    const result: QueryResult = await pool.query(
      `INSERT INTO users (name, email, password_hash, role, created_at) 
       VALUES ($1, $2, $3, 'student', DEFAULT) 
       RETURNING id, name, email, created_at`,
      [name, email, hashedPassword]
    );
    return res.status(201).json({ success: true, student: result.rows[0] });
  } catch (error) {
    console.error('Create student error:', error);
    return res.status(500).json({ success: false, message: 'Ошибка создания студента' });
  }
}
export async function updateStudent(req: Request, res: Response): Promise<Response> {
  const session = req.session as SessionWithUser;
  if (!session.userId || session.userRole !== 'teacher') {
    return res.status(403).json({ success: false, message: 'Доступ запрещен' });
  }

  const studentId = req.params.id;
  const { name, email } = req.body;

  try {
    const result: QueryResult = await pool.query(
      `UPDATE users 
       SET name = $1, email = $2 
       WHERE id = $3 AND role = 'student' 
       RETURNING id, name, email, created_at`,
      [name, email, studentId]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Студент не найден' });
    }
    
    return res.json({ success: true, student: result.rows[0] });
  } catch (error) {
    console.error('Update student error:', error);
    return res.status(500).json({ success: false, message: 'Ошибка обновления студента' });
  }
}

export async function deleteStudent(req: Request, res: Response): Promise<Response> {
  const session = req.session as SessionWithUser;
  if (!session.userId || session.userRole !== 'teacher') {
    return res.status(403).json({ success: false, message: 'Доступ запрещен' });
  }

  const studentId = req.params.id;

  try {
    const result: QueryResult = await pool.query(
      'DELETE FROM users WHERE id = $1 AND role = $2 RETURNING id',
      [studentId, 'student']
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Студент не найден' });
    }
    
    return res.json({ success: true, message: 'Студент удален' });
  } catch (error) {
    console.error('Delete student error:', error);
    return res.status(500).json({ success: false, message: 'Ошибка удаления студента' });
  }
}

export async function getAllStudentClasses(req: Request, res: Response): Promise<Response> {
  const session = req.session as SessionWithUser;
  if (!session.userId || session.userRole !== 'teacher') {
    return res.status(403).json({ success: false, message: 'Доступ запрещен' });
  }

  try {
    const result: QueryResult = await pool.query(
      `SELECT sc.id, sc.student_id, sc.class_id, sc.joined_at,
              u.name as student_name, c.name as class_name
       FROM student_classes sc
       JOIN users u ON sc.student_id = u.id
       JOIN classes c ON sc.class_id = c.id
       ORDER BY c.name, u.name`
    );
    return res.json({ success: true, student_classes: result.rows });
  } catch (error) {
    console.error('Get student classes error:', error);
    return res.status(500).json({ success: false, message: 'Ошибка получения данных' });
  }
}

export async function deleteStudentClass(req: Request, res: Response): Promise<Response> {
  const session = req.session as SessionWithUser;
  if (!session.userId || session.userRole !== 'teacher') {
    return res.status(403).json({ success: false, message: 'Доступ запрещен' });
  }

  const id = req.params.id;

  try {
    const result: QueryResult = await pool.query(
      'DELETE FROM student_classes WHERE id = $1 RETURNING id',
      [id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Запись не найдена' });
    }
    
    return res.json({ success: true, message: 'Студент удален из класса' });
  } catch (error) {
    console.error('Delete student class error:', error);
    return res.status(500).json({ success: false, message: 'Ошибка удаления' });
  }
}

export async function getAllTeachers(req: Request, res: Response): Promise<Response> {
  const session = req.session as SessionWithUser;
  if (!session.userId || session.userRole !== 'teacher') {
    return res.status(403).json({ success: false, message: 'Доступ запрещен' });
  }

  try {
    const result: QueryResult = await pool.query(
      `SELECT id, name, email, created_at 
       FROM users 
       WHERE role = 'teacher' 
       ORDER BY name`
    );
    return res.json({ success: true, teachers: result.rows });
  } catch (error) {
    console.error('Get teachers error:', error);
    return res.status(500).json({ success: false, message: 'Ошибка получения учителей' });
  }
}

export async function getAllTeacherSubjects(req: Request, res: Response): Promise<Response> {
  const session = req.session as SessionWithUser;
  if (!session.userId || session.userRole !== 'teacher') {
    return res.status(403).json({ success: false, message: 'Доступ запрещен' });
  }

  try {
    const result: QueryResult = await pool.query(
      `SELECT ts.id, ts.teacher_id, ts.subject_id, ts.class_id,
              u.name as teacher_name, s.name as subject_name, c.name as class_name
       FROM teacher_subjects ts
       JOIN users u ON ts.teacher_id = u.id
       JOIN subjects s ON ts.subject_id = s.id
       JOIN classes c ON ts.class_id = c.id
       ORDER BY c.name, s.name`
    );
    return res.json({ success: true, teacher_subjects: result.rows });
  } catch (error) {
    console.error('Get teacher subjects error:', error);
    return res.status(500).json({ success: false, message: 'Ошибка получения данных' });
  }
}

export async function deleteTeacherSubject(req: Request, res: Response): Promise<Response> {
  const session = req.session as SessionWithUser;
  if (!session.userId || session.userRole !== 'teacher') {
    return res.status(403).json({ success: false, message: 'Доступ запрещен' });
  }

  const id = req.params.id;

  try {
    const result: QueryResult = await pool.query(
      'DELETE FROM teacher_subjects WHERE id = $1 RETURNING id',
      [id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Запись не найдена' });
    }
    
    return res.json({ success: true, message: 'Назначение удалено' });
  } catch (error) {
    console.error('Delete teacher subject error:', error);
    return res.status(500).json({ success: false, message: 'Ошибка удаления' });
  }
}

export async function updateClass(req: Request, res: Response): Promise<Response> {
  const session = req.session as SessionWithUser;
  if (!session.userId || session.userRole !== 'teacher') {
    return res.status(403).json({ success: false, message: 'Доступ запрещен' });
  }

  const classId = req.params.id;
  const { name, year } = req.body;

  try {
    const result: QueryResult = await pool.query(
      `UPDATE classes 
       SET name = $1, year = $2 
       WHERE id = $3 
       RETURNING id, name, year, created_at`,
      [name, year, classId]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Класс не найден' });
    }
    
    return res.json({ success: true, class: result.rows[0] });
  } catch (error) {
    console.error('Update class error:', error);
    return res.status(500).json({ success: false, message: 'Ошибка обновления класса' });
  }
}

export async function deleteClass(req: Request, res: Response): Promise<Response> {
  const session = req.session as SessionWithUser;
  if (!session.userId || session.userRole !== 'teacher') {
    return res.status(403).json({ success: false, message: 'Доступ запрещен' });
  }

  const classId = req.params.id;

  try {
    const result: QueryResult = await pool.query(
      'DELETE FROM classes WHERE id = $1 RETURNING id',
      [classId]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Класс не найден' });
    }
    
    return res.json({ success: true, message: 'Класс удален' });
  } catch (error) {
    console.error('Delete class error:', error);
    return res.status(500).json({ success: false, message: 'Ошибка удаления класса' });
  }
}