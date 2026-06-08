// controllers/course_controller.ts
import { Request, Response } from 'express';
import { BaseController } from './base_controller';
import { CourseService } from '../services/course_service';
import { CreateProgramDTO, CreateLessonDTO, CreateMaterialDTO, CreateTeamDTO, AddTeamMemberDTO } from '../types/course_types';

export class CourseController extends BaseController {
  private service: CourseService;
  
  constructor() {
    super();
    this.service = new CourseService();
  }
  
  async getCourseProgram(req: Request, res: Response): Promise<Response> {
    const auth = this.checkAuth(req);
    if (!auth.success) return this.error(res, auth.message!, 401);
    
    const { subjectId, classId } = req.params;
    
    try {
      const program = await this.service.getProgram(subjectId, classId);
      return this.success(res, { program });
    } catch (error) {
      return this.handleError(res, error, 'Ошибка получения программы');
    }
  }
  
  async createOrUpdateProgram(req: Request, res: Response): Promise<Response> {
    const teacherCheck = this.checkTeacher(req);
    if (!teacherCheck.success) return this.error(res, teacherCheck.message!, 403);
    
    const dto: CreateProgramDTO = req.body;
    if (!dto.subject_id || !dto.class_id) {
      return this.error(res, 'subject_id и class_id обязательны', 400);
    }
    
    try {
      const program = await this.service.createOrUpdateProgram(dto);
      return this.success(res, { program });
    } catch (error) {
      return this.handleError(res, error, 'Ошибка сохранения программы');
    }
  }
  
  async deleteProgram(req: Request, res: Response): Promise<Response> {
    const teacherCheck = this.checkTeacher(req);
    if (!teacherCheck.success) return this.error(res, teacherCheck.message!, 403);
    
    const programId = req.params.id;
    
    try {
      await this.service.deleteProgram(programId);
      return this.success(res, { message: 'Программа удалена' });
    } catch (error) {
      return this.handleError(res, error, 'Ошибка удаления программы');
    }
  }
  
  async getProgramLessons(req: Request, res: Response): Promise<Response> {
    const auth = this.checkAuth(req);
    if (!auth.success) return this.error(res, auth.message!, 401);
    
    const programId = req.params.programId;
    
    try {
      const lessons = await this.service.getProgramLessons(programId);
      return this.success(res, { lessons });
    } catch (error) {
      return this.handleError(res, error, 'Ошибка получения занятий');
    }
  }
  
  async createLesson(req: Request, res: Response): Promise<Response> {
    const teacherCheck = this.checkTeacher(req);
    if (!teacherCheck.success) return this.error(res, teacherCheck.message!, 403);
    
    const dto: CreateLessonDTO = req.body;
    if (!dto.course_program_id || !dto.lesson_number || !dto.lesson_type || !dto.title) {
      return this.error(res, 'Не все обязательные поля заполнены', 400);
    }
    
    try {
      const lesson = await this.service.createLesson(dto);
      return this.success(res, { lesson }, 201);
    } catch (error) {
      return this.handleError(res, error, 'Ошибка создания занятия');
    }
  }
  
  async updateLesson(req: Request, res: Response): Promise<Response> {
    const teacherCheck = this.checkTeacher(req);
    if (!teacherCheck.success) return this.error(res, teacherCheck.message!, 403);
    
    const lessonId = req.params.id;
    const updates = req.body;
    
    try {
      const lesson = await this.service.updateLesson(lessonId, updates);
      if (!lesson) {
        return this.error(res, 'Занятие не найдено', 404);
      }
      return this.success(res, { lesson });
    } catch (error) {
      return this.handleError(res, error, 'Ошибка обновления занятия');
    }
  }
  
  async deleteLesson(req: Request, res: Response): Promise<Response> {
    const teacherCheck = this.checkTeacher(req);
    if (!teacherCheck.success) return this.error(res, teacherCheck.message!, 403);
    
    const lessonId = req.params.id;
    
    try {
      await this.service.deleteLesson(lessonId);
      return this.success(res, { message: 'Занятие удалено' });
    } catch (error) {
      return this.handleError(res, error, 'Ошибка удаления занятия');
    }
  }
  
  async getLessonTypeByDate(req: Request, res: Response): Promise<Response> {
    const auth = this.checkAuth(req);
    if (!auth.success) return this.error(res, auth.message!, 401);
    
    const { subjectId, classId, date } = req.params;
    
    try {
      const lesson = await this.service.getLessonTypeByDate(subjectId, classId, date);
      return this.success(res, { lesson });
    } catch (error) {
      return this.handleError(res, error, 'Ошибка получения типа урока');
    }
  }
  
