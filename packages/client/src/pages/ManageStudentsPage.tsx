import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

interface Student {
  id: number;
  name: string;
  email: string;
  created_at: string;
}

interface Teacher {
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

interface Subject {
  id: number;
  name: string;
  description: string;
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
  const [activeTab, setActiveTab] = useState('students');
  
  const [students, setStudents] = useState<Student[]>([]);
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [classes, setClasses] = useState<Class[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [studentClasses, setStudentClasses] = useState<StudentClass[]>([]);
  const [teacherSubjects, setTeacherSubjects] = useState<TeacherSubject[]>([]);
  
  const [showStudentModal, setShowStudentModal] = useState(false);
  const [showTeacherModal, setShowTeacherModal] = useState(false);
  const [showClassModal, setShowClassModal] = useState(false);
  const [showSubjectModal, setShowSubjectModal] = useState(false);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [showTeacherSubjectModal, setShowTeacherSubjectModal] = useState(false);
  
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);
  const [editingTeacher, setEditingTeacher] = useState<Teacher | null>(null);
  const [editingClass, setEditingClass] = useState<Class | null>(null);
  const [editingSubject, setEditingSubject] = useState<Subject | null>(null);
  
  const [studentForm, setStudentForm] = useState({ name: '', email: '', password: '' });
  const [teacherForm, setTeacherForm] = useState({ name: '', email: '', password: '' });
  const [classForm, setClassForm] = useState({ name: '', year: new Date().getFullYear() + 3 });
  const [subjectForm, setSubjectForm] = useState({ name: '', description: '' });
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
      loadTeachers(),
      loadClasses(),
      loadSubjects(),
      loadStudentClasses(),
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

