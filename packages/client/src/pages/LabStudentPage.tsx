import React, { useEffect, useState, useRef } from 'react';
import axios from 'axios';


interface Material { title?: string; material_url: string }
interface Submission { id: number; submission_text: string; file_path: string; submitted_at: string }
interface Grade { id: number; grade: number; comment: string; graded_at: string }
interface Groupmate { id: number; name: string; email: string }
interface LabWork {
    id: number; title: string; description: string;
    issued_date: string; deadline: string; is_group: boolean;
    subject_name: string; teacher_name: string;
    submitted: boolean; grade: number | null; teacher_comment: string | null;
}
interface LabDetail {
    id: number; title: string; description: string;
    issued_date: string; deadline: string; is_group: boolean;
    subject_name: string; teacher_name: string; materials: Material[];
}


const daysLeft = (d: string) => Math.ceil((new Date(d).getTime() - Date.now()) / 86400000);
const isOverdue = (d: string) => new Date(d) < new Date();
const fmt = (d: string) => new Date(d).toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric' });

const StatusBadge: React.FC<{ submitted: boolean; deadline: string }> = ({ submitted, deadline }) => {
    if (submitted) return <span style={{ fontSize: 11, color: '#059669', background: '#ecfdf5', padding: '2px 8px', borderRadius: 999, fontWeight: 500 }}>Сдано</span>;
    if (isOverdue(deadline)) return <span style={{ fontSize: 11, color: '#ef4444', background: '#fef2f2', padding: '2px 8px', borderRadius: 999, fontWeight: 500 }}>Просрочено</span>;
    const d = daysLeft(deadline);
    return <span style={{ fontSize: 11, color: '#3b82f6', background: '#eff6ff', padding: '2px 8px', borderRadius: 999, fontWeight: 500 }}>{d === 0 ? 'Сегодня' : `${d} дн.`}</span>;
};


const LabCard: React.FC<{ lab: LabWork; index: number; active: boolean; onClick: () => void }> = ({ lab, index, active, onClick }) => (
    <div onClick={onClick} style={{
        cursor: 'pointer', padding: '12px 16px', borderRadius: 12, marginBottom: 4,
        border: active ? '1px solid #d1d5db' : '1px solid transparent',
        background: active ? '#f9fafb' : 'transparent',
        transition: 'all 0.15s'
    }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
            <span style={{ fontSize: 11, color: '#9ca3af', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 1 }}>
                Работа №{index + 1}
            </span>
            <StatusBadge submitted={lab.submitted} deadline={lab.deadline} />
        </div>
        <div style={{ fontSize: 14, fontWeight: 600, color: '#1f2937', lineHeight: 1.3, marginBottom: 6 }}>{lab.title}</div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: 11, color: '#9ca3af' }}>{lab.subject_name}</span>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <span style={{ fontSize: 11, color: isOverdue(lab.deadline) && !lab.submitted ? '#ef4444' : '#9ca3af' }}>
                    {fmt(lab.deadline)}
                </span>
                {lab.grade && <span style={{ fontSize: 11, fontWeight: 700, color: '#d97706' }}>{lab.grade}/10</span>}
            </div>
        </div>
    </div>
);


const Sec: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
    <div style={{ marginBottom: 24 }}>
        <div style={{ fontSize: 11, fontWeight: 600, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 10 }}>
            {title}
        </div>
        {children}
    </div>
);

const Chip: React.FC<{ active: boolean; onClick: () => void; children: React.ReactNode }> = ({ active, onClick, children }) => (
    <button onClick={onClick} style={{
        padding: '4px 12px', borderRadius: 8, fontSize: 11, fontWeight: 600, border: 'none', cursor: 'pointer',
        background: active ? '#111827' : '#f3f4f6', color: active ? '#fff' : '#6b7280'
    }}>{children}</button>
);

