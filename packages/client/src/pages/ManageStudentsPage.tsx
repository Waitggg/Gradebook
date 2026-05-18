import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

interface Student {
  id: number;
  name: string;
  email: string;
  created_at: string;
}

interface Class {
  id: number;
  name: string;
  year: number;
  created_at: string;
}

interface StudentClass {
  id: number;
  student_id: number;
  class_id: number;
  joined_at: string;
  student_name?: string;
  class_name?: string;
}

interface TeacherSubject {
  id: number;
  teacher_id: number;
  subject_id: number;
  class_id: number;
  teacher_name?: string;
  subject_name?: string;
  class_name?: string;
}

function ManageStudentsPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [userRole, setUserRole] = useState<'teacher' | 'student' | null>(null);
  
  const [students, setStudents] = useState<Student[]>([]);
  const [classes, setClasses] = useState<Class[]>([]);
  const [studentClasses, setStudentClasses] = useState<StudentClass[]>([]);
  const [teachers, setTeachers] = useState<Student[]>([]);
  const [subjects, setSubjects] = useState<{ id: number; name: string }[]>([]);
  const [teacherSubjects, setTeacherSubjects] = useState<TeacherSubject[]>([]);
  
  const [showStudentModal, setShowStudentModal] = useState(false);
  const [showClassModal, setShowClassModal] = useState(false);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [showTeacherSubjectModal, setShowTeacherSubjectModal] = useState(false);
  
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);
  const [editingClass, setEditingClass] = useState<Class | null>(null);
  
  const [studentForm, setStudentForm] = useState({ name: '', email: '', password: '' });
  const [classForm, setClassForm] = useState({ name: '', year: new Date().getFullYear() + 3 });
  const [assignForm, setAssignForm] = useState({ student_id: 0, class_id: 0 });
  const [teacherSubjectForm, setTeacherSubjectForm] = useState({ teacher_id: 0, subject_id: 0, class_id: 0 });

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      const response = await fetch('/api/auth/profile', { credentials: 'include' });
      if (response.ok) {
        const data = await response.json();
        if (data.user.role !== 'teacher') {
          navigate('/profile');
          return;
        }
        setUserRole(data.user.role);
        await loadAllData();
      } else {
        navigate('/login');
      }
    } catch (error) {
      console.error('Auth error:', error);
      navigate('/login');
    } finally {
      setLoading(false);
    }
  };

  const loadAllData = async () => {
    await Promise.all([
      loadStudents(),
      loadClasses(),
      loadStudentClasses(),
      loadTeachers(),
      loadSubjects(),
      loadTeacherSubjects()
    ]);
  };

  const loadStudents = async () => {
    try {
      const response = await fetch('/api/gradebook/students', { credentials: 'include' });
      if (response.ok) {
        const data = await response.json();
        setStudents(data.students || []);
      }
    } catch (error) {
      console.error('Load students error:', error);
    }
  };

  const loadClasses = async () => {
    try {
      const response = await fetch('/api/gradebook/classes', { credentials: 'include' });
      if (response.ok) {
        const data = await response.json();
        setClasses(data.classes || []);
      }
    } catch (error) {
      console.error('Load classes error:', error);
    }
  };

  const loadStudentClasses = async () => {
    try {
      const response = await fetch('/api/gradebook/student-classes', { credentials: 'include' });
      if (response.ok) {
        const data = await response.json();
        setStudentClasses(data.student_classes || []);
      }
    } catch (error) {
      console.error('Load student classes error:', error);
    }
  };

  const loadTeachers = async () => {
    try {
      const response = await fetch('/api/gradebook/teachers', { credentials: 'include' });
      if (response.ok) {
        const data = await response.json();
        setTeachers(data.teachers || []);
      }
    } catch (error) {
      console.error('Load teachers error:', error);
    }
  };

  const loadSubjects = async () => {
    try {
      const response = await fetch('/api/gradebook/subjects', { credentials: 'include' });
      if (response.ok) {
        const data = await response.json();
        setSubjects(data.subjects || []);
      }
    } catch (error) {
      console.error('Load subjects error:', error);
    }
  };

  const loadTeacherSubjects = async () => {
    try {
      const response = await fetch('/api/gradebook/teacher-subjects', { credentials: 'include' });
      if (response.ok) {
        const data = await response.json();
        setTeacherSubjects(data.teacher_subjects || []);
      }
    } catch (error) {
      console.error('Load teacher subjects error:', error);
    }
  };

  const handleCreateStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const response = await fetch('/api/gradebook/students', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(studentForm),
        credentials: 'include'
      });
      if (response.ok) {
        setShowStudentModal(false);
        setStudentForm({ name: '', email: '', password: '' });
        loadStudents();
      } else {
        const error = await response.json();
        alert(error.message || 'Ошибка создания студента');
      }
    } catch (error) {
      console.error('Create student error:', error);
      alert('Ошибка создания студента');
    }
  };

  const handleUpdateStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingStudent) return;
    try {
      const response = await fetch(`/api/gradebook/students/${editingStudent.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: studentForm.name, email: studentForm.email }),
        credentials: 'include'
      });
      if (response.ok) {
        setShowStudentModal(false);
        setEditingStudent(null);
        setStudentForm({ name: '', email: '', password: '' });
        loadStudents();
      } else {
        const error = await response.json();
        alert(error.message || 'Ошибка обновления студента');
      }
    } catch (error) {
      console.error('Update student error:', error);
      alert('Ошибка обновления студента');
    }
  };

  const handleDeleteStudent = async (id: number) => {
    if (!confirm('Вы уверены, что хотите удалить этого студента?')) return;
    try {
      const response = await fetch(`/api/gradebook/students/${id}`, {
        method: 'DELETE',
        credentials: 'include'
      });
      if (response.ok) {
        loadStudents();
        loadStudentClasses();
      } else {
        alert('Ошибка удаления студента');
      }
    } catch (error) {
      console.error('Delete student error:', error);
      alert('Ошибка удаления студента');
    }
  };

  const handleCreateClass = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const response = await fetch('/api/gradebook/classes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(classForm),
        credentials: 'include'
      });
      if (response.ok) {
        setShowClassModal(false);
        setClassForm({ name: '', year: new Date().getFullYear() + 3 });
        loadClasses();
      } else {
        const error = await response.json();
        alert(error.message || 'Ошибка создания класса');
      }
    } catch (error) {
      console.error('Create class error:', error);
      alert('Ошибка создания класса');
    }
  };

  const handleUpdateClass = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingClass) return;
    try {
      const response = await fetch(`/api/gradebook/classes/${editingClass.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(classForm),
        credentials: 'include'
      });
      if (response.ok) {
        setShowClassModal(false);
        setEditingClass(null);
        setClassForm({ name: '', year: new Date().getFullYear() + 3 });
        loadClasses();
      } else {
        const error = await response.json();
        alert(error.message || 'Ошибка обновления класса');
      }
    } catch (error) {
      console.error('Update class error:', error);
      alert('Ошибка обновления класса');
    }
  };

  const handleDeleteClass = async (id: number) => {
    if (!confirm('Вы уверены, что хотите удалить этот класс? Все связи будут удалены.')) return;
    try {
      const response = await fetch(`/api/gradebook/classes/${id}`, {
        method: 'DELETE',
        credentials: 'include'
      });
      if (response.ok) {
        loadClasses();
        loadStudentClasses();
        loadTeacherSubjects();
      } else {
        alert('Ошибка удаления класса');
      }
    } catch (error) {
      console.error('Delete class error:', error);
      alert('Ошибка удаления класса');
    }
  };

  const handleAssignStudentToClass = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const response = await fetch('/api/gradebook/student-classes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(assignForm),
        credentials: 'include'
      });
      if (response.ok) {
        setShowAssignModal(false);
        setAssignForm({ student_id: 0, class_id: 0 });
        loadStudentClasses();
      } else {
        const error = await response.json();
        alert(error.message || 'Ошибка привязки студента');
      }
    } catch (error) {
      console.error('Assign student error:', error);
      alert('Ошибка привязки студента');
    }
  };

  const handleRemoveStudentFromClass = async (studentClassId: number) => {
    if (!confirm('Удалить студента из класса?')) return;
    try {
      const response = await fetch(`/api/gradebook/student-classes/${studentClassId}`, {
        method: 'DELETE',
        credentials: 'include'
      });
      if (response.ok) {
        loadStudentClasses();
      } else {
        alert('Ошибка удаления');
      }
    } catch (error) {
      console.error('Remove student error:', error);
      alert('Ошибка удаления');
    }
  };

  const handleAssignTeacherToSubject = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const response = await fetch('/api/gradebook/teacher-subjects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(teacherSubjectForm),
        credentials: 'include'
      });
      if (response.ok) {
        setShowTeacherSubjectModal(false);
        setTeacherSubjectForm({ teacher_id: 0, subject_id: 0, class_id: 0 });
        loadTeacherSubjects();
      } else {
        const error = await response.json();
        alert(error.message || 'Ошибка назначения');
      }
    } catch (error) {
      console.error('Assign teacher error:', error);
      alert('Ошибка назначения');
    }
  };

  const handleRemoveTeacherSubject = async (id: number) => {
    if (!confirm('Удалить назначение?')) return;
    try {
      const response = await fetch(`/api/gradebook/teacher-subjects/${id}`, {
        method: 'DELETE',
        credentials: 'include'
      });
      if (response.ok) {
        loadTeacherSubjects();
      } else {
        alert('Ошибка удаления');
      }
    } catch (error) {
      console.error('Remove teacher subject error:', error);
      alert('Ошибка удаления');
    }
  };

  if (loading) {
    return <div className="loading">Загрузка...</div>;
  }

  return (
    <div className="manage-container">
      <h1 className="page-title">Управление</h1>
      
      <div className="manage-tabs">
        <div className="tabs-header">
          <button className="tab-btn active">Студенты</button>
          <button className="tab-btn">Классы</button>
          <button className="tab-btn">Привязка студентов</button>
          <button className="tab-btn">Назначение учителей</button>
        </div>
        
        <div className="tab-content active">
          <div className="section-header">
            <h2>Список студентов</h2>
            <button className="btn-primary" onClick={() => {
              setEditingStudent(null);
              setStudentForm({ name: '', email: '', password: '' });
              setShowStudentModal(true);
            }}>+ Добавить студента</button>
          </div>
          
          <div className="data-table-wrapper">
            <table className="data-table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Имя</th>
                  <th>Email</th>
                  <th>Дата регистрации</th>
                  <th>Действия</th>
                </tr>
              </thead>
              <tbody>
                {students.map((student) => (
                  <tr key={student.id}>
                    <td>{student.id}</td>
                    <td>{student.name}</td>
                    <td>{student.email}</td>
                    <td>{new Date(student.created_at).toLocaleDateString()}</td>
                    <td className="actions">
                      <button className="btn-edit" onClick={() => {
                        setEditingStudent(student);
                        setStudentForm({ name: student.name, email: student.email, password: '' });
                        setShowStudentModal(true);
                      }}>✏️</button>
                      <button className="btn-delete" onClick={() => handleDeleteStudent(student.id)}>🗑️</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
      
      <div className="tab-content">
        <div className="section-header">
          <h2>Список классов</h2>
          <button className="btn-primary" onClick={() => {
            setEditingClass(null);
            setClassForm({ name: '', year: new Date().getFullYear() + 3 });
            setShowClassModal(true);
          }}>+ Добавить класс</button>
        </div>
        
        <div className="data-table-wrapper">
          <table className="data-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Название</th>
                <th>Год выпуска</th>
                <th>Дата создания</th>
                <th>Действия</th>
              </tr>
            </thead>
            <tbody>
              {classes.map((classItem) => (
                <tr key={classItem.id}>
                  <td>{classItem.id}</td>
                  <td>{classItem.name}</td>
                  <td>{classItem.year}</td>
                  <td>{new Date(classItem.created_at).toLocaleDateString()}</td>
                  <td className="actions">
                    <button className="btn-edit" onClick={() => {
                      setEditingClass(classItem);
                      setClassForm({ name: classItem.name, year: classItem.year });
                      setShowClassModal(true);
                    }}>✏️</button>
                    <button className="btn-delete" onClick={() => handleDeleteClass(classItem.id)}>🗑️</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      
      <div className="tab-content">
        <div className="section-header">
          <h2>Привязка студентов к классам</h2>
          <button className="btn-primary" onClick={() => setShowAssignModal(true)}>+ Привязать студента</button>
        </div>
        
        <div className="data-table-wrapper">
          <table className="data-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Студент</th>
                <th>Класс</th>
                <th>Дата привязки</th>
                <th>Действия</th>
              </tr>
            </thead>
            <tbody>
              {studentClasses.map((sc) => {
                const student = students.find(s => s.id === sc.student_id);
                const classItem = classes.find(c => c.id === sc.class_id);
                return (
                  <tr key={sc.id}>
                    <td>{sc.id}</td>
                    <td>{student?.name || sc.student_id}</td>
                    <td>{classItem?.name || sc.class_id}</td>
                    <td>{new Date(sc.joined_at).toLocaleDateString()}</td>
                    <td className="actions">
                      <button className="btn-delete" onClick={() => handleRemoveStudentFromClass(sc.id)}>🗑️</button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
      
      <div className="tab-content">
        <div className="section-header">
          <h2>Назначение учителей на предметы</h2>
          <button className="btn-primary" onClick={() => setShowTeacherSubjectModal(true)}>+ Назначить учителя</button>
        </div>
        
        <div className="data-table-wrapper">
          <table className="data-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Учитель</th>
                <th>Предмет</th>
                <th>Класс</th>
                <th>Действия</th>
              </tr>
            </thead>
            <tbody>
              {teacherSubjects.map((ts) => {
                const teacher = teachers.find(t => t.id === ts.teacher_id);
                const subject = subjects.find(s => s.id === ts.subject_id);
                const classItem = classes.find(c => c.id === ts.class_id);
                return (
                  <tr key={ts.id}>
                    <td>{ts.id}</td>
                    <td>{teacher?.name || ts.teacher_id}</td>
                    <td>{subject?.name || ts.subject_id}</td>
                    <td>{classItem?.name || ts.class_id}</td>
                    <td className="actions">
                      <button className="btn-delete" onClick={() => handleRemoveTeacherSubject(ts.id)}>🗑️</button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
      
      {showStudentModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h2>{editingStudent ? 'Редактировать студента' : 'Добавить студента'}</h2>
            <form onSubmit={editingStudent ? handleUpdateStudent : handleCreateStudent}>
              <div className="form-group">
                <label>Имя</label>
                <input type="text" value={studentForm.name} onChange={(e) => setStudentForm({ ...studentForm, name: e.target.value })} required />
              </div>
              <div className="form-group">
                <label>Email</label>
                <input type="email" value={studentForm.email} onChange={(e) => setStudentForm({ ...studentForm, email: e.target.value })} required />
              </div>
              {!editingStudent && (
                <div className="form-group">
                  <label>Пароль</label>
                  <input type="password" value={studentForm.password} onChange={(e) => setStudentForm({ ...studentForm, password: e.target.value })} required />
                </div>
              )}
              <div className="modal-buttons">
                <button type="button" onClick={() => setShowStudentModal(false)}>Отмена</button>
                <button type="submit">Сохранить</button>
              </div>
            </form>
          </div>
        </div>
      )}
      
      {showClassModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h2>{editingClass ? 'Редактировать класс' : 'Добавить класс'}</h2>
            <form onSubmit={editingClass ? handleUpdateClass : handleCreateClass}>
              <div className="form-group">
                <label>Название класса</label>
                <input type="text" value={classForm.name} onChange={(e) => setClassForm({ ...classForm, name: e.target.value })} required />
              </div>
              <div className="form-group">
                <label>Год выпуска</label>
                <input type="number" value={classForm.year} onChange={(e) => setClassForm({ ...classForm, year: parseInt(e.target.value) })} required />
              </div>
              <div className="modal-buttons">
                <button type="button" onClick={() => setShowClassModal(false)}>Отмена</button>
                <button type="submit">Сохранить</button>
              </div>
            </form>
          </div>
        </div>
      )}
      
      {showAssignModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h2>Привязать студента к классу</h2>
            <form onSubmit={handleAssignStudentToClass}>
              <div className="form-group">
                <label>Студент</label>
                <select value={assignForm.student_id} onChange={(e) => setAssignForm({ ...assignForm, student_id: parseInt(e.target.value) })} required>
                  <option value="">Выберите студента</option>
                  {students.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label>Класс</label>
                <select value={assignForm.class_id} onChange={(e) => setAssignForm({ ...assignForm, class_id: parseInt(e.target.value) })} required>
                  <option value="">Выберите класс</option>
                  {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              <div className="modal-buttons">
                <button type="button" onClick={() => setShowAssignModal(false)}>Отмена</button>
                <button type="submit">Сохранить</button>
              </div>
            </form>
          </div>
        </div>
      )}
      
      {showTeacherSubjectModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h2>Назначить учителя на предмет</h2>
            <form onSubmit={handleAssignTeacherToSubject}>
              <div className="form-group">
                <label>Учитель</label>
                <select value={teacherSubjectForm.teacher_id} onChange={(e) => setTeacherSubjectForm({ ...teacherSubjectForm, teacher_id: parseInt(e.target.value) })} required>
                  <option value="">Выберите учителя</option>
                  {teachers.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label>Предмет</label>
                <select value={teacherSubjectForm.subject_id} onChange={(e) => setTeacherSubjectForm({ ...teacherSubjectForm, subject_id: parseInt(e.target.value) })} required>
                  <option value="">Выберите предмет</option>
                  {subjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label>Класс</label>
                <select value={teacherSubjectForm.class_id} onChange={(e) => setTeacherSubjectForm({ ...teacherSubjectForm, class_id: parseInt(e.target.value) })} required>
                  <option value="">Выберите класс</option>
                  {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              <div className="modal-buttons">
                <button type="button" onClick={() => setShowTeacherSubjectModal(false)}>Отмена</button>
                <button type="submit">Сохранить</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default ManageStudentsPage;