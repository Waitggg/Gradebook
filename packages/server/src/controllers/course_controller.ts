import { Request, Response } from 'express';
import pool from '../db/pool';
import { QueryResult } from 'pg';
import {
  CreateProgramDTO,
  CreateLessonDTO,
  CreateMaterialDTO,
  CreateTeamDTO,
  AddTeamMemberDTO
} from '../types/course_types';

interface SessionWithUser {
  userId?: string;
  userRole?: 'teacher' | 'student';
}
export async function getCourseProgram(req: Request, res: Response): Promise<Response> {
  const session = req.session as SessionWithUser;
  if (!session.userId) {
    return res.status(401).json({ success: false, message: 'Не авторизован' });
  }

  const { subjectId, classId } = req.params;

  try {
    const result: QueryResult = await pool.query(
      `SELECT cp.*, s.name as subject_name, c.name as class_name
       FROM course_programs cp
       JOIN subjects s ON cp.subject_id = s.id
       JOIN classes c ON cp.class_id = c.id
       WHERE cp.subject_id = $1 AND cp.class_id = $2`,
      [subjectId, classId]
    );

    if (result.rows.length === 0) {
      return res.json({ success: true, program: null });
    }

    return res.json({ success: true, program: result.rows[0] });
  } catch (error) {
    console.error('Get course program error:', error);
    return res.status(500).json({ success: false, message: 'Ошибка получения программы' });
  }
}

export async function createOrUpdateProgram(req: Request, res: Response): Promise<Response> {
  const session = req.session as SessionWithUser;
  if (!session.userId || session.userRole !== 'teacher') {
    return res.status(403).json({ success: false, message: 'Доступ запрещен' });
  }

  const { subject_id, class_id, total_hours, description }: CreateProgramDTO = req.body;

  if (!subject_id || !class_id) {
    return res.status(400).json({ success: false, message: 'subject_id и class_id обязательны' });
  }

  try {
    const existing = await pool.query(
      'SELECT id FROM course_programs WHERE subject_id = $1 AND class_id = $2',
      [subject_id, class_id]
    );

    let result: QueryResult;
    if (existing.rows.length > 0) {
      result = await pool.query(
        `UPDATE course_programs 
         SET total_hours = $1, description = $2, updated_at = CURRENT_TIMESTAMP
         WHERE subject_id = $3 AND class_id = $4
         RETURNING *`,
        [total_hours || 0, description || null, subject_id, class_id]
      );
    } else {
      result = await pool.query(
        `INSERT INTO course_programs (subject_id, class_id, total_hours, description)
         VALUES ($1, $2, $3, $4)
         RETURNING *`,
        [subject_id, class_id, total_hours || 0, description || null]
      );
    }

    return res.json({ success: true, program: result.rows[0] });
  } catch (error) {
    console.error('Create/update program error:', error);
    return res.status(500).json({ success: false, message: 'Ошибка сохранения программы' });
  }
}

export async function deleteProgram(req: Request, res: Response): Promise<Response> {
  const session = req.session as SessionWithUser;
  if (!session.userId || session.userRole !== 'teacher') {
    return res.status(403).json({ success: false, message: 'Доступ запрещен' });
  }

  const programId = req.params.id;

  try {
    await pool.query('DELETE FROM course_programs WHERE id = $1', [programId]);
    return res.json({ success: true, message: 'Программа удалена' });
  } catch (error) {
    console.error('Delete program error:', error);
    return res.status(500).json({ success: false, message: 'Ошибка удаления программы' });
  }
}

export async function getProgramLessons(req: Request, res: Response): Promise<Response> {
  const session = req.session as SessionWithUser;
  if (!session.userId) {
    return res.status(401).json({ success: false, message: 'Не авторизован' });
  }

  const programId = req.params.programId;

  try {
    const lessons: QueryResult = await pool.query(
      `SELECT * FROM course_lessons 
       WHERE course_program_id = $1 
       ORDER BY lesson_number`,
      [programId]
    );

    const lessonsWithDetails = await Promise.all(
      lessons.rows.map(async (lesson) => {
        const materials = await pool.query(
          'SELECT * FROM lesson_materials WHERE course_lesson_id = $1 ORDER BY id',
          [lesson.id]
        );
        
        const teams = await pool.query(
          'SELECT * FROM team_projects WHERE course_lesson_id = $1 ORDER BY id',
          [lesson.id]
        );
        
        for (const team of teams.rows) {
          const members = await pool.query(
            `SELECT tm.*, u.name as student_name 
             FROM team_members tm
             JOIN users u ON tm.student_id = u.id
             WHERE tm.team_project_id = $1`,
            [team.id]
          );
          team.members = members.rows;
        }
        
        return {
          ...lesson,
          materials: materials.rows,
          teams: teams.rows
        };
      })
    );

    return res.json({ success: true, lessons: lessonsWithDetails });
  } catch (error) {
    console.error('Get lessons error:', error);
    return res.status(500).json({ success: false, message: 'Ошибка получения занятий' });
  }
}

