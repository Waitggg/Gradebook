export type LessonType = 'lecture' | 'lab' | 'practice' | 'control' | 'exam';

export interface CourseProgram {
  id: number;
  subject_id: number;
  class_id: number;
  total_hours: number;
  description: string | null;
  subject_name?: string;
  class_name?: string;
}

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
  materials?: LessonMaterial[];
  teams?: TeamProject[];
}

export interface LessonMaterial {
  id: number;
  course_lesson_id: number;
  title: string;
  file_url: string | null;
  file_name: string | null;
  file_size: number | null;
  mime_type: string | null;
}

export interface TeamProject {
  id: number;
  course_lesson_id: number;
  team_name: string;
  max_members: number;
  members?: TeamMember[];
}

export interface TeamMember {
  id: number;
  team_project_id: number;
  student_id: number;
  student_name?: string;
  role: string;
}

export const lessonTypeLabels: Record<LessonType, string> = {
  lecture: '📖 Лекция',
  lab: '🔬 Лабораторная',
  practice: '✏️ Практика',
  control: '📝 Контрольная',
  exam: '🎓 Экзамен'
};

export const lessonTypeColors: Record<LessonType, string> = {
  lecture: '#3b82f6',
  lab: '#10b981',
  practice: '#f59e0b',
  control: '#ef4444',
  exam: '#8b5cf6'
};