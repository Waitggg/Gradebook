ALTER TABLE schedule DROP CONSTRAINT IF EXISTS schedule_lesson_number_check;

ALTER TABLE schedule ADD CONSTRAINT schedule_lesson_number_check 
CHECK (lesson_number >= 1 AND lesson_number <= 12);