export async function createLesson(req: Request, res: Response): Promise<Response> {
  const session = req.session as SessionWithUser;
  if (!session.userId || session.userRole !== 'teacher') {
    return res.status(403).json({ success: false, message: 'Доступ запрещен' });
  }

  const {
    course_program_id,
    lesson_number,
    lesson_type,
    title,
    description,
    planned_date,
    deadline,
    max_score,
    weight,
    requirements
  }: CreateLessonDTO = req.body;

  if (!course_program_id || !lesson_number || !lesson_type || !title) {
    return res.status(400).json({ success: false, message: 'Не все обязательные поля заполнены' });
  }

  try {
    const result: QueryResult = await pool.query(
      `INSERT INTO course_lessons 
       (course_program_id, lesson_number, lesson_type, title, description, 
        planned_date, deadline, max_score, weight, requirements)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
       RETURNING *`,
      [
        course_program_id, lesson_number, lesson_type, title, description || null,
        planned_date || null, deadline || null, max_score || 10, weight || 1, requirements || null
      ]
    );

    return res.status(201).json({ success: true, lesson: result.rows[0] });
  } catch (error) {
    console.error('Create lesson error:', error);
    return res.status(500).json({ success: false, message: 'Ошибка создания занятия' });
  }
}

export async function updateLesson(req: Request, res: Response): Promise<Response> {
  const session = req.session as SessionWithUser;
  if (!session.userId || session.userRole !== 'teacher') {
    return res.status(403).json({ success: false, message: 'Доступ запрещен' });
  }

  const lessonId = req.params.id;
  const updates = req.body;

  try {
    const setClause = Object.keys(updates)
      .map((key, i) => `${key} = $${i + 2}`)
      .join(', ');
    
    const values = [lessonId, ...Object.values(updates)];
    
    const result: QueryResult = await pool.query(
      `UPDATE course_lessons SET ${setClause}, updated_at = CURRENT_TIMESTAMP
       WHERE id = $1 RETURNING *`,
      values
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Занятие не найдено' });
    }

    return res.json({ success: true, lesson: result.rows[0] });
  } catch (error) {
    console.error('Update lesson error:', error);
    return res.status(500).json({ success: false, message: 'Ошибка обновления занятия' });
  }
}

export async function deleteLesson(req: Request, res: Response): Promise<Response> {
  const session = req.session as SessionWithUser;
  if (!session.userId || session.userRole !== 'teacher') {
    return res.status(403).json({ success: false, message: 'Доступ запрещен' });
  }

  const lessonId = req.params.id;

  try {
    await pool.query('DELETE FROM course_lessons WHERE id = $1', [lessonId]);
    return res.json({ success: true, message: 'Занятие удалено' });
  } catch (error) {
    console.error('Delete lesson error:', error);
    return res.status(500).json({ success: false, message: 'Ошибка удаления занятия' });
  }
}


export async function getLessonTypeByDate(req: Request, res: Response): Promise<Response> {
  const session = req.session as SessionWithUser;
  if (!session.userId) {
    return res.status(401).json({ success: false, message: 'Не авторизован' });
  }

  const { subjectId, classId, date } = req.params;

  try {
    const result: QueryResult = await pool.query(
      `SELECT cl.* 
       FROM course_lessons cl
       JOIN course_programs cp ON cl.course_program_id = cp.id
       WHERE cp.subject_id = $1 AND cp.class_id = $2 
         AND cl.planned_date = $3::date
       LIMIT 1`,
      [subjectId, classId, date]
    );

    if (result.rows.length === 0) {
      return res.json({ success: true, lesson: null });
    }

    return res.json({ success: true, lesson: result.rows[0] });
  } catch (error) {
    console.error('Get lesson type error:', error);
    return res.status(500).json({ success: false, message: 'Ошибка получения типа урока' });
  }
}