  async addMaterial(req: Request, res: Response): Promise<Response> {
    const teacherCheck = this.checkTeacher(req);
    if (!teacherCheck.success) return this.error(res, teacherCheck.message!, 403);
    
    const dto: CreateMaterialDTO = req.body;
    if (!dto.course_lesson_id || !dto.title) {
      return this.error(res, 'course_lesson_id и title обязательны', 400);
    }
    
    try {
      const material = await this.service.addMaterial(dto);
      return this.success(res, { material }, 201);
    } catch (error) {
      return this.handleError(res, error, 'Ошибка добавления материала');
    }
  }
  
  async deleteMaterial(req: Request, res: Response): Promise<Response> {
    const teacherCheck = this.checkTeacher(req);
    if (!teacherCheck.success) return this.error(res, teacherCheck.message!, 403);
    
    const materialId = req.params.id;
    
    try {
      await this.service.deleteMaterial(materialId);
      return this.success(res, { message: 'Материал удален' });
    } catch (error) {
      return this.handleError(res, error, 'Ошибка удаления материала');
    }
  }
  
  async createTeam(req: Request, res: Response): Promise<Response> {
    const teacherCheck = this.checkTeacher(req);
    if (!teacherCheck.success) return this.error(res, teacherCheck.message!, 403);
    
    const dto: CreateTeamDTO = req.body;
    if (!dto.course_lesson_id || !dto.team_name) {
      return this.error(res, 'course_lesson_id и team_name обязательны', 400);
    }
    
    try {
      const team = await this.service.createTeam(dto);
      return this.success(res, { team }, 201);
    } catch (error) {
      return this.handleError(res, error, 'Ошибка создания команды');
    }
  }
  
  async addTeamMember(req: Request, res: Response): Promise<Response> {
    const teacherCheck = this.checkTeacher(req);
    if (!teacherCheck.success) return this.error(res, teacherCheck.message!, 403);
    
    const dto: AddTeamMemberDTO = req.body;
    if (!dto.team_project_id || !dto.student_id) {
      return this.error(res, 'team_project_id и student_id обязательны', 400);
    }
    
    try {
      const member = await this.service.addTeamMember(dto);
      if (!member) {
        return this.error(res, 'Студент уже в команде', 409);
      }
      return this.success(res, { member }, 201);
    } catch (error) {
      return this.handleError(res, error, 'Ошибка добавления участника');
    }
  }
  
  async removeTeamMember(req: Request, res: Response): Promise<Response> {
    const teacherCheck = this.checkTeacher(req);
    if (!teacherCheck.success) return this.error(res, teacherCheck.message!, 403);
    
    const { teamId, studentId } = req.params;
    
    try {
      await this.service.removeTeamMember(teamId, studentId);
      return this.success(res, { message: 'Участник удален' });
    } catch (error) {
      return this.handleError(res, error, 'Ошибка удаления участника');
    }
  }
  
  async deleteTeam(req: Request, res: Response): Promise<Response> {
    const teacherCheck = this.checkTeacher(req);
    if (!teacherCheck.success) return this.error(res, teacherCheck.message!, 403);
    
    const teamId = req.params.id;
    
    try {
      await this.service.deleteTeam(teamId);
      return this.success(res, { message: 'Команда удалена' });
    } catch (error) {
      return this.handleError(res, error, 'Ошибка удаления команды');
    }
  }
}

// Экспортируем функции-обертки для сохранения обратной совместимости с роутером
const courseController = new CourseController();

const wrap = (fn: Function) => {
  return async (req: Request, res: Response) => {
    try {
      return await fn(req, res);
    } catch (error) {
      console.error('Course Controller Wrapper Error:', error);
      return res.status(500).json({ success: false, message: 'Внутренняя ошибка сервера' });
    }
  };
};

export const getCourseProgram = wrap(courseController.getCourseProgram.bind(courseController));
export const createOrUpdateProgram = wrap(courseController.createOrUpdateProgram.bind(courseController));
export const deleteProgram = wrap(courseController.deleteProgram.bind(courseController));
export const getProgramLessons = wrap(courseController.getProgramLessons.bind(courseController));
export const createLesson = wrap(courseController.createLesson.bind(courseController));
export const updateLesson = wrap(courseController.updateLesson.bind(courseController));
export const deleteLesson = wrap(courseController.deleteLesson.bind(courseController));
export const getLessonTypeByDate = wrap(courseController.getLessonTypeByDate.bind(courseController));
export const addMaterial = wrap(courseController.addMaterial.bind(courseController));
export const deleteMaterial = wrap(courseController.deleteMaterial.bind(courseController));
export const createTeam = wrap(courseController.createTeam.bind(courseController));
export const addTeamMember = wrap(courseController.addTeamMember.bind(courseController));
export const removeTeamMember = wrap(courseController.removeTeamMember.bind(courseController));
export const deleteTeam = wrap(courseController.deleteTeam.bind(courseController));