import { Request, Response } from 'express';
import pool from '../db/pool';
import fs from 'fs';
import path from 'path';

interface SessionWithUser {
    userId?: string;
    userEmail?: string;
    userRole?: 'teacher' | 'student';
    destroy: (callback: (err: Error | null) => void) => void;
}

export async function getStudentLabs(req: Request, res: Response): Promise<Response> {
    const session = req.session as SessionWithUser;
    if (!session.userId) return res.status(401).json({ success: false, message: 'Не авторизован' });

    const subjectId = req.query.subject_id ? Number(req.query.subject_id) : null;

    try {
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
        const params: any[] = [session.userId];

        if (subjectId) {
            query += ' AND h.subject_id = $2';
            params.push(subjectId);
        }

        query += ' ORDER BY h.due_date DESC, h.id DESC';

        const result = await pool.query(query, params);

        const labs = await Promise.all(result.rows.map(async (row: any) => {
            let grade = null;
            let teacher_comment = null;

            if (row.submission_id) {
                try {
                    const g = await pool.query(
                        `SELECT grade, comment FROM grades WHERE homework_id = $1 AND student_id = $2 AND grade_type = 'lab'`,
                        [row.submission_id, session.userId]
                    );
                    if (g.rows[0]) {
                        grade = g.rows[0].grade;
                        teacher_comment = g.rows[0].comment;
                    }
                } catch (e) {}
            }

            return {
                id: row.id,
                title: row.title,
                description: row.description,
                issued_date: row.issued_date,
                deadline: row.deadline,
                is_group: row.is_group,
                subject_name: row.subject_name,
                teacher_name: row.teacher_name,
                submitted: !!row.submission_id,
                grade,
                teacher_comment
            };
        }));

        return res.json({ success: true, labs });
    } catch (error) {
        console.error('Get student labs error:', error);
        return res.status(500).json({ success: false, message: 'Ошибка получения лабораторных работ' });
    }
}

