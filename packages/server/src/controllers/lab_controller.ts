// lab_controller.ts (рефакторированный)
import { Request, Response } from 'express';
import { BaseController } from './base_controller';
import { LabService } from '../services/lab_service';

export class LabController extends BaseController {
    private service: LabService;
    
    constructor() {
        super();
        this.service = new LabService();
    }
    
    async getStudentLabs(req: Request, res: Response): Promise<Response> {
        const auth = this.checkAuth(req);
        if (!auth.success) return this.error(res, auth.message!, 401);
        
        const subjectId = req.query.subject_id ? Number(req.query.subject_id) : undefined;
        
        try {
            const labs = await this.service.getStudentLabs(auth.userId!, subjectId);
            return this.success(res, { labs });
        } catch (error) {
            console.error('Get student labs error:', error);
            return this.error(res, 'Ошибка получения лабораторных работ', 500);
        }
    }
    
    async getStudentLabById(req: Request, res: Response): Promise<Response> {
        const auth = this.checkAuth(req);
        if (!auth.success) return this.error(res, auth.message!, 401);
        
        const labId = parseInt(req.params.id);
        if (isNaN(labId)) return this.error(res, 'Неверный ID', 400);
        
        try {
            const lab = await this.service.getLabById(labId, auth.userId);
            if (!lab) {
                return this.error(res, 'Лабораторная работа не найдена', 404);
            }
            
            const submission = await this.service.getSubmission(labId, auth.userId!);
            
            let grade = null;
            if (submission) {
                grade = await this.service.getGradeForSubmission(submission.id, auth.userId!);
            }
            
            let groupmates: any[] = [];
            if (lab.is_group) {
                groupmates = await this.service.getGroupmates(labId, auth.userId!);
            }
            
            let materials = [];
            if (lab.materials) {
                if (typeof lab.materials === 'string') {
                    try { materials = JSON.parse(lab.materials); } catch (e) { materials = []; }
                } else if (Array.isArray(lab.materials)) {
                    materials = lab.materials;
                }
            }
            
            return this.success(res, {
                lab: { ...lab, materials },
                submission,
                grade,
                groupmates
            });
        } catch (error) {
            console.error('Get lab detail error:', error);
            return this.error(res, 'Ошибка получения деталей лабораторной работы', 500);
        }
    }
    
    async submitLabWork(req: Request, res: Response): Promise<Response> {
        const auth = this.checkAuth(req);
        if (!auth.success) return this.error(res, auth.message!, 401);
        
        const labId = parseInt(req.params.id);
        if (isNaN(labId)) return this.error(res, 'Неверный ID', 400);
        
        const { submission_text } = req.body;
        const file = req.file;
        const filePath = file ? `/uploads/labs/${file.filename}` : null;
        
        if (!submission_text && !file) {
            return this.error(res, 'Текст или файл обязательны', 400);
        }
        
        try {
            const labExists = await this.service.checkLabExists(labId);
            if (!labExists) {
                return this.error(res, 'Лабораторная работа не найдена', 404);
            }
            
            const submission = await this.service.submitLab(labId, auth.userId!, submission_text || null, filePath);
            return this.success(res, { message: 'Отправлено', submission }, 201);
        } catch (error) {
            console.error('Submit lab error:', error);
            return this.error(res, 'Ошибка отправки', 500);
        }
    }
    
    async getMySubmission(req: Request, res: Response): Promise<Response> {
        const auth = this.checkAuth(req);
        if (!auth.success) return this.error(res, auth.message!, 401);
        
        const labId = parseInt(req.params.id);
        if (isNaN(labId)) return this.error(res, 'Неверный ID', 400);
        
        try {
            const submission = await this.service.getSubmission(labId, auth.userId!);
            return this.success(res, { submission: submission || null });
        } catch (error) {
            console.error('Get submission error:', error);
            return this.error(res, 'Ошибка получения сдачи', 500);
        }
    }
    
    async getMyGrade(req: Request, res: Response): Promise<Response> {
        const auth = this.checkAuth(req);
        if (!auth.success) return this.error(res, auth.message!, 401);
        
        const labId = parseInt(req.params.id);
        if (isNaN(labId)) return this.error(res, 'Неверный ID', 400);
        
        try {
            const submission = await this.service.getSubmission(labId, auth.userId!);
            if (!submission) {
                return this.success(res, { grade: null });
            }
            
            const grade = await this.service.getGradeForSubmission(submission.id, auth.userId!);
            return this.success(res, { grade: grade || null });
        } catch (error) {
            console.error('Get grade error:', error);
            return this.error(res, 'Ошибка получения оценки', 500);
        }
    }
    
    async getSubjects(req: Request, res: Response): Promise<Response> {
        try {
            const subjects = await this.service.getSubjects();
            return this.success(res, { subjects });
        } catch (error) {
            console.error('Get subjects error:', error);
            return this.error(res, 'Ошибка получения предметов', 500);
        }
    }
    
    // Методы для учителя
    async createLab(req: Request, res: Response): Promise<Response> {
        const teacherCheck = this.checkTeacher(req);
        if (!teacherCheck.success) return this.error(res, teacherCheck.message!, 403);
        
        const { subject_id, teacher_id, title, description, due_date, is_group, materials, teams } = req.body;
        
        try {
            const lab = await this.service.createLab({
                subject_id,
                teacher_id,
                title,
                description,
                due_date,
                is_group: is_group || false,
                materials: materials || []
            });
            
            if (is_group && teams?.length) {
                await this.service.saveTeams(lab.id, teams);
            }
            
            return this.success(res, { lab }, 201);
        } catch (error) {
            console.error('Create lab error:', error);
            return this.error(res, 'Ошибка создания лабораторной работы', 500);
        }
    }
    
