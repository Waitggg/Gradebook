
CREATE TABLE IF NOT EXISTS course_programs (
    id SERIAL PRIMARY KEY,
    subject_id INTEGER REFERENCES subjects(id) ON DELETE CASCADE,
    class_id INTEGER REFERENCES classes(id) ON DELETE CASCADE,
    total_hours INTEGER DEFAULT 0,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(subject_id, class_id)
);

CREATE TABLE IF NOT EXISTS course_lessons (
    id SERIAL PRIMARY KEY,
    course_program_id INTEGER REFERENCES course_programs(id) ON DELETE CASCADE,
    lesson_number INTEGER NOT NULL,
    lesson_type VARCHAR(50) NOT NULL CHECK (lesson_type IN ('lecture', 'lab', 'practice', 'control', 'exam')),
    title VARCHAR(255) NOT NULL,
    description TEXT,
    planned_date DATE,
    deadline DATE,
    max_score INTEGER DEFAULT 10 CHECK (max_score >= 1 AND max_score <= 100),
    weight INTEGER DEFAULT 1 CHECK (weight >= 0),
    requirements TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS lesson_materials (
    id SERIAL PRIMARY KEY,
    course_lesson_id INTEGER REFERENCES course_lessons(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    file_url TEXT,
    file_name VARCHAR(255),
    file_size INTEGER,
    mime_type VARCHAR(100),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS team_projects (
    id SERIAL PRIMARY KEY,
    course_lesson_id INTEGER REFERENCES course_lessons(id) ON DELETE CASCADE,
    team_name VARCHAR(100) NOT NULL,
    max_members INTEGER DEFAULT 5,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS team_members (
    id SERIAL PRIMARY KEY,
    team_project_id INTEGER REFERENCES team_projects(id) ON DELETE CASCADE,
    student_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    role VARCHAR(50) DEFAULT 'member',
    joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(team_project_id, student_id)
);

ALTER TABLE grades ADD COLUMN IF NOT EXISTS course_lesson_id INTEGER REFERENCES course_lessons(id) ON DELETE SET NULL;
ALTER TABLE grades ADD COLUMN IF NOT EXISTS lesson_type VARCHAR(50);

CREATE INDEX IF NOT EXISTS idx_course_programs_subject ON course_programs(subject_id);
CREATE INDEX IF NOT EXISTS idx_course_programs_class ON course_programs(class_id);
CREATE INDEX IF NOT EXISTS idx_course_lessons_program ON course_lessons(course_program_id);
CREATE INDEX IF NOT EXISTS idx_course_lessons_date ON course_lessons(planned_date);
CREATE INDEX IF NOT EXISTS idx_course_lessons_type ON course_lessons(lesson_type);
CREATE INDEX IF NOT EXISTS idx_lesson_materials_lesson ON lesson_materials(course_lesson_id);
CREATE INDEX IF NOT EXISTS idx_team_projects_lesson ON team_projects(course_lesson_id);
CREATE INDEX IF NOT EXISTS idx_team_members_team ON team_members(team_project_id);
CREATE INDEX IF NOT EXISTS idx_team_members_student ON team_members(student_id);

DROP TRIGGER IF EXISTS update_course_programs_updated_at ON course_programs;
CREATE TRIGGER update_course_programs_updated_at
    BEFORE UPDATE ON course_programs
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_course_lessons_updated_at ON course_lessons;
CREATE TRIGGER update_course_lessons_updated_at
    BEFORE UPDATE ON course_lessons
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();