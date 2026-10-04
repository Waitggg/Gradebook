import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
function ManageStudentsPage() {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('students');
    const [userRole, setUserRole] = useState('');
    const [userId, setUserId] = useState('');
    const [user, setUser] = useState({ id: 0, name: '', email: '', role: '' });
    const [students, setStudents] = useState([]);
    const [teachers, setTeachers] = useState([]);
    const [classes, setClasses] = useState([]);
    const [subjects, setSubjects] = useState([]);
    const [studentClasses, setStudentClasses] = useState([]);
    const [teacherSubjects, setTeacherSubjects] = useState([]);
    const [labs, setLabs] = useState([]);
    const [showStudentModal, setShowStudentModal] = useState(false);
    const [editingStudent, setEditingStudent] = useState(null);
    const [studentForm, setStudentForm] = useState({ name: '', email: '', password: '' });
    const [showTeacherModal, setShowTeacherModal] = useState(false);
    const [editingTeacher, setEditingTeacher] = useState(null);
    const [teacherForm, setTeacherForm] = useState({ name: '', email: '', password: '' });
    const [showClassModal, setShowClassModal] = useState(false);
    const [editingClass, setEditingClass] = useState(null);
    const [classForm, setClassForm] = useState({ name: '', year: new Date().getFullYear() + 3 });
    const [showSubjectModal, setShowSubjectModal] = useState(false);
    const [editingSubject, setEditingSubject] = useState(null);
    const [subjectForm, setSubjectForm] = useState({ name: '', description: '' });
    const [showAssignModal, setShowAssignModal] = useState(false);
    const [assignForm, setAssignForm] = useState({ student_id: 0, class_id: 0 });
    const [showTeacherSubjectModal, setShowTeacherSubjectModal] = useState(false);
    const [teacherSubjectForm, setTeacherSubjectForm] = useState({ teacher_id: 0, subject_id: 0, class_id: 0 });
    const [showLabModal, setShowLabModal] = useState(false);
    const [editingLab, setEditingLab] = useState(null);
    const [labForm, setLabForm] = useState({
        subject_id: 0, teacher_id: 0, title: '', description: '',
        due_date: '', is_group: false, class_id: 0,
        materials: [{ title: '', material_url: '' }],
        teams: []
    });
    const [availableClassStudents, setAvailableClassStudents] = useState([]);
    useEffect(() => { checkAuth(); }, []);
    const checkAuth = async () => {
        try {
            const response = await fetch('/api/auth/profile', { credentials: 'include' });
            if (response.ok) {
                const data = await response.json();
                if (data.user.role == 'student') {
                    navigate('/profile');
                    return;
                }
                setUserRole(data.user.role);
                setUserId(data.user.id);
                setUser(data.user);
                if (data.user.role === 'teacher') {
                    setActiveTab('labs');
                }
                await loadAllData();
            }
            else {
                navigate('/login');
            }
        }
        catch (error) {
            console.error('Auth error:', error);
            navigate('/login');
        }
        finally {
            setLoading(false);
        }
    };
    const loadLabs = async () => {
        try {
            const res = await fetch('/api/labs/all?_=' + Date.now(), { credentials: 'include' });
            if (res.ok) {
                const data = await res.json();
                const subs = await fetch('/api/gradebook/subjects', { credentials: 'include' }).then(r => r.json()).catch(() => ({ subjects: [] }));
                const teach = await fetch('/api/gradebook/teachers', { credentials: 'include' }).then(r => r.json()).catch(() => ({ teachers: [] }));
                setLabs((data.labs || []).map((lab) => ({
                    ...lab,
                    subject_name: (subs.subjects || []).find((s) => s.id === lab.subject_id)?.name || '',
                    teacher_name: (teach.teachers || []).find((t) => t.id === lab.teacher_id)?.name || ''
                })));
            }
        }
        catch { }
    };
    const loadAllData = async () => {
        await Promise.all([loadStudents(), loadTeachers(), loadClasses(), loadSubjects(), loadStudentClasses(), loadTeacherSubjects(), loadLabs()]);
    };
    const loadStudents = async () => {
        try {
            const response = await fetch('/api/gradebook/students', { credentials: 'include' });
            if (response.ok) {
                const data = await response.json();
                setStudents(data.students || []);
            }
        }
        catch (error) {
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
        }
        catch (error) {
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
        }
        catch (error) {
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
        }
        catch (error) {
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
        }
        catch (error) {
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
            const loadLabs = async () => {
                try {
                    const res = await fetch('/api/labs/all?_=' + Date.now(), { credentials: 'include' });
                    if (res.ok) {
                        const data = await res.json();
                        const subs = await fetch('/api/gradebook/subjects', { credentials: 'include' }).then(r => r.json()).catch(() => ({ subjects: [] }));
                        const teach = await fetch('/api/gradebook/teachers', { credentials: 'include' }).then(r => r.json()).catch(() => ({ teachers: [] }));
                        setLabs((data.labs || []).map((lab) => ({
                            ...lab,
                            subject_name: (subs.subjects || []).find((s) => s.id === lab.subject_id)?.name || '',
                            teacher_name: (teach.teachers || []).find((t) => t.id === lab.teacher_id)?.name || ''
                        })));
                    }
                }
                catch { }
            };
        }
        catch (error) {
            console.error('Load teacher subjects error:', error);
        }
    };
    const handleCreateStudent = async (e) => {
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
            }
            else {
                const error = await response.json();
                alert(error.message || 'Ошибка создания студента');
            }
        }
        catch (error) {
            console.error('Create student error:', error);
            alert('Ошибка создания студента');
        }
    };
    const handleUpdateStudent = async (e) => {
        e.preventDefault();
        if (!editingStudent)
            return;
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
            }
            else {
                const error = await response.json();
                alert(error.message || 'Ошибка обновления студента');
            }
        }
        catch (error) {
            console.error('Update student error:', error);
            alert('Ошибка обновления студента');
        }
    };
    const handleDeleteStudent = async (id) => {
        if (!confirm('Вы уверены, что хотите удалить этого студента?'))
            return;
        try {
            const response = await fetch(`/api/gradebook/students/${id}`, {
                method: 'DELETE',
                credentials: 'include'
            });
            if (response.ok) {
                loadStudents();
                loadStudentClasses();
            }
            else {
                alert('Ошибка удаления студента');
            }
        }
        catch (error) {
            console.error('Delete student error:', error);
            alert('Ошибка удаления студента');
        }
    };
    const handleCreateTeacher = async (e) => {
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
            }
            else {
                const error = await response.json();
                alert(error.message || 'Ошибка создания учителя');
            }
        }
        catch (error) {
            console.error('Create teacher error:', error);
            alert('Ошибка создания учителя');
        }
    };
    const handleUpdateTeacher = async (e) => {
        e.preventDefault();
        if (!editingTeacher)
            return;
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
            }
            else {
                const error = await response.json();
                alert(error.message || 'Ошибка обновления учителя');
            }
        }
        catch (error) {
            console.error('Update teacher error:', error);
            alert('Ошибка обновления учителя');
        }
    };
    const handleDeleteTeacher = async (id) => {
        if (!confirm('Вы уверены, что хотите удалить этого учителя?'))
            return;
        try {
            const response = await fetch(`/api/gradebook/teachers/${id}`, {
                method: 'DELETE',
                credentials: 'include'
            });
            if (response.ok) {
                loadTeachers();
                loadTeacherSubjects();
            }
            else {
                alert('Ошибка удаления учителя');
            }
        }
        catch (error) {
            console.error('Delete teacher error:', error);
            alert('Ошибка удаления учителя');
        }
    };
    const handleCreateClass = async (e) => {
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
            }
            else {
                const error = await response.json();
                alert(error.message || 'Ошибка создания класса');
            }
        }
        catch (error) {
            console.error('Create class error:', error);
            alert('Ошибка создания класса');
        }
    };
    const handleUpdateClass = async (e) => {
        e.preventDefault();
        if (!editingClass)
            return;
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
            }
            else {
                const error = await response.json();
                alert(error.message || 'Ошибка обновления класса');
            }
        }
        catch (error) {
            console.error('Update class error:', error);
            alert('Ошибка обновления класса');
        }
    };
    const handleDeleteClass = async (id) => {
        if (!confirm('Вы уверены, что хотите удалить этот класс? Все связи будут удалены.'))
            return;
        try {
            const response = await fetch(`/api/gradebook/classes/${id}`, {
                method: 'DELETE',
                credentials: 'include'
            });
            if (response.ok) {
                loadClasses();
                loadStudentClasses();
                loadTeacherSubjects();
            }
            else {
                alert('Ошибка удаления класса');
            }
        }
        catch (error) {
            console.error('Delete class error:', error);
            alert('Ошибка удаления класса');
        }
    };
    const handleCreateSubject = async (e) => {
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
            }
            else {
                const error = await response.json();
                alert(error.message || 'Ошибка создания предмета');
            }
        }
        catch (error) {
            console.error('Create subject error:', error);
            alert('Ошибка создания предмета');
        }
    };
    const handleUpdateSubject = async (e) => {
        e.preventDefault();
        if (!editingSubject)
            return;
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
            }
            else {
                const error = await response.json();
                alert(error.message || 'Ошибка обновления предмета');
            }
        }
        catch (error) {
            console.error('Update subject error:', error);
            alert('Ошибка обновления предмета');
        }
    };
    const handleDeleteSubject = async (id) => {
        if (!confirm('Вы уверены, что хотите удалить этот предмет? Все связанные оценки и назначения будут удалены.'))
            return;
        try {
            const response = await fetch(`/api/gradebook/subjects/${id}`, {
                method: 'DELETE',
                credentials: 'include'
            });
            if (response.ok) {
                loadSubjects();
                loadTeacherSubjects();
            }
            else {
                alert('Ошибка удаления предмета');
            }
        }
        catch (error) {
            console.error('Delete subject error:', error);
            alert('Ошибка удаления предмета');
        }
    };
    const handleAssignStudentToClass = async (e) => {
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
            }
            else {
                const error = await response.json();
                alert(error.message || 'Ошибка привязки студента');
            }
        }
        catch (error) {
            console.error('Assign student error:', error);
            alert('Ошибка привязки студента');
        }
    };
    const handleRemoveStudentFromClass = async (studentClassId) => {
        if (!confirm('Удалить студента из класса?'))
            return;
        try {
            const response = await fetch(`/api/gradebook/student-classes/${studentClassId}`, {
                method: 'DELETE',
                credentials: 'include'
            });
            if (response.ok) {
                loadStudentClasses();
            }
            else {
                alert('Ошибка удаления');
            }
        }
        catch (error) {
            console.error('Remove student error:', error);
            alert('Ошибка удаления');
        }
    };
    const handleAssignTeacherToSubject = async (e) => {
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
            }
            else {
                const error = await response.json();
                alert(error.message || 'Ошибка назначения');
            }
        }
        catch (error) {
            console.error('Assign teacher error:', error);
            alert('Ошибка назначения');
        }
    };
    const handleRemoveTeacherSubject = async (id) => {
        if (!confirm('Удалить назначение?'))
            return;
        try {
            const response = await fetch(`/api/gradebook/teacher-subjects/${id}`, {
                method: 'DELETE',
                credentials: 'include'
            });
            if (response.ok) {
                loadTeacherSubjects();
            }
            else {
                alert('Ошибка удаления');
            }
        }
        catch (error) {
            console.error('Remove teacher subject error:', error);
            alert('Ошибка удаления');
        }
    };
    const resetLabForm = () => {
        setLabForm({ subject_id: 0, teacher_id: 0, title: '', description: '', due_date: '', is_group: false, class_id: 0, materials: [{ title: '', material_url: '' }], teams: [] });
        setEditingLab(null);
        setAvailableClassStudents([]);
    };
    const handleCreateLab = async (e) => {
        e.preventDefault();
        const body = {
            subject_id: labForm.subject_id, teacher_id: labForm.teacher_id,
            title: labForm.title, description: labForm.description,
            due_date: labForm.due_date, is_group: labForm.is_group,
            materials: labForm.materials.filter(m => m.title || m.material_url)
        };
        if (labForm.is_group) {
            body.class_id = labForm.class_id;
            body.teams = labForm.teams;
        }
        const res = await fetch('/api/labs', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body), credentials: 'include' });
        if (res.ok) {
            setShowLabModal(false);
            resetLabForm();
            await loadLabs();
            setActiveTab('labs');
        }
        else {
            const err = await res.json();
            alert(err.message || 'Ошибка');
        }
    };
    const handleUpdateLab = async (e) => {
        e.preventDefault();
        if (!editingLab)
            return;
        const body = {
            subject_id: labForm.subject_id, teacher_id: labForm.teacher_id,
            title: labForm.title, description: labForm.description,
            due_date: labForm.due_date, is_group: labForm.is_group,
            materials: labForm.materials.filter(m => m.title || m.material_url)
        };
        if (labForm.is_group) {
            body.class_id = labForm.class_id;
            body.teams = labForm.teams;
        }
        const res = await fetch(`/api/labs/${editingLab.id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body), credentials: 'include' });
        if (res.ok) {
            setShowLabModal(false);
            resetLabForm();
            await loadLabs();
        }
        else {
            const err = await res.json();
            alert(err.message || 'Ошибка');
        }
    };
    const handleDeleteLab = async (id) => {
        if (!confirm('Удалить лабораторную?'))
            return;
        await fetch(`/api/labs/${id}`, { method: 'DELETE', credentials: 'include' });
        loadLabs();
    };
    const loadClassStudents = async (classId) => {
        try {
            const res = await fetch(`/api/gradebook/classes/${classId}/students`, { credentials: 'include' });
            if (res.ok) {
                const data = await res.json();
                setAvailableClassStudents(data.students || []);
            }
        }
        catch { }
    };
    const addTeamToLabForm = () => setLabForm({ ...labForm, teams: [...labForm.teams, { name: '', members: [] }] });
    const removeTeamFromLabForm = (i) => setLabForm({ ...labForm, teams: labForm.teams.filter((_, idx) => idx !== i) });
    const updateTeamName = (i, name) => { const t = [...labForm.teams]; t[i].name = name; setLabForm({ ...labForm, teams: t }); };
    const toggleTeamMember = (ti, sid) => {
        const t = [...labForm.teams];
        t[ti].members = t[ti].members.includes(sid) ? t[ti].members.filter(id => id !== sid) : [...t[ti].members, sid];
        setLabForm({ ...labForm, teams: t });
    };
    if (loading)
        return _jsx("div", { className: "manage-container", children: _jsx("div", { className: "loading-spinner", children: "\u0417\u0430\u0433\u0440\u0443\u0437\u043A\u0430..." }) });
    return (_jsxs("div", { className: "manage-container", children: [_jsxs("div", { className: "manage-card", children: [_jsxs("div", { className: "manage-header", children: [_jsx("h1", { className: "manage-title", children: "\u0423\u043F\u0440\u0430\u0432\u043B\u0435\u043D\u0438\u0435" }), _jsx("p", { className: "manage-subtitle", children: "\u0423\u043F\u0440\u0430\u0432\u043B\u0435\u043D\u0438\u0435 \u0441\u0442\u0443\u0434\u0435\u043D\u0442\u0430\u043C\u0438, \u0443\u0447\u0438\u0442\u0435\u043B\u044F\u043C\u0438, \u043A\u043B\u0430\u0441\u0441\u0430\u043C\u0438, \u043F\u0440\u0435\u0434\u043C\u0435\u0442\u0430\u043C\u0438 \u0438 \u043B\u0430\u0431\u043E\u0440\u0430\u0442\u043E\u0440\u043D\u044B\u043C\u0438 \u0440\u0430\u0431\u043E\u0442\u0430\u043C\u0438" })] }), _jsxs("div", { className: "manage-tabs", children: [_jsxs("div", { className: "tabs-header", children: [userRole === 'admin' && (_jsxs(_Fragment, { children: [_jsx("button", { className: `tab-btn ${activeTab === 'students' ? 'active' : ''}`, onClick: () => setActiveTab('students'), children: "\u0421\u0442\u0443\u0434\u0435\u043D\u0442\u044B" }), _jsx("button", { className: `tab-btn ${activeTab === 'teachers' ? 'active' : ''}`, onClick: () => setActiveTab('teachers'), children: "\u0423\u0447\u0438\u0442\u0435\u043B\u044F" }), _jsx("button", { className: `tab-btn ${activeTab === 'classes' ? 'active' : ''}`, onClick: () => setActiveTab('classes'), children: "\u041A\u043B\u0430\u0441\u0441\u044B" }), _jsx("button", { className: `tab-btn ${activeTab === 'subjects' ? 'active' : ''}`, onClick: () => setActiveTab('subjects'), children: "\u041F\u0440\u0435\u0434\u043C\u0435\u0442\u044B" }), _jsx("button", { className: `tab-btn ${activeTab === 'assignments' ? 'active' : ''}`, onClick: () => setActiveTab('assignments'), children: "\u041F\u0440\u0438\u0432\u044F\u0437\u043A\u0430 \u0441\u0442\u0443\u0434\u0435\u043D\u0442\u043E\u0432" }), _jsx("button", { className: `tab-btn ${activeTab === 'teacher-subjects' ? 'active' : ''}`, onClick: () => setActiveTab('teacher-subjects'), children: "\u041D\u0430\u0437\u043D\u0430\u0447\u0435\u043D\u0438\u0435 \u0443\u0447\u0438\u0442\u0435\u043B\u0435\u0439" })] })), _jsx("button", { className: `tab-btn ${activeTab === 'labs' ? 'active' : ''}`, onClick: () => setActiveTab('labs'), children: "\u041B\u0430\u0431\u043E\u0440\u0430\u0442\u043E\u0440\u043D\u044B\u0435" })] }), activeTab === 'students' && (_jsxs("div", { className: "tab-content", children: [_jsxs("div", { className: "section-header", children: [_jsx("h2", { children: "\u0421\u043F\u0438\u0441\u043E\u043A \u0441\u0442\u0443\u0434\u0435\u043D\u0442\u043E\u0432" }), _jsx("button", { className: "btn-primary", onClick: () => { setEditingStudent(null); setStudentForm({ name: '', email: '', password: '' }); setShowStudentModal(true); }, children: "+ \u0414\u043E\u0431\u0430\u0432\u0438\u0442\u044C \u0441\u0442\u0443\u0434\u0435\u043D\u0442\u0430" })] }), _jsx("div", { className: "data-table-wrapper", children: _jsxs("table", { className: "data-table", children: [_jsx("thead", { children: _jsxs("tr", { children: [_jsx("th", { children: "ID" }), _jsx("th", { children: "\u0418\u043C\u044F" }), _jsx("th", { children: "Email" }), _jsx("th", { children: "\u0414\u0430\u0442\u0430 \u0440\u0435\u0433\u0438\u0441\u0442\u0440\u0430\u0446\u0438\u0438" }), _jsx("th", { children: "\u0414\u0435\u0439\u0441\u0442\u0432\u0438\u044F" })] }) }), _jsx("tbody", { children: students.map((s) => (_jsxs("tr", { children: [_jsx("td", { children: s.id }), _jsx("td", { children: s.name }), _jsx("td", { children: s.email }), _jsx("td", { children: new Date(s.created_at).toLocaleDateString() }), _jsxs("td", { className: "actions", children: [_jsx("button", { className: "btn-edit", onClick: () => { setEditingStudent(s); setStudentForm({ name: s.name, email: s.email, password: '' }); setShowStudentModal(true); }, children: "\u270F\uFE0F" }), _jsx("button", { className: "btn-delete", onClick: () => handleDeleteStudent(s.id), children: "\uD83D\uDDD1\uFE0F" })] })] }, s.id))) })] }) })] })), activeTab === 'teachers' && (_jsxs("div", { className: "tab-content", children: [_jsxs("div", { className: "section-header", children: [_jsx("h2", { children: "\u0421\u043F\u0438\u0441\u043E\u043A \u0443\u0447\u0438\u0442\u0435\u043B\u0435\u0439" }), _jsx("button", { className: "btn-primary", onClick: () => { setEditingTeacher(null); setTeacherForm({ name: '', email: '', password: '' }); setShowTeacherModal(true); }, children: "+ \u0414\u043E\u0431\u0430\u0432\u0438\u0442\u044C \u0443\u0447\u0438\u0442\u0435\u043B\u044F" })] }), _jsx("div", { className: "data-table-wrapper", children: _jsxs("table", { className: "data-table", children: [_jsx("thead", { children: _jsxs("tr", { children: [_jsx("th", { children: "ID" }), _jsx("th", { children: "\u0418\u043C\u044F" }), _jsx("th", { children: "Email" }), _jsx("th", { children: "\u0414\u0430\u0442\u0430 \u0440\u0435\u0433\u0438\u0441\u0442\u0440\u0430\u0446\u0438\u0438" }), _jsx("th", { children: "\u0414\u0435\u0439\u0441\u0442\u0432\u0438\u044F" })] }) }), _jsx("tbody", { children: teachers.map((t) => (_jsxs("tr", { children: [_jsx("td", { children: t.id }), _jsx("td", { children: t.name }), _jsx("td", { children: t.email }), _jsx("td", { children: new Date(t.created_at).toLocaleDateString() }), _jsxs("td", { className: "actions", children: [_jsx("button", { className: "btn-edit", onClick: () => { setEditingTeacher(t); setTeacherForm({ name: t.name, email: t.email, password: '' }); setShowTeacherModal(true); }, children: "\u270F\uFE0F" }), _jsx("button", { className: "btn-delete", onClick: () => handleDeleteTeacher(t.id), children: "\uD83D\uDDD1\uFE0F" })] })] }, t.id))) })] }) })] })), activeTab === 'classes' && (_jsxs("div", { className: "tab-content", children: [_jsxs("div", { className: "section-header", children: [_jsx("h2", { children: "\u0421\u043F\u0438\u0441\u043E\u043A \u043A\u043B\u0430\u0441\u0441\u043E\u0432" }), _jsx("button", { className: "btn-primary", onClick: () => { setEditingClass(null); setClassForm({ name: '', year: new Date().getFullYear() + 3 }); setShowClassModal(true); }, children: "+ \u0414\u043E\u0431\u0430\u0432\u0438\u0442\u044C \u043A\u043B\u0430\u0441\u0441" })] }), _jsx("div", { className: "data-table-wrapper", children: _jsxs("table", { className: "data-table", children: [_jsx("thead", { children: _jsxs("tr", { children: [_jsx("th", { children: "ID" }), _jsx("th", { children: "\u041D\u0430\u0437\u0432\u0430\u043D\u0438\u0435" }), _jsx("th", { children: "\u0413\u043E\u0434 \u0432\u044B\u043F\u0443\u0441\u043A\u0430" }), _jsx("th", { children: "\u0414\u0435\u0439\u0441\u0442\u0432\u0438\u044F" })] }) }), _jsx("tbody", { children: classes.map((c) => (_jsxs("tr", { children: [_jsx("td", { children: c.id }), _jsx("td", { children: c.name }), _jsx("td", { children: c.year }), _jsxs("td", { className: "actions", children: [_jsx("button", { className: "btn-edit", onClick: () => { setEditingClass(c); setClassForm({ name: c.name, year: c.year }); setShowClassModal(true); }, children: "\u270F\uFE0F" }), _jsx("button", { className: "btn-delete", onClick: () => handleDeleteClass(c.id), children: "\uD83D\uDDD1\uFE0F" })] })] }, c.id))) })] }) })] })), activeTab === 'subjects' && (_jsxs("div", { className: "tab-content", children: [_jsxs("div", { className: "section-header", children: [_jsx("h2", { children: "\u0421\u043F\u0438\u0441\u043E\u043A \u043F\u0440\u0435\u0434\u043C\u0435\u0442\u043E\u0432" }), _jsx("button", { className: "btn-primary", onClick: () => { setEditingSubject(null); setSubjectForm({ name: '', description: '' }); setShowSubjectModal(true); }, children: "+ \u0414\u043E\u0431\u0430\u0432\u0438\u0442\u044C \u043F\u0440\u0435\u0434\u043C\u0435\u0442" })] }), _jsx("div", { className: "data-table-wrapper", children: _jsxs("table", { className: "data-table", children: [_jsx("thead", { children: _jsxs("tr", { children: [_jsx("th", { children: "ID" }), _jsx("th", { children: "\u041D\u0430\u0437\u0432\u0430\u043D\u0438\u0435" }), _jsx("th", { children: "\u041E\u043F\u0438\u0441\u0430\u043D\u0438\u0435" }), _jsx("th", { children: "\u0414\u0435\u0439\u0441\u0442\u0432\u0438\u044F" })] }) }), _jsx("tbody", { children: subjects.map((s) => (_jsxs("tr", { children: [_jsx("td", { children: s.id }), _jsx("td", { children: s.name }), _jsx("td", { children: s.description || '-' }), _jsxs("td", { className: "actions", children: [_jsx("button", { className: "btn-edit", onClick: () => { setEditingSubject(s); setSubjectForm({ name: s.name, description: s.description || '' }); setShowSubjectModal(true); }, children: "\u270F\uFE0F" }), _jsx("button", { className: "btn-delete", onClick: () => handleDeleteSubject(s.id), children: "\uD83D\uDDD1\uFE0F" })] })] }, s.id))) })] }) })] })), activeTab === 'assignments' && (_jsxs("div", { className: "tab-content", children: [_jsxs("div", { className: "section-header", children: [_jsx("h2", { children: "\u041F\u0440\u0438\u0432\u044F\u0437\u043A\u0430 \u0441\u0442\u0443\u0434\u0435\u043D\u0442\u043E\u0432 \u043A \u043A\u043B\u0430\u0441\u0441\u0430\u043C" }), _jsx("button", { className: "btn-primary", onClick: () => setShowAssignModal(true), children: "+ \u041F\u0440\u0438\u0432\u044F\u0437\u0430\u0442\u044C \u0441\u0442\u0443\u0434\u0435\u043D\u0442\u0430" })] }), _jsx("div", { className: "data-table-wrapper", children: _jsxs("table", { className: "data-table", children: [_jsx("thead", { children: _jsxs("tr", { children: [_jsx("th", { children: "ID" }), _jsx("th", { children: "\u0421\u0442\u0443\u0434\u0435\u043D\u0442" }), _jsx("th", { children: "\u041A\u043B\u0430\u0441\u0441" }), _jsx("th", { children: "\u0414\u0430\u0442\u0430" }), _jsx("th", { children: "\u0414\u0435\u0439\u0441\u0442\u0432\u0438\u044F" })] }) }), _jsx("tbody", { children: studentClasses.map((sc) => (_jsxs("tr", { children: [_jsx("td", { children: sc.id }), _jsx("td", { children: students.find(s => s.id === sc.student_id)?.name || sc.student_id }), _jsx("td", { children: classes.find(c => c.id === sc.class_id)?.name || sc.class_id }), _jsx("td", { children: new Date(sc.joined_at).toLocaleDateString() }), _jsx("td", { className: "actions", children: _jsx("button", { className: "btn-delete", onClick: () => handleRemoveStudentFromClass(sc.id), children: "\uD83D\uDDD1\uFE0F" }) })] }, sc.id))) })] }) })] })), activeTab === 'teacher-subjects' && (_jsxs("div", { className: "tab-content", children: [_jsxs("div", { className: "section-header", children: [_jsx("h2", { children: "\u041D\u0430\u0437\u043D\u0430\u0447\u0435\u043D\u0438\u0435 \u0443\u0447\u0438\u0442\u0435\u043B\u0435\u0439" }), _jsx("button", { className: "btn-primary", onClick: () => setShowTeacherSubjectModal(true), children: "+ \u041D\u0430\u0437\u043D\u0430\u0447\u0438\u0442\u044C \u0443\u0447\u0438\u0442\u0435\u043B\u044F" })] }), _jsx("div", { className: "data-table-wrapper", children: _jsxs("table", { className: "data-table", children: [_jsx("thead", { children: _jsxs("tr", { children: [_jsx("th", { children: "ID" }), _jsx("th", { children: "\u0423\u0447\u0438\u0442\u0435\u043B\u044C" }), _jsx("th", { children: "\u041F\u0440\u0435\u0434\u043C\u0435\u0442" }), _jsx("th", { children: "\u041A\u043B\u0430\u0441\u0441" }), _jsx("th", { children: "\u0414\u0435\u0439\u0441\u0442\u0432\u0438\u044F" })] }) }), _jsx("tbody", { children: teacherSubjects.map((ts) => (_jsxs("tr", { children: [_jsx("td", { children: ts.id }), _jsx("td", { children: teachers.find(t => t.id === ts.teacher_id)?.name || ts.teacher_id }), _jsx("td", { children: subjects.find(s => s.id === ts.subject_id)?.name || ts.subject_id }), _jsx("td", { children: classes.find(c => c.id === ts.class_id)?.name || ts.class_id }), _jsx("td", { className: "actions", children: _jsx("button", { className: "btn-delete", onClick: () => handleRemoveTeacherSubject(ts.id), children: "\uD83D\uDDD1\uFE0F" }) })] }, ts.id))) })] }) })] })), activeTab === 'labs' && (_jsxs("div", { className: "tab-content", children: [_jsxs("div", { className: "section-header", children: [_jsx("h2", { children: "\u041B\u0430\u0431\u043E\u0440\u0430\u0442\u043E\u0440\u043D\u044B\u0435 \u0440\u0430\u0431\u043E\u0442\u044B" }), _jsx("button", { className: "btn-primary", onClick: () => { resetLabForm(); setShowLabModal(true); }, children: "+ \u0414\u043E\u0431\u0430\u0432\u0438\u0442\u044C \u043B\u0430\u0431\u043E\u0440\u0430\u0442\u043E\u0440\u043D\u0443\u044E" })] }), _jsx("div", { className: "data-table-wrapper", children: _jsxs("table", { className: "data-table", children: [_jsx("thead", { children: _jsxs("tr", { children: [_jsx("th", { children: "ID" }), _jsx("th", { children: "\u041D\u0430\u0437\u0432\u0430\u043D\u0438\u0435" }), _jsx("th", { children: "\u041F\u0440\u0435\u0434\u043C\u0435\u0442" }), _jsx("th", { children: "\u0414\u0435\u0434\u043B\u0430\u0439\u043D" }), _jsx("th", { children: "\u0413\u0440\u0443\u043F\u043F\u043E\u0432\u0430\u044F" }), _jsx("th", { children: "\u0414\u0435\u0439\u0441\u0442\u0432\u0438\u044F" })] }) }), _jsx("tbody", { children: labs.map(lab => (_jsxs("tr", { children: [_jsx("td", { children: lab.id }), _jsx("td", { children: lab.title }), _jsx("td", { children: lab.subject_name }), _jsx("td", { children: new Date(lab.due_date).toLocaleDateString() }), _jsx("td", { children: lab.is_group ? 'Да' : 'Нет' }), _jsxs("td", { className: "actions", children: [_jsx("button", { className: "btn-edit", onClick: () => { setEditingLab(lab); setLabForm({ subject_id: lab.subject_id, teacher_id: lab.teacher_id, title: lab.title, description: lab.description || '', due_date: lab.due_date, is_group: lab.is_group, class_id: lab.class_id || 0, materials: lab.materials?.length ? lab.materials : [{ title: '', material_url: '' }], teams: lab.teams?.map((t) => ({ id: t.id, name: t.name, members: t.members?.map((m) => m.id) || [] })) || [] }); setShowLabModal(true); }, children: "\u270F\uFE0F" }), _jsx("button", { className: "btn-delete", onClick: () => handleDeleteLab(lab.id), children: "\uD83D\uDDD1\uFE0F" })] })] }, lab.id))) })] }) })] }))] })] }), showStudentModal && (_jsx("div", { className: "modal-overlay", children: _jsxs("div", { className: "modal-content", children: [_jsxs("h2", { children: [editingStudent ? 'Редактировать' : 'Добавить', " \u0441\u0442\u0443\u0434\u0435\u043D\u0442\u0430"] }), _jsxs("form", { onSubmit: editingStudent ? handleUpdateStudent : handleCreateStudent, children: [_jsxs("div", { className: "form-group", children: [_jsx("label", { children: "\u0418\u043C\u044F" }), _jsx("input", { value: studentForm.name, onChange: e => setStudentForm({ ...studentForm, name: e.target.value }), required: true })] }), _jsxs("div", { className: "form-group", children: [_jsx("label", { children: "Email" }), _jsx("input", { type: "email", value: studentForm.email, onChange: e => setStudentForm({ ...studentForm, email: e.target.value }), required: true })] }), !editingStudent && _jsxs("div", { className: "form-group", children: [_jsx("label", { children: "\u041F\u0430\u0440\u043E\u043B\u044C" }), _jsx("input", { type: "password", value: studentForm.password, onChange: e => setStudentForm({ ...studentForm, password: e.target.value }), required: true })] }), _jsxs("div", { className: "modal-buttons", children: [_jsx("button", { type: "button", onClick: () => setShowStudentModal(false), children: "\u041E\u0442\u043C\u0435\u043D\u0430" }), _jsx("button", { type: "submit", children: "\u0421\u043E\u0445\u0440\u0430\u043D\u0438\u0442\u044C" })] })] })] }) })), showTeacherModal && (_jsx("div", { className: "modal-overlay", children: _jsxs("div", { className: "modal-content", children: [_jsxs("h2", { children: [editingTeacher ? 'Редактировать' : 'Добавить', " \u0443\u0447\u0438\u0442\u0435\u043B\u044F"] }), _jsxs("form", { onSubmit: editingTeacher ? handleUpdateTeacher : handleCreateTeacher, children: [_jsxs("div", { className: "form-group", children: [_jsx("label", { children: "\u0418\u043C\u044F" }), _jsx("input", { value: teacherForm.name, onChange: e => setTeacherForm({ ...teacherForm, name: e.target.value }), required: true })] }), _jsxs("div", { className: "form-group", children: [_jsx("label", { children: "Email" }), _jsx("input", { type: "email", value: teacherForm.email, onChange: e => setTeacherForm({ ...teacherForm, email: e.target.value }), required: true })] }), !editingTeacher && _jsxs("div", { className: "form-group", children: [_jsx("label", { children: "\u041F\u0430\u0440\u043E\u043B\u044C" }), _jsx("input", { type: "password", value: teacherForm.password, onChange: e => setTeacherForm({ ...teacherForm, password: e.target.value }), required: true })] }), _jsxs("div", { className: "modal-buttons", children: [_jsx("button", { type: "button", onClick: () => setShowTeacherModal(false), children: "\u041E\u0442\u043C\u0435\u043D\u0430" }), _jsx("button", { type: "submit", children: "\u0421\u043E\u0445\u0440\u0430\u043D\u0438\u0442\u044C" })] })] })] }) })), showClassModal && (_jsx("div", { className: "modal-overlay", children: _jsxs("div", { className: "modal-content", children: [_jsxs("h2", { children: [editingClass ? 'Редактировать' : 'Добавить', " \u043A\u043B\u0430\u0441\u0441"] }), _jsxs("form", { onSubmit: editingClass ? handleUpdateClass : handleCreateClass, children: [_jsxs("div", { className: "form-group", children: [_jsx("label", { children: "\u041D\u0430\u0437\u0432\u0430\u043D\u0438\u0435" }), _jsx("input", { value: classForm.name, onChange: e => setClassForm({ ...classForm, name: e.target.value }), required: true })] }), _jsxs("div", { className: "form-group", children: [_jsx("label", { children: "\u0413\u043E\u0434 \u0432\u044B\u043F\u0443\u0441\u043A\u0430" }), _jsx("input", { type: "number", value: classForm.year, onChange: e => setClassForm({ ...classForm, year: +e.target.value }), required: true })] }), _jsxs("div", { className: "modal-buttons", children: [_jsx("button", { type: "button", onClick: () => setShowClassModal(false), children: "\u041E\u0442\u043C\u0435\u043D\u0430" }), _jsx("button", { type: "submit", children: "\u0421\u043E\u0445\u0440\u0430\u043D\u0438\u0442\u044C" })] })] })] }) })), showSubjectModal && (_jsx("div", { className: "modal-overlay", children: _jsxs("div", { className: "modal-content", children: [_jsxs("h2", { children: [editingSubject ? 'Редактировать' : 'Добавить', " \u043F\u0440\u0435\u0434\u043C\u0435\u0442"] }), _jsxs("form", { onSubmit: editingSubject ? handleUpdateSubject : handleCreateSubject, children: [_jsxs("div", { className: "form-group", children: [_jsx("label", { children: "\u041D\u0430\u0437\u0432\u0430\u043D\u0438\u0435" }), _jsx("input", { value: subjectForm.name, onChange: e => setSubjectForm({ ...subjectForm, name: e.target.value }), required: true })] }), _jsxs("div", { className: "form-group", children: [_jsx("label", { children: "\u041E\u043F\u0438\u0441\u0430\u043D\u0438\u0435" }), _jsx("textarea", { value: subjectForm.description, onChange: e => setSubjectForm({ ...subjectForm, description: e.target.value }), rows: 3 })] }), _jsxs("div", { className: "modal-buttons", children: [_jsx("button", { type: "button", onClick: () => setShowSubjectModal(false), children: "\u041E\u0442\u043C\u0435\u043D\u0430" }), _jsx("button", { type: "submit", children: "\u0421\u043E\u0445\u0440\u0430\u043D\u0438\u0442\u044C" })] })] })] }) })), showAssignModal && (_jsx("div", { className: "modal-overlay", children: _jsxs("div", { className: "modal-content", children: [_jsx("h2", { children: "\u041F\u0440\u0438\u0432\u044F\u0437\u0430\u0442\u044C \u0441\u0442\u0443\u0434\u0435\u043D\u0442\u0430 \u043A \u043A\u043B\u0430\u0441\u0441\u0443" }), _jsxs("form", { onSubmit: handleAssignStudentToClass, children: [_jsxs("div", { className: "form-group", children: [_jsx("label", { children: "\u0421\u0442\u0443\u0434\u0435\u043D\u0442" }), _jsxs("select", { value: assignForm.student_id, onChange: e => setAssignForm({ ...assignForm, student_id: +e.target.value }), required: true, children: [_jsx("option", { value: "", children: "\u0412\u044B\u0431\u0440\u0430\u0442\u044C" }), students.map(s => _jsx("option", { value: s.id, children: s.name }, s.id))] })] }), _jsxs("div", { className: "form-group", children: [_jsx("label", { children: "\u041A\u043B\u0430\u0441\u0441" }), _jsxs("select", { value: assignForm.class_id, onChange: e => setAssignForm({ ...assignForm, class_id: +e.target.value }), required: true, children: [_jsx("option", { value: "", children: "\u0412\u044B\u0431\u0440\u0430\u0442\u044C" }), classes.map(c => _jsx("option", { value: c.id, children: c.name }, c.id))] })] }), _jsxs("div", { className: "modal-buttons", children: [_jsx("button", { type: "button", onClick: () => setShowAssignModal(false), children: "\u041E\u0442\u043C\u0435\u043D\u0430" }), _jsx("button", { type: "submit", children: "\u0421\u043E\u0445\u0440\u0430\u043D\u0438\u0442\u044C" })] })] })] }) })), showTeacherSubjectModal && (_jsx("div", { className: "modal-overlay", children: _jsxs("div", { className: "modal-content", children: [_jsx("h2", { children: "\u041D\u0430\u0437\u043D\u0430\u0447\u0438\u0442\u044C \u0443\u0447\u0438\u0442\u0435\u043B\u044F" }), _jsxs("form", { onSubmit: handleAssignTeacherToSubject, children: [_jsxs("div", { className: "form-group", children: [_jsx("label", { children: "\u0423\u0447\u0438\u0442\u0435\u043B\u044C" }), _jsxs("select", { value: teacherSubjectForm.teacher_id, onChange: e => setTeacherSubjectForm({ ...teacherSubjectForm, teacher_id: +e.target.value }), required: true, children: [_jsx("option", { value: "", children: "\u0412\u044B\u0431\u0440\u0430\u0442\u044C" }), teachers.map(t => _jsx("option", { value: t.id, children: t.name }, t.id))] })] }), _jsxs("div", { className: "form-group", children: [_jsx("label", { children: "\u041F\u0440\u0435\u0434\u043C\u0435\u0442" }), _jsxs("select", { value: teacherSubjectForm.subject_id, onChange: e => setTeacherSubjectForm({ ...teacherSubjectForm, subject_id: +e.target.value }), required: true, children: [_jsx("option", { value: "", children: "\u0412\u044B\u0431\u0440\u0430\u0442\u044C" }), subjects.map(s => _jsx("option", { value: s.id, children: s.name }, s.id))] })] }), _jsxs("div", { className: "form-group", children: [_jsx("label", { children: "\u041A\u043B\u0430\u0441\u0441" }), _jsxs("select", { value: teacherSubjectForm.class_id, onChange: e => setTeacherSubjectForm({ ...teacherSubjectForm, class_id: +e.target.value }), required: true, children: [_jsx("option", { value: "", children: "\u0412\u044B\u0431\u0440\u0430\u0442\u044C" }), classes.map(c => _jsx("option", { value: c.id, children: c.name }, c.id))] })] }), _jsxs("div", { className: "modal-buttons", children: [_jsx("button", { type: "button", onClick: () => setShowTeacherSubjectModal(false), children: "\u041E\u0442\u043C\u0435\u043D\u0430" }), _jsx("button", { type: "submit", children: "\u0421\u043E\u0445\u0440\u0430\u043D\u0438\u0442\u044C" })] })] })] }) })), showLabModal && (_jsx("div", { className: "modal-overlay", children: _jsxs("div", { className: "modal-content", style: { maxWidth: 680, width: '95%' }, children: [_jsxs("h2", { children: [editingLab ? 'Редактировать' : 'Добавить', " \u043B\u0430\u0431\u043E\u0440\u0430\u0442\u043E\u0440\u043D\u0443\u044E"] }), _jsxs("form", { onSubmit: editingLab ? handleUpdateLab : handleCreateLab, style: { display: 'flex', flexDirection: 'column', gap: 16 }, children: [_jsxs("div", { style: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }, children: [_jsxs("div", { className: "form-group", children: [_jsx("label", { children: "\u041F\u0440\u0435\u0434\u043C\u0435\u0442" }), _jsxs("select", { value: labForm.subject_id, onChange: e => setLabForm({ ...labForm, subject_id: +e.target.value }), required: true, children: [_jsx("option", { value: "", children: "\u0412\u044B\u0431\u0435\u0440\u0438\u0442\u0435 \u043F\u0440\u0435\u0434\u043C\u0435\u0442" }), userRole === "admin"
                                                            ? subjects.map(s => _jsx("option", { value: s.id, children: s.name }, s.id))
                                                            : teacherSubjects.map(s => {
                                                                const subject = subjects.find(subj => subj.id == s.subject_id && s.teacher_id.toString() == userId);
                                                                return subject ? _jsx("option", { value: subject.id, children: subject.name }, subject.id) : null;
                                                            })] })] }), _jsxs("div", { className: "form-group", children: [_jsx("label", { children: "\u0423\u0447\u0438\u0442\u0435\u043B\u044C" }), _jsxs("select", { value: labForm.teacher_id, onChange: e => setLabForm({ ...labForm, teacher_id: +e.target.value }), required: true, children: [_jsx("option", { value: "", children: "\u0412\u044B\u0431\u0435\u0440\u0438\u0442\u0435 \u0443\u0447\u0438\u0442\u0435\u043B\u044F" }), userRole === "admin"
                                                            ? teachers.map(t => _jsx("option", { value: t.id, children: t.name }, t.id))
                                                            : teachers.filter(t => t.id.toString() === userId || t.email == user.email).map(t => _jsx("option", { value: t.id, children: t.name }, t.id))] })] })] }), _jsxs("div", { className: "form-group", children: [_jsx("label", { children: "\u041D\u0430\u0437\u0432\u0430\u043D\u0438\u0435" }), _jsx("input", { value: labForm.title, onChange: e => setLabForm({ ...labForm, title: e.target.value }), placeholder: "\u041B\u0430\u0431\u043E\u0440\u0430\u0442\u043E\u0440\u043D\u0430\u044F \u0440\u0430\u0431\u043E\u0442\u0430 \u21161", required: true })] }), _jsxs("div", { className: "form-group", children: [_jsx("label", { children: "\u041E\u043F\u0438\u0441\u0430\u043D\u0438\u0435" }), _jsx("textarea", { value: labForm.description, onChange: e => setLabForm({ ...labForm, description: e.target.value }), rows: 3, placeholder: "\u041E\u043F\u0438\u0441\u0430\u043D\u0438\u0435 \u0437\u0430\u0434\u0430\u043D\u0438\u044F..." })] }), _jsxs("div", { className: "form-group", children: [_jsx("label", { children: "\u0414\u0435\u0434\u043B\u0430\u0439\u043D" }), _jsx("input", { type: "date", value: labForm.due_date, onChange: e => setLabForm({ ...labForm, due_date: e.target.value }), required: true })] }), _jsxs("label", { style: { display: 'flex', alignItems: 'center', gap: 10, fontSize: 14, fontWeight: 500, cursor: 'pointer' }, children: [_jsx("input", { type: "checkbox", checked: labForm.is_group, onChange: e => setLabForm({ ...labForm, is_group: e.target.checked, class_id: 0, teams: [] }), style: { width: 18, height: 18 } }), "\u041A\u043E\u043C\u0430\u043D\u0434\u043D\u0430\u044F \u0440\u0430\u0431\u043E\u0442\u0430"] }), labForm.is_group && (_jsxs("div", { style: { background: '#f9fafb', borderRadius: 12, padding: 16, display: 'flex', flexDirection: 'column', gap: 12 }, children: [_jsxs("div", { className: "form-group", children: [_jsx("label", { children: "\u041A\u043B\u0430\u0441\u0441" }), _jsxs("select", { value: labForm.class_id, onChange: e => { const id = +e.target.value; setLabForm({ ...labForm, class_id: id, teams: [] }); if (id)
                                                        loadClassStudents(id); }, required: true, children: [_jsx("option", { value: "", children: "\u0412\u044B\u0431\u0435\u0440\u0438\u0442\u0435 \u043A\u043B\u0430\u0441\u0441" }), classes.map(c => _jsx("option", { value: c.id, children: c.name }, c.id))] })] }), _jsxs("div", { children: [_jsxs("div", { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }, children: [_jsx("p", { style: { fontSize: 13, fontWeight: 600, margin: 0 }, children: "\u041A\u043E\u043C\u0430\u043D\u0434\u044B" }), _jsx("button", { type: "button", onClick: addTeamToLabForm, style: { background: '#3b82f6', color: '#fff', border: 'none', borderRadius: 8, padding: '6px 14px', fontSize: 12, fontWeight: 500, cursor: 'pointer' }, children: "+ \u0414\u043E\u0431\u0430\u0432\u0438\u0442\u044C \u043A\u043E\u043C\u0430\u043D\u0434\u0443" })] }), labForm.teams.length === 0 && _jsx("p", { style: { color: '#9ca3af', fontSize: 12 }, children: "\u041D\u0435\u0442 \u043A\u043E\u043C\u0430\u043D\u0434" }), labForm.teams.map((team, ti) => (_jsxs("div", { style: { background: '#fff', borderRadius: 10, border: '1px solid #e5e7eb', padding: 12, marginBottom: 10 }, children: [_jsxs("div", { style: { display: 'flex', gap: 8, marginBottom: 8 }, children: [_jsx("input", { placeholder: "\u041D\u0430\u0437\u0432\u0430\u043D\u0438\u0435 \u043A\u043E\u043C\u0430\u043D\u0434\u044B", value: team.name, onChange: e => updateTeamName(ti, e.target.value), style: { flex: 1, padding: '8px 10px', border: '1px solid #e5e7eb', borderRadius: 8, fontSize: 13 } }), _jsx("button", { type: "button", onClick: () => removeTeamFromLabForm(ti), style: { background: '#fee2e2', border: 'none', color: '#dc2626', borderRadius: 8, padding: '6px 12px', cursor: 'pointer', fontSize: 13 }, children: "\u2715" })] }), availableClassStudents.length > 0 && (_jsx("div", { style: { maxHeight: 140, overflow: 'auto', border: '1px solid #f0f0f0', borderRadius: 8, padding: 4 }, children: availableClassStudents.map((s) => (_jsxs("label", { style: { display: 'flex', alignItems: 'center', gap: 10, padding: '6px 8px', borderRadius: 6, cursor: 'pointer', fontSize: 12, background: team.members.includes(s.id) ? '#eff6ff' : 'transparent' }, children: [_jsx("input", { type: "checkbox", checked: team.members.includes(s.id), onChange: () => toggleTeamMember(ti, s.id), style: { width: 15, height: 15 } }), s.name] }, s.id))) }))] }, ti)))] })] })), _jsxs("div", { className: "form-group", children: [_jsx("label", { children: "\u041C\u0430\u0442\u0435\u0440\u0438\u0430\u043B\u044B" }), _jsxs("div", { style: { border: '1px solid #e5e7eb', borderRadius: 12, padding: 12, display: 'flex', flexDirection: 'column', gap: 8 }, children: [labForm.materials.map((m, i) => (_jsxs("div", { style: { display: 'flex', gap: 8, alignItems: 'center' }, children: [_jsx("input", { placeholder: "\u041D\u0430\u0437\u0432\u0430\u043D\u0438\u0435", value: m.title, onChange: e => { const u = [...labForm.materials]; u[i].title = e.target.value; setLabForm({ ...labForm, materials: u }); }, style: { flex: 1 } }), _jsx("input", { placeholder: "URL", value: m.material_url, onChange: e => { const u = [...labForm.materials]; u[i].material_url = e.target.value; setLabForm({ ...labForm, materials: u }); }, style: { flex: 2 } }), _jsx("button", { type: "button", onClick: () => { const u = labForm.materials.filter((_, idx) => idx !== i); setLabForm({ ...labForm, materials: u.length ? u : [{ title: '', material_url: '' }] }); }, style: { background: '#fee2e2', border: 'none', color: '#dc2626', borderRadius: 8, padding: '8px 12px', cursor: 'pointer' }, children: "\u2715" })] }, i))), _jsx("button", { type: "button", onClick: () => setLabForm({ ...labForm, materials: [...labForm.materials, { title: '', material_url: '' }] }), style: { background: '#f3f4f6', border: 'none', padding: '8px 14px', borderRadius: 8, fontSize: 13, cursor: 'pointer', color: '#374151', fontWeight: 500 }, children: "+ \u0414\u043E\u0431\u0430\u0432\u0438\u0442\u044C \u043C\u0430\u0442\u0435\u0440\u0438\u0430\u043B" })] })] }), _jsxs("div", { className: "modal-buttons", children: [_jsx("button", { type: "button", onClick: () => setShowLabModal(false), children: "\u041E\u0442\u043C\u0435\u043D\u0430" }), _jsx("button", { type: "submit", children: editingLab ? 'Сохранить' : 'Создать' })] })] })] }) })), _jsx("style", { children: `
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
      ` })] }));
}
export default ManageStudentsPage;
