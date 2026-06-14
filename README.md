# 📚 Gradebook

Современное веб-приложение для управления оценками учащихся с поддержкой реал-тайм обновлений и удобным интерфейсом.

---

## 📋 Содержание

- [Описание проекта](#описание-проекта)
- [Стек технологий](#стек-технологий)
- [Установка](#установка)
- [Запуск](#запуск)
- [Переменные окружения](#переменные-окружения)
- [Архитектура](#архитектура)
- [Backend API](#backend-api)
- [Frontend компоненты](#frontend-компоненты)
- [Типизация данных](#типизация-данных)
- [API Документация](#api-документация)
- [Утилиты и сервисы](#утилиты-и-сервисы)

---

## Описание проекта

**Gradebook** — это полнофункциональное веб-приложение для управления и отслеживания оценок учащихся. Приложение предоставляет удобный интерфейс для:

- 📊 **Управления оценками** — ввод, редактирование и просмотр оценок.
- 👥 **Управления студентами и классами** — создание, редактирование и удаление записей.
- 📈 **Аналитики и отчетов** — просмотр статистики и истории изменений.
- 🔄 **Реал-тайм синхронизации** — мгновенное обновление данных через WebSocket.
- 📁 **Импорта/экспорта** — поддержка работы с Excel файлами (XLSX).
- 🔐 **Аутентификации и авторизации** — безопасный доступ с сессиями и проверкой ролей.

Приложение использует монолитную архитектуру на основе **Monorepo (npm workspaces)** с чётким разделением на фронтенд и бэкенд части, что обеспечивает лёгкость масштабирования и поддержки.

---

## Стек технологий

### 🎨 Frontend (Client)
- **React** `18.3.1` — библиотека для создания пользовательских интерфейсов.
- **TypeScript** `5.7.3` — типизированный JavaScript для безопасности кода.
- **Vite** `8.0.13` — быстрый сборщик и dev-сервер.
- **React Router DOM** `6.30.3` — маршрутизация между страницами.
- **Axios** `1.16.1` — HTTP-клиент для API запросов.
- **Socket.io Client** `4.8.3` — реал-тайм двусторонняя коммуникация.
- **XLSX** `0.18.5` — работа с Excel файлами (импорт/экспорт).
- **ESLint** — линтер для контроля качества кода.

### 🔧 Backend (Server)
- **Express** `4.18.2` — веб-фреймворк для Node.js.
- **TypeScript** `5.3.3` — типизированный JavaScript.
- **PostgreSQL** (`pg` `8.11.3`) — реляционная база данных.
- **Socket.io** `4.8.3` — реал-тайм коммуникация с клиентами.
- **JWT** (`jsonwebtoken` `9.0.2`) — вспомогательная аутентификация.
- **Bcrypt** `5.1.1` — хеширование паролей.
- **Multer** `2.1.1` — обработка загруженных файлов.
- **Express Session** + **Connect PG Simple** — управление сессиями с хранением в БД.
- **CORS** `2.8.5` — поддержка кросс-доменных запросов.
- **Dotenv** `16.6.1` — загрузка переменных окружения.

### 🛠️ Инструменты разработки
- **Monorepo** с **npm workspaces** — управление множественными пакетами в одном репозитории.
- **Concurrently** `8.2.2` — одновременный запуск нескольких процессов (сервер + клиент).
- **Prettier** `3.2.5` — форматирование кода.
- **TSX** `4.7.0` — запуск TypeScript файлов без предварительной компиляции.

---

## Установка

### Требования
- Node.js >= 18
- npm >= 9
- PostgreSQL >= 12

### Шаги установки

1. **Клонируйте репозиторий:**
```bash
git clone [https://github.com/Waitggg/Gradebook.git](https://github.com/Waitggg/Gradebook.git)
cd Gradebook
```

2. **Установите зависимости для всего monorepo:**
```bash
npm install
```

3. **Настройте переменные окружения:**
```bash
npm run setup:env
```
*После выполнения команды отредактируйте созданный файл `.env` в корне проекта, указав ваши данные подключения к БД.*

---

## Запуск

### Режим разработки (Development)

Вы можете запустить оба пакета (client и server) одновременно одной командой из корня:
```bash
npm run dev
```

Или запустить их по отдельности в разных терминалах:
```bash
npm run dev:client    # Фронтенд запустится на http://localhost:5173
npm run dev:server    # Бэкенд запустится на http://localhost:3000
```

### База данных (Миграции и сидирование)
```bash
npm run db:migrate    # Запустить миграции структуры таблиц
npm run db:seed       # Заполнить БД тестовыми демо-данными
```

### Сборка и запуск для Production
```bash
npm run build         # Собрать клиент и сервер
npm start             # Запустить собранное приложение
```

---

## Переменные окружения

Создайте файл `.env` в корне проекта на основе `.env.example`. Вот пример конфигурации:

```env
# Database
DATABASE_URL=postgresql://user:password@localhost:5432/gradebook
DB_HOST=localhost
DB_PORT=5432
DB_USER=postgres
DB_PASSWORD=your_password
DB_NAME=gradebook

# Server
PORT=3000
NODE_ENV=development

# Security
SESSION_SECRET=your-session-secret-key-change-in-production
JWT_SECRET=your-jwt-secret-key-change-in-production

# CORS
CORS_ORIGIN=http://localhost:5173

# Session
SESSION_MAX_AGE=86400000
```

### Описание переменных

| Переменная | Описание | Пример |
| :--- | :--- | :--- |
| **DATABASE_URL** | Полная строка подключения к БД | `postgresql://user:pass@localhost:5432/gradebook` |
| **DB_HOST** | Хост базы данных | `localhost` |
| **DB_PORT** | Порт PostgreSQL | `5432` |
| **DB_USER** | Пользователь БД | `postgres` |
| **DB_PASSWORD** | Пароль БД | `secure_password` |
| **DB_NAME** | Название базы данных | `gradebook` |
| **PORT** | Порт бэкенд-сервера | `3000` |
| **NODE_ENV** | Окружение разработки | `development` или `production` |
| **SESSION_SECRET**| Секретный ключ сессии | `random-string-here` |
| **JWT_SECRET** | Секретный ключ JWT токенов | `random-string-here` |
| **CORS_ORIGIN** | Разрешённый источник для CORS | `http://localhost:5173` |
| **SESSION_MAX_AGE**| Время жизни сессии в миллисекундах | `86400000` (24 часа) |

---

## Архитектура

### Общая схема системы

```text
┌─────────────────────────────────────────────────────────┐
│                     Gradebook System                    │
└─────────────────────────────────────────────────────────┘
                             │
            ┌─────────────────┼─────────────────┐
            │                 │                 │
        ┌───▼────┐        ┌──▼──┐         ┌────▼────┐
        │ Frontend│        │WebSocket      │ REST API│
        │ (React) │        │(Socket.io)    │(Express)│
        └───┬────┘        └──┬──┘         └────┬────┘
            │                 │                 │
            └─────────────────┼─────────────────┘
                              │
                     ┌────────▼─────────┐
                     │   Express Server │
                     │   (Node.js + TS) │
                     └────────┬─────────┘
                              │
                     ┌────────▼─────────┐
                     │   PostgreSQL     │
                     │   Database       │
                     └──────────────────┘
```

### Слоёная архитектура Backend

```text
┌─────────────────────────────────────────┐
│              Routes Layer               │
│  (auth_routes, gradebook_routes, etc)   │
└─────────────┬───────────────────────────┘
              │
┌─────────────▼───────────────────────────┐
│           Controllers Layer             │
│  (auth_controller, gradebook_controller)│
└─────────────┬───────────────────────────┘
              │
┌─────────────▼───────────────────────────┐
│             Services Layer              │
│   (Business logic & DB operations)      │
└─────────────┬───────────────────────────┘
              │
┌─────────────▼───────────────────────────┐
│            Database Layer               │
│  (Migrations, Pool connection)          │
└─────────────┬───────────────────────────┘
              │
              ▼
         PostgreSQL DB
```

### Основные слои бэкенда:
- **Routes:** Определяют эндпоинты, пути и сопоставленные им HTTP-методы.
- **Controllers:** Обрабатывают входящие запросы, вызывают бизнес-логику и возвращают ответы.
- **Services:** Содержат чистую бизнес-логику и осуществляют непосредственные операции с БД.
- **Middlewares:** Отвечают за аутентификацию, валидацию данных и централизованную обработку ошибок.
- **Database:** Скрипты миграций, конфигурация пула подключений (`pg.Pool`) и реляционная схема.
- **WebSocket:** Модуль для обеспечения мгновенной отправки событий через `Socket.io`.

### 📁 Структура проекта

```text
Gradebook/
├── packages/
│   ├── client/                     # React приложение
│   │   ├── src/
│   │   │   ├── components/         # React компоненты
│   │   │   │   ├── Header.tsx
│   │   │   │   ├── Notification.tsx
│   │   │   │   ├── GradeTable.tsx
│   │   │   │   └── ...
│   │   │   ├── pages/              # Страницы
│   │   │   │   ├── LoginPage.tsx
│   │   │   │   ├── GradebookPage.tsx
│   │   │   │   ├── SchedulePage.tsx
│   │   │   │   ├── ProfilePage.tsx
│   │   │   │   ├── ManageStudentsPage.tsx
│   │   │   │   ├── LabStudentPage.tsx
│   │   │   │   ├── TeacherLabCheckPage.tsx
│   │   │   │   └── CourseProgramPage.tsx
│   │   │   ├── hooks/              # Custom React hooks
│   │   │   │   ├── useWebSocket.ts
│   │   │   │   └── ...
│   │   │   ├── types/              # TypeScript типы
│   │   │   │   ├── index.ts
│   │   │   │   └── api.ts
│   │   │   ├── services/           # API и утилиты
│   │   │   │   ├── api.ts
│   │   │   │   ├── socket.ts
│   │   │   │   └── ...
│   │   │   ├── assets/             # Изображения, иконки
│   │   │   ├── App.tsx             # Главный компонент с маршрутами
│   │   │   ├── App.css             # Глобальные стили
│   │   │   ├── index.css
│   │   │   └── main.tsx            # Точка входа
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   ├── vite.config.ts
│   │   └── index.html
│   │
│   └── server/                     # Express приложение
│       ├── src/
│       │   ├── controllers/        # Обработчики запросов
│       │   │   ├── auth_controller.ts
│       │   │   ├── gradebook_controller.ts
│       │   │   ├── course_controller.ts
│       │   │   └── ...
│       │   ├── services/           # Бизнес-логика
│       │   │   ├── base_service.ts      # Базовый класс
│       │   │   ├── auth_validator.ts    # Валидация
│       │   │   ├── course_service.ts
│       │   │   ├── lab_service.ts
│       │   │   └── ...
│       │   ├── routes/             # API маршруты
│       │   │   ├── auth_routes.ts
│       │   │   ├── gradebook_routes.ts
│       │   │   ├── course_routes.ts
│       │   │   ├── lab_routes.ts
│       │   │   └── schedule_routes.ts
│       │   ├── middlewares/        # Middleware функции
│       │   │   ├── auth_middleware.ts
│       │   │   └── ...
│       │   ├── db/                 # База данных
│       │   │   ├── migrations/     # SQL миграции
│       │   │   │   ├── 001_init.sql
│       │   │   │   └── ...
│       │   │   ├── pool.ts         # Подключение к БД
│       │   │   └── schema.sql      # Схема БД
│       │   ├── types/              # TypeScript типы
│       │   │   ├── auth_types.ts
│       │   │   ├── course_types.ts
│       │   │   └── roles.ts
│       │   ├── utils/              # Вспомогательные функции
│       │   │   ├── asyncHandler.ts
│       │   │   └── ...
│       │   └── index.ts            # Точка входа
│       ├── package.json
│       ├── tsconfig.json
│       └── .env.example
│
├── .env.example               # Пример переменных окружения
├── .gitignore
├── package.json                # Корневой конфиг (workspaces)
├── package-lock.json
└── README.md                  # Этот файл
```

---

## Backend API

**Базовый URL:** `http://localhost:3000/api`

### 🔐 Аутентификация (Auth Routes)
Базовый путь: `/api/auth`

* **POST `/api/auth/register`** — Регистрация пользователя.
    * *Body:* `{"email": "...", "password": "...", "name": "...", "role": "teacher"}` (роли: `teacher`, `student`, `admin`)
* **POST `/api/auth/login`** — Вход в систему (устанавливает Cookie сессии).
    * *Body:* `{"email": "...", "password": "..."}`
* **GET `/api/auth/profile`** — Получение профиля текущего авторизованного пользователя.
* **POST `/api/auth/logout`** — Удаление текущей сессии.

### 📊 Журнал оценок (Gradebook Routes)
Базовый путь: `/api/gradebook`

#### Предметы (Subjects)
- `GET /subjects` — Получить список всех предметов.
- `POST /subjects` — Создать новый предмет (`name`, `description`).
- `PUT /subjects/:id` — Обновить данные предмета.
- `DELETE /subjects/:id` — Удалить предмет.

#### Классы (Classes)
- `GET /classes` — Получить все классы.
- `GET /myClasses` — Получить классы конкретного преподавателя.
- `POST /classes` — Создать класс (`name`, `academicYear`).
- `PUT /classes/:id` — Изменить класс.
- `DELETE /classes/:id` — Удалить класс.

#### Студенты (Students)
- `GET /students` — Список всех студентов.
- `POST /students` — Создать профиль студента.
- `GET /classes/:classId/students` — Получить студентов определённого класса.
- `POST /student-classes` — Привязать студента к классу (`studentId`, `classId`).

#### Оценки (Grades)
- `POST /grades` — Добавить оценку (`studentId`, `subjectId`, `grade`, `date`).
- `GET /grades/student/:studentId` — История оценок студента.
- `GET /grades/average/:studentId` — Средний балл студента.
- `GET /classes/:classId/grades` — Все оценки по классу.
- `DELETE /grades` — Удалить оценку по `id` в теле запроса.

#### Посещаемость (Attendance)
- `POST /attendance` — Отметить статус (`studentId`, `subjectId`, `date`, `status`: `present`/`absent`/`late`).
- `GET /attendance/student/:studentId` — Посещаемость конкретного учащегося.

#### Домашние задания (Homework)
- `POST /homework` — Опубликовать задание для класса.
- `GET /homework?classId=1&subjectId=1` — Фильтр заданий.
- `POST /homework/:id/submit` — Отправка решения студентом.

#### Расписание (Schedule)
- `GET /schedule/class/:classId` — Расписание класса.
- `GET /teacher/schedule` — График уроков преподавателя.
- `POST /schedule` — Добавить позицию в расписание.

#### Панель управления (Dashboard)
- `GET /dashboard` — Общая статистика для главной страницы (кол-во студентов, средний балл, посещаемость, последние изменения).

### 📚 Курсы и программы (Course Routes)
Базовый путь: `/api/course`

- `GET /program/:subjectId/:classId` — Просмотр учебной программы.
- `POST /program` — Создать/обновить программу курса (`totalHours`, `description`).
- `POST /lessons` — Добавить урок в программу (`topic`, `lessonType`, `date`).
- `POST /materials` — Прикрепить к уроку файлы (лекции, методички).
- `POST /teams` — Создать учебную команду внутри класса для групповых проектов.

---

## Frontend компоненты

### Основные компоненты

#### Header компонент
* **Путь:** `packages/client/src/components/Header.tsx`
* Главная компонента навигации, отображает:
    * Логотип приложения
    * Меню навигации (адаптивное для мобильных устройств)
    * Профиль пользователя с аватаром
    * Уведомления о новых оценках
* **Свойства (Props):**
```typescript
interface HeaderProps {
  user?: User;
  onLogout?: () => void;
}

interface User {
  id: string;
  name: string;
  email: string;
  role: 'teacher' | 'student' | 'admin';
}
```
* **Использование:**
```tsx
import Header from './components/Header';

<Header />
```
* **Возможности:**
    * 📱 Адаптивное меню для мобильных устройств
    * 🎯 Подсветка активного пункта меню
    * 👤 Отображение информации пользователя
    * 🔔 Интеграция с уведомлениями

#### Notification компонент
* **Путь:** `packages/client/src/components/Notification.tsx`
* Компонента для отображения уведомлений в реал-тайм:
    * Новые оценки
    * Обновления расписания
    * Сообщения от учителей
* **Функционал:**
    * 🔔 Отображение количества непрочитанных уведомлений
    * 🎯 Кликабельное уведомление с деталями
    * ✅ Отметить прочитанным
    * 🗑️ Удалить уведомление

### Страницы приложения

#### LoginPage
* **Путь:** `packages/client/src/pages/LoginPage.tsx`
* Страница аутентификации пользователя: форма входа (email/пароль), форма регистрации, валидация данных и обработка ошибок.

#### ProfilePage
* **Путь:** `packages/client/src/pages/ProfilePage.tsx`
* Страница профиля пользователя: просмотр информации профиля, редактирование личных данных, смена текущего пароля и выход из системы.

#### GradebookPage
* **Путь:** `packages/client/src/pages/GradebookPage.tsx`
* Основная страница журнала оценок: детальный просмотр успеваемости, добавление/редактирование оценок преподавателями, фильтрация по предметам/студентам и импорт/экспорт в Excel.

#### SchedulePage
* **Путь:** `packages/client/src/pages/SchedulePage.tsx`
* Страница расписания: просмотр текущего расписания класса, расписание преподавателя, создание/редактирование сетки занятий и отправка реал-тайм уведомлений об изменениях.

#### ManageStudentsPage
* **Путь:** `packages/client/src/pages/ManageStudentsPage.tsx`
* Страница управления студентами (для администраторов и учителей): сводный список студентов, добавление новых профилей, редактирование информации, удаление записей и привязка к учебным классам.

#### LabStudentPage
* **Путь:** `packages/client/src/pages/LabStudentPage.tsx`
* Страница для студентов с лабораторными работами: актуальный список лабораторных работ, загрузка выполненных решений, история отправленных файлов и полученные оценки за каждую работу.

#### TeacherLabCheckPage
* **Путь:** `packages/client/src/pages/TeacherLabCheckPage.tsx`
* Страница для проверки лабораторных работ учителем: список поступивших на проверку решений, удобный просмотр и выставление оценок, добавление комментариев и мгновенная отправка результатов студенту.

#### CourseProgramPage
* **Путь:** `packages/client/src/pages/CourseProgramPage.tsx`
* Страница программы курса: просмотр структуры обучения, список уроков, скачивание материалов лекций, организация командных проектов и общий график выполнения.

---

## Типизация данных

### Backend типы

#### Auth типы
* **Путь:** `packages/server/src/types/auth_types.ts`
```typescript
// Роли пользователя
export type Role = 'teacher' | 'student' | 'admin';

// Интерфейс сессии Express
interface SessionData {
  userId: string;
  userEmail: string;
  userRole: Role;
  isLoggedIn: boolean;
}

// Тело запроса аутентификации
interface AuthRequestBody {
  email: string;
  password: string;
}

// Ответ аутентификации
interface AuthResponseBody {
  status: number;
  success: boolean;
  message: string;
  user?: {
    id: string;
    email: string;
    name?: string;
    role: Role;
    creationDate?: Date;
  };
}

// Результат валидации
interface ValidationResult {
  success: boolean;
  error: string | null;
}

// DTO для создания пользователя
interface CreateUserDTO {
  email: string;
  password: string;
  name: string;
  role?: Role;
}

// Модель пользователя
interface IUser {
  id: string;
  email: string;
  password: string;
  name: string;
  creationDate: Date;
  role: Role;
}

// Класс User с методами
class User implements IUser {
  id: string;
  email: string;
  password: string;
  name: string;
  creationDate: Date;
  role: Role;

  // Статический метод создания
  static async createNew(
    email: string,
    password: string,
    name: string,
    role?: Role
  ): Promise<User>;

  // Методы проверки роли
  isTeacher(): boolean;
  isStudent(): boolean;

  // Преобразование в JSON
  toJSON(): UserResponseDTO;
}
```

#### Course типы
* **Путь:** `packages/server/src/types/course_types.ts`
```typescript
// Интерфейс программы курса
export interface CourseProgram {
  id: number;
  subject_id: number;
  class_id: number;
  total_hours: number;
  description: string | null;
  created_at: Date;
  updated_at: Date;
}

// Тип урока
export type LessonType = 'lecture' | 'lab' | 'practice' | 'control' | 'exam';

// Интерфейс урока курса
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

// Интерфейс материала урока
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

// Интерфейс командного проекта
export interface TeamProject {
  id: number;
  course_lesson_id: number;
  team_name: string;
  max_members: number;
  created_at: Date;
}

// Интерфейс члена команды
export interface TeamMember {
  id: number;
  team_project_id: number;
  student_id: number;
  role: string;
  joined_at: Date;
}

// Урок с деталями
export interface LessonWithDetails extends CourseLesson {
  materials: LessonMaterial[];
  teams: TeamProject[];
}

// DTO для создания программы
export interface CreateProgramDTO {
  subject_id: number;
  class_id: number;
  total_hours?: number;
  description?: string;
}

// DTO для создания урока
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
```

#### Роли
* **Путь:** `packages/server/src/types/roles.ts`
```typescript
export type UserRole = 'teacher' | 'student' | 'admin';

export const ROLES = {
  TEACHER: 'teacher' as const,
  STUDENT: 'student' as const,
  ADMIN: 'admin' as const,
};
```

### Frontend типы

#### Пользователь
```typescript
interface User {
  id: string;
  name: string;
  email: string;
  role: 'teacher' | 'student' | 'admin';
  creationDate?: Date;
}
```

#### Оценка
```typescript
interface Grade {
  id: number;
  studentId: number;
  subjectId: number;
  grade: number;
  date: string;
  comment?: string;
  gradeType?: string;
}
```

#### Расписание
```typescript
interface ScheduleItem {
  id: number;
  classId: number;
  subjectId: number;
  dayOfWeek: string;
  startTime: string;
  endTime: string;
  room: string;
}
```

---

## API Документация

### Структура ответов API
Все ответы имеют единообразный и предсказуемый формат:

```typescript
// Успешный ответ
{
  "success": true,
  "data": { /* возвращаемые данные */ },
  "message": "Операция выполнена успешно"
}

// Ошибка
{
  "success": false,
  "error": "Описание ошибки",
  "statusCode": 400
}
```

### Примеры запросов (cURL)

#### Получить все оценки студента
```bash
curl -X GET http://localhost:3000/api/gradebook/grades/student/1 \
  -H "Content-Type: application/json" \
  --cookie "sessionId=your_session_id"
```

#### Добавить новую оценку
```bash
curl -X POST http://localhost:3000/api/gradebook/grades \
  -H "Content-Type: application/json" \
  --cookie "sessionId=your_session_id" \
  -d '{
    "studentId": 1,
    "subjectId": 2,
    "grade": 5,
    "date": "2024-06-14"
  }'
```

#### Получить расписание класса
```bash
curl -X GET http://localhost:3000/api/gradebook/schedule/class/1 \
  -H "Content-Type: application/json" \
  --cookie "sessionId=your_session_id"
```

#### Создать программу курса
```bash
curl -X POST http://localhost:3000/api/course/program \
  -H "Content-Type: application/json" \
  --cookie "sessionId=your_session_id" \
  -d '{
    "subjectId": 1,
    "classId": 1,
    "totalHours": 80,
    "description": "Программа по математике"
  }'
```

### Аутентификация
Приложение использует надежную **Session-based** аутентификацию:
1. **Вход:** Пользователь отправляет валидный email и пароль на сервер.
2. **Проверка:** Сервер сверяет данные и хэш пароля.
3. **Сессия:** Сервер генерирует сессию и сохраняет её в PostgreSQL через `Connect PG Simple`.
4. **Cookie:** Клиент получает cookie с зашифрованным `sessionId`.
5. **Последующие запросы:** Браузер автоматически прикрепляет Cookie к каждому исходящему запросу.

```typescript
// Пример: Вход POST /api/auth/login
{
  "email": "user@example.com",
  "password": "password123"
}

// Ответ содержит заголовок Set-Cookie с идентификатором сессии
Set-Cookie: sessionId=abc123...; HttpOnly; SameSite=Lax
```

### Пагинация
```typescript
// Запрос с пагинацией
GET /api/gradebook/students?page=1&limit=20

// Ответ
{
  "data": [ /* массив студентов */ ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 150,
    "totalPages": 8
  }
}
```

### Фильтрация
```typescript
// Получить оценки с фильтрацией по дате и предмету
GET /api/gradebook/grades/student/1?date=2024-06-14&subject=1

// Получить студентов с фильтром по классу и статусу
GET /api/gradebook/students?class=1&status=active
```

---

## WebSocket События (Real-time)

Синхронизация между клиентами реализована на базе `Socket.io`.

```typescript
// Пример работы на стороне клиента:

// 1. Подключение и передача контекста пользователя
socket.emit('user:connect', { userId: 1 });

// 2. Слушатель мгновенного обновления оценок
socket.on('grade:updated', (data) => {
  console.log('Оценка была обновлена в базе данных:', data);
});

// 3. Слушатель изменений в расписании
socket.on('schedule:changed', (data) => {
  console.log('Расписание перестроено:', data);
});
```

### HTTP Коды ответов API
- `200 OK` — Успешный запрос.
- `201 Created` — Ресурс успешно создан.
- `400 Bad Request` — Ошибка валидации или неверный формат тела запроса.
- `401 Unauthorized` — Отсутствует или недействительна сессия авторизации.
- `403 Forbidden` — Недостаточно прав (например, студент пытается поставить оценку).
- `404 Not Found` — Ресурс или эндпоинт не найден.
- `500 Internal Server Error` — Критическая ошибка на стороне сервера.

---

## Утилиты и сервисы

### Backend сервисы

#### BaseService
* **Путь:** `packages/server/src/services/base_service.ts`
* Базовый абстрактный класс для всех сервисов, предоставляющий методы низкоуровневой работы с БД:
```typescript
export class BaseService {
  protected pool: Pool;

  constructor();

  // Выполнить SELECT запрос
  async query<T>(sql: string, params?: any[]): Promise<T[]>;

  // Получить один результат
  async single<T>(sql: string, params?: any[]): Promise<T | null>;

  // Выполнить INSERT/UPDATE/DELETE
  async mutation(sql: string, params?: any[]): Promise<QueryResult>;

  // Проверить существование записи
  async exists(sql: string, params?: any[]): Promise<boolean>;

  // Выполнить транзакцию
  async transaction<T>(callback: (client: any) => Promise<T>): Promise<T>;
}
```
* **Пример расширения базового класса:**
```typescript
class StudentService extends BaseService {
  async getStudentById(id: number) {
    return this.single<Student>(
      'SELECT * FROM students WHERE id = $1',
      [id]
    );
  }

  async getAllStudents() {
    return this.query<Student>('SELECT * FROM students');
  }

  async createStudent(data: CreateStudentDTO) {
    return this.mutation(
      'INSERT INTO students (name, email) VALUES ($1, $2)',
      [data.name, data.email]
    );
  }
}
```

#### Auth Validator
* **Путь:** `packages/server/src/services/auth_validator.ts`
* Валидация входных данных при регистрации и аутентификации:
```typescript
export function validateAuth(body: AuthRequestBody): ValidationResult {
  if (!body) {
    return { success: false, error: 'Тело запроса пустое' };
  }

  const { email, password } = body;

  if (!email || !password) {
    return { success: false, error: 'Email и пароль обязательны' };
  }

  return { success: true, error: null };
}
```
* **Использование:**
```typescript
const validation = validateAuth(req.body);
if (!validation.success) {
  return res.status(400).json({ error: validation.error });
}
```

### Backend утилиты

#### Async Handler
* **Путь:** `packages/server/src/utils/asyncHandler.ts`
* Утилита-обёртка для безопасной обработки асинхронных роутов Express и перехвата ошибок:
```typescript
// Оборачивает асинхронную функцию и ловит ошибки
export const asyncHandler = (fn: AsyncHandler) => {
  return async (req: Request, res: Response) => {
    try {
      return await fn(req, res);
    } catch (error) {
      console.error(`Error in ${fn.name}:`, error);
      return res.status(500).json({
        success: false,
        message: 'Внутренняя ошибка сервера'
      });
    }
  };
};

// Оборачивает функцию и проверяет аутентификацию/роли
export const withAuth = (
  fn: AsyncHandler,
  requireTeacher: boolean = false) => {
  return async (req: Request, res: Response) => {
    const session = req.session as SessionWithUser;

    if (!session.userId) {
      return res.status(401).json({
        success: false,
        message: 'Не авторизован'
      });
    }

    if (requireTeacher && session.userRole !== 'teacher') {
      return res.status(403).json({
        success: false,
        message: 'Доступ запрещен'
      });
    }

    return asyncHandler(fn)(req, res);
  };
};
```
* **Пример использования в контроллере и роутере:**
```typescript
// Контроллер
export const addGrade = asyncHandler(async (req: Request, res: Response) => {
  const { studentId, subjectId, grade, date } = req.body;
  
  const result = await gradeService.addGrade({
    studentId,
    subjectId,
    grade,
    date
  });

  return res.json({ success: true, data: result });
});

// Роутер
router.post('/grades', withAuth(addGrade));
```

### Клиентские хуки (`useWebSocket.ts`)
Кастомный React-хук для работы с потоком уведомлений и синхронизации с бэкендом через нативные всплывающие окна браузера (сервис `Notification API`):

```typescript
export function useWebSocket() {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    const newSocket = io('http://localhost:3000', { withCredentials: true });
    setSocket(newSocket);

    newSocket.on('new_grade', (data: Notification) => {
      setNotifications(prev => [data, ...prev]);
      setUnreadCount(prev => prev + 1);
      
      if (Notification.permission === 'granted') {
        new Notification('Новая оценка!', { body: `${data.subject_name}: ${data.grade}` });
      }
    });

    return () => { newSocket.close(); };
  }, []);

  return { socket, notifications, unreadCount, markAsRead: () => setUnreadCount(0) };
}
```
```
