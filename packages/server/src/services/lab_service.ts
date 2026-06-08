import { BaseService } from './base_service';

interface LabWithDetails {
	id: number;
	title: string;
	description: string;
	issued_date: string;
	deadline: string;
	is_group: boolean;
	subject_name: string;
	teacher_name: string;
	submitted: boolean;
	grade?: number | null;
	teacher_comment?: string | null;
}

export class LabService extends BaseService {
	async getStudentLabs(studentId: string, subjectId?: number): Promise<LabWithDetails[]> {
		let query = `
        SELECT
            h.id, h.title, h.description,
            to_char(h.created_at, 'YYYY-MM-DD') as issued_date,
            to_char(h.due_date, 'YYYY-MM-DD') as deadline,
            h.is_group, h.homework_type,
            s.name as subject_name,
            u.name as teacher_name,
            ls.id as submission_id
        FROM homework h
                 JOIN subjects s ON h.subject_id = s.id
                 JOIN users u ON h.teacher_id = u.id
                 JOIN teacher_subjects ts ON h.subject_id = ts.subject_id
                 JOIN student_classes sc ON ts.class_id = sc.class_id
                 LEFT JOIN homework_submissions ls ON h.id = ls.homework_id AND ls.student_id = $1
        WHERE h.homework_type = 'lab' AND sc.student_id = $1
		`;
		const params: any[] = [studentId];
		
		if (subjectId) {
			query += ' AND h.subject_id = $2';
			params.push(subjectId);
		}
		
		query += ' ORDER BY h.due_date DESC, h.id DESC';
		
		const labs = await this.query<any>(query, params);
		
		for (const lab of labs) {
			if (lab.submission_id) {
				const grade = await this.single<{ grade: number; comment: string }>(
					`SELECT grade, comment FROM grades WHERE homework_id = $1 AND student_id = $2 AND grade_type = 'lab'`,
					[lab.submission_id, studentId]
				);
				if (grade) {
					lab.grade = grade.grade;
					lab.teacher_comment = grade.comment;
				}
			}
		}
		
		return labs;
	}
	
	async getLabById(labId: number, studentId?: string): Promise<any> {
		const lab = await this.single<any>(`
        SELECT h.id, h.title, h.description, h.materials,
               to_char(h.created_at, 'YYYY-MM-DD') as issued_date,
               to_char(h.due_date, 'YYYY-MM-DD') as deadline,
               h.is_group,
               s.name as subject_name,
               u.name as teacher_name
        FROM homework h
                 JOIN subjects s ON h.subject_id = s.id
                 JOIN users u ON h.teacher_id = u.id
        WHERE h.id = $1 AND h.homework_type = 'lab'
		`, [labId]);
		
		return lab;
	}
	
	async getSubmission(labId: number, studentId: string): Promise<any> {
		return this.single<any>(`
        SELECT id, submission_text, file_path,
               to_char(submitted_at, 'YYYY-MM-DD HH24:MI:SS') as submitted_at
        FROM homework_submissions
        WHERE homework_id = $1 AND student_id = $2
		`, [labId, studentId]);
	}
	
	async getGradeForSubmission(submissionId: number, studentId: string): Promise<any> {
		return this.single<any>(`
        SELECT id, grade, comment, to_char(grade_date, 'YYYY-MM-DD') as graded_at
        FROM grades
        WHERE homework_id = $1 AND student_id = $2 AND grade_type = 'lab'
		`, [submissionId, studentId]);
	}
	
	async getGroupmates(labId: number, studentId: string): Promise<any[]> {
		return this.query<any>(`
        SELECT u.id, u.name, u.email
        FROM homework_submissions hs
                 JOIN users u ON hs.student_id = u.id
        WHERE hs.homework_id = $1 AND hs.student_id != $2
		`, [labId, studentId]);
	}
	