  const handleCreateTeacher = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const response = await fetch('/api/gradebook/teachers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(teacherForm),
        credentials: 'include'
      });
      if (response.ok) {
        setShowTeacherModal(false);
        setTeacherForm({ name: '', email: '', password: '' });
        loadTeachers();
      } else {
        const error = await response.json();
        alert(error.message || 'Ошибка создания учителя');
      }
    } catch (error) {
      console.error('Create teacher error:', error);
      alert('Ошибка создания учителя');
    }
  };

  const handleUpdateTeacher = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTeacher) return;
    try {
      const response = await fetch(`/api/gradebook/teachers/${editingTeacher.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: teacherForm.name, email: teacherForm.email }),
        credentials: 'include'
      });
      if (response.ok) {
        setShowTeacherModal(false);
        setEditingTeacher(null);
        setTeacherForm({ name: '', email: '', password: '' });
        loadTeachers();
      } else {
        const error = await response.json();
        alert(error.message || 'Ошибка обновления учителя');
      }
    } catch (error) {
      console.error('Update teacher error:', error);
      alert('Ошибка обновления учителя');
    }
  };

  const handleDeleteTeacher = async (id: number) => {
    if (!confirm('Вы уверены, что хотите удалить этого учителя?')) return;
    try {
      const response = await fetch(`/api/gradebook/teachers/${id}`, {
        method: 'DELETE',
        credentials: 'include'
      });
      if (response.ok) {
        loadTeachers();
        loadTeacherSubjects();
      } else {
        alert('Ошибка удаления учителя');
      }
    } catch (error) {
      console.error('Delete teacher error:', error);
      alert('Ошибка удаления учителя');
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

  const handleCreateSubject = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const response = await fetch('/api/gradebook/subjects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(subjectForm),
        credentials: 'include'
      });
      if (response.ok) {
        setShowSubjectModal(false);
        setSubjectForm({ name: '', description: '' });
        loadSubjects();
      } else {
        const error = await response.json();
        alert(error.message || 'Ошибка создания предмета');
      }
    } catch (error) {
      console.error('Create subject error:', error);
      alert('Ошибка создания предмета');
    }
  };

  const handleUpdateSubject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingSubject) return;
    try {
      const response = await fetch(`/api/gradebook/subjects/${editingSubject.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(subjectForm),
        credentials: 'include'
      });
      if (response.ok) {
        setShowSubjectModal(false);
        setEditingSubject(null);
        setSubjectForm({ name: '', description: '' });
        loadSubjects();
      } else {
        const error = await response.json();
        alert(error.message || 'Ошибка обновления предмета');
      }
    } catch (error) {
      console.error('Update subject error:', error);
      alert('Ошибка обновления предмета');
    }
  };

  const handleDeleteSubject = async (id: number) => {
    if (!confirm('Вы уверены, что хотите удалить этот предмет? Все связанные оценки и назначения будут удалены.')) return;
    try {
      const response = await fetch(`/api/gradebook/subjects/${id}`, {
        method: 'DELETE',
        credentials: 'include'
      });
      if (response.ok) {
        loadSubjects();
        loadTeacherSubjects();
      } else {
        alert('Ошибка удаления предмета');
      }
    } catch (error) {
      console.error('Delete subject error:', error);
      alert('Ошибка удаления предмета');
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
    return (
      <div className="manage-container">
        <div className="loading-spinner">Загрузка...</div>
      </div>
    );
  }

  return (
    <div className="manage-container">
      <div className="manage-card">
        <div className="manage-header">
          <h1 className="manage-title">Управление</h1>
          <p className="manage-subtitle">Управление студентами, учителями, классами и предметами</p>
        </div>
        
        <div className="manage-tabs">
          <div className="tabs-header">
            <button className={`tab-btn ${activeTab === 'students' ? 'active' : ''}`} onClick={() => setActiveTab('students')}>
              Студенты
            </button>
            <button className={`tab-btn ${activeTab === 'teachers' ? 'active' : ''}`} onClick={() => setActiveTab('teachers')}>
              Учителя
            </button>
            <button className={`tab-btn ${activeTab === 'classes' ? 'active' : ''}`} onClick={() => setActiveTab('classes')}>
              Классы
            </button>
            <button className={`tab-btn ${activeTab === 'subjects' ? 'active' : ''}`} onClick={() => setActiveTab('subjects')}>
              Предметы
            </button>
            <button className={`tab-btn ${activeTab === 'assignments' ? 'active' : ''}`} onClick={() => setActiveTab('assignments')}>
              Привязка студентов
            </button>
            <button className={`tab-btn ${activeTab === 'teacher-subjects' ? 'active' : ''}`} onClick={() => setActiveTab('teacher-subjects')}>
              Назначение учителей
            </button>
          </div>
          
          {activeTab === 'students' && (
            <div className="tab-content">
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
          )}
          
          {activeTab === 'teachers' && (
            <div className="tab-content">
              <div className="section-header">
                <h2>Список учителей</h2>
                <button className="btn-primary" onClick={() => {
                  setEditingTeacher(null);
                  setTeacherForm({ name: '', email: '', password: '' });
                  setShowTeacherModal(true);
                }}>+ Добавить учителя</button>
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
                    {teachers.map((teacher) => (
                      <tr key={teacher.id}>
                        <td>{teacher.id}</td>
                        <td>{teacher.name}</td>
                        <td>{teacher.email}</td>
                        <td>{new Date(teacher.created_at).toLocaleDateString()}</td>
                        <td className="actions">
                          <button className="btn-edit" onClick={() => {
                            setEditingTeacher(teacher);
                            setTeacherForm({ name: teacher.name, email: teacher.email, password: '' });
                            setShowTeacherModal(true);
                          }}>✏️</button>
                          <button className="btn-delete" onClick={() => handleDeleteTeacher(teacher.id)}>🗑️</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
          
          {activeTab === 'classes' && (
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
          )}
          
          {activeTab === 'subjects' && (
            <div className="tab-content">
              <div className="section-header">
                <h2>Список предметов</h2>
                <button className="btn-primary" onClick={() => {
                  setEditingSubject(null);
                  setSubjectForm({ name: '', description: '' });
                  setShowSubjectModal(true);
                }}>+ Добавить предмет</button>
              </div>
              
              <div className="data-table-wrapper">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>ID</th>
                      <th>Название</th>
                      <th>Описание</th>
                      <th>Дата создания</th>
                      <th>Действия</th>
                    </tr>
                  </thead>
                  <tbody>
                    {subjects.map((subject) => (
                      <tr key={subject.id}>
                        <td>{subject.id}</td>
                        <td>{subject.name}</td>
                        <td>{subject.description || '-'}</td>
                        <td>{new Date(subject.created_at).toLocaleDateString()}</td>
                        <td className="actions">
                          <button className="btn-edit" onClick={() => {
                            setEditingSubject(subject);
                            setSubjectForm({ name: subject.name, description: subject.description || '' });
                            setShowSubjectModal(true);
                          }}>✏️</button>
                          <button className="btn-delete" onClick={() => handleDeleteSubject(subject.id)}>🗑️</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
          
          {activeTab === 'assignments' && (
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
          )}
          
          {activeTab === 'teacher-subjects' && (
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
          )}
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
      
      {showTeacherModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h2>{editingTeacher ? 'Редактировать учителя' : 'Добавить учителя'}</h2>
            <form onSubmit={editingTeacher ? handleUpdateTeacher : handleCreateTeacher}>
              <div className="form-group">
                <label>Имя</label>
                <input type="text" value={teacherForm.name} onChange={(e) => setTeacherForm({ ...teacherForm, name: e.target.value })} required />
              </div>
              <div className="form-group">
                <label>Email</label>
                <input type="email" value={teacherForm.email} onChange={(e) => setTeacherForm({ ...teacherForm, email: e.target.value })} required />
              </div>
              {!editingTeacher && (
                <div className="form-group">
                  <label>Пароль</label>
                  <input type="password" value={teacherForm.password} onChange={(e) => setTeacherForm({ ...teacherForm, password: e.target.value })} required />
                </div>
              )}
              <div className="modal-buttons">
                <button type="button" onClick={() => setShowTeacherModal(false)}>Отмена</button>
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
      
      {showSubjectModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h2>{editingSubject ? 'Редактировать предмет' : 'Добавить предмет'}</h2>
            <form onSubmit={editingSubject ? handleUpdateSubject : handleCreateSubject}>
              <div className="form-group">
                <label>Название предмета</label>
                <input type="text" value={subjectForm.name} onChange={(e) => setSubjectForm({ ...subjectForm, name: e.target.value })} required />
              </div>
              <div className="form-group">
                <label>Описание</label>
                <textarea value={subjectForm.description} onChange={(e) => setSubjectForm({ ...subjectForm, description: e.target.value })} rows={3} />
              </div>
              <div className="modal-buttons">
                <button type="button" onClick={() => setShowSubjectModal(false)}>Отмена</button>
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
      
      <style>{`
        .manage-container {
          min-height: 100vh;
          background: #f3f4f6;
          padding: 40px 20px;
        }
        
        .manage-card {
          max-width: 1400px;
          margin: 0 auto;
          background: white;
          border-radius: 24px;
          padding: 32px;
          box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
        }
        
        .manage-header {
          text-align: center;
          margin-bottom: 32px;
        }
        
        .manage-title {
          font-size: 28px;
          font-weight: 700;
          color: #1f2937;
          margin-bottom: 8px;
        }
        
        .manage-subtitle {
          font-size: 14px;
          color: #6b7280;
        }
        
        .manage-tabs {
          margin-top: 24px;
        }
        
        .tabs-header {
          display: flex;
          gap: 8px;
          border-bottom: 2px solid #e5e7eb;
          margin-bottom: 24px;
          flex-wrap: wrap;
        }
        
        .tab-btn {
          padding: 10px 20px;
          background: none;
          border: none;
          font-size: 14px;
          font-weight: 500;
          color: #6b7280;
          cursor: pointer;
          transition: all 0.2s;
          border-radius: 8px 8px 0 0;
        }
        
        .tab-btn:hover {
          color: #3b82f6;
          background: #eff6ff;
        }
        
        .tab-btn.active {
          color: #3b82f6;
          border-bottom: 2px solid #3b82f6;
          margin-bottom: -2px;
        }
        
        .tab-content {
          animation: fadeIn 0.3s ease-out;
        }
        
        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: translateY(10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        
        .section-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 20px;
          flex-wrap: wrap;
          gap: 16px;
        }
        
        .section-header h2 {
          font-size: 20px;
          font-weight: 600;
          color: #1f2937;
        }
        
        .btn-primary {
          padding: 10px 20px;
          background: #3b82f6;
          color: white;
          border: none;
          border-radius: 12px;
          font-size: 14px;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s;
        }
        
        .btn-primary:hover {
          background: #2563eb;
          transform: translateY(-2px);
          box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
        }
        
        .data-table-wrapper {
          overflow-x: auto;
          border-radius: 12px;
          border: 1px solid #e5e7eb;
        }
        
        .data-table {
          width: 100%;
          border-collapse: collapse;
          font-size: 14px;
        }
        
        .data-table th {
          background: #f9fafb;
          padding: 12px;
          text-align: left;
          font-weight: 600;
          color: #374151;
          border-bottom: 1px solid #e5e7eb;
        }
        
        .data-table td {
          padding: 12px;
          border-bottom: 1px solid #f0f0f0;
        }
        
        .data-table tr:hover {
          background: #f9fafb;
        }
        
        .actions {
          display: flex;
          gap: 8px;
        }
        
        .btn-edit, .btn-delete {
          padding: 6px 12px;
          border: none;
          border-radius: 8px;
          cursor: pointer;
          font-size: 14px;
          transition: all 0.2s;
        }
        
        .btn-edit {
          background: #dbeafe;
          color: #1e40af;
        }
        
        .btn-edit:hover {
          background: #bfdbfe;
        }
        
        .btn-delete {
          background: #fee2e2;
          color: #dc2626;
        }
        
        .btn-delete:hover {
          background: #fecaca;
        }
        
        .modal-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.5);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
          animation: fadeIn 0.2s ease-out;
        }
        
        .modal-content {
          background: white;
          border-radius: 24px;
          padding: 32px;
          max-width: 500px;
          width: 90%;
          max-height: 90vh;
          overflow-y: auto;
        }
        
        .modal-content h2 {
          font-size: 24px;
          font-weight: 600;
          color: #1f2937;
          margin-bottom: 24px;
        }
        
        .form-group {
          margin-bottom: 20px;
        }
        
        .form-group label {
          display: block;
          font-size: 14px;
          font-weight: 500;
          color: #374151;
          margin-bottom: 8px;
        }
        
        .form-group input,
        .form-group select,
        .form-group textarea {
          width: 100%;
          padding: 10px 12px;
          border: 2px solid #e5e7eb;
          border-radius: 12px;
          font-size: 14px;
          transition: all 0.2s;
        }
        
        .form-group input:focus,
        .form-group select:focus,
        .form-group textarea:focus {
          outline: none;
          border-color: #3b82f6;
          box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
        }
        
        .modal-buttons {
          display: flex;
          gap: 12px;
          justify-content: flex-end;
          margin-top: 24px;
        }
        
        .modal-buttons button {
          padding: 10px 20px;
          border-radius: 12px;
          font-size: 14px;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s;
        }
        
        .modal-buttons button:first-child {
          background: #f3f4f6;
          border: none;
          color: #6b7280;
        }
        
        .modal-buttons button:first-child:hover {
          background: #e5e7eb;
        }
        
        .modal-buttons button:last-child {
          background: #3b82f6;
          border: none;
          color: white;
        }
        
        .modal-buttons button:last-child:hover {
          background: #2563eb;
        }
        
        .loading-spinner {
          text-align: center;
          padding: 40px;
          color: #6b7280;
          font-size: 16px;
        }
        
        @media (max-width: 768px) {
          .manage-card {
            padding: 20px;
          }
          
          .manage-title {
            font-size: 24px;
          }
          
          .tabs-header {
            gap: 4px;
          }
          
          .tab-btn {
            padding: 8px 12px;
            font-size: 12px;
          }
          
          .section-header {
            flex-direction: column;
            align-items: stretch;
          }
          
          .btn-primary {
            width: 100%;
          }
          
          .actions {
            flex-direction: column;
          }
        }
      `}</style>
    </div>
  );
}

export default ManageStudentsPage;