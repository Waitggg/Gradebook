import { Request, Response } from 'express';
import pool from '../db/pool';
import { QueryResult } from 'pg';

interface SessionWithUser {
  userId?: string;
  userEmail?: string;
  userRole?: 'teacher' | 'student';
  destroy: (callback: (err: Error | null) => void) => void;
}

interface ScheduleBody {
  class_id: number;
  subject_id: number;
  lesson_number: number;
  day_of_week: number;
  room?: string;
}

interface ScheduleChangeBody {
  class_id: number;
  subject_id: number;
  lesson_number: number;
  date: string;
  room?: string;
  change_type?: 'replace' | 'cancel' | 'moved_to' | 'added';
  original_subject_id?: number;
  original_teacher_id?: number;
  notes?: string;
}

export async function getWeekScheduleWithChanges(req: Request, res: Response): Promise<Response> {
  const session = req.session as SessionWithUser;
  if (!session.userId) {
    return res.status(401).json({ success: false, message: 'Не авторизован' });
  }

  const classId = parseInt(req.params.classId);
  const targetDate = req.params.date || new Date().toISOString().split('T')[0];

  try {
    const classInfo = await pool.query(
      'SELECT id, name, year FROM classes WHERE id = $1',
      [classId]
    );

    const lessonTimes = await pool.query(
      'SELECT lesson_number, start_time, end_time FROM lesson_times ORDER BY lesson_number'
    );

    const weekSchedule = [];
    
    for (let dayOfWeek = 1; dayOfWeek <= 6; dayOfWeek++) {
      const regularSchedule = await pool.query(
        `SELECT s.id, s.day_of_week, s.lesson_number, s.room,
                sub.id as subject_id, sub.name as subject_name,
                u.id as teacher_id, u.name as teacher_name,
                c.id as class_id, c.name as class_name
         FROM schedule s
         JOIN subjects sub ON s.subject_id = sub.id
         JOIN users u ON s.teacher_id = u.id
         JOIN classes c ON s.class_id = c.id
         WHERE s.class_id = $1 AND s.day_of_week = $2
         ORDER BY s.lesson_number`,
        [classId, dayOfWeek]
      );

      const dateObj = new Date(targetDate);
      const currentDayOfWeek = dateObj.getDay() === 0 ? 7 : dateObj.getDay();
      const daysDiff = dayOfWeek - currentDayOfWeek;
      const targetDateObj = new Date(dateObj);
      targetDateObj.setDate(dateObj.getDate() + daysDiff);
      const changeDate = targetDateObj.toISOString().split('T')[0];

      const changes = await pool.query(
        `SELECT sc.*,
                sub.name as subject_name,
                u.name as teacher_name,
                orig_sub.name as original_subject_name,
                orig_teacher.name as original_teacher_name
         FROM schedule_changes sc
         LEFT JOIN subjects sub ON sc.subject_id = sub.id
         LEFT JOIN users u ON sc.teacher_id = u.id
         LEFT JOIN subjects orig_sub ON sc.original_subject_id = orig_sub.id
         LEFT JOIN users orig_teacher ON sc.original_teacher_id = orig_teacher.id
         WHERE sc.class_id = $1 AND sc.date = $2::date
         ORDER BY sc.lesson_number`,
        [classId, changeDate]
      );

      const changesMap = new Map();
      changes.rows.forEach((change: any) => {
        changesMap.set(change.lesson_number, change);
      });

      const lessons = [];
      const maxLessonNumber = 12;

      for (let i = 1; i <= maxLessonNumber; i++) {
        const regular = regularSchedule.rows.find((l: any) => l.lesson_number === i);
        const change = changesMap.get(i);

        if (change && change.change_type === 'cancel') {
          lessons.push({
            id: change.id,
            lesson_number: i,
            subject_id: regular?.subject_id || 0,
            subject_name: regular?.subject_name || 'Урок отменен',
            teacher_id: regular?.teacher_id || 0,
            teacher_name: regular?.teacher_name || '',
            room: regular?.room || null,
            is_canceled: true,
            change_type: 'cancel',
            notes: change.notes
          });
        } 
        else if (change && change.change_type === 'replace') {
          lessons.push({
            id: change.id,
            lesson_number: i,
            subject_id: change.subject_id,
            subject_name: change.subject_name || 'Замена',
            teacher_id: change.teacher_id,
            teacher_name: change.teacher_name || 'Учитель',
            room: change.room || regular?.room || null,
            is_changed: true,
            change_type: 'replace',
            original_subject: regular?.subject_name || null,
            original_teacher: regular?.teacher_name || null,
            notes: change.notes
          });
        }
        else if (change && change.change_type === 'added') {
          lessons.push({
            id: change.id,
            lesson_number: i,
            subject_id: change.subject_id,
            subject_name: change.subject_name || 'Дополнительный урок',
            teacher_id: change.teacher_id,
            teacher_name: change.teacher_name || 'Учитель',
            room: change.room || null,
            is_added: true,
            change_type: 'added',
            notes: change.notes
          });
        }
        else if (regular) {
          lessons.push({
            id: regular.id,
            lesson_number: i,
            subject_id: regular.subject_id,
            subject_name: regular.subject_name,
            teacher_id: regular.teacher_id,
            teacher_name: regular.teacher_name,
            room: regular.room,
            is_regular: true
          });
        }
        else {
          lessons.push({
            id: 0,
            lesson_number: i,
            subject_id: 0,
            subject_name: 'Нет урока',
            teacher_id: 0,
            teacher_name: '',
            room: null,
            is_empty: true
          });
        }
      }

      weekSchedule.push({
        day_of_week: dayOfWeek,
        lessons: lessons
      });
    }

    return res.json({ 
      success: true, 
      week_schedule: weekSchedule,
      lesson_times: lessonTimes.rows,
      class_info: classInfo.rows[0],
      date: targetDate
    });
  } catch (error) {
    console.error('Get week schedule error:', error);
    return res.status(500).json({ success: false, message: 'Ошибка получения расписания' });
  }
}

