import React, { useEffect, useState } from 'react';
import axios from 'axios';

interface Material {
    title?: string;
    material_url: string;
}
interface Submission {
    id: number;
    submission_text: string;
    file_path: string;
    submitted_at: string;
}
interface Grade {
    id: number;
    grade: number;
    comment: string;
    graded_at: string;
}
interface Groupmate {
    id: number;
    name: string;
    email: string;
}
interface LabWork {
    id: number;
    title: string;
    description: string;
    issued_date: string;
    deadline: string;
    is_group: boolean;
    subject_name: string;
    teacher_name: string;
    submitted: boolean;
    grade: number | null;
    teacher_comment: string | null;
}
interface LabDetail {
    id: number;
    title: string;
    description: string;
    issued_date: string;
    deadline: string;
    is_group: boolean;
    subject_name: string;
    teacher_name: string;
    materials: Material[];
}

const LabStudentPage: React.FC = () => {
    const [labs, setLabs] = useState<LabWork[]>([]);
    const [subjects, setSubjects] = useState<{ id: number; name: string }[]>([]);
    const [selectedSubject, setSelectedSubject] = useState<number | null>(null);
    const [loading, setLoading] = useState(false);
    const [sideOpen, setSideOpen] = useState(false);
    const [detail, setDetail] = useState<LabDetail | null>(null);
    const [submission, setSubmission] = useState<Submission | null>(null);
    const [grade, setGrade] = useState<Grade | null>(null);
    const [groupmates, setGroupmates] = useState<Groupmate[]>([]);
    const [loadingDetail, setLoadingDetail] = useState(false);
    const [text, setText] = useState('');
    const [file, setFile] = useState<File | null>(null);
    const [sending, setSending] = useState(false);
    const [msg, setMsg] = useState('');

    const fetchLabs = async () => {
        setLoading(true);
        try {
            const params = selectedSubject ? { subject_id: selectedSubject } : {};
            const { data } = await axios.get('/api/labs', { params });
            setLabs(data.labs || []);
        } catch { setMsg('Ошибка загрузки'); }
        finally { setLoading(false); }
    };

    const openSide = async (id: number) => {
        setSideOpen(true);
        setLoadingDetail(true);
        try {
            const { data } = await axios.get(`/api/labs/${id}`);
            setDetail(data.lab || null);
            setSubmission(data.submission || null);
            setGrade(data.grade || null);
            setGroupmates(data.groupmates || []);
            setText(data.submission?.submission_text || '');
            setFile(null);
        } catch { setMsg('Ошибка загрузки'); }
        finally { setLoadingDetail(false); }
    };

    const send = async () => {
        if (!detail) return;
        if (!text && !file) { setMsg('Текст или файл обязательны'); return; }
        setSending(true);
        try {
            const fd = new FormData();
            fd.append('submission_text', text);
            if (file) fd.append('file', file);
            await axios.post(`/api/labs/${detail.id}/submit`, fd);
            setMsg('Отправлено!');
            openSide(detail.id);
        } catch { setMsg('Ошибка отправки'); }
        finally { setSending(false); }
    };

    useEffect(() => { fetchLabs(); }, [selectedSubject]);
    useEffect(() => {
        axios.get('/api/subjects/my').then(r => setSubjects(r.data.subjects || [])).catch(() => {});
    }, []);

    const dl = (d: string) => {
        const days = Math.ceil((new Date(d).getTime() - Date.now()) / 86400000);
        if (days < 0) return { t: `-${Math.abs(days)}д`, c: 'red' };
        if (days === 0) return { t: 'Сегодня', c: 'orange' };
        return { t: `${days}д`, c: 'green' };
    };

    return (
        <div className="min-h-screen bg-gray-50 flex">
            <div className="flex-1 p-6">
                <h1 className="text-2xl font-bold mb-4">🔬 Лабораторные работы</h1>
                <div className="flex gap-2 mb-6 flex-wrap">
                    <button onClick={() => setSelectedSubject(null)}
                            className={`px-4 py-2 rounded-lg text-sm ${!selectedSubject ? 'bg-blue-600 text-white' : 'bg-white border'}`}>Все</button>
                    {subjects.map(s => (
                        <button key={s.id} onClick={() => setSelectedSubject(s.id)}
                                className={`px-4 py-2 rounded-lg text-sm ${selectedSubject === s.id ? 'bg-blue-600 text-white' : 'bg-white border'}`}>{s.name}</button>
                    ))}
                </div>
                {loading ? <p className="text-gray-400">Загрузка...</p> : labs.length === 0 ? <p className="text-gray-400">Нет работ</p> :
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                        {labs.map(lab => {
                            const s = dl(lab.deadline);
                            return (
                                <div key={lab.id} onClick={() => openSide(lab.id)}
                                     className="bg-white rounded-xl p-5 shadow-sm border hover:shadow-md cursor-pointer transition-all">
                                    <div className="flex justify-between items-start mb-2">
                                        <span className={`text-xs px-2 py-1 rounded-full font-medium ${lab.submitted ? 'bg-green-100 text-green-700' : s.c === 'red' ? 'bg-red-100 text-red-700' : 'bg-blue-100 text-blue-700'}`}>
                                            {lab.submitted ? 'Сдано' : s.c === 'red' ? 'Просрочено' : 'Активно'}</span>
                                        {lab.grade && <span className="text-yellow-500 font-bold text-sm">⭐{lab.grade}</span>}
                                    </div>
                                    <h3 className="font-semibold mb-1">{lab.title}</h3>
                                    <p className="text-xs text-gray-500 mb-3">{lab.subject_name} · {lab.teacher_name}</p>
                                    <p className="text-xs text-gray-400">⏳ {lab.deadline} ({s.t})</p>
                                </div>
                            );
                        })}
                    </div>}
            </div>

            {sideOpen && (
                <div className="w-[450px] bg-white border-l shadow-lg p-6 overflow-y-auto max-h-screen">
                    <div className="flex justify-between items-center mb-4">
                        <h2 className="text-lg font-bold">Детали</h2>
                        <button onClick={() => setSideOpen(false)} className="text-gray-400 hover:text-gray-600 text-xl">&times;</button>
                    </div>
                    {loadingDetail ? <p className="text-gray-400">Загрузка...</p> : detail && (
                        <div className="space-y-5">
                            <div>
                                <h3 className="font-semibold text-lg">{detail.title}</h3>
                                <p className="text-sm text-gray-500">{detail.subject_name} · {detail.teacher_name}</p>
                            </div>
                            <div className="flex gap-3 text-sm">
                                <div className="bg-blue-50 px-3 py-2 rounded-lg flex-1"><span className="text-blue-600">Выдано</span><p className="font-medium">{detail.issued_date}</p></div>
                                <div className={`px-3 py-2 rounded-lg flex-1 ${dl(detail.deadline).c === 'red' ? 'bg-red-50' : 'bg-green-50'}`}><span className={dl(detail.deadline).c === 'red' ? 'text-red-600' : 'text-green-600'}>Дедлайн</span><p className="font-medium">{detail.deadline}</p></div>
                            </div>
                            {detail.description && <p className="text-sm text-gray-600">{detail.description}</p>}
                            {detail.materials?.length > 0 && (
                                <div>
                                    <p className="font-medium text-sm mb-2">📚 Материалы</p>
                                    {detail.materials.map((m, i) => (
                                        <a key={i} href={m.material_url} target="_blank" className="block text-sm text-blue-600 hover:underline py-1">📎 {m.title || m.material_url}</a>
                                    ))}
                                </div>
                            )}
                            {detail.is_group && groupmates.length > 0 && (
                                <div>
                                    <p className="font-medium text-sm mb-2">👥 Напарники</p>
                                    {groupmates.map(g => (
                                        <div key={g.id} className="flex items-center gap-2 py-1 text-sm">
                                            <div className="w-7 h-7 bg-purple-200 rounded-full flex items-center justify-center text-xs font-bold">{g.name[0]}</div>
                                            {g.name}
                                        </div>
                                    ))}
                                </div>
                            )}
                            <div className="border-t pt-4">
                                <p className="font-medium text-sm mb-2">{submission ? 'Обновить' : 'Отправить'} решение</p>
                                <textarea value={text} onChange={e => setText(e.target.value)} rows={3} className="w-full border rounded-lg p-2 text-sm mb-2" placeholder="Текст решения..." />
                                <div className="flex items-center gap-2 mb-3">
                                    <label className="text-sm cursor-pointer bg-gray-100 px-3 py-1.5 rounded-lg hover:bg-gray-200">📁 {file ? file.name : 'Файл'}<input type="file" className="hidden" onChange={e => setFile(e.target.files?.[0] || null)} /></label>
                                    {file && <button onClick={() => setFile(null)} className="text-red-500 text-sm">Удалить</button>}
                                </div>
                                <button onClick={send} disabled={sending || (!text && !file)} className="w-full bg-blue-600 text-white py-2 rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50">
                                    {sending ? 'Отправка...' : submission ? 'Обновить' : 'Отправить'}
                                </button>
                            </div>
                            {submission && (
                                <div className="bg-green-50 p-3 rounded-lg text-sm">
                                    <p className="font-medium text-green-800">✅ Отправлено: {submission.submitted_at}</p>
                                    {submission.submission_text && <p className="mt-1">{submission.submission_text}</p>}
                                    {submission.file_path && <a href={submission.file_path} target="_blank" className="text-blue-600 block mt-1">📄 Скачать файл</a>}
                                </div>
                            )}
                            {grade && (
                                <div className="bg-yellow-50 p-3 rounded-lg text-sm">
                                    <p className="font-medium text-yellow-800">⭐ Оценка: {grade.grade}/10</p>
                                    {grade.comment && <p className="mt-1">💬 {grade.comment}</p>}
                                    <p className="text-gray-400 text-xs mt-1">{grade.graded_at}</p>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            )}
            {msg && (
                <div className="fixed bottom-4 right-4 bg-gray-800 text-white px-4 py-2 rounded-lg text-sm shadow-lg flex gap-2">
                    {msg} <button onClick={() => setMsg('')}>&times;</button>
                </div>
            )}
        </div>
    );
};

export default LabStudentPage;