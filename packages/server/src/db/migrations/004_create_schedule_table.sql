    CREATE TABLE IF NOT EXISTS lesson_times (
        id SERIAL PRIMARY KEY,
        lesson_number INTEGER NOT NULL UNIQUE,
        start_time TIME NOT NULL,
        end_time TIME NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS schedule (
        id SERIAL PRIMARY KEY,
        class_id INTEGER REFERENCES classes(id) ON DELETE CASCADE,
        subject_id INTEGER REFERENCES subjects(id) ON DELETE CASCADE,
        teacher_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        lesson_number INTEGER NOT NULL,
        day_of_week INTEGER NOT NULL CHECK (day_of_week BETWEEN 1 AND 6),
        room VARCHAR(50),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(class_id, day_of_week, lesson_number)
    );

    CREATE INDEX IF NOT EXISTS idx_schedule_class ON schedule(class_id);
    CREATE INDEX IF NOT EXISTS idx_schedule_teacher ON schedule(teacher_id);
    CREATE INDEX IF NOT EXISTS idx_schedule_day ON schedule(day_of_week);

    DO $$ 
    BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'unique_lesson_time') THEN
            ALTER TABLE lesson_times ADD CONSTRAINT unique_lesson_time UNIQUE (start_time);
        END IF;
    END $$;

    INSERT INTO lesson_times (lesson_number, start_time, end_time) VALUES
        (1, '08:00:00', '8:45:00'),
        (2, '08:55:00', '09:40:00'),
        (3, '09:50:00', '10:35:00'),
        (4, '10:45:00', '11:30:00'),
        (5, '12:00:00', '12:45:00'),
        (6, '12:55:00', '13:40:00'),
        (7, '14:00:00', '14:45:00'),
        (8, '14:55:00', '15:40:00'),
        (9, '15:50:00', '16:35:00'),
        (10, '16:45:00', '17:30:00'),
        (11, '17:40:00', '18:25:00'),
        (12, '18:35:00', '19:20:00')
    ON CONFLICT (lesson_number) DO NOTHING;

    DROP TRIGGER IF EXISTS update_schedule_updated_at ON schedule;
    CREATE TRIGGER update_schedule_updated_at
        BEFORE UPDATE ON schedule
        FOR EACH ROW
        EXECUTE FUNCTION update_updated_at_column();