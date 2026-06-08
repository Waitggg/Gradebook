import { Request, Response } from 'express';
import { BaseController } from './base_controller';
import { BaseService } from '../services/base_service';

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
  teacher_id: number;
  lesson_number: number;
  date: string;
  room?: string;
  change_type?: 'replace' | 'cancel' | 'moved_to' | 'added';
  original_subject_id?: number;
  original_teacher_id?: number;
  notes?: string;
}

class ScheduleService extends BaseService {
  async getClassInfo(classId: number): Promise<any> {
    return this.single('SELECT id, name, year FROM classes WHERE id = $1', [classId]);
  }

  async getLessonTimes(): Promise<any[]> {
    return this.query('SELECT lesson_number, start_time, end_time FROM lesson_times ORDER BY lesson_number');
  }

  async getRegularSchedule(classId: number, dayOfWeek: number): Promise<any[]> {
    return this.query(
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
  }

  async getScheduleChanges(classId: number, date: string): Promise<any[]> {
    return this.query(
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
      [classId, date]
    );
  }

  async getScheduleChangesByDate(classId: number, date: string): Promise<any[]> {
    return this.query(
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
  }

  async upsertScheduleChange(data: any, teacherId: string, normalizedDate: string): Promise<any> {
    const existing = await this.single(
      'SELECT id FROM schedule_changes WHERE class_id = $1 AND date = $2::date AND lesson_number = $3',
      [data.class_id, normalizedDate, data.lesson_number]
    );

    if (existing) {
      if (data.change_type === 'cancel') {
        return this.single(
          `UPDATE schedule_changes 
           SET change_type = $1, notes = $2, updated_at = CURRENT_TIMESTAMP
           WHERE class_id = $3 AND date = $4::date AND lesson_number = $5
           RETURNING *`,
          [data.change_type, data.notes || null, data.class_id, normalizedDate, data.lesson_number]
        );
      } else {
        return this.single(
          `UPDATE schedule_changes 
           SET subject_id = $1, room = $2, change_type = $3, notes = $4, teacher_id = $5, updated_at = CURRENT_TIMESTAMP
           WHERE class_id = $6 AND date = $7::date AND lesson_number = $8
           RETURNING *`,
          [data.subject_id, data.room || null, data.change_type, data.notes || null, teacherId, 
           data.class_id, normalizedDate, data.lesson_number]
        );
      }
    } else {
      if (data.change_type === 'cancel') {
        return this.single(
          `INSERT INTO schedule_changes (class_id, lesson_number, date, change_type, notes) 
           VALUES ($1, $2, $3::date, $4, $5) 
           RETURNING *`,
          [data.class_id, data.lesson_number, normalizedDate, data.change_type, data.notes || null]
        );
      } else {
        return this.single(
          `INSERT INTO schedule_changes (class_id, subject_id, teacher_id, lesson_number, date, room, change_type, notes) 
           VALUES ($1, $2, $3, $4, $5::date, $6, $7, $8) 
           RETURNING *`,
          [data.class_id, data.subject_id, teacherId, data.lesson_number, normalizedDate, 
           data.room || null, data.change_type, data.notes || null]
        );
      }
    }
  }

  async deleteScheduleChange(changeId: string): Promise<boolean> {
    const result = await this.mutation('DELETE FROM schedule_changes WHERE id = $1 RETURNING id', [changeId]);
    return (result.rowCount ?? 0) > 0;
  }

async copyScheduleChanges(classId: number, sourceDate: string, targetDate: string): Promise<number> {
  const sourceChanges = await this.query<ScheduleChangeBody>(
    'SELECT * FROM schedule_changes WHERE class_id = $1 AND date = $2',
    [classId, sourceDate]
  );
  
  for (const change of sourceChanges) {
    await this.mutation(
      `INSERT INTO schedule_changes (class_id, subject_id, teacher_id, lesson_number, date, room, change_type, original_subject_id, original_teacher_id, notes) 
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
       ON CONFLICT (class_id, date, lesson_number) 
       DO UPDATE SET subject_id = EXCLUDED.subject_id, teacher_id = EXCLUDED.teacher_id, 
                     room = EXCLUDED.room, change_type = EXCLUDED.change_type,
                     original_subject_id = EXCLUDED.original_subject_id,
                     original_teacher_id = EXCLUDED.original_teacher_id,
                     notes = EXCLUDED.notes`,
      [
        change.class_id, 
        change.subject_id ?? null, 
        change.teacher_id ?? null, 
        change.lesson_number, 
        targetDate, 
        change.room ?? null, 
        change.change_type, 
        change.original_subject_id ?? null, 
        change.original_teacher_id ?? null, 
        change.notes ?? null
      ]
    );
  }
  return sourceChanges.length;
}

  async getAllClasses(): Promise<any[]> {
    return this.query('SELECT DISTINCT c.id, c.name, c.year FROM classes c ORDER BY c.name');
  }

  async getAllSubjects(): Promise<any[]> {
    return this.query('SELECT id, name, description FROM subjects ORDER BY name');
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

  async createScheduleItem(data: any, teacherId: string): Promise<any> {
    return this.single(
      `INSERT INTO schedule (class_id, subject_id, teacher_id, lesson_number, day_of_week, room) 
       VALUES ($1, $2, $3, $4, $5, $6) 
       ON CONFLICT (class_id, day_of_week, lesson_number) 
       DO UPDATE SET subject_id = $2, teacher_id = $3, room = $6
       RETURNING *`,
      [data.class_id, data.subject_id, teacherId, data.lesson_number, data.day_of_week, data.room || null]
    );
  }

  async updateScheduleItem(scheduleId: string, data: any): Promise<any> {
    return this.single(
      `UPDATE schedule 
       SET subject_id = $1, lesson_number = $2, day_of_week = $3, room = $4
       WHERE id = $5
       RETURNING *`,
      [data.subject_id, data.lesson_number, data.day_of_week, data.room, scheduleId]
    );
  }

  async deleteScheduleItem(scheduleId: string): Promise<boolean> {
    const result = await this.mutation('DELETE FROM schedule WHERE id = $1 RETURNING id', [scheduleId]);
    return (result.rowCount ?? 0) > 0;
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

  async getAvailableSubjects(): Promise<any[]> {
    return this.query('SELECT id, name FROM subjects ORDER BY name');
  }
}

class ScheduleController extends BaseController {
  private service: ScheduleService;

  constructor() {
    super();
    this.service = new ScheduleService();
  }

  async getWeekScheduleWithChanges(req: Request, res: Response): Promise<Response> {
    const auth = this.checkAuth(req);
    if (!auth.success) return this.error(res, auth.message!, 401);

    const classId = parseInt(req.params.classId);
    const targetDate = req.params.date || new Date().toISOString().split('T')[0];

    const classInfo = await this.service.getClassInfo(classId);
    const lessonTimes = await this.service.getLessonTimes();

    const weekSchedule = [];
    
    for (let dayOfWeek = 1; dayOfWeek <= 6; dayOfWeek++) {
      const regularSchedule = await this.service.getRegularSchedule(classId, dayOfWeek);

      const dateObj = new Date(targetDate);
      const currentDayOfWeek = dateObj.getDay() === 0 ? 7 : dateObj.getDay();
      const daysDiff = dayOfWeek - currentDayOfWeek;
      const targetDateObj = new Date(dateObj);
      targetDateObj.setDate(dateObj.getDate() + daysDiff);
      const changeDate = targetDateObj.toISOString().split('T')[0];

      const changes = await this.service.getScheduleChanges(classId, changeDate);
      const changesMap = new Map();
      changes.forEach((change: any) => {
        changesMap.set(change.lesson_number, change);
      });

      const lessons = [];
      const maxLessonNumber = 12;

      for (let i = 1; i <= maxLessonNumber; i++) {
        const regular = regularSchedule.find((l: any) => l.lesson_number === i);
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

    return this.success(res, {
      week_schedule: weekSchedule,
      lesson_times: lessonTimes,
      class_info: classInfo,
      date: targetDate
    });
  }

  async getScheduleWithChanges(req: Request, res: Response): Promise<Response> {
    const auth = this.checkAuth(req);
    if (!auth.success) return this.error(res, auth.message!, 401);

    const classId = req.params.classId;
    const targetDate = (req.query.date as string) || new Date().toISOString().split('T')[0];
    const searchDate = targetDate.split('T')[0];

    const dateObj = new Date(targetDate);
    let dayOfWeek = dateObj.getDay();
    if (dayOfWeek === 0) dayOfWeek = 7;

    const regularSchedule = await this.service.getRegularSchedule(parseInt(classId), dayOfWeek);
    const changes = await this.service.getScheduleChanges(parseInt(classId), searchDate);
    const lessonTimes = await this.service.getLessonTimes();
    const classInfo = await this.service.getClassInfo(parseInt(classId));

    const regularMap = new Map();
    regularSchedule.forEach((lesson: any) => {
      regularMap.set(lesson.lesson_number, lesson);
    });

    const changesMap = new Map();
    changes.forEach((change: any) => {
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
          class_name: classInfo?.name || '',
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
          class_name: classInfo?.name || '',
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
          class_name: classInfo?.name || '',
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
          class_name: classInfo?.name || '',
          room: null,
          is_empty: true
        });
      }
    }

    return this.success(res, {
      schedule: finalSchedule,
      lesson_times: lessonTimes,
      class_info: classInfo,
      date: searchDate,
      day_of_week: dayOfWeek
    });
  }

  async createScheduleChange(req: Request, res: Response): Promise<Response> {
      const auth = this.checkAuth(req);
      if (!auth.success) return this.error(res, auth.message!, 401);

      const teacherCheck = this.checkTeacher(req);
      if (!teacherCheck.success) return this.error(res, teacherCheck.message!, 403);

      const { class_id, subject_id, lesson_number, date, room, change_type, lesson_type, notes } = req.body;
      const normalizedDate = typeof date === 'string' ? date.split('T')[0] : date;

      if (!class_id || !lesson_number || !normalizedDate) {
        return this.error(res, 'Необходимо указать class_id, lesson_number и date', 400);
      }

      if (change_type !== 'cancel' && !subject_id) {
        return this.error(res, 'Для замены или добавления урока необходимо указать subject_id', 400);
      }

      const finalLessonType = lesson_type || 'lecture';

      const change = await this.service.upsertScheduleChange(
        { class_id, subject_id, lesson_number, room, change_type, lesson_type: finalLessonType, notes },
        auth.userId!,
        normalizedDate
      );

      return this.success(res, { change }, 201);
  }
  
  async deleteScheduleChange(req: Request, res: Response): Promise<Response> {
    const auth = this.checkAuth(req);
    if (!auth.success) return this.error(res, auth.message!, 401);

    const teacherCheck = this.checkTeacher(req);
    if (!teacherCheck.success) return this.error(res, teacherCheck.message!, 403);

    const changeId = req.params.id;
    const deleted = await this.service.deleteScheduleChange(changeId);
    if (!deleted) return this.error(res, 'Изменение не найдено', 404);

    return this.success(res, { message: 'Изменение удалено' });
  }

  async getScheduleChangesForDate(req: Request, res: Response): Promise<Response> {
    const auth = this.checkAuth(req);
    if (!auth.success) return this.error(res, auth.message!, 401);

    const classId = parseInt(req.params.classId);
    const date = req.params.date;

    const changes = await this.service.getScheduleChangesByDate(classId, date);
    return this.success(res, { changes });
  }

  async copyScheduleToDate(req: Request, res: Response): Promise<Response> {
    const auth = this.checkAuth(req);
    if (!auth.success) return this.error(res, auth.message!, 401);

    const teacherCheck = this.checkTeacher(req);
    if (!teacherCheck.success) return this.error(res, teacherCheck.message!, 403);

    const { class_id, source_date, target_date } = req.body;

    if (!class_id || !source_date || !target_date) {
      return this.error(res, 'Необходимо указать class_id, source_date и target_date', 400);
    }

    const count = await this.service.copyScheduleChanges(class_id, source_date, target_date);
    return this.success(res, { message: `Скопировано ${count} изменений` });
  }

  async getAllClassesSchedule(req: Request, res: Response): Promise<Response> {
    const auth = this.checkAuth(req);
    if (!auth.success) return this.error(res, auth.message!, 401);

    const classes = await this.service.getAllClasses();
    return this.success(res, { classes });
  }

  async getAllSubjectsForTeacher(req: Request, res: Response): Promise<Response> {
    const auth = this.checkAuth(req);
    if (!auth.success) return this.error(res, auth.message!, 401);

    const teacherCheck = this.checkTeacher(req);
    if (!teacherCheck.success) return this.error(res, teacherCheck.message!, 403);

    const subjects = await this.service.getAllSubjects();
    return this.success(res, { subjects });
  }

  async getAllClassesForTeacher(req: Request, res: Response): Promise<Response> {
    const auth = this.checkAuth(req);
    if (!auth.success) return this.error(res, auth.message!, 401);

    const teacherCheck = this.checkTeacher(req);
    if (!teacherCheck.success) return this.error(res, teacherCheck.message!, 403);

    const classes = await this.service.getAllClasses();
    return this.success(res, { classes });
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

  async createScheduleItem(req: Request<{}, {}, ScheduleBody>, res: Response): Promise<Response> {
    const auth = this.checkAuth(req);
    if (!auth.success) return this.error(res, auth.message!, 401);

    const teacherCheck = this.checkTeacher(req);
    if (!teacherCheck.success) return this.error(res, teacherCheck.message!, 403);

    const { class_id, subject_id, lesson_number, day_of_week, room } = req.body;

    if (!class_id || !subject_id || !lesson_number || !day_of_week) {
      return this.error(res, 'Все поля обязательны', 400);
    }

    const schedule = await this.service.createScheduleItem(
      { class_id, subject_id, lesson_number, day_of_week, room },
      auth.userId!
    );

    return this.success(res, { schedule }, 201);
  }

  async updateScheduleItem(req: Request, res: Response): Promise<Response> {
    const auth = this.checkAuth(req);
    if (!auth.success) return this.error(res, auth.message!, 401);

    const teacherCheck = this.checkTeacher(req);
    if (!teacherCheck.success) return this.error(res, teacherCheck.message!, 403);

    const scheduleId = req.params.id;
    const { subject_id, lesson_number, day_of_week, room } = req.body;

    const schedule = await this.service.updateScheduleItem(scheduleId, { subject_id, lesson_number, day_of_week, room });
    if (!schedule) return this.error(res, 'Запись не найдена', 404);

    return this.success(res, { schedule });
  }

  async deleteScheduleItem(req: Request, res: Response): Promise<Response> {
    const auth = this.checkAuth(req);
    if (!auth.success) return this.error(res, auth.message!, 401);

    const teacherCheck = this.checkTeacher(req);
    if (!teacherCheck.success) return this.error(res, teacherCheck.message!, 403);

    const scheduleId = req.params.id;
    const deleted = await this.service.deleteScheduleItem(scheduleId);
    if (!deleted) return this.error(res, 'Запись не найдена', 404);

    return this.success(res, { message: 'Запись удалена' });
  }

  async getClassSchedule(req: Request, res: Response): Promise<Response> {
    const auth = this.checkAuth(req);
    if (!auth.success) return this.error(res, auth.message!, 401);

    const classId = req.params.classId;
    const schedule = await this.service.getClassSchedule(classId);
    const lessonTimes = await this.service.getLessonTimes();

    return this.success(res, { schedule, lesson_times: lessonTimes });
  }

  async getAvailableSubjects(req: Request, res: Response): Promise<Response> {
    const auth = this.checkAuth(req);
    if (!auth.success) return this.error(res, auth.message!, 401);

    const subjects = await this.service.getAvailableSubjects();
    return this.success(res, { subjects });
  }

  async getLessonTimes(req: Request, res: Response): Promise<Response> {
    const auth = this.checkAuth(req);
    if (!auth.success) return this.error(res, auth.message!, 401);

    const lessonTimes = await this.service.getLessonTimes();
    return this.success(res, { lesson_times: lessonTimes });
  }
}

const scheduleController = new ScheduleController();

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

export const getWeekScheduleWithChanges = wrap(scheduleController.getWeekScheduleWithChanges.bind(scheduleController));
export const getScheduleWithChanges = wrap(scheduleController.getScheduleWithChanges.bind(scheduleController));
export const createScheduleChange = wrap(scheduleController.createScheduleChange.bind(scheduleController));
export const deleteScheduleChange = wrap(scheduleController.deleteScheduleChange.bind(scheduleController));
export const getScheduleChangesForDate = wrap(scheduleController.getScheduleChangesForDate.bind(scheduleController));
export const copyScheduleToDate = wrap(scheduleController.copyScheduleToDate.bind(scheduleController));
export const getAllClassesSchedule = wrap(scheduleController.getAllClassesSchedule.bind(scheduleController));
export const getAllSubjectsForTeacher = wrap(scheduleController.getAllSubjectsForTeacher.bind(scheduleController));
export const getAllClassesForTeacher = wrap(scheduleController.getAllClassesForTeacher.bind(scheduleController));
export const getTeacherSchedule = wrap(scheduleController.getTeacherSchedule.bind(scheduleController));
export const createScheduleItem = wrap(scheduleController.createScheduleItem.bind(scheduleController));
export const updateScheduleItem = wrap(scheduleController.updateScheduleItem.bind(scheduleController));
export const deleteScheduleItem = wrap(scheduleController.deleteScheduleItem.bind(scheduleController));
export const getClassSchedule = wrap(scheduleController.getClassSchedule.bind(scheduleController));
export const getAvailableSubjects = wrap(scheduleController.getAvailableSubjects.bind(scheduleController));
export const getLessonTimes = wrap(scheduleController.getLessonTimes.bind(scheduleController));