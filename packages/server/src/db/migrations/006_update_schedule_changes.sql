ALTER TABLE schedule_changes 
ADD COLUMN IF NOT EXISTS lesson_type VARCHAR(50) 
CHECK (lesson_type IN ('lecture', 'lab', 'practice', 'control', 'exam'));

UPDATE schedule_changes SET lesson_type = 'lecture' WHERE lesson_type IS NULL;

ALTER TABLE schedule_changes 
ALTER COLUMN lesson_type SET NOT NULL;