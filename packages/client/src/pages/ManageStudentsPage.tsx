import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

interface Student { id: number; name: string; email: string; created_at: string; }
interface Teacher { id: number; name: string; email: string; created_at: string; }
interface Class { id: number; name: string; year: number; created_at: string; }
interface Subject { id: number; name: string; description: string; created_at: string; }
interface StudentClass { id: number; student_id: number; class_id: number; joined_at: string; student_name?: string; class_name?: string; }
interface TeacherSubject { id: number; teacher_id: number; subject_id: number; class_id: number; teacher_name?: string; subject_name?: string; class_name?: string; }
interface LabWork {
  id: number; title: string; description: string; subject_id: number;
  teacher_id: number; due_date: string; is_group: boolean;
  issued_date: string; materials: { title?: string; material_url: string }[];
  subject_name?: string; teacher_name?: string;
  teams?: { id: number; name: string; members: { id: number; name: string }[] }[];
}

function ManageStudentsPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('students');

  const [students, setStudents] = useState<Student[]>([]);
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [classes, setClasses] = useState<Class[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [studentClasses, setStudentClasses] = useState<StudentClass[]>([]);
  const [teacherSubjects, setTeacherSubjects] = useState<TeacherSubject[]>([]);
  const [labs, setLabs] = useState<LabWork[]>([]);

  const [showStudentModal, setShowStudentModal] = useState(false);
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);
  const [studentForm, setStudentForm] = useState({ name: '', email: '', password: '' });
  const [showTeacherModal, setShowTeacherModal] = useState(false);
  const [editingTeacher, setEditingTeacher] = useState<Teacher | null>(null);
  const [teacherForm, setTeacherForm] = useState({ name: '', email: '', password: '' });
  const [showClassModal, setShowClassModal] = useState(false);
  const [editingClass, setEditingClass] = useState<Class | null>(null);
  const [classForm, setClassForm] = useState({ name: '', year: new Date().getFullYear() + 3 });
  const [showSubjectModal, setShowSubjectModal] = useState(false);
  const [editingSubject, setEditingSubject] = useState<Subject | null>(null);
  const [subjectForm, setSubjectForm] = useState({ name: '', description: '' });
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [assignForm, setAssignForm] = useState({ student_id: 0, class_id: 0 });
  const [showTeacherSubjectModal, setShowTeacherSubjectModal] = useState(false);
  const [teacherSubjectForm, setTeacherSubjectForm] = useState({ teacher_id: 0, subject_id: 0, class_id: 0 });

  const [showLabModal, setShowLabModal] = useState(false);
  const [editingLab, setEditingLab] = useState<LabWork | null>(null);
  const [labForm, setLabForm] = useState({
    subject_id: 0, teacher_id: 0, title: '', description: '',
    due_date: '', is_group: false, class_id: 0,
    materials: [{ title: '', material_url: '' }],
    teams: [] as { id?: number; name: string; members: number[] }[]
  });
  const [availableClassStudents, setAvailableClassStudents] = useState<any[]>([]);

  useEffect(() => { checkAuth(); }, []);

  const checkAuth = async () => {
    try {
      const response = await fetch('/api/auth/profile', { credentials: 'include' });
      if (response.ok) {
        const data = await response.json();
        if (data.user.role !== 'teacher') { navigate('/profile'); return; }
        await loadAllData();
      } else { navigate('/login'); }
    } catch (error) { navigate('/login'); } finally { setLoading(false); }
  };

  const loadAllData = async () => {
    await Promise.all([loadStudents(), loadTeachers(), loadClasses(), loadSubjects(), loadStudentClasses(), loadTeacherSubjects(), loadLabs()]);
  };

  const loadStudents = async () => {
    const res = await fetch('/api/gradebook/students', { credentials: 'include' });
    if (res.ok) { const data = await res.json(); setStudents(data.students || []); }
  };
  const loadTeachers = async () => {
    const res = await fetch('/api/gradebook/teachers', { credentials: 'include' });
    if (res.ok) { const data = await res.json(); setTeachers(data.teachers || []); }
  };
  const loadClasses = async () => {
    const res = await fetch('/api/gradebook/classes', { credentials: 'include' });
    if (res.ok) { const data = await res.json(); setClasses(data.classes || []); }
  };
  const loadSubjects = async () => {
    const res = await fetch('/api/gradebook/subjects', { credentials: 'include' });
    if (res.ok) { const data = await res.json(); setSubjects(data.subjects || []); }
  };
  const loadStudentClasses = async () => {
    const res = await fetch('/api/gradebook/student-classes', { credentials: 'include' });
    if (res.ok) { const data = await res.json(); setStudentClasses(data.student_classes || []); }
  };
  const loadTeacherSubjects = async () => {
    const res = await fetch('/api/gradebook/teacher-subjects', { credentials: 'include' });
    if (res.ok) { const data = await res.json(); setTeacherSubjects(data.teacher_subjects || []); }
  };
  const loadLabs = async () => {
    try {
      const res = await fetch('/api/labs/all?_=' + Date.now(), { credentials: 'include' });
      if (res.ok) {
        const data = await res.json();
        const subs = await fetch('/api/gradebook/subjects', { credentials: 'include' }).then(r => r.json()).catch(() => ({ subjects: [] }));
        const teach = await fetch('/api/gradebook/teachers', { credentials: 'include' }).then(r => r.json()).catch(() => ({ teachers: [] }));
        setLabs((data.labs || []).map((lab: any) => ({
          ...lab,
          subject_name: (subs.subjects || []).find((s: any) => s.id === lab.subject_id)?.name || '',
          teacher_name: (teach.teachers || []).find((t: any) => t.id === lab.teacher_id)?.name || ''
        })));
      }
    } catch {}
  };

  const handleCreateStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await fetch('/api/gradebook/students', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(studentForm), credentials: 'include' });
    if (res.ok) { setShowStudentModal(false); setStudentForm({ name: '', email: '', password: '' }); loadStudents(); }
    else { const err = await res.json(); alert(err.message || 'Ошибка'); }
  };
  const handleUpdateStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingStudent) return;
    const res = await fetch(`/api/gradebook/students/${editingStudent.id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: studentForm.name, email: studentForm.email }), credentials: 'include' });
    if (res.ok) { setShowStudentModal(false); setEditingStudent(null); setStudentForm({ name: '', email: '', password: '' }); loadStudents(); }
    else { const err = await res.json(); alert(err.message || 'Ошибка'); }
  };
  const handleDeleteStudent = async (id: number) => {
    if (!confirm('Удалить студента?')) return;
    await fetch(`/api/gradebook/students/${id}`, { method: 'DELETE', credentials: 'include' });
    loadStudents(); loadStudentClasses();
  };
  const handleCreateTeacher = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await fetch('/api/gradebook/teachers', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(teacherForm), credentials: 'include' });
    if (res.ok) { setShowTeacherModal(false); setTeacherForm({ name: '', email: '', password: '' }); loadTeachers(); }
    else { const err = await res.json(); alert(err.message || 'Ошибка'); }
  };
  const handleUpdateTeacher = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTeacher) return;
    const res = await fetch(`/api/gradebook/teachers/${editingTeacher.id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: teacherForm.name, email: teacherForm.email }), credentials: 'include' });
    if (res.ok) { setShowTeacherModal(false); setEditingTeacher(null); setTeacherForm({ name: '', email: '', password: '' }); loadTeachers(); }
    else { const err = await res.json(); alert(err.message || 'Ошибка'); }
  };
  const handleDeleteTeacher = async (id: number) => {
    if (!confirm('Удалить учителя?')) return;
    await fetch(`/api/gradebook/teachers/${id}`, { method: 'DELETE', credentials: 'include' });
    loadTeachers(); loadTeacherSubjects();
  };
  const handleCreateClass = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await fetch('/api/gradebook/classes', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(classForm), credentials: 'include' });
    if (res.ok) { setShowClassModal(false); setClassForm({ name: '', year: new Date().getFullYear() + 3 }); loadClasses(); }
    else { const err = await res.json(); alert(err.message || 'Ошибка'); }
  };
  const handleUpdateClass = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingClass) return;
    const res = await fetch(`/api/gradebook/classes/${editingClass.id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(classForm), credentials: 'include' });
    if (res.ok) { setShowClassModal(false); setEditingClass(null); setClassForm({ name: '', year: new Date().getFullYear() + 3 }); loadClasses(); }
    else { const err = await res.json(); alert(err.message || 'Ошибка'); }
  };
  const handleDeleteClass = async (id: number) => {
    if (!confirm('Удалить класс?')) return;
    await fetch(`/api/gradebook/classes/${id}`, { method: 'DELETE', credentials: 'include' });
    loadClasses(); loadStudentClasses(); loadTeacherSubjects();
  };
  const handleCreateSubject = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await fetch('/api/gradebook/subjects', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(subjectForm), credentials: 'include' });
    if (res.ok) { setShowSubjectModal(false); setSubjectForm({ name: '', description: '' }); loadSubjects(); }
    else { const err = await res.json(); alert(err.message || 'Ошибка'); }
  };
  const handleUpdateSubject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingSubject) return;
    const res = await fetch(`/api/gradebook/subjects/${editingSubject.id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(subjectForm), credentials: 'include' });
    if (res.ok) { setShowSubjectModal(false); setEditingSubject(null); setSubjectForm({ name: '', description: '' }); loadSubjects(); }
    else { const err = await res.json(); alert(err.message || 'Ошибка'); }
  };
  const handleDeleteSubject = async (id: number) => {
    if (!confirm('Удалить предмет?')) return;
    await fetch(`/api/gradebook/subjects/${id}`, { method: 'DELETE', credentials: 'include' });
    loadSubjects(); loadTeacherSubjects();
  };
  const handleAssignStudentToClass = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await fetch('/api/gradebook/student-classes', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(assignForm), credentials: 'include' });
    if (res.ok) { setShowAssignModal(false); setAssignForm({ student_id: 0, class_id: 0 }); loadStudentClasses(); }
    else { const err = await res.json(); alert(err.message || 'Ошибка'); }
  };
  const handleRemoveStudentFromClass = async (id: number) => {
    if (!confirm('Удалить студента из класса?')) return;
    await fetch(`/api/gradebook/student-classes/${id}`, { method: 'DELETE', credentials: 'include' });
    loadStudentClasses();
  };
  const handleAssignTeacherToSubject = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await fetch('/api/gradebook/teacher-subjects', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(teacherSubjectForm), credentials: 'include' });
    if (res.ok) { setShowTeacherSubjectModal(false); setTeacherSubjectForm({ teacher_id: 0, subject_id: 0, class_id: 0 }); loadTeacherSubjects(); }
    else { const err = await res.json(); alert(err.message || 'Ошибка'); }
  };
  const handleRemoveTeacherSubject = async (id: number) => {
    if (!confirm('Удалить назначение?')) return;
    await fetch(`/api/gradebook/teacher-subjects/${id}`, { method: 'DELETE', credentials: 'include' });
    loadTeacherSubjects();
  };

  const resetLabForm = () => {
    setLabForm({ subject_id: 0, teacher_id: 0, title: '', description: '', due_date: '', is_group: false, class_id: 0, materials: [{ title: '', material_url: '' }], teams: [] });
    setEditingLab(null);
    setAvailableClassStudents([]);
  };
  const handleCreateLab = async (e: React.FormEvent) => {
    e.preventDefault();
    const body: any = {
      subject_id: labForm.subject_id, teacher_id: labForm.teacher_id,
      title: labForm.title, description: labForm.description,
      due_date: labForm.due_date, is_group: labForm.is_group,
      materials: labForm.materials.filter(m => m.title || m.material_url)
    };
    if (labForm.is_group) { body.class_id = labForm.class_id; body.teams = labForm.teams; }
    const res = await fetch('/api/labs', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body), credentials: 'include' });
    if (res.ok) { setShowLabModal(false); resetLabForm(); await loadLabs(); setActiveTab('labs'); }
    else { const err = await res.json(); alert(err.message || 'Ошибка'); }
  };
  const handleUpdateLab = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingLab) return;
    const body: any = {
      subject_id: labForm.subject_id, teacher_id: labForm.teacher_id,
      title: labForm.title, description: labForm.description,
      due_date: labForm.due_date, is_group: labForm.is_group,
      materials: labForm.materials.filter(m => m.title || m.material_url)
    };
    if (labForm.is_group) { body.class_id = labForm.class_id; body.teams = labForm.teams; }
    const res = await fetch(`/api/labs/${editingLab.id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body), credentials: 'include' });
    if (res.ok) { setShowLabModal(false); resetLabForm(); await loadLabs(); }
    else { const err = await res.json(); alert(err.message || 'Ошибка'); }
  };
  const handleDeleteLab = async (id: number) => {
    if (!confirm('Удалить лабораторную?')) return;
    await fetch(`/api/labs/${id}`, { method: 'DELETE', credentials: 'include' });
    loadLabs();
  };

  const loadClassStudents = async (classId: number) => {
    try {
      const res = await fetch(`/api/gradebook/classes/${classId}/students`, { credentials: 'include' });
      if (res.ok) { const data = await res.json(); setAvailableClassStudents(data.students || []); }
    } catch {}
  };

  const addTeamToLabForm = () => setLabForm({ ...labForm, teams: [...labForm.teams, { name: '', members: [] }] });
  const removeTeamFromLabForm = (i: number) => setLabForm({ ...labForm, teams: labForm.teams.filter((_, idx) => idx !== i) });
  const updateTeamName = (i: number, name: string) => { const t = [...labForm.teams]; t[i].name = name; setLabForm({ ...labForm, teams: t }); };
  const toggleTeamMember = (ti: number, sid: number) => {
    const t = [...labForm.teams];
    t[ti].members = t[ti].members.includes(sid) ? t[ti].members.filter(id => id !== sid) : [...t[ti].members, sid];
    setLabForm({ ...labForm, teams: t });
  };

  if (loading) return <div className="manage-container"><div className="loading-spinner">Загрузка...</div></div>;

  return (
      <div className="manage-container">
        <div className="manage-card">
          <div className="manage-header"><h1 className="manage-title">Управление</h1><p className="manage-subtitle">Управление студентами, учителями, классами, предметами и лабораторными работами</p></div>
          <div className="manage-tabs">
            <div className="tabs-header">
              <button className={`tab-btn ${activeTab === 'students' ? 'active' : ''}`} onClick={() => setActiveTab('students')}>Студенты</button>
              <button className={`tab-btn ${activeTab === 'teachers' ? 'active' : ''}`} onClick={() => setActiveTab('teachers')}>Учителя</button>
              <button className={`tab-btn ${activeTab === 'classes' ? 'active' : ''}`} onClick={() => setActiveTab('classes')}>Классы</button>
              <button className={`tab-btn ${activeTab === 'subjects' ? 'active' : ''}`} onClick={() => setActiveTab('subjects')}>Предметы</button>
              <button className={`tab-btn ${activeTab === 'assignments' ? 'active' : ''}`} onClick={() => setActiveTab('assignments')}>Привязка студентов</button>
              <button className={`tab-btn ${activeTab === 'teacher-subjects' ? 'active' : ''}`} onClick={() => setActiveTab('teacher-subjects')}>Назначение учителей</button>
              <button className={`tab-btn ${activeTab === 'labs' ? 'active' : ''}`} onClick={() => setActiveTab('labs')}>Лабораторные</button>
            </div>
            {activeTab === 'students' && (<div className="tab-content"><div className="section-header"><h2>Список студентов</h2><button className="btn-primary" onClick={() => { setEditingStudent(null); setStudentForm({ name: '', email: '', password: '' }); setShowStudentModal(true); }}>+ Добавить студента</button></div><div className="data-table-wrapper"><table className="data-table"><thead><tr><th>ID</th><th>Имя</th><th>Email</th><th>Дата регистрации</th><th>Действия</th></tr></thead><tbody>{students.map((s) => (<tr key={s.id}><td>{s.id}</td><td>{s.name}</td><td>{s.email}</td><td>{new Date(s.created_at).toLocaleDateString()}</td><td className="actions"><button className="btn-edit" onClick={() => { setEditingStudent(s); setStudentForm({ name: s.name, email: s.email, password: '' }); setShowStudentModal(true); }}>✏️</button><button className="btn-delete" onClick={() => handleDeleteStudent(s.id)}>🗑️</button></td></tr>))}</tbody></table></div></div>)}
            {activeTab === 'teachers' && (<div className="tab-content"><div className="section-header"><h2>Список учителей</h2><button className="btn-primary" onClick={() => { setEditingTeacher(null); setTeacherForm({ name: '', email: '', password: '' }); setShowTeacherModal(true); }}>+ Добавить учителя</button></div><div className="data-table-wrapper"><table className="data-table"><thead><tr><th>ID</th><th>Имя</th><th>Email</th><th>Дата регистрации</th><th>Действия</th></tr></thead><tbody>{teachers.map((t) => (<tr key={t.id}><td>{t.id}</td><td>{t.name}</td><td>{t.email}</td><td>{new Date(t.created_at).toLocaleDateString()}</td><td className="actions"><button className="btn-edit" onClick={() => { setEditingTeacher(t); setTeacherForm({ name: t.name, email: t.email, password: '' }); setShowTeacherModal(true); }}>✏️</button><button className="btn-delete" onClick={() => handleDeleteTeacher(t.id)}>🗑️</button></td></tr>))}</tbody></table></div></div>)}
            {activeTab === 'classes' && (<div className="tab-content"><div className="section-header"><h2>Список классов</h2><button className="btn-primary" onClick={() => { setEditingClass(null); setClassForm({ name: '', year: new Date().getFullYear() + 3 }); setShowClassModal(true); }}>+ Добавить класс</button></div><div className="data-table-wrapper"><table className="data-table"><thead><tr><th>ID</th><th>Название</th><th>Год выпуска</th><th>Действия</th></tr></thead><tbody>{classes.map((c) => (<tr key={c.id}><td>{c.id}</td><td>{c.name}</td><td>{c.year}</td><td className="actions"><button className="btn-edit" onClick={() => { setEditingClass(c); setClassForm({ name: c.name, year: c.year }); setShowClassModal(true); }}>✏️</button><button className="btn-delete" onClick={() => handleDeleteClass(c.id)}>🗑️</button></td></tr>))}</tbody></table></div></div>)}
            {activeTab === 'subjects' && (<div className="tab-content"><div className="section-header"><h2>Список предметов</h2><button className="btn-primary" onClick={() => { setEditingSubject(null); setSubjectForm({ name: '', description: '' }); setShowSubjectModal(true); }}>+ Добавить предмет</button></div><div className="data-table-wrapper"><table className="data-table"><thead><tr><th>ID</th><th>Название</th><th>Описание</th><th>Действия</th></tr></thead><tbody>{subjects.map((s) => (<tr key={s.id}><td>{s.id}</td><td>{s.name}</td><td>{s.description || '-'}</td><td className="actions"><button className="btn-edit" onClick={() => { setEditingSubject(s); setSubjectForm({ name: s.name, description: s.description || '' }); setShowSubjectModal(true); }}>✏️</button><button className="btn-delete" onClick={() => handleDeleteSubject(s.id)}>🗑️</button></td></tr>))}</tbody></table></div></div>)}
            {activeTab === 'assignments' && (<div className="tab-content"><div className="section-header"><h2>Привязка студентов к классам</h2><button className="btn-primary" onClick={() => setShowAssignModal(true)}>+ Привязать студента</button></div><div className="data-table-wrapper"><table className="data-table"><thead><tr><th>ID</th><th>Студент</th><th>Класс</th><th>Дата</th><th>Действия</th></tr></thead><tbody>{studentClasses.map((sc) => (<tr key={sc.id}><td>{sc.id}</td><td>{students.find(s => s.id === sc.student_id)?.name || sc.student_id}</td><td>{classes.find(c => c.id === sc.class_id)?.name || sc.class_id}</td><td>{new Date(sc.joined_at).toLocaleDateString()}</td><td className="actions"><button className="btn-delete" onClick={() => handleRemoveStudentFromClass(sc.id)}>🗑️</button></td></tr>))}</tbody></table></div></div>)}
            {activeTab === 'teacher-subjects' && (<div className="tab-content"><div className="section-header"><h2>Назначение учителей</h2><button className="btn-primary" onClick={() => setShowTeacherSubjectModal(true)}>+ Назначить учителя</button></div><div className="data-table-wrapper"><table className="data-table"><thead><tr><th>ID</th><th>Учитель</th><th>Предмет</th><th>Класс</th><th>Действия</th></tr></thead><tbody>{teacherSubjects.map((ts) => (<tr key={ts.id}><td>{ts.id}</td><td>{teachers.find(t => t.id === ts.teacher_id)?.name || ts.teacher_id}</td><td>{subjects.find(s => s.id === ts.subject_id)?.name || ts.subject_id}</td><td>{classes.find(c => c.id === ts.class_id)?.name || ts.class_id}</td><td className="actions"><button className="btn-delete" onClick={() => handleRemoveTeacherSubject(ts.id)}>🗑️</button></td></tr>))}</tbody></table></div></div>)}
            {activeTab === 'labs' && (<div className="tab-content"><div className="section-header"><h2>Лабораторные работы</h2><button className="btn-primary" onClick={() => { resetLabForm(); setShowLabModal(true); }}>+ Добавить лабораторную</button></div><div className="data-table-wrapper"><table className="data-table"><thead><tr><th>ID</th><th>Название</th><th>Предмет</th><th>Дедлайн</th><th>Групповая</th><th>Действия</th></tr></thead><tbody>{labs.map(lab => (<tr key={lab.id}><td>{lab.id}</td><td>{lab.title}</td><td>{lab.subject_name}</td><td>{new Date(lab.due_date).toLocaleDateString()}</td><td>{lab.is_group ? 'Да' : 'Нет'}</td><td className="actions"><button className="btn-edit" onClick={() => { setEditingLab(lab); setLabForm({ subject_id: lab.subject_id, teacher_id: lab.teacher_id, title: lab.title, description: lab.description || '', due_date: lab.due_date, is_group: lab.is_group, class_id: (lab as any).class_id || 0, materials: lab.materials?.length ? lab.materials : [{ title: '', material_url: '' }], teams: lab.teams?.map((t: any) => ({ id: t.id, name: t.name, members: t.members?.map((m: any) => m.id) || [] })) || [] }); setShowLabModal(true); }}>✏️</button><button className="btn-delete" onClick={() => handleDeleteLab(lab.id)}>🗑️</button></td></tr>))}</tbody></table></div></div>)}
          </div>
        </div>

        {showStudentModal && (<div className="modal-overlay"><div className="modal-content"><h2>{editingStudent ? 'Редактировать' : 'Добавить'} студента</h2><form onSubmit={editingStudent ? handleUpdateStudent : handleCreateStudent}><div className="form-group"><label>Имя</label><input value={studentForm.name} onChange={e => setStudentForm({ ...studentForm, name: e.target.value })} required /></div><div className="form-group"><label>Email</label><input type="email" value={studentForm.email} onChange={e => setStudentForm({ ...studentForm, email: e.target.value })} required /></div>{!editingStudent && <div className="form-group"><label>Пароль</label><input type="password" value={studentForm.password} onChange={e => setStudentForm({ ...studentForm, password: e.target.value })} required /></div>}<div className="modal-buttons"><button type="button" onClick={() => setShowStudentModal(false)}>Отмена</button><button type="submit">Сохранить</button></div></form></div></div>)}
        {showTeacherModal && (<div className="modal-overlay"><div className="modal-content"><h2>{editingTeacher ? 'Редактировать' : 'Добавить'} учителя</h2><form onSubmit={editingTeacher ? handleUpdateTeacher : handleCreateTeacher}><div className="form-group"><label>Имя</label><input value={teacherForm.name} onChange={e => setTeacherForm({ ...teacherForm, name: e.target.value })} required /></div><div className="form-group"><label>Email</label><input type="email" value={teacherForm.email} onChange={e => setTeacherForm({ ...teacherForm, email: e.target.value })} required /></div>{!editingTeacher && <div className="form-group"><label>Пароль</label><input type="password" value={teacherForm.password} onChange={e => setTeacherForm({ ...teacherForm, password: e.target.value })} required /></div>}<div className="modal-buttons"><button type="button" onClick={() => setShowTeacherModal(false)}>Отмена</button><button type="submit">Сохранить</button></div></form></div></div>)}
        {showClassModal && (<div className="modal-overlay"><div className="modal-content"><h2>{editingClass ? 'Редактировать' : 'Добавить'} класс</h2><form onSubmit={editingClass ? handleUpdateClass : handleCreateClass}><div className="form-group"><label>Название</label><input value={classForm.name} onChange={e => setClassForm({ ...classForm, name: e.target.value })} required /></div><div className="form-group"><label>Год выпуска</label><input type="number" value={classForm.year} onChange={e => setClassForm({ ...classForm, year: +e.target.value })} required /></div><div className="modal-buttons"><button type="button" onClick={() => setShowClassModal(false)}>Отмена</button><button type="submit">Сохранить</button></div></form></div></div>)}
        {showSubjectModal && (<div className="modal-overlay"><div className="modal-content"><h2>{editingSubject ? 'Редактировать' : 'Добавить'} предмет</h2><form onSubmit={editingSubject ? handleUpdateSubject : handleCreateSubject}><div className="form-group"><label>Название</label><input value={subjectForm.name} onChange={e => setSubjectForm({ ...subjectForm, name: e.target.value })} required /></div><div className="form-group"><label>Описание</label><textarea value={subjectForm.description} onChange={e => setSubjectForm({ ...subjectForm, description: e.target.value })} rows={3} /></div><div className="modal-buttons"><button type="button" onClick={() => setShowSubjectModal(false)}>Отмена</button><button type="submit">Сохранить</button></div></form></div></div>)}
        {showAssignModal && (<div className="modal-overlay"><div className="modal-content"><h2>Привязать студента к классу</h2><form onSubmit={handleAssignStudentToClass}><div className="form-group"><label>Студент</label><select value={assignForm.student_id} onChange={e => setAssignForm({ ...assignForm, student_id: +e.target.value })} required><option value="">Выбрать</option>{students.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}</select></div><div className="form-group"><label>Класс</label><select value={assignForm.class_id} onChange={e => setAssignForm({ ...assignForm, class_id: +e.target.value })} required><option value="">Выбрать</option>{classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</select></div><div className="modal-buttons"><button type="button" onClick={() => setShowAssignModal(false)}>Отмена</button><button type="submit">Сохранить</button></div></form></div></div>)}
        {showTeacherSubjectModal && (<div className="modal-overlay"><div className="modal-content"><h2>Назначить учителя</h2><form onSubmit={handleAssignTeacherToSubject}><div className="form-group"><label>Учитель</label><select value={teacherSubjectForm.teacher_id} onChange={e => setTeacherSubjectForm({ ...teacherSubjectForm, teacher_id: +e.target.value })} required><option value="">Выбрать</option>{teachers.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}</select></div><div className="form-group"><label>Предмет</label><select value={teacherSubjectForm.subject_id} onChange={e => setTeacherSubjectForm({ ...teacherSubjectForm, subject_id: +e.target.value })} required><option value="">Выбрать</option>{subjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}</select></div><div className="form-group"><label>Класс</label><select value={teacherSubjectForm.class_id} onChange={e => setTeacherSubjectForm({ ...teacherSubjectForm, class_id: +e.target.value })} required><option value="">Выбрать</option>{classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</select></div><div className="modal-buttons"><button type="button" onClick={() => setShowTeacherSubjectModal(false)}>Отмена</button><button type="submit">Сохранить</button></div></form></div></div>)}

        {showLabModal && (
            <div className="modal-overlay"><div className="modal-content" style={{ maxWidth: 680, width: '95%' }}>
              <h2>{editingLab ? 'Редактировать' : 'Добавить'} лабораторную</h2>
              <form onSubmit={editingLab ? handleUpdateLab : handleCreateLab} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                  <div className="form-group"><label>Предмет</label><select value={labForm.subject_id} onChange={e => setLabForm({ ...labForm, subject_id: +e.target.value })} required><option value="">Выберите предмет</option>{subjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}</select></div>
                  <div className="form-group"><label>Учитель</label><select value={labForm.teacher_id} onChange={e => setLabForm({ ...labForm, teacher_id: +e.target.value })} required><option value="">Выберите учителя</option>{teachers.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}</select></div>
                </div>
                <div className="form-group"><label>Название</label><input value={labForm.title} onChange={e => setLabForm({ ...labForm, title: e.target.value })} placeholder="Лабораторная работа №1" required /></div>
                <div className="form-group"><label>Описание</label><textarea value={labForm.description} onChange={e => setLabForm({ ...labForm, description: e.target.value })} rows={3} placeholder="Описание задания..." /></div>
                <div className="form-group"><label>Дедлайн</label><input type="date" value={labForm.due_date} onChange={e => setLabForm({ ...labForm, due_date: e.target.value })} required /></div>
                <label style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 14, fontWeight: 500, cursor: 'pointer' }}>
                  <input type="checkbox" checked={labForm.is_group} onChange={e => setLabForm({ ...labForm, is_group: e.target.checked, class_id: 0, teams: [] })} style={{ width: 18, height: 18 }} />
                  Командная работа
                </label>
                {labForm.is_group && (
                    <div style={{ background: '#f9fafb', borderRadius: 12, padding: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
                      <div className="form-group"><label>Класс</label><select value={labForm.class_id} onChange={e => { const id = +e.target.value; setLabForm({ ...labForm, class_id: id, teams: [] }); if (id) loadClassStudents(id); }} required><option value="">Выберите класс</option>{classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</select></div>
                      <div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                          <p style={{ fontSize: 13, fontWeight: 600, margin: 0 }}>Команды</p>
                          <button type="button" onClick={addTeamToLabForm} style={{ background: '#3b82f6', color: '#fff', border: 'none', borderRadius: 8, padding: '6px 14px', fontSize: 12, fontWeight: 500, cursor: 'pointer' }}>+ Добавить команду</button>
                        </div>
                        {labForm.teams.length === 0 && <p style={{ color: '#9ca3af', fontSize: 12 }}>Нет команд</p>}
                        {labForm.teams.map((team, ti) => (
                            <div key={ti} style={{ background: '#fff', borderRadius: 10, border: '1px solid #e5e7eb', padding: 12, marginBottom: 10 }}>
                              <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
                                <input placeholder="Название команды" value={team.name} onChange={e => updateTeamName(ti, e.target.value)} style={{ flex: 1, padding: '8px 10px', border: '1px solid #e5e7eb', borderRadius: 8, fontSize: 13 }} />
                                <button type="button" onClick={() => removeTeamFromLabForm(ti)} style={{ background: '#fee2e2', border: 'none', color: '#dc2626', borderRadius: 8, padding: '6px 12px', cursor: 'pointer', fontSize: 13 }}>✕</button>
                              </div>
                              {availableClassStudents.length > 0 && (
                                  <div style={{ maxHeight: 140, overflow: 'auto', border: '1px solid #f0f0f0', borderRadius: 8, padding: 4 }}>
                                    {availableClassStudents.map((s: any) => (
                                        <label key={s.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '6px 8px', borderRadius: 6, cursor: 'pointer', fontSize: 12, background: team.members.includes(s.id) ? '#eff6ff' : 'transparent' }}>
                                          <input type="checkbox" checked={team.members.includes(s.id)} onChange={() => toggleTeamMember(ti, s.id)} style={{ width: 15, height: 15 }} />
                                          {s.name}
                                        </label>
                                    ))}
                                  </div>
                              )}
                            </div>
                        ))}
                      </div>
                    </div>
                )}
                <div className="form-group"><label>Материалы</label>
                  <div style={{ border: '1px solid #e5e7eb', borderRadius: 12, padding: 12, display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {labForm.materials.map((m, i) => (
                        <div key={i} style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                          <input placeholder="Название" value={m.title} onChange={e => { const u = [...labForm.materials]; u[i].title = e.target.value; setLabForm({ ...labForm, materials: u }); }} style={{ flex: 1 }} />
                          <input placeholder="URL" value={m.material_url} onChange={e => { const u = [...labForm.materials]; u[i].material_url = e.target.value; setLabForm({ ...labForm, materials: u }); }} style={{ flex: 2 }} />
                          <button type="button" onClick={() => { const u = labForm.materials.filter((_, idx) => idx !== i); setLabForm({ ...labForm, materials: u.length ? u : [{ title: '', material_url: '' }] }); }} style={{ background: '#fee2e2', border: 'none', color: '#dc2626', borderRadius: 8, padding: '8px 12px', cursor: 'pointer' }}>✕</button>
                        </div>
                    ))}
                    <button type="button" onClick={() => setLabForm({ ...labForm, materials: [...labForm.materials, { title: '', material_url: '' }] })} style={{ background: '#f3f4f6', border: 'none', padding: '8px 14px', borderRadius: 8, fontSize: 13, cursor: 'pointer', color: '#374151', fontWeight: 500 }}>+ Добавить материал</button>
                  </div>
                </div>
                <div className="modal-buttons"><button type="button" onClick={() => setShowLabModal(false)}>Отмена</button><button type="submit">{editingLab ? 'Сохранить' : 'Создать'}</button></div>
              </form>
            </div></div>
        )}

        <style>{`
        .manage-container { min-height: 100vh; background: #f3f4f6; padding: 40px 20px; }
        .manage-card { max-width: 1400px; margin: 0 auto; background: white; border-radius: 24px; padding: 32px; box-shadow: 0 20px 25px -5px rgba(0,0,0,0.1); }
        .manage-header { text-align: center; margin-bottom: 32px; }
        .manage-title { font-size: 28px; font-weight: 700; color: #1f2937; }
        .manage-subtitle { font-size: 14px; color: #6b7280; margin-top: 8px; }
        .tabs-header { display: flex; gap: 8px; border-bottom: 2px solid #e5e7eb; margin-bottom: 24px; flex-wrap: wrap; }
        .tab-btn { padding: 10px 20px; background: none; border: none; font-size: 14px; font-weight: 500; color: #6b7280; cursor: pointer; border-radius: 8px 8px 0 0; }
        .tab-btn:hover { color: #3b82f6; background: #eff6ff; }
        .tab-btn.active { color: #3b82f6; border-bottom: 2px solid #3b82f6; margin-bottom: -2px; }
        .section-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; flex-wrap: wrap; gap: 16px; }
        .section-header h2 { font-size: 20px; font-weight: 600; color: #1f2937; }
        .btn-primary { padding: 10px 20px; background: #3b82f6; color: white; border: none; border-radius: 12px; font-size: 14px; font-weight: 500; cursor: pointer; }
        .btn-primary:hover { background: #2563eb; }
        .data-table-wrapper { overflow-x: auto; border-radius: 12px; border: 1px solid #e5e7eb; }
        .data-table { width: 100%; border-collapse: collapse; font-size: 14px; }
        .data-table th { background: #f9fafb; padding: 12px; text-align: left; font-weight: 600; color: #374151; border-bottom: 1px solid #e5e7eb; }
        .data-table td { padding: 12px; border-bottom: 1px solid #f0f0f0; }
        .data-table tr:hover { background: #f9fafb; }
        .actions { display: flex; gap: 8px; }
        .btn-edit, .btn-delete { padding: 6px 12px; border: none; border-radius: 8px; cursor: pointer; font-size: 14px; }
        .btn-edit { background: #dbeafe; color: #1e40af; }
        .btn-delete { background: #fee2e2; color: #dc2626; }
        .modal-overlay { position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center; z-index: 1000; }
        .modal-content { background: white; border-radius: 24px; padding: 32px; max-width: 500px; width: 90%; max-height: 90vh; overflow-y: auto; }
        .modal-content h2 { font-size: 24px; font-weight: 600; color: #1f2937; margin-bottom: 24px; }
        .form-group { margin-bottom: 0; }
        .form-group label { display: block; font-size: 14px; font-weight: 500; color: #374151; margin-bottom: 6px; }
        .form-group input, .form-group select, .form-group textarea { width: 100%; padding: 10px 12px; border: 2px solid #e5e7eb; border-radius: 12px; font-size: 14px; box-sizing: border-box; }
        .form-group input:focus, .form-group select:focus, .form-group textarea:focus { outline: none; border-color: #3b82f6; }
        .modal-buttons { display: flex; gap: 12px; justify-content: flex-end; margin-top: 8px; }
        .modal-buttons button { padding: 10px 20px; border-radius: 12px; font-size: 14px; font-weight: 500; cursor: pointer; }
        .modal-buttons button:first-child { background: #f3f4f6; border: none; color: #6b7280; }
        .modal-buttons button:last-child { background: #3b82f6; border: none; color: white; }
        .loading-spinner { text-align: center; padding: 40px; color: #6b7280; }
        @media (max-width: 768px) { .manage-card { padding: 20px; } .tabs-header { gap: 4px; } .tab-btn { padding: 8px 12px; font-size: 12px; } .section-header { flex-direction: column; align-items: stretch; } .btn-primary { width: 100%; } }
      `}</style>
      </div>
  );
}

export default ManageStudentsPage;