export async function getStudentLabById(req: Request, res: Response): Promise<Response> {
    const session = req.session as SessionWithUser;
    if (!session.userId) return res.status(401).json({ success: false, message: 'Не авторизован' });

    const labId = parseInt(req.params.id);
    if (isNaN(labId)) return res.status(400).json({ success: false, message: 'Неверный ID' });

    try {
        const labResult = await pool.query(`
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

        if (labResult.rows.length === 0) {
            return res.status(404).json({ success: false, message: 'Лабораторная работа не найдена' });
        }

        const lab = labResult.rows[0];

        let submission = null;
        try {
            const subRes = await pool.query(
                `SELECT id, submission_text, file_path, to_char(submitted_at, 'YYYY-MM-DD HH24:MI:SS') as submitted_at
                 FROM homework_submissions WHERE homework_id = $1 AND student_id = $2`,
                [labId, session.userId]
            );
            submission = subRes.rows[0] || null;
        } catch (e) {}

        let grade = null;
        if (submission) {
            try {
                const g = await pool.query(
                    `SELECT id, grade, comment, to_char(grade_date, 'YYYY-MM-DD') as graded_at
                     FROM grades WHERE homework_id = $1 AND student_id = $2 AND grade_type = 'lab'`,
                    [submission.id, session.userId]
                );
                grade = g.rows[0] || null;
            } catch (e) {}
        }

        let groupmates: any[] = [];
        if (lab.is_group) {
            try {
                const gm = await pool.query(
                    `SELECT u.id, u.name, u.email
                     FROM homework_submissions hs
                     JOIN users u ON hs.student_id = u.id
                     WHERE hs.homework_id = $1 AND hs.student_id != $2`,
                    [labId, session.userId]
                );
                groupmates = gm.rows;
            } catch (e) {}
        }

        let materials = [];
        if (lab.materials) {
            if (typeof lab.materials === 'string') {
                try { materials = JSON.parse(lab.materials); } catch (e) { materials = []; }
            } else if (Array.isArray(lab.materials)) {
                materials = lab.materials;
            }
        }

        return res.json({
            success: true,
            lab: {
                id: lab.id,
                title: lab.title,
                description: lab.description,
                issued_date: lab.issued_date,
                deadline: lab.deadline,
                is_group: lab.is_group,
                subject_name: lab.subject_name,
                teacher_name: lab.teacher_name,
                materials
            },
            submission,
            grade,
            groupmates
        });
    } catch (error) {
        console.error('Get lab detail error:', error);
        return res.status(500).json({ success: false, message: 'Ошибка' });
    }
}

export async function submitLabWork(req: Request, res: Response): Promise<Response> {
    const session = req.session as SessionWithUser;
    if (!session.userId) return res.status(401).json({ success: false, message: 'Не авторизован' });

    const labId = parseInt(req.params.id);
    if (isNaN(labId)) return res.status(400).json({ success: false, message: 'Неверный ID' });

    const { submission_text } = req.body;
    const file = req.file;
    const filePath = file ? `/uploads/labs/${file.filename}` : null;

    if (!submission_text && !file) {
        return res.status(400).json({ success: false, message: 'Текст или файл обязательны' });
    }

    try {
        const labCheck = await pool.query(
            `SELECT id FROM homework WHERE id = $1 AND homework_type = 'lab'`,
            [labId]
        );
        if (labCheck.rows.length === 0) {
            return res.status(404).json({ success: false, message: 'Лабораторная работа не найдена' });
        }

        const result = await pool.query(`
            INSERT INTO homework_submissions (homework_id, student_id, submission_text, file_path)
            VALUES ($1, $2, $3, $4)
            ON CONFLICT (homework_id, student_id)
            DO UPDATE SET submission_text = COALESCE($3, homework_submissions.submission_text),
                          file_path = COALESCE($4, homework_submissions.file_path),
                          submitted_at = CURRENT_TIMESTAMP
            RETURNING id, homework_id, student_id, submission_text, file_path,
                      to_char(submitted_at, 'YYYY-MM-DD HH24:MI:SS') as submitted_at
        `, [labId, session.userId, submission_text || null, filePath]);

        return res.status(201).json({ success: true, message: 'Отправлено', submission: result.rows[0] });
    } catch (error) {
        console.error('Submit lab error:', error);
        return res.status(500).json({ success: false, message: 'Ошибка отправки' });
    }
}

export async function getMySubmission(req: Request, res: Response): Promise<Response> {
    const session = req.session as SessionWithUser;
    if (!session.userId) return res.status(401).json({ success: false, message: 'Не авторизован' });

    const labId = parseInt(req.params.id);
    if (isNaN(labId)) return res.status(400).json({ success: false, message: 'Неверный ID' });

    try {
        const result = await pool.query(
            `SELECT id, submission_text, file_path,
                    to_char(submitted_at, 'YYYY-MM-DD HH24:MI:SS') as submitted_at
             FROM homework_submissions
             WHERE homework_id = $1 AND student_id = $2`,
            [labId, session.userId]
        );
        return res.json({ success: true, submission: result.rows[0] || null });
    } catch (error) {
        console.error('Get submission error:', error);
        return res.status(500).json({ success: false, message: 'Ошибка' });
    }
}

export async function getMyGrade(req: Request, res: Response): Promise<Response> {
    const session = req.session as SessionWithUser;
    if (!session.userId) return res.status(401).json({ success: false, message: 'Не авторизован' });

    const labId = parseInt(req.params.id);
    if (isNaN(labId)) return res.status(400).json({ success: false, message: 'Неверный ID' });

    try {
        const sub = await pool.query(
            `SELECT id FROM homework_submissions WHERE homework_id = $1 AND student_id = $2`,
            [labId, session.userId]
        );

        if (!sub.rows[0]) {
            return res.json({ success: true, grade: null });
        }

        const result = await pool.query(
            `SELECT id, grade, comment,
                    to_char(grade_date, 'YYYY-MM-DD') as graded_at
             FROM grades
             WHERE homework_id = $1 AND student_id = $2 AND grade_type = 'lab'`,
            [sub.rows[0].id, session.userId]
        );

        return res.json({ success: true, grade: result.rows[0] || null });
    } catch (error) {
        console.error('Get grade error:', error);
        return res.status(500).json({ success: false, message: 'Ошибка' });
    }
}

export async function getSubjects(req: Request, res: Response): Promise<Response> {
    try {
        const result = await pool.query('SELECT id, name FROM subjects ORDER BY name');
        return res.json({ success: true, subjects: result.rows });
    } catch (error) {
        return res.status(500).json({ success: false, message: 'Ошибка' });
    }
}

export async function createLab(req: Request, res: Response): Promise<Response> {
    const session = req.session as SessionWithUser;
    if (!session.userId || session.userRole !== 'teacher') {
        return res.status(403).json({ success: false, message: 'Доступ запрещен' });
    }

    const { subject_id, teacher_id, title, description, due_date, is_group, materials, teams } = req.body;

    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        const result = await client.query(`
            INSERT INTO homework (subject_id, teacher_id, title, description, due_date, is_group, issued_date, homework_type, materials)
            VALUES ($1, $2, $3, $4, $5, $6, CURRENT_DATE, 'lab', $7::jsonb)
                RETURNING *
        `, [subject_id, teacher_id, title, description || null, due_date, is_group || false, JSON.stringify(materials || [])]);

        const labId = result.rows[0].id;

        // Сохраняем команды
        if (is_group && teams?.length) {
            for (const team of teams) {
                const teamResult = await client.query(
                    `INSERT INTO lab_teams (lab_id, name) VALUES ($1, $2) RETURNING id`,
                    [labId, team.name || `Команда ${teams.indexOf(team) + 1}`]
                );
                const teamId = teamResult.rows[0].id;
                if (team.members?.length) {
                    for (const studentId of team.members) {
                        await client.query(
                            `INSERT INTO lab_team_members (team_id, student_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`,
                            [teamId, studentId]
                        );
                    }
                }
            }
        }

        await client.query('COMMIT');
        return res.status(201).json({ success: true, lab: result.rows[0] });
    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Create lab error:', error);
        return res.status(500).json({ success: false, message: 'Ошибка создания' });
    } finally {
        client.release();
    }
}

export async function updateLab(req: Request, res: Response): Promise<Response> {
    const session = req.session as SessionWithUser;
    if (!session.userId || session.userRole !== 'teacher') {
        return res.status(403).json({ success: false, message: 'Доступ запрещен' });
    }

    const labId = parseInt(req.params.id);
    const { subject_id, teacher_id, title, description, due_date, is_group, materials, teams } = req.body;

    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        await client.query(`
            UPDATE homework SET subject_id=$1, teacher_id=$2, title=$3, description=$4, due_date=$5, is_group=$6, materials=$7::jsonb
            WHERE id=$8 AND homework_type='lab'
        `, [subject_id, teacher_id, title, description, due_date, is_group, JSON.stringify(materials || []), labId]);

        // Удаляем старые команды
        await client.query(`DELETE FROM lab_team_members WHERE team_id IN (SELECT id FROM lab_teams WHERE lab_id = $1)`, [labId]);
        await client.query(`DELETE FROM lab_teams WHERE lab_id = $1`, [labId]);

        // Создаём новые
        if (is_group && teams?.length) {
            for (const team of teams) {
                const teamResult = await client.query(
                    `INSERT INTO lab_teams (lab_id, name) VALUES ($1, $2) RETURNING id`,
                    [labId, team.name || 'Команда']
                );
                const teamId = teamResult.rows[0].id;
                if (team.members?.length) {
                    for (const studentId of team.members) {
                        await client.query(
                            `INSERT INTO lab_team_members (team_id, student_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`,
                            [teamId, studentId]
                        );
                    }
                }
            }
        }

        await client.query('COMMIT');
        return res.json({ success: true });
    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Update lab error:', error);
        return res.status(500).json({ success: false, message: 'Ошибка обновления' });
    } finally {
        client.release();
    }
}

export async function deleteLab(req: Request, res: Response): Promise<Response> {
    const session = req.session as SessionWithUser;
    if (!session.userId || session.userRole !== 'teacher') {
        return res.status(403).json({ success: false, message: 'Доступ запрещен' });
    }

    const labId = parseInt(req.params.id);

    try {
        await pool.query(`DELETE FROM homework WHERE id=$1 AND homework_type='lab'`, [labId]);
        return res.json({ success: true });
    } catch (error) {
        console.error('Delete lab error:', error);
        return res.status(500).json({ success: false, message: 'Ошибка удаления' });
    }
}

export async function getAllLabs(req: Request, res: Response): Promise<Response> {
    const session = req.session as SessionWithUser;
    if (!session.userId || session.userRole !== 'teacher') {
        return res.status(403).json({ success: false, message: 'Доступ запрещен' });
    }
    try {
        const result = await pool.query(`
            SELECT h.*, s.name as subject_name, u.name as teacher_name
            FROM homework h
            JOIN subjects s ON h.subject_id = s.id
            JOIN users u ON h.teacher_id = u.id
            WHERE h.homework_type = 'lab'
            ORDER BY h.due_date DESC
        `);
        return res.json({ success: true, labs: result.rows });
    } catch (error) {
        console.error('Get all labs error:', error);
        return res.status(500).json({ success: false, message: 'Ошибка' });
    }
}

// Получить все лабы преподавателя
export async function getTeacherLabs(req: Request, res: Response): Promise<Response> {
    const session = req.session as SessionWithUser;
    if (!session.userId || session.userRole !== 'teacher') {
        return res.status(403).json({ success: false, message: 'Доступ запрещен' });
    }
    try {
        const result = await pool.query(`
            SELECT h.*, s.name as subject_name,
                   COUNT(ls.id) as submissions_count
            FROM homework h
            JOIN subjects s ON h.subject_id = s.id
            LEFT JOIN homework_submissions ls ON h.id = ls.homework_id
            WHERE h.homework_type = 'lab' AND h.teacher_id = $1
            GROUP BY h.id, s.name
            ORDER BY h.due_date DESC
        `, [session.userId]);
        return res.json({ success: true, labs: result.rows });
    } catch (error) {
        console.error('Get teacher labs error:', error);
        return res.status(500).json({ success: false, message: 'Ошибка' });
    }
}

export async function getLabSubmissionsForTeacher(req: Request, res: Response): Promise<Response> {
    const session = req.session as SessionWithUser;
    if (!session.userId || session.userRole !== 'teacher') {
        return res.status(403).json({ success: false, message: 'Доступ запрещен' });
    }
    const labId = parseInt(req.params.id);
    try {
        // Сначала получим лабу для проверки is_group
        const lab = await pool.query(`SELECT is_group FROM homework WHERE id = $1`, [labId]);
        const isGroup = lab.rows[0]?.is_group;

        let submissions;
        if (isGroup) {
            submissions = await pool.query(`
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
            submissions = await pool.query(`
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

        return res.json({ success: true, submissions: submissions.rows });
    } catch (error) {
        console.error('Get submissions error:', error);
        return res.status(500).json({ success: false, message: 'Ошибка' });
    }
}

export async function gradeSubmission(req: Request, res: Response): Promise<Response> {
    const session = req.session as SessionWithUser;
    if (!session.userId || session.userRole !== 'teacher') {
        return res.status(403).json({ success: false, message: 'Доступ запрещен' });
    }
    const submissionId = parseInt(req.params.id);
    const { grade, comment } = req.body;
    try {
        const sub = await pool.query(`SELECT * FROM homework_submissions WHERE id = $1`, [submissionId]);
        if (!sub.rows[0]) return res.status(404).json({ success: false, message: 'Сдача не найдена' });
        const lab = await pool.query(`SELECT subject_id FROM homework WHERE id = $1`, [sub.rows[0].homework_id]);

        // Проверяем есть ли уже оценка
        const existing = await pool.query(
            `SELECT id FROM grades WHERE homework_id = $1 AND student_id = $2 AND grade_type = 'lab'`,
            [submissionId, sub.rows[0].student_id]
        );

        let result;
        if (existing.rows.length > 0) {
            result = await pool.query(
                `UPDATE grades SET grade = $1, comment = $2, teacher_id = $3, updated_at = CURRENT_TIMESTAMP WHERE id = $4 RETURNING *`,
                [grade, comment, session.userId, existing.rows[0].id]
            );
        } else {
            result = await pool.query(
                `INSERT INTO grades (student_id, subject_id, teacher_id, grade, grade_date, comment, grade_type, homework_id)
                 VALUES ($1, $2, $3, $4, CURRENT_DATE, $5, 'lab', $6) RETURNING *`,
                [sub.rows[0].student_id, lab.rows[0].subject_id, session.userId, grade, comment, submissionId]
            );
        }

        return res.json({ success: true, grade: result.rows[0] });
    } catch (error) {
        console.error('Grade submission error:', error);
        return res.status(500).json({ success: false, message: 'Ошибка' });
    }
}