export async function getScheduleWithChanges(req: Request, res: Response): Promise<Response> {
  const session = req.session as SessionWithUser;
  if (!session.userId) {
    return res.status(401).json({ success: false, message: 'Не авторизован' });
  }

  const classId = req.params.classId;
    const targetDate = req.query.date as string || new Date().toISOString().split('T')[0];
    const normalizedDate = new Date(targetDate);
    normalizedDate.setUTCHours(0, 0, 0, 0);
    const dbDateString = normalizedDate.toISOString().split('T')[0];

    const searchDate = targetDate.split('T')[0];
  try {
    const dateObj = new Date(targetDate);
    let dayOfWeek = dateObj.getDay();
    if (dayOfWeek === 0) dayOfWeek = 7;
    
    console.log(`Target date: ${targetDate}, Day of week: ${dayOfWeek}`);

    const regularSchedule = await pool.query(
      `SELECT s.id, s.day_of_week, s.lesson_number, s.room,
              sub.id as subject_id, sub.name as subject_name,
              u.id as teacher_id, u.name as teacher_name,
              c.id as class_id, c.name as class_name
       FROM schedule s
       JOIN subjects sub ON s.subject_id = sub.id
       JOIN users u ON s.teacher_id = u.id
       JOIN classes c ON s.class_id = c.id
       WHERE s.class_id = $1 AND s.day_of_week = $2
       ORDER BY s.lesson_number`,
      [classId, dayOfWeek]
    );

    console.log(`Found ${regularSchedule.rows.length} regular lessons`);

    const changes = await pool.query(
      `SELECT sc.*,
              sub.name as subject_name,
              u.name as teacher_name,
              orig_sub.name as original_subject_name,
              orig_teacher.name as original_teacher_name
       FROM schedule_changes sc
       LEFT JOIN subjects sub ON sc.subject_id = sub.id
       LEFT JOIN users u ON sc.teacher_id = u.id
       LEFT JOIN subjects orig_sub ON sc.original_subject_id = orig_sub.id
       LEFT JOIN users orig_teacher ON sc.original_teacher_id = orig_teacher.id
       WHERE sc.class_id = $1 AND sc.date = $2
       ORDER BY sc.lesson_number`,
      [classId, searchDate]
    );

    console.log(`Found ${changes.rows.length} changes`);

    const lessonTimes = await pool.query(
      'SELECT lesson_number, start_time, end_time FROM lesson_times ORDER BY lesson_number'
    );

    const classInfo = await pool.query(
      'SELECT id, name, year FROM classes WHERE id = $1',
      [classId]
    );

    const regularMap = new Map();
    regularSchedule.rows.forEach((lesson: any) => {
      regularMap.set(lesson.lesson_number, lesson);
    });

    const changesMap = new Map();
    changes.rows.forEach((change: any) => {
      changesMap.set(change.lesson_number, change);
    });

    const finalSchedule = [];
    const maxLessonNumber = 12;

    for (let i = 1; i <= maxLessonNumber; i++) {
      const regular = regularMap.get(i);
      const change = changesMap.get(i);

      if (change && change.change_type === 'cancel') {
        finalSchedule.push({
          id: change.id,
          day_of_week: dayOfWeek,
          lesson_number: i,
          subject_id: regular?.subject_id || 0,
          subject_name: regular?.subject_name || 'Урок отменен',
          teacher_id: regular?.teacher_id || 0,
          teacher_name: regular?.teacher_name || '',
          class_id: parseInt(classId),
          class_name: classInfo.rows[0]?.name || '',
          room: regular?.room || null,
          is_canceled: true,
          change_type: 'cancel',
          notes: change.notes
        });
      } 
      else if (change && change.change_type === 'replace') {
        finalSchedule.push({
          id: change.id,
          day_of_week: dayOfWeek,
          lesson_number: i,
          subject_id: change.subject_id,
          subject_name: change.subject_name || 'Замена',
          teacher_id: change.teacher_id,
          teacher_name: change.teacher_name || 'Учитель',
          class_id: parseInt(classId),
          class_name: classInfo.rows[0]?.name || '',
          room: change.room || regular?.room || null,
          is_changed: true,
          change_type: 'replace',
          original_subject: regular?.subject_name || null,
          original_teacher: regular?.teacher_name || null,
          notes: change.notes
        });
      }
      else if (change && change.change_type === 'added') {
        finalSchedule.push({
          id: change.id,
          day_of_week: dayOfWeek,
          lesson_number: i,
          subject_id: change.subject_id,
          subject_name: change.subject_name || 'Дополнительный урок',
          teacher_id: change.teacher_id,
          teacher_name: change.teacher_name || 'Учитель',
          class_id: parseInt(classId),
          class_name: classInfo.rows[0]?.name || '',
          room: change.room || null,
          is_added: true,
          change_type: 'added',
          notes: change.notes
        });
      }
      else if (regular) {
        finalSchedule.push({
          id: regular.id,
          day_of_week: dayOfWeek,
          lesson_number: i,
          subject_id: regular.subject_id,
          subject_name: regular.subject_name,
          teacher_id: regular.teacher_id,
          teacher_name: regular.teacher_name,
          class_id: regular.class_id,
          class_name: regular.class_name,
          room: regular.room,
          is_regular: true
        });
      }
      else {
        finalSchedule.push({
          id: 0,
          day_of_week: dayOfWeek,
          lesson_number: i,
          subject_id: 0,
          subject_name: 'Нет урока',
          teacher_id: 0,
          teacher_name: '',
          class_id: parseInt(classId),
          class_name: classInfo.rows[0]?.name || '',
          room: null,
          is_empty: true
        });
      }
    }

    console.log(`Final schedule has ${finalSchedule.length} items`);

    return res.json({ 
      success: true, 
      schedule: finalSchedule,
      lesson_times: lessonTimes.rows,
      class_info: classInfo.rows[0],
      date: targetDate.split('T')[0],
      day_of_week: dayOfWeek
    });
  } catch (error) {
    console.error('Get schedule with changes error:', error);
    return res.status(500).json({ success: false, message: 'Ошибка получения расписания' });
  }
}
export async function createScheduleChange(req: Request, res: Response): Promise<Response> {
  const session = req.session as SessionWithUser;
  if (!session.userId || session.userRole !== 'teacher') {
    return res.status(403).json({ success: false, message: 'Доступ запрещен' });
  }

  const { class_id, subject_id, lesson_number, date, room, change_type, notes } = req.body;
  const normalizedDate = typeof date === 'string' ? date.split('T')[0] : date;

  if (!class_id || !lesson_number || !normalizedDate) {
    return res.status(400).json({ 
      success: false, 
      message: 'Необходимо указать class_id, lesson_number и date' 
    });
  }

  if (change_type !== 'cancel' && !subject_id) {
    return res.status(400).json({ 
      success: false, 
      message: 'Для замены или добавления урока необходимо указать subject_id' 
    });
  }

  try {
    const existing = await pool.query(
      'SELECT id FROM schedule_changes WHERE class_id = $1 AND date = $2::date AND lesson_number = $3',
      [class_id, normalizedDate, lesson_number]
    );

    let result: QueryResult;
    
    if (existing.rows.length > 0) {
      if (change_type === 'cancel') {
        result = await pool.query(
          `UPDATE schedule_changes 
           SET change_type = $1, notes = $2, updated_at = CURRENT_TIMESTAMP
           WHERE class_id = $3 AND date = $4::date AND lesson_number = $5
           RETURNING *`,
          [change_type, notes || null, class_id, normalizedDate, lesson_number]
        );
      } else {
        result = await pool.query(
          `UPDATE schedule_changes 
           SET subject_id = $1, room = $2, change_type = $3, notes = $4, teacher_id = $5, updated_at = CURRENT_TIMESTAMP
           WHERE class_id = $6 AND date = $7::date AND lesson_number = $8
           RETURNING *`,
          [subject_id, room || null, change_type, notes || null, session.userId, class_id, normalizedDate, lesson_number]
        );
      }
    } else {
      if (change_type === 'cancel') {
        result = await pool.query(
          `INSERT INTO schedule_changes (class_id, lesson_number, date, change_type, notes) 
           VALUES ($1, $2, $3::date, $4, $5) 
           RETURNING *`,
          [class_id, lesson_number, normalizedDate, change_type, notes || null]
        );
      } else {
        result = await pool.query(
          `INSERT INTO schedule_changes (class_id, subject_id, teacher_id, lesson_number, date, room, change_type, notes) 
           VALUES ($1, $2, $3, $4, $5::date, $6, $7, $8) 
           RETURNING *`,
          [class_id, subject_id, session.userId, lesson_number, normalizedDate, room || null, change_type, notes || null]
        );
      }
    }
    
    return res.status(201).json({ success: true, change: result.rows[0] });
  } catch (error) {
    console.error('Create schedule change error:', error);
    return res.status(500).json({ success: false, message: 'Ошибка создания изменения' });
  }
}
export async function deleteScheduleChange(req: Request, res: Response): Promise<Response> {
  const session = req.session as SessionWithUser;
  if (!session.userId || session.userRole !== 'teacher') {
    return res.status(403).json({ success: false, message: 'Доступ запрещен' });
  }

  const changeId = req.params.id;

  try {
    const result: QueryResult = await pool.query(
      'DELETE FROM schedule_changes WHERE id = $1 RETURNING id',
      [changeId]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Изменение не найдено' });
    }
    
    return res.json({ success: true, message: 'Изменение удалено' });
  } catch (error) {
    console.error('Delete schedule change error:', error);
    return res.status(500).json({ success: false, message: 'Ошибка удаления' });
  }
}

  export async function getScheduleChangesForDate(req: Request, res: Response): Promise<Response> {
    const session = req.session as SessionWithUser;
    if (!session.userId) {
      return res.status(401).json({ success: false, message: 'Не авторизован' });
    }

    const classId = req.params.classId;
    const date = req.params.date;

    try {
      const result: QueryResult = await pool.query(
        `SELECT sc.*,
                sub.name as subject_name,
                u.name as teacher_name
        FROM schedule_changes sc
        LEFT JOIN subjects sub ON sc.subject_id = sub.id
        LEFT JOIN users u ON sc.teacher_id = u.id
        WHERE sc.class_id = $1 AND sc.date = $2
        ORDER BY sc.lesson_number`,
        [classId, date]
      );
      
      return res.json({ success: true, changes: result.rows });
    } catch (error) {
      console.error('Get schedule changes error:', error);
      return res.status(500).json({ success: false, message: 'Ошибка получения изменений' });
    }
}

