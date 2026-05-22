 CREATE TABLE IF NOT EXISTS schedule_changes (
        id SERIAL PRIMARY KEY,
        class_id INTEGER REFERENCES classes(id) ON DELETE CASCADE,
        subject_id INTEGER REFERENCES subjects(id) ON DELETE CASCADE,
        teacher_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        date DATE NOT NULL,
        lesson_number INTEGER NOT NULL,
        room VARCHAR(50),
        change_type VARCHAR(20) DEFAULT 'replace', -- replace, cancel, moved_to, added
        original_subject_id INTEGER REFERENCES subjects(id) ON DELETE SET NULL,
        original_teacher_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
        notes TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(class_id, date, lesson_number)
    );

    CREATE INDEX IF NOT EXISTS idx_schedule_changes_class ON schedule_changes(class_id);
    CREATE INDEX IF NOT EXISTS idx_schedule_changes_date ON schedule_changes(date);
    CREATE INDEX IF NOT EXISTS idx_schedule_changes_class_date ON schedule_changes(class_id, date);

    DROP TRIGGER IF EXISTS update_schedule_changes_updated_at ON schedule_changes;
    CREATE TRIGGER update_schedule_changes_updated_at
        BEFORE UPDATE ON schedule_changes
        FOR EACH ROW
        EXECUTE FUNCTION update_updated_at_column();