    async updateLab(req: Request, res: Response): Promise<Response> {
        const teacherCheck = this.checkTeacher(req);
        if (!teacherCheck.success) return this.error(res, teacherCheck.message!, 403);
        
        const labId = parseInt(req.params.id);
        const { subject_id, teacher_id, title, description, due_date, is_group, materials, teams } = req.body;
        
        try {
            const lab = await this.service.updateLab(labId, {
                subject_id,
                teacher_id,
                title,
                description,
                due_date,
                is_group: is_group || false,
                materials: materials || []
            });
            
            if (is_group && teams?.length) {
                await this.service.saveTeams(labId, teams);
            }
            
            return this.success(res, { lab });
        } catch (error) {
            console.error('Update lab error:', error);
            return this.error(res, 'Ошибка обновления лабораторной работы', 500);
        }
    }
    
    async deleteLab(req: Request, res: Response): Promise<Response> {
        const teacherCheck = this.checkTeacher(req);
        if (!teacherCheck.success) return this.error(res, teacherCheck.message!, 403);
        
        const labId = parseInt(req.params.id);
        
        try {
            const deleted = await this.service.deleteLab(labId);
            if (!deleted) {
                return this.error(res, 'Лабораторная работа не найдена', 404);
            }
            return this.success(res, { message: 'Лабораторная работа удалена' });
        } catch (error) {
            console.error('Delete lab error:', error);
            return this.error(res, 'Ошибка удаления', 500);
        }
    }
    
    async getAllLabs(req: Request, res: Response): Promise<Response> {
        const teacherCheck = this.checkTeacher(req);
        if (!teacherCheck.success) return this.error(res, teacherCheck.message!, 403);
        
        try {
            const labs = await this.service.getAllLabs();
            return this.success(res, { labs });
        } catch (error) {
            console.error('Get all labs error:', error);
            return this.error(res, 'Ошибка получения лабораторных работ', 500);
        }
    }
    
    async getTeacherLabs(req: Request, res: Response): Promise<Response> {
        const teacherCheck = this.checkTeacher(req) as { success: boolean; message?: string; userId?: string };
        if (!teacherCheck.success) return this.error(res, teacherCheck.message!, 403);
        
        try {
            const labs = await this.service.getTeacherLabs(teacherCheck.userId!);
            return this.success(res, { labs });
        } catch (error) {
            console.error('Get teacher labs error:', error);
            return this.error(res, 'Ошибка получения лабораторных работ', 500);
        }
    }
    
    async getLabSubmissionsForTeacher(req: Request, res: Response): Promise<Response> {
        const teacherCheck = this.checkTeacher(req);
        if (!teacherCheck.success) return this.error(res, teacherCheck.message!, 403);
        
        const labId = parseInt(req.params.id);
        
        try {
            const lab = await this.service.getLabWithGroupInfo(labId);
            if (!lab) {
                return this.error(res, 'Лабораторная работа не найдена', 404);
            }
            
            const submissions = await this.service.getSubmissionsForLab(labId, lab.is_group);
            return this.success(res, { submissions });
        } catch (error) {
            console.error('Get submissions error:', error);
            return this.error(res, 'Ошибка получения сдач', 500);
        }
    }
    
    async gradeSubmission(req: Request, res: Response): Promise<Response> {
        const teacherCheck = this.checkTeacher(req) as { success: boolean; message?: string; userId?: string };
        if (!teacherCheck.success) return this.error(res, teacherCheck.message!, 403);
        
        const submissionId = parseInt(req.params.id);
        const { grade, comment } = req.body;
        
        if (!grade && grade !== 0) {
            return this.error(res, 'Оценка обязательна', 400);
        }
        
        try {
            const graded = await this.service.gradeSubmission(submissionId, teacherCheck.userId!, grade, comment);
            if (!graded) {
                return this.error(res, 'Сдача не найдена', 404);
            }
            return this.success(res, { grade: graded });
        } catch (error) {
            console.error('Grade submission error:', error);
            return this.error(res, 'Ошибка оценивания', 500);
        }
    }
}

// Экспортируем обернутые функции
const labController = new LabController();

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

export const getStudentLabs = wrap(labController.getStudentLabs.bind(labController));
export const getStudentLabById = wrap(labController.getStudentLabById.bind(labController));
export const submitLabWork = wrap(labController.submitLabWork.bind(labController));
export const getMySubmission = wrap(labController.getMySubmission.bind(labController));
export const getMyGrade = wrap(labController.getMyGrade.bind(labController));
export const getSubjects = wrap(labController.getSubjects.bind(labController));
export const createLab = wrap(labController.createLab.bind(labController));
export const updateLab = wrap(labController.updateLab.bind(labController));
export const deleteLab = wrap(labController.deleteLab.bind(labController));
export const getAllLabs = wrap(labController.getAllLabs.bind(labController));
export const getTeacherLabs = wrap(labController.getTeacherLabs.bind(labController));
export const getLabSubmissionsForTeacher = wrap(labController.getLabSubmissionsForTeacher.bind(labController));
export const gradeSubmission = wrap(labController.gradeSubmission.bind(labController));