export async function copyScheduleToDate(req: Request, res: Response): Promise<Response> {
  const session = req.session as SessionWithUser;
  if (!session.userId || session.userRole !== 'teacher') {
    return res.status(403).json({ success: false, message: 'Доступ запрещен' });
  }

  const { class_id, source_date, target_date } = req.body;

  if (!class_id || !source_date || !target_date) {
    return res.status(400).json({ 
      success: false, 
      message: 'Необходимо указать class_id, source_date и target_date' 
    });
  }

  try {
    const sourceChanges = await pool.query(
      'SELECT * FROM schedule_changes WHERE class_id = $1 AND date = $2',
      [class_id, source_date]
    );

    for (const change of sourceChanges.rows) {
      await pool.query(
        `INSERT INTO schedule_changes (class_id, subject_id, teacher_id, lesson_number, date, room, change_type, original_subject_id, original_teacher_id, notes) 
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
         ON CONFLICT (class_id, date, lesson_number) 
         DO UPDATE SET subject_id = EXCLUDED.subject_id, teacher_id = EXCLUDED.teacher_id, 
                       room = EXCLUDED.room, change_type = EXCLUDED.change_type,
                       original_subject_id = EXCLUDED.original_subject_id,
                       original_teacher_id = EXCLUDED.original_teacher_id,
                       notes = EXCLUDED.notes`,
        [change.class_id, change.subject_id, change.teacher_id, change.lesson_number, 
         target_date, change.room, change.change_type, change.original_subject_id, 
         change.original_teacher_id, change.notes]
      );
    }
    
    return res.json({ success: true, message: `Скопировано ${sourceChanges.rows.length} изменений` });
  } catch (error) {
    console.error('Copy schedule error:', error);
    return res.status(500).json({ success: false, message: 'Ошибка копирования расписания' });
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

export async function getAllClassesSchedule(req: Request, res: Response): Promise<Response> {
  const session = req.session as SessionWithUser;
  if (!session.userId) {
    return res.status(401).json({ success: false, message: 'Не авторизован' });
  }

  try {
    const result: QueryResult = await pool.query(
      `SELECT DISTINCT c.id, c.name, c.year
       FROM classes c
       ORDER BY c.name`
    );
    return res.json({ success: true, classes: result.rows });
  } catch (error) {
    console.error('Get all classes error:', error);
    return res.status(500).json({ success: false, message: 'Ошибка получения классов' });
  }
}

export async function getAllSubjectsForTeacher(req: Request, res: Response): Promise<Response> {
  const session = req.session as SessionWithUser;
  if (!session.userId || session.userRole !== 'teacher') {
    return res.status(403).json({ success: false, message: 'Доступ запрещен' });
  }

  try {
    const result: QueryResult = await pool.query(
      'SELECT id, name, description FROM subjects ORDER BY name'
    );
    return res.json({ success: true, subjects: result.rows });
  } catch (error) {
    console.error('Get all subjects error:', error);
    return res.status(500).json({ success: false, message: 'Ошибка получения предметов' });
  }
}

export async function getAllClassesForTeacher(req: Request, res: Response): Promise<Response> {
  const session = req.session as SessionWithUser;
  if (!session.userId || session.userRole !== 'teacher') {
    return res.status(403).json({ success: false, message: 'Доступ запрещен' });
  }

  try {
    const result: QueryResult = await pool.query(
      'SELECT id, name, year FROM classes ORDER BY year DESC, name'
    );
    return res.json({ success: true, classes: result.rows });
  } catch (error) {
    console.error('Get all classes error:', error);
    return res.status(500).json({ success: false, message: 'Ошибка получения классов' });
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
export async function createScheduleItem(req: Request<{}, {}, ScheduleBody>, res: Response): Promise<Response> {
  const session = req.session as SessionWithUser;
  if (!session.userId || session.userRole !== 'teacher') {
    return res.status(403).json({ success: false, message: 'Доступ запрещен' });
  }

  const { class_id, subject_id, lesson_number, day_of_week, room } = req.body;

  if (!class_id || !subject_id || !lesson_number || !day_of_week) {
    return res.status(400).json({ 
      success: false, 
      message: 'Все поля обязательны' 
    });
  }

  try {
    const result: QueryResult = await pool.query(
      `INSERT INTO schedule (class_id, subject_id, teacher_id, lesson_number, day_of_week, room) 
       VALUES ($1, $2, $3, $4, $5, $6) 
       ON CONFLICT (class_id, day_of_week, lesson_number) 
       DO UPDATE SET subject_id = $2, teacher_id = $3, room = $6
       RETURNING *`,
      [class_id, subject_id, session.userId, lesson_number, day_of_week, room || null]
    );
    
    return res.status(201).json({ success: true, schedule: result.rows[0] });
  } catch (error) {
    console.error('Create schedule error:', error);
    return res.status(500).json({ success: false, message: 'Ошибка создания расписания' });
  }
}

export async function updateScheduleItem(req: Request, res: Response): Promise<Response> {
  const session = req.session as SessionWithUser;
  if (!session.userId || session.userRole !== 'teacher') {
    return res.status(403).json({ success: false, message: 'Доступ запрещен' });
  }

  const scheduleId = req.params.id;
  const { subject_id, lesson_number, day_of_week, room } = req.body;

  try {
    const result: QueryResult = await pool.query(
      `UPDATE schedule 
       SET subject_id = $1, lesson_number = $2, day_of_week = $3, room = $4
       WHERE id = $5
       RETURNING *`,
      [subject_id, lesson_number, day_of_week, room, scheduleId]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Запись не найдена' });
    }
    
    return res.json({ success: true, schedule: result.rows[0] });
  } catch (error) {
    console.error('Update schedule error:', error);
    return res.status(500).json({ success: false, message: 'Ошибка обновления расписания' });
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

export async function getAvailableSubjects(req: Request, res: Response): Promise<Response> {
  const session = req.session as SessionWithUser;
  if (!session.userId) {
    return res.status(401).json({ success: false, message: 'Не авторизован' });
  }

  try {
    const result: QueryResult = await pool.query(
      'SELECT id, name FROM subjects ORDER BY name'
    );
    return res.json({ success: true, subjects: result.rows });
  } catch (error) {
    console.error('Get subjects error:', error);
    return res.status(500).json({ success: false, message: 'Ошибка получения предметов' });
  }
}

export async function getLessonTimes(req: Request, res: Response): Promise<Response> {
  const session = req.session as SessionWithUser;
  if (!session.userId) {
    return res.status(401).json({ success: false, message: 'Не авторизован' });
  }

  try {
    const result: QueryResult = await pool.query(
      'SELECT lesson_number, start_time, end_time FROM lesson_times ORDER BY lesson_number'
    );
    return res.json({ success: true, lesson_times: result.rows });
  } catch (error) {
    console.error('Get lesson times error:', error);
    return res.status(500).json({ success: false, message: 'Ошибка получения времени уроков' });
  }
}