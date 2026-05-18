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

interface LessonTime {
  id: number;
  lesson_number: number;
  start_time: string;
  end_time: string;
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

    // Получаем время уроков
    const lessonTimesResult: QueryResult = await pool.query(
      'SELECT lesson_number, start_time, end_time FROM lesson_times ORDER BY lesson_number'
    );

    return res.json({ 
      success: true, 
      schedule: scheduleResult.rows,
      lesson_times: lessonTimesResult.rows
    });
  } catch (error) {
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