const LabStudentPage: React.FC = () => {
    const [labs, setLabs] = useState<LabWork[]>([]);
    const [subjects, setSubjects] = useState<{ id: number; name: string }[]>([]);
    const [filterSubject, setFilterSubject] = useState<number | null>(null);
    const [filterStatus, setFilterStatus] = useState<'all' | 'submitted' | 'pending'>('all');
    const [activeId, setActiveId] = useState<number | null>(null);
    const [detail, setDetail] = useState<LabDetail | null>(null);
    const [submission, setSubmission] = useState<Submission | null>(null);
    const [grade, setGrade] = useState<Grade | null>(null);
    const [mates, setMates] = useState<Groupmate[]>([]);
    const [comment, setComment] = useState('');
    const [file, setFile] = useState<File | null>(null);
    const [sending, setSending] = useState(false);
    const [loading, setLoading] = useState(false);
    const [loadingD, setLoadingD] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const fetchLabs = async () => {
        setLoading(true);
        try {
            const params: any = {};
            if (filterSubject) params.subject_id = filterSubject;
            const { data } = await axios.get('/api/labs', { params });
            let filtered = data.labs || [];
            if (filterStatus === 'submitted') filtered = filtered.filter((l: LabWork) => l.submitted);
            if (filterStatus === 'pending') filtered = filtered.filter((l: LabWork) => !l.submitted);
            setLabs(filtered);
        } catch {}
        setLoading(false);
    };

    const openLab = async (id: number) => {
        setActiveId(id); setLoadingD(true);
        try {
            const { data } = await axios.get(`/api/labs/${id}`);
            setDetail(data.lab); setSubmission(data.submission); setGrade(data.grade);
            setMates(data.groupmates || []); setComment(''); setFile(null);
        } catch {}
        setLoadingD(false);
    };

    const send = async () => {
        if (!detail || (!comment && !file)) return;
        setSending(true);
        try {
            const fd = new FormData();
            fd.append('submission_text', comment);
            if (file) fd.append('file', file);
            await axios.post(`/api/labs/${detail.id}/submit`, fd);
            openLab(detail.id);
        } catch {}
        setSending(false);
    };

    const downloadFile = async (filePath: string) => {
        try {
            const response = await axios.get(filePath, { responseType: 'blob' });
            const url = window.URL.createObjectURL(new Blob([response.data]));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', filePath.split('/').pop() || 'file');
            document.body.appendChild(link);
            link.click();
            link.remove();
            window.URL.revokeObjectURL(url);
        } catch {}
    };

        useEffect(() => { fetchLabs(); }, [filterSubject, filterStatus]);
        useEffect(() => {
            axios.get('/api/labs/subjects').then(r => setSubjects(r.data.subjects || [])).catch(() => {});
    }, []);

    const activeLab = labs.find(l => l.id === activeId);
    const colors = { bg: '#f8f9fa', white: '#fff', border: '#e5e7eb', text: '#1f2937', sub: '#9ca3af', accent: '#111827' };

    return (
        <div style={{ display: 'flex', height: '100vh', background: colors.bg, fontFamily: 'system-ui, sans-serif', color: colors.text }}>
            <div style={{ width: 300, background: colors.white, borderRight: `1px solid ${colors.border}`, display: 'flex', flexDirection: 'column', flexShrink: 0 }}>
                <div style={{ padding: '20px 20px 16px', borderBottom: `1px solid ${colors.border}` }}>
                    <div style={{ fontSize: 18, fontWeight: 700, marginBottom: 12 }}>Лабораторные работы</div>


                    <div style={{ fontSize: 10, fontWeight: 600, color: colors.sub, textTransform: 'uppercase', marginBottom: 6 }}>Предмет</div>
                    <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginBottom: 12 }}>
                        <Chip active={!filterSubject} onClick={() => setFilterSubject(null)}>Все</Chip>
                        {subjects.map(s => (
                            <Chip key={s.id} active={filterSubject === s.id} onClick={() => setFilterSubject(s.id)}>{s.name}</Chip>
                        ))}
                    </div>


                    <div style={{ fontSize: 10, fontWeight: 600, color: colors.sub, textTransform: 'uppercase', marginBottom: 6 }}>Статус</div>
                    <div style={{ display: 'flex', gap: 4 }}>
                        <Chip active={filterStatus === 'all'} onClick={() => setFilterStatus('all')}>Все</Chip>
                        <Chip active={filterStatus === 'submitted'} onClick={() => setFilterStatus('submitted')}>Сдано</Chip>
                        <Chip active={filterStatus === 'pending'} onClick={() => setFilterStatus('pending')}>Не сдано</Chip>
                    </div>
                </div>

                <div style={{ flex: 1, overflow: 'auto', padding: '8px 12px' }}>
                    {loading ? <div style={{ textAlign: 'center', color: colors.sub, fontSize: 13, padding: 40 }}>Загрузка...</div>
                        : labs.length === 0 ? <div style={{ textAlign: 'center', color: colors.sub, fontSize: 13, padding: 40 }}>Нет работ</div>
                            : labs.map((lab, i) => (
                                <LabCard key={lab.id} lab={lab} index={i} active={activeId === lab.id} onClick={() => openLab(lab.id)} />
                            ))}
                </div>
                <div style={{ padding: '10px 20px', borderTop: `1px solid ${colors.border}`, fontSize: 11, color: colors.sub }}>
                    Всего: {labs.length} &middot; Сдано: {labs.filter(l => l.submitted).length}
                </div>
            </div>


            <div style={{ flex: 1, overflow: 'auto', padding: 40 }}>
                {!activeLab ? (
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: colors.sub, fontSize: 14 }}>
                        Выберите лабораторную работу в боковой панели
                    </div>
                ) : loadingD ? (
                    <div style={{ maxWidth: 640, margin: '0 auto', color: colors.sub, fontSize: 14 }}>Загрузка...</div>
                ) : detail && (
                    <div style={{ maxWidth: 640, margin: '0 auto' }}>

                        <div style={{ marginBottom: 28 }}>
                            <div style={{ display: 'flex', gap: 8, marginBottom: 8, flexWrap: 'wrap' }}>
                                <span style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1.5, color: colors.sub, background: '#f3f4f6', padding: '3px 10px', borderRadius: 6 }}>Лабораторная работа</span>
                                {detail.is_group && <span style={{ fontSize: 10, fontWeight: 700, background: '#ede9fe', color: '#7c3aed', padding: '3px 10px', borderRadius: 6 }}>Командная</span>}
                                <StatusBadge submitted={!!submission} deadline={detail.deadline} />
                            </div>
                            <h1 style={{ fontSize: 24, fontWeight: 700, margin: '0 0 4px', lineHeight: 1.2 }}>{detail.title}</h1>
                            <p style={{ fontSize: 13, color: colors.sub, margin: 0 }}>{detail.subject_name} &middot; {detail.teacher_name}</p>
                        </div>


                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 28 }}>
                            <div style={{ background: '#f9fafb', borderRadius: 12, padding: 16 }}>
                                <div style={{ fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 1, color: colors.sub, marginBottom: 4 }}>Выдано</div>
                                <div style={{ fontSize: 15, fontWeight: 600 }}>{fmt(detail.issued_date)}</div>
                            </div>
                            <div style={{ background: isOverdue(detail.deadline) && !submission ? '#fef2f2' : '#f9fafb', borderRadius: 12, padding: 16 }}>
                                <div style={{ fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 1, color: isOverdue(detail.deadline) && !submission ? '#ef4444' : colors.sub, marginBottom: 4 }}>Дедлайн</div>
                                <div style={{ fontSize: 15, fontWeight: 600, color: isOverdue(detail.deadline) && !submission ? '#ef4444' : colors.text }}>{fmt(detail.deadline)}</div>
                            </div>
                        </div>


                        {detail.description && <Sec title="Описание задания"><p style={{ margin: 0, fontSize: 14, lineHeight: 1.6, color: '#4b5563' }}>{detail.description}</p></Sec>}


                        {detail.materials?.length > 0 && (
                            <Sec title="Теоретические материалы">
                                {detail.materials.map((m, i) => (
                                    <a key={i} href={m.material_url} target="_blank" rel="noopener noreferrer" style={{
                                        display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px',
                                        background: colors.white, borderRadius: 10, border: `1px solid ${colors.border}`,
                                        marginBottom: 8, textDecoration: 'none', color: colors.text, fontSize: 13
                                    }}>
                                        <span style={{ color: '#3b82f6', fontWeight: 500 }}>{m.title || m.material_url}</span>
                                    </a>
                                ))}
                            </Sec>
                        )}


                        {detail.is_group && mates.length > 0 && (
                            <Sec title="Состав команды">
                                <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                                    {mates.map(m => (
                                        <div key={m.id} style={{ display: 'flex', alignItems: 'center', gap: 8, background: '#ede9fe', borderRadius: 999, padding: '6px 14px', fontSize: 13 }}>
                                            <div style={{ width: 24, height: 24, borderRadius: '50%', background: '#c4b5fd', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 11, color: '#5b21b6' }}>{m.name[0]}</div>
                                            {m.name}
                                        </div>
                                    ))}
                                </div>
                            </Sec>
                        )}

                        <Sec title={submission ? 'Обновить комментарий' : 'Оставить комментарий'}>
                            <textarea value={comment} onChange={e => setComment(e.target.value)} rows={4}
                                      style={{ width: '100%', border: `1px solid ${colors.border}`, borderRadius: 10, padding: 12, fontSize: 13, resize: 'vertical', marginBottom: 12, boxSizing: 'border-box' }}
                                      placeholder="Комментарий к решению..." />
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                    <button onClick={() => fileInputRef.current?.click()} style={{
                                        cursor: 'pointer', fontSize: 13, color: '#6b7280', background: '#f3f4f6',
                                        padding: '6px 14px', borderRadius: 8, border: 'none'
                                    }}>
                                        {file ? file.name : 'Прикрепить файл'}
                                    </button>
                                    <input ref={fileInputRef} type="file" style={{ display: 'none' }}
                                           onChange={e => setFile(e.target.files?.[0] || null)} />
                                    {file && <button onClick={() => setFile(null)} style={{ border: 'none', background: 'none', color: '#ef4444', fontSize: 12, cursor: 'pointer' }}>Удалить</button>}
                                </div>
                                <button onClick={send} disabled={sending || (!comment && !file)} style={{
                                    padding: '8px 20px', background: colors.accent, color: '#fff', border: 'none', borderRadius: 8,
                                    fontSize: 13, fontWeight: 600, cursor: 'pointer', opacity: sending ? 0.5 : 1
                                }}>{sending ? 'Отправка...' : submission ? 'Обновить' : 'Отправить'}</button>
                            </div>
                        </Sec>


                        {submission && (
                            <Sec title="Отправленное решение">
                                <div style={{ background: '#ecfdf5', borderRadius: 12, padding: 16, border: '1px solid #a7f3d0' }}>
                                    <div style={{ fontSize: 12, color: '#059669', marginBottom: 8 }}>Отправлено {new Date(submission.submitted_at).toLocaleString('ru-RU')}</div>
                                    {submission.submission_text && <div style={{ background: '#fff', borderRadius: 8, padding: 12, fontSize: 13, color: '#374151', marginBottom: 8 }}>{submission.submission_text}</div>}
                                    {submission.file_path && (
                                        <button onClick={() => downloadFile(submission.file_path)} style={{
                                            background: 'none', border: 'none', color: '#3b82f6', fontSize: 13, cursor: 'pointer',
                                            textDecoration: 'underline', padding: 0
                                        }}>
                                            Скачать прикреплённый файл
                                        </button>
                                    )}
                                </div>
                            </Sec>
                        )}

                        {grade && (
                            <Sec title="Оценка преподавателя">
                                <div style={{ background: '#fffbeb', borderRadius: 12, padding: 16, border: '1px solid #fde68a' }}>
                                    <div style={{ fontSize: 36, fontWeight: 700, color: '#d97706' }}>{grade.grade}<span style={{ fontSize: 16, color: '#92400e' }}>/10</span></div>
                                    {grade.comment && <div style={{ background: '#fff', borderRadius: 8, padding: 12, marginTop: 10, fontSize: 13, color: '#374151' }}>{grade.comment}</div>}
                                    <div style={{ fontSize: 11, color: '#9ca3af', marginTop: 8 }}>{fmt(grade.graded_at)}</div>
                                </div>
                            </Sec>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};

export default LabStudentPage;