	async submitLab(labId: number, studentId: string, submissionText: string | null, filePath: string | null): Promise<any> {
		return this.single<any>(`
        INSERT INTO homework_submissions (homework_id, student_id, submission_text, file_path)
        VALUES ($1, $2, $3, $4)
            ON CONFLICT (homework_id, student_id)
      DO UPDATE SET submission_text = COALESCE($3, homework_submissions.submission_text),
                         file_path = COALESCE($4, homework_submissions.file_path),
                         submitted_at = CURRENT_TIMESTAMP
                         RETURNING id, homework_id, student_id, submission_text, file_path,
                         to_char(submitted_at, 'YYYY-MM-DD HH24:MI:SS') as submitted_at
		`, [labId, studentId, submissionText, filePath]);
	}
	
	async checkLabExists(labId: number): Promise<boolean> {
		return this.exists('SELECT 1 FROM homework WHERE id = $1 AND homework_type = \'lab\'', [labId]);
	}
	
	async getTeacherLabs(teacherId: string): Promise<any[]> {
		return this.query<any>(`
        SELECT h.*, s.name as subject_name,
               COUNT(ls.id) as submissions_count
        FROM homework h
                 JOIN subjects s ON h.subject_id = s.id
                 LEFT JOIN homework_submissions ls ON h.id = ls.homework_id
        WHERE h.homework_type = 'lab' AND h.teacher_id = $1
        GROUP BY h.id, s.name
        ORDER BY h.due_date DESC
		`, [teacherId]);
	}
	
	async getAllLabs(): Promise<any[]> {
		return this.query<any>(`
        SELECT h.*, s.name as subject_name, u.name as teacher_name
        FROM homework h
                 JOIN subjects s ON h.subject_id = s.id
                 JOIN users u ON h.teacher_id = u.id
        WHERE h.homework_type = 'lab'
        ORDER BY h.due_date DESC
		`);
	}
	
	async createLab(data: {
		subject_id: number;
		teacher_id: string;
		title: string;
		description?: string;
		due_date: string;
		is_group: boolean;
		materials?: any[];
	}): Promise<any> {
		return this.single<any>(`
        INSERT INTO homework (subject_id, teacher_id, title, description, due_date, is_group, issued_date, homework_type, materials)
        VALUES ($1, $2, $3, $4, $5, $6, CURRENT_DATE, 'lab', $7::jsonb)
            RETURNING *
		`, [data.subject_id, data.teacher_id, data.title, data.description || null, data.due_date,
			data.is_group || false, JSON.stringify(data.materials || [])]);
	}
	
	async updateLab(labId: number, data: {
		subject_id: number;
		teacher_id: string;
		title: string;
		description?: string;
		due_date: string;
		is_group: boolean;
		materials?: any[];
	}): Promise<any> {
		return this.single<any>(`
        UPDATE homework
        SET subject_id=$1, teacher_id=$2, title=$3, description=$4, due_date=$5, is_group=$6, materials=$7::jsonb
        WHERE id=$8 AND homework_type='lab'
            RETURNING *
		`, [data.subject_id, data.teacher_id, data.title, data.description, data.due_date,
			data.is_group, JSON.stringify(data.materials || []), labId]);
	}
	
	async deleteLab(labId: number): Promise<boolean> {
		const result = await this.mutation('DELETE FROM homework WHERE id=$1 AND homework_type=\'lab\'', [labId]);
		return (result.rowCount ?? 0) > 0;
	}
	