export async function addMaterial(req: Request, res: Response): Promise<Response> {
  const session = req.session as SessionWithUser;
  if (!session.userId || session.userRole !== 'teacher') {
    return res.status(403).json({ success: false, message: 'Доступ запрещен' });
  }

  const { course_lesson_id, title, file_url, file_name, file_size, mime_type }: CreateMaterialDTO = req.body;

  if (!course_lesson_id || !title) {
    return res.status(400).json({ success: false, message: 'course_lesson_id и title обязательны' });
  }

  try {
    const result: QueryResult = await pool.query(
      `INSERT INTO lesson_materials 
       (course_lesson_id, title, file_url, file_name, file_size, mime_type)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [course_lesson_id, title, file_url || null, file_name || null, file_size || null, mime_type || null]
    );

    return res.status(201).json({ success: true, material: result.rows[0] });
  } catch (error) {
    console.error('Add material error:', error);
    return res.status(500).json({ success: false, message: 'Ошибка добавления материала' });
  }
}

export async function deleteMaterial(req: Request, res: Response): Promise<Response> {
  const session = req.session as SessionWithUser;
  if (!session.userId || session.userRole !== 'teacher') {
    return res.status(403).json({ success: false, message: 'Доступ запрещен' });
  }

  const materialId = req.params.id;

  try {
    await pool.query('DELETE FROM lesson_materials WHERE id = $1', [materialId]);
    return res.json({ success: true, message: 'Материал удален' });
  } catch (error) {
    console.error('Delete material error:', error);
    return res.status(500).json({ success: false, message: 'Ошибка удаления материала' });
  }
}


export async function createTeam(req: Request, res: Response): Promise<Response> {
  const session = req.session as SessionWithUser;
  if (!session.userId || session.userRole !== 'teacher') {
    return res.status(403).json({ success: false, message: 'Доступ запрещен' });
  }

  const { course_lesson_id, team_name, max_members }: CreateTeamDTO = req.body;

  if (!course_lesson_id || !team_name) {
    return res.status(400).json({ success: false, message: 'course_lesson_id и team_name обязательны' });
  }

  try {
    const result: QueryResult = await pool.query(
      `INSERT INTO team_projects (course_lesson_id, team_name, max_members)
       VALUES ($1, $2, $3)
       RETURNING *`,
      [course_lesson_id, team_name, max_members || 5]
    );

    return res.status(201).json({ success: true, team: result.rows[0] });
  } catch (error) {
    console.error('Create team error:', error);
    return res.status(500).json({ success: false, message: 'Ошибка создания команды' });
  }
}

export async function addTeamMember(req: Request, res: Response): Promise<Response> {
  const session = req.session as SessionWithUser;
  if (!session.userId || session.userRole !== 'teacher') {
    return res.status(403).json({ success: false, message: 'Доступ запрещен' });
  }

  const { team_project_id, student_id, role }: AddTeamMemberDTO = req.body;

  if (!team_project_id || !student_id) {
    return res.status(400).json({ success: false, message: 'team_project_id и student_id обязательны' });
  }

  try {
    const result: QueryResult = await pool.query(
      `INSERT INTO team_members (team_project_id, student_id, role)
       VALUES ($1, $2, $3)
       ON CONFLICT (team_project_id, student_id) DO NOTHING
       RETURNING *`,
      [team_project_id, student_id, role || 'member']
    );

    if (result.rows.length === 0) {
      return res.status(409).json({ success: false, message: 'Студент уже в команде' });
    }

    return res.status(201).json({ success: true, member: result.rows[0] });
  } catch (error) {
    console.error('Add team member error:', error);
    return res.status(500).json({ success: false, message: 'Ошибка добавления участника' });
  }
}

export async function removeTeamMember(req: Request, res: Response): Promise<Response> {
  const session = req.session as SessionWithUser;
  if (!session.userId || session.userRole !== 'teacher') {
    return res.status(403).json({ success: false, message: 'Доступ запрещен' });
  }

  const { teamId, studentId } = req.params;

  try {
    await pool.query(
      'DELETE FROM team_members WHERE team_project_id = $1 AND student_id = $2',
      [teamId, studentId]
    );
    return res.json({ success: true, message: 'Участник удален' });
  } catch (error) {
    console.error('Remove team member error:', error);
    return res.status(500).json({ success: false, message: 'Ошибка удаления участника' });
  }
}

export async function deleteTeam(req: Request, res: Response): Promise<Response> {
  const session = req.session as SessionWithUser;
  if (!session.userId || session.userRole !== 'teacher') {
    return res.status(403).json({ success: false, message: 'Доступ запрещен' });
  }

  const teamId = req.params.id;

  try {
    await pool.query('DELETE FROM team_projects WHERE id = $1', [teamId]);
    return res.json({ success: true, message: 'Команда удалена' });
  } catch (error) {
    console.error('Delete team error:', error);
    return res.status(500).json({ success: false, message: 'Ошибка удаления команды' });
  }
}