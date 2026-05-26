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