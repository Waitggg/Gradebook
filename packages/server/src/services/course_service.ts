// services/course_service.ts
import pool from '../db/pool';
import { QueryResult } from 'pg';
import {
	CreateProgramDTO,
	CreateLessonDTO,
	CreateMaterialDTO,
	CreateTeamDTO,
	AddTeamMemberDTO
} from '../types/course_types';

export class CourseService {
	
	async getProgram(subjectId: string, classId: string): Promise<any | null> {
		const result: QueryResult = await pool.query(
			`SELECT cp.*, s.name as subject_name, c.name as class_name
       FROM course_programs cp
       JOIN subjects s ON cp.subject_id = s.id
       JOIN classes c ON cp.class_id = c.id
       WHERE cp.subject_id = $1 AND cp.class_id = $2`,
			[subjectId, classId]
		);
		return result.rows.length > 0 ? result.rows[0] : null;
	}
	
	async createOrUpdateProgram(dto: CreateProgramDTO): Promise<any> {
		const { subject_id, class_id, total_hours, description } = dto;
		
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
		return result.rows[0];
	}
	
	async deleteProgram(programId: string): Promise<void> {
		await pool.query('DELETE FROM course_programs WHERE id = $1', [programId]);
	}
	
	async getProgramLessons(programId: string): Promise<any[]> {
		const lessons: QueryResult = await pool.query(
			`SELECT * FROM course_lessons
       WHERE course_program_id = $1
       ORDER BY lesson_number`,
			[programId]
		);
		
		return await Promise.all(
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
	}
	
	async createLesson(dto: CreateLessonDTO): Promise<any> {
		const result: QueryResult = await pool.query(
			`INSERT INTO course_lessons
       (course_program_id, lesson_number, lesson_type, title, description,
        planned_date, deadline, max_score, weight, requirements)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
       RETURNING *`,
			[
				dto.course_program_id, dto.lesson_number, dto.lesson_type, dto.title, dto.description || null,
				dto.planned_date || null, dto.deadline || null, dto.max_score || 10, dto.weight || 1, dto.requirements || null
			]
		);
		return result.rows[0];
	}
	
	async updateLesson(lessonId: string, updates: Record<string, any>): Promise<any | null> {
		const setClause = Object.keys(updates)
			.map((key, i) => `${key} = $${i + 2}`)
			.join(', ');
		
		const values = [lessonId, ...Object.values(updates)];
		
		const result: QueryResult = await pool.query(
			`UPDATE course_lessons SET ${setClause}, updated_at = CURRENT_TIMESTAMP
       WHERE id = $1 RETURNING *`,
			values
		);
		return result.rows.length > 0 ? result.rows[0] : null;
	}
	
	async deleteLesson(lessonId: string): Promise<void> {
		await pool.query('DELETE FROM course_lessons WHERE id = $1', [lessonId]);
	}
	
	async getLessonTypeByDate(subjectId: string, classId: string, date: string): Promise<any | null> {
		const result: QueryResult = await pool.query(
			`SELECT cl.* FROM course_lessons cl
       JOIN course_programs cp ON cl.course_program_id = cp.id
       WHERE cp.subject_id = $1 AND cp.class_id = $2
         AND cl.planned_date = $3::date
       LIMIT 1`,
			[subjectId, classId, date]
		);
		return result.rows.length > 0 ? result.rows[0] : null;
	}
	
	async addMaterial(dto: CreateMaterialDTO): Promise<any> {
		const result: QueryResult = await pool.query(
			`INSERT INTO lesson_materials
       (course_lesson_id, title, file_url, file_name, file_size, mime_type)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
			[dto.course_lesson_id, dto.title, dto.file_url || null, dto.file_name || null, dto.file_size || null, dto.mime_type || null]
		);
		return result.rows[0];
	}
	
	async deleteMaterial(materialId: string): Promise<void> {
		await pool.query('DELETE FROM lesson_materials WHERE id = $1', [materialId]);
	}
	
	
	async createTeam(dto: CreateTeamDTO): Promise<any> {
		const result: QueryResult = await pool.query(
			`INSERT INTO team_projects (course_lesson_id, team_name, max_members)
       VALUES ($1, $2, $3)
       RETURNING *`,
			[dto.course_lesson_id, dto.team_name, dto.max_members || 5]
		);
		return result.rows[0];
	}
	
	async addTeamMember(dto: AddTeamMemberDTO): Promise<any | null> {
		const result: QueryResult = await pool.query(
			`INSERT INTO team_members (team_project_id, student_id, role)
       VALUES ($1, $2, $3)
       ON CONFLICT (team_project_id, student_id) DO NOTHING
       RETURNING *`,
			[dto.team_project_id, dto.student_id, dto.role || 'member']
		);
		return result.rows.length > 0 ? result.rows[0] : null;
	}
	
	async removeTeamMember(teamId: string, studentId: string): Promise<void> {
		await pool.query(
			'DELETE FROM team_members WHERE team_project_id = $1 AND student_id = $2',
			[teamId, studentId]
		);
	}
	
	async deleteTeam(teamId: string): Promise<void> {
		await pool.query('DELETE FROM team_projects WHERE id = $1', [teamId]);
	}
}