	async getSubmissionsForLab(labId: number, isGroup: boolean): Promise<any[]> {
		if (isGroup) {
			return this.query<any>(`
          SELECT hs.id, hs.student_id, hs.submission_text, hs.file_path,
                 to_char(hs.submitted_at, 'YYYY-MM-DD HH24:MI:SS') as submitted_at,
                 u.name as student_name, u.email as student_email,
                 g.grade, g.comment as grade_comment,
                 to_char(g.grade_date, 'YYYY-MM-DD') as graded_at,
                 lt.name as team_name, lt.id as team_id
          FROM homework_submissions hs
                   JOIN users u ON hs.student_id = u.id
                   LEFT JOIN lab_team_members ltm ON hs.student_id = ltm.student_id
                   LEFT JOIN lab_teams lt ON ltm.team_id = lt.id AND lt.lab_id = $1
                   LEFT JOIN grades g ON hs.id = g.homework_id AND g.student_id = hs.student_id AND g.grade_type = 'lab'
          WHERE hs.homework_id = $1
          ORDER BY lt.name, hs.submitted_at DESC
			`, [labId]);
		} else {
			return this.query<any>(`
          SELECT hs.id, hs.student_id, hs.submission_text, hs.file_path,
                 to_char(hs.submitted_at, 'YYYY-MM-DD HH24:MI:SS') as submitted_at,
                 u.name as student_name, u.email as student_email,
                 g.grade, g.comment as grade_comment,
                 to_char(g.grade_date, 'YYYY-MM-DD') as graded_at
          FROM homework_submissions hs
                   JOIN users u ON hs.student_id = u.id
                   LEFT JOIN grades g ON hs.id = g.homework_id AND g.student_id = hs.student_id AND g.grade_type = 'lab'
          WHERE hs.homework_id = $1
          ORDER BY hs.submitted_at DESC
			`, [labId]);
		}
	}
	
	async gradeSubmission(submissionId: number, teacherId: string, grade: number, comment?: string): Promise<any> {
		// Явно типизируем объект сдачи, чтобы прочесть homework_id и student_id
		const submission = await this.single<{ homework_id: number; student_id: string }>(
			'SELECT homework_id, student_id FROM homework_submissions WHERE id = $1',
			[submissionId]
		);
		if (!submission) return null;
		
		const lab = await this.single<{ subject_id: number }>(
			'SELECT subject_id FROM homework WHERE id = $1',
			[submission.homework_id]
		);
		if (!lab) return null;
		
		const existing = await this.single<{ id: number }>(
			'SELECT id FROM grades WHERE homework_id = $1 AND student_id = $2 AND grade_type = \'lab\'',
			[submissionId, submission.student_id]
		);
		
		if (existing) {
			return this.single<any>(`
          UPDATE grades
          SET grade = $1, comment = $2, teacher_id = $3, updated_at = CURRENT_TIMESTAMP
          WHERE id = $4
              RETURNING *
			`, [grade, comment || null, teacherId, existing.id]);
		} else {
			return this.single<any>(`
          INSERT INTO grades (student_id, subject_id, teacher_id, grade, grade_date, comment, grade_type, homework_id)
          VALUES ($1, $2, $3, $4, CURRENT_DATE, $5, 'lab', $6)
              RETURNING *
			`, [submission.student_id, lab.subject_id, teacherId, grade, comment || null, submissionId]);
		}
	}
	
	async getSubjects(): Promise<any[]> {
		return this.query<any>('SELECT id, name FROM subjects ORDER BY name');
	}
	
	async saveTeams(labId: number, teams: any[]): Promise<void> {
		await this.mutation(`DELETE FROM lab_team_members WHERE team_id IN (SELECT id FROM lab_teams WHERE lab_id = $1)`, [labId]);
		await this.mutation(`DELETE FROM lab_teams WHERE lab_id = $1`, [labId]);
		
		for (const team of teams) {
			const teamResult = await this.single<{ id: number }>(
				`INSERT INTO lab_teams (lab_id, name) VALUES ($1, $2) RETURNING id`,
				[labId, team.name || `Команда ${teams.indexOf(team) + 1}`]
			);
			if (teamResult && team.members?.length) {
				for (const studentId of team.members) {
					await this.mutation(
						`INSERT INTO lab_team_members (team_id, student_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`,
						[teamResult.id, studentId]
					);
				}
			}
		}
	}
	
	async getLabWithGroupInfo(labId: number): Promise<any> {
		return this.single<any>(`SELECT is_group FROM homework WHERE id = $1`, [labId]);
	}
}