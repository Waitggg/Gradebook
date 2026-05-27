
export interface CourseProgram {
  id: number;
  subject_id: number;
  class_id: number;
  total_hours: number;
  description: string | null;
  created_at: Date;
  updated_at: Date;
}

export type LessonType = 'lecture' | 'lab' | 'practice' | 'control' | 'exam';

export interface CourseLesson {
  id: number;
  course_program_id: number;
  lesson_number: number;
  lesson_type: LessonType;
  title: string;
  description: string | null;
  planned_date: string | null;
  deadline: string | null;
  max_score: number;
  weight: number;
  requirements: string | null;
  created_at: Date;
  updated_at: Date;
}

export interface LessonMaterial {
  id: number;
  course_lesson_id: number;
  title: string;
  file_url: string | null;
  file_name: string | null;
  file_size: number | null;
  mime_type: string | null;
  created_at: Date;
}

export interface TeamProject {
  id: number;
  course_lesson_id: number;
  team_name: string;
  max_members: number;
  created_at: Date;
}

export interface TeamMember {
  id: number;
  team_project_id: number;
  student_id: number;
  role: string;
  joined_at: Date;
}

export interface LessonWithDetails extends CourseLesson {
  materials: LessonMaterial[];
  teams: TeamProject[];
}

export interface CreateProgramDTO {
  subject_id: number;
  class_id: number;
  total_hours?: number;
  description?: string;
}

export interface CreateLessonDTO {
  course_program_id: number;
  lesson_number: number;
  lesson_type: LessonType;
  title: string;
  description?: string;
  planned_date?: string;
  deadline?: string;
  max_score?: number;
  weight?: number;
  requirements?: string;
}

export interface CreateMaterialDTO {
  course_lesson_id: number;
  title: string;
  file_url?: string;
  file_name?: string;
  file_size?: number;
  mime_type?: string;
}

export interface CreateTeamDTO {
  course_lesson_id: number;
  team_name: string;
  max_members?: number;
}

export interface AddTeamMemberDTO {
  team_project_id: number;
  student_id: number;
  role?: string;
}