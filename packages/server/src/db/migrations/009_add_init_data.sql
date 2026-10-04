-- заполнение тестовыми данными
INSERT INTO users (email, password_hash, name, role) VALUES
    ('jabi22@enjo.com', '$2b$10$oPxV/u2MP1geqT5N8O/e1.6o2fei1eQhC3sVrUgk/wETtuzj2y6Ia', 'Иван Иванович (Учитель)', 'teacher'),
    ('petrov@enjo.com', '$2b$10$GEC5XbuK5lTbH2HQUl2wW.M1mYVNWbu5kun0tjbfy4eG8PfMkZO5u', 'Петр Петров (Учитель)', 'teacher'),
    ('student1@enjo.com', '$2b$10$045UpR3Gbh1rm8BLqABGk.FTYAXcvySNHkMenb86SPtDBg3X8znZe', 'Алексей Иванов', 'student'),
    ('student2@enjo.com', '52', 'Мария Сидорова', 'student'),
    ('student3@enjo.com', '2', 'Дмитрий Кузнецов', 'student')
ON CONFLICT (email) DO NOTHING;

INSERT INTO student_classes (student_id, class_id) VALUES
    ((SELECT id FROM users WHERE email = 'student1@enjo.com'), (SELECT id FROM classes WHERE name = 'Т-391')),
    ((SELECT id FROM users WHERE email = 'student2@enjo.com'), (SELECT id FROM classes WHERE name = 'Т-391')),
    ((SELECT id FROM users WHERE email = 'student3@enjo.com'), (SELECT id FROM classes WHERE name = 'Т-392'))
ON CONFLICT DO NOTHING;

INSERT INTO teacher_subjects (teacher_id, subject_id, class_id) VALUES
    ((SELECT id FROM users WHERE email = 'jabi22@enjo.com'), (SELECT id FROM subjects WHERE name = 'КПиЯП'), (SELECT id FROM classes WHERE name = 'Т-391')),
    ((SELECT id FROM users WHERE email = 'jabi22@enjo.com'), (SELECT id FROM subjects WHERE name = 'ПСС'), (SELECT id FROM classes WHERE name = 'Т-391')),
    ((SELECT id FROM users WHERE email = 'petrov@enjo.com'), (SELECT id FROM subjects WHERE name = 'ЗКИ'), (SELECT id FROM classes WHERE name = 'Т-392'))
ON CONFLICT DO NOTHING;

INSERT INTO schedule (class_id, subject_id, teacher_id, lesson_number, day_of_week, room) VALUES
    ((SELECT id FROM classes WHERE name = 'Т-391'), (SELECT id FROM subjects WHERE name = 'КПиЯП'), (SELECT id FROM users WHERE email = 'jabi22@enjo.com'), 1, 1, 'Кабинет 301'),
    ((SELECT id FROM classes WHERE name = 'Т-391'), (SELECT id FROM subjects WHERE name = 'ПСС'), (SELECT id FROM users WHERE email = 'jabi22@enjo.com'), 2, 1, 'Кабинет 305'),
    ((SELECT id FROM classes WHERE name = 'Т-392'), (SELECT id FROM subjects WHERE name = 'ЗКИ'), (SELECT id FROM users WHERE email = 'petrov@enjo.com'), 3, 2, 'Кабинет 102')
ON CONFLICT DO NOTHING;

INSERT INTO homework (subject_id, teacher_id, title, description, due_date) VALUES
    ((SELECT id FROM subjects WHERE name = 'КПиЯП'), (SELECT id FROM users WHERE email = 'jabi22@enjo.com'), 'Лабораторная работа №1', 'Разработать консольное приложение на Node.js', CURRENT_DATE + INTERVAL '7 days'),
    ((SELECT id FROM subjects WHERE name = 'ПСС'), (SELECT id FROM users WHERE email = 'jabi22@enjo.com'), 'Практическое задание', 'Сверстать адаптивный макет профиля', CURRENT_DATE + INTERVAL '3 days')
ON CONFLICT DO NOTHING;

INSERT INTO grades (student_id, subject_id, teacher_id, grade, grade_date, semester, comment, grade_type) VALUES
    ((SELECT id FROM users WHERE email = 'student1@enjo.com'), (SELECT id FROM subjects WHERE name = 'КПиЯП'), (SELECT id FROM users WHERE email = 'jabi22@enjo.com'), 9, CURRENT_DATE, 1, 'Отличная работа на уроке', 'classwork'),
    ((SELECT id FROM users WHERE email = 'student2@enjo.com'), (SELECT id FROM subjects WHERE name = 'КПиЯП'), (SELECT id FROM users WHERE email = 'jabi22@enjo.com'), 5, CURRENT_DATE, 1, 'Нужно повторить теорию', 'test')
ON CONFLICT DO NOTHING;
