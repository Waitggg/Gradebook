import React, { useEffect, useState } from 'react';
import axios from 'axios';

interface LabWork {
    id: number; title: string; subject_name: string;
    due_date: string; is_group: boolean; submissions_count: number;
    teams?: { id: number; name: string; members: { id: number; name: string }[] }[];
}
interface Submission {
    id: number; student_id: number; student_name: string; student_email: string;
    submission_text: string; file_path: string; submitted_at: string;
    grade: number | null; grade_comment: string | null; graded_at: string | null;
    team_id?: number; team_name?: string;
}

const TeacherLabCheckPage: React.FC = () => {
    const [labs, setLabs] = useState<LabWork[]>([]);
    const [selectedLab, setSelectedLab] = useState<LabWork | null>(null);
    const [submissions, setSubmissions] = useState<Submission[]>([]);
    const [loading, setLoading] = useState(false);
    const [grading, setGrading] = useState<{ ids: number[]; grade: number; comment: string } | null>(null);
    const [confirmAll, setConfirmAll] = useState(false);

    const fetchLabs = async () => {
        setLoading(true);
        const { data } = await axios.get('/api/labs/teacher');
        setLabs(data.labs || []);
        setLoading(false);
    };

    const openLab = async (lab: LabWork) => {
        setSelectedLab(lab);
        setLoading(true);
        const { data } = await axios.get(`/api/labs/teacher/${lab.id}/submissions`);
        setSubmissions(data.submissions || []);
        setLoading(false);
    };

    const submitGrade = async (submissionIds: number[]) => {
        if (!grading || grading.grade < 1 || grading.grade > 10) return;
        for (const id of submissionIds) {
            await axios.post(`/api/labs/submission/${id}/grade`, { grade: grading.grade, comment: grading.comment });
        }
        setGrading(null);
        setConfirmAll(false);
        if (selectedLab) openLab(selectedLab);
    };

    useEffect(() => { fetchLabs(); }, []);

    const downloadFile = async (path: string) => {
        const res = await axios.get(path, { responseType: 'blob' });
        const url = window.URL.createObjectURL(new Blob([res.data]));
        const a = document.createElement('a'); a.href = url; a.download = path.split('/').pop() || 'file'; a.click();
    };

    const groupedSubmissions = () => {
        if (!selectedLab?.is_group) return { individual: submissions };
        const groups: Record<string, Submission[]> = {};
        submissions.forEach(s => {
            const key = s.team_name || 'Без команды';
            if (!groups[key]) groups[key] = [];
            groups[key].push(s);
        });
        return groups;
    };

    const grouped = groupedSubmissions();

    return (
        <div style={{ display: 'flex', height: '100vh', background: '#f5f5f7', fontFamily: 'system-ui, sans-serif' }}>
            <div style={{ width: 300, background: '#fff', borderRight: '1px solid #e5e7eb', display: 'flex', flexDirection: 'column', boxShadow: '2px 0 8px rgba(0,0,0,0.04)' }}>
                <div style={{ padding: '24px 20px 16px', borderBottom: '1px solid #f0f0f0' }}>
                    <h2 style={{ fontSize: 17, fontWeight: 700, margin: 0, color: '#1a1a2e' }}>Проверка работ</h2>
                    <p style={{ fontSize: 12, color: '#9ca3af', margin: '4px 0 0' }}>{labs.length} лабораторных</p>
                </div>
                <div style={{ flex: 1, overflow: 'auto', padding: '8px 12px' }}>
                    {loading && !selectedLab ? <p style={{ color: '#9ca3af', textAlign: 'center', fontSize: 13, padding: 20 }}>Загрузка...</p>
                        : labs.map(lab => (
                            <div key={lab.id} onClick={() => openLab(lab)} style={{
                                padding: '14px 16px', borderRadius: 12, marginBottom: 4, cursor: 'pointer',
                                background: selectedLab?.id === lab.id ? '#f0f7ff' : 'transparent',
                                border: selectedLab?.id === lab.id ? '1px solid #dbeafe' : '1px solid transparent',
                                transition: 'all 0.15s'
                            }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                    <p style={{ fontSize: 13, fontWeight: 600, margin: 0, color: '#1f2937', lineHeight: 1.3 }}>{lab.title}</p>
                                    <span style={{ fontSize: 11, background: '#f3f4f6', padding: '2px 8px', borderRadius: 999, color: '#6b7280', fontWeight: 500, whiteSpace: 'nowrap', marginLeft: 8 }}>
                                    {lab.submissions_count} сдач
                                </span>
                                </div>
                                <p style={{ fontSize: 11, color: '#9ca3af', margin: '4px 0 0' }}>{lab.subject_name}{lab.is_group ? ' · Командная' : ''}</p>
                            </div>
                        ))}
                </div>
            </div>

            <div style={{ flex: 1, overflow: 'auto', padding: '40px 48px' }}>
                {!selectedLab ? (
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
                        <div style={{ textAlign: 'center', color: '#d1d5db' }}>
                            <p style={{ fontSize: 48, margin: '0 0 12px' }}>📋</p>
                            <p style={{ fontSize: 15, fontWeight: 500 }}>Выберите лабораторную работу</p>
                        </div>
                    </div>
                ) : loading ? <p style={{ color: '#9ca3af', textAlign: 'center', padding: 40 }}>Загрузка...</p>
                    : submissions.length === 0 ? (
                        <div style={{ textAlign: 'center', padding: 60, color: '#d1d5db' }}>
                            <p style={{ fontSize: 36, margin: 0 }}>📭</p>
                            <p style={{ fontSize: 15, fontWeight: 500, marginTop: 12 }}>Нет сдавших студентов</p>
                        </div>
                    ) : (
                        <div style={{ maxWidth: 750 }}>
                            <div style={{ marginBottom: 28 }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
                                <span style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1.5, color: '#9ca3af', background: '#f3f4f6', padding: '3px 10px', borderRadius: 6 }}>
                                    {selectedLab.is_group ? 'Командная работа' : 'Индивидуальная'}
                                </span>
                                </div>
                                <h1 style={{ fontSize: 24, fontWeight: 700, margin: 0, color: '#1a1a2e', lineHeight: 1.2 }}>{selectedLab.title}</h1>
                                <p style={{ fontSize: 13, color: '#9ca3af', margin: '6px 0 0' }}>{selectedLab.subject_name} · Сдач: {selectedLab.submissions_count}</p>
                            </div>

                            {Object.entries(grouped).map(([groupName, groupSubs]) => (
                                <div key={groupName} style={{ marginBottom: 28 }}>
                                    {selectedLab.is_group && (
                                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                                            <h3 style={{ fontSize: 14, fontWeight: 600, color: '#374151', margin: 0 }}>
                                                {groupName}
                                                <span style={{ fontWeight: 400, color: '#9ca3af', marginLeft: 6 }}>({groupSubs.length})</span>
                                            </h3>
                                            {groupSubs.length > 1 && (
                                                <button onClick={() => setGrading({ ids: groupSubs.map(s => s.id), grade: 5, comment: '' })}
                                                        style={{ fontSize: 11, background: '#f0f9ff', border: '1px solid #bae6fd', borderRadius: 6, padding: '4px 10px', cursor: 'pointer', color: '#0369a1' }}>
                                                    Выставить всем
                                                </button>
                                            )}
                                        </div>
                                    )}
                                    {groupSubs.map(sub => (
                                        <div key={sub.id} style={{
                                            background: '#fff', borderRadius: 14, padding: '20px 24px', marginBottom: 10,
                                            border: '1px solid #f0f0f0', boxShadow: '0 1px 3px rgba(0,0,0,0.03)'
                                        }}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                                                <div>
                                                    <p style={{ fontWeight: 600, margin: 0, fontSize: 14, color: '#1f2937' }}>{sub.student_name}</p>
                                                    <p style={{ fontSize: 11, color: '#9ca3af', margin: '2px 0 0' }}>{sub.submitted_at}</p>
                                                </div>
                                                {sub.grade ? (
                                                    <div style={{ textAlign: 'right' }}>
                                                        <span style={{ fontSize: 28, fontWeight: 700, color: '#d97706' }}>{sub.grade}</span>
                                                        <span style={{ fontSize: 13, color: '#b45309' }}>/10</span>
                                                    </div>
                                                ) : (
                                                    <span style={{ fontSize: 11, background: '#fef3c7', color: '#b45309', padding: '3px 10px', borderRadius: 999, fontWeight: 500 }}>Не оценено</span>
                                                )}
                                            </div>
                                            {sub.submission_text && (
                                                <div style={{ background: '#f9fafb', borderRadius: 8, padding: '12px 16px', marginBottom: 10, fontSize: 13, color: '#4b5563', lineHeight: 1.5 }}>
                                                    {sub.submission_text}
                                                </div>
                                            )}
                                            {sub.file_path && (
                                                <button onClick={() => downloadFile(sub.file_path)} style={{
                                                    fontSize: 12, color: '#3b82f6', background: 'none', border: 'none', cursor: 'pointer',
                                                    padding: 0, fontWeight: 500, marginBottom: 10
                                                }}>📎 Скачать прикреплённый файл</button>
                                            )}
                                            {sub.grade_comment && (
                                                <div style={{ background: '#fffbeb', borderRadius: 8, padding: '10px 14px', marginBottom: 10, fontSize: 12, color: '#92400e' }}>
                                                    💬 {sub.grade_comment}
                                                </div>
                                            )}

                                            {grading?.ids.includes(sub.id) ? (
                                                <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                                                    <input type="number" min={1} max={10} value={grading.grade}
                                                           onChange={e => setGrading({ ...grading, grade: +e.target.value })}
                                                           style={{ width: 56, padding: '8px 10px', border: '1px solid #e5e7eb', borderRadius: 8, fontSize: 13, textAlign: 'center' }} />
                                                    <input placeholder="Комментарий" value={grading.comment}
                                                           onChange={e => setGrading({ ...grading, comment: e.target.value })}
                                                           style={{ flex: 1, minWidth: 140, padding: '8px 10px', border: '1px solid #e5e7eb', borderRadius: 8, fontSize: 13 }} />
                                                    <button onClick={() => {
                                                        if (grading.ids.length > 1 && !confirmAll) { setConfirmAll(true); return; }
                                                        submitGrade(grading.ids);
                                                    }} style={{ background: '#111827', color: '#fff', border: 'none', borderRadius: 8, padding: '8px 16px', cursor: 'pointer', fontSize: 12, fontWeight: 600 }}>
                                                        {confirmAll ? 'Подтвердить всем' : 'OK'}
                                                    </button>
                                                    <button onClick={() => { setGrading(null); setConfirmAll(false); }}
                                                            style={{ background: '#f3f4f6', border: 'none', borderRadius: 8, padding: '8px 14px', cursor: 'pointer', fontSize: 12 }}>Отмена</button>
                                                </div>
                                            ) : (
                                                <button onClick={() => setGrading({ ids: [sub.id], grade: sub.grade || 5, comment: sub.grade_comment || '' })}
                                                        style={{ background: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: 8, padding: '7px 16px', cursor: 'pointer', fontSize: 12, color: '#374151', fontWeight: 500 }}>
                                                    {sub.grade ? 'Изменить оценку' : 'Выставить оценку'}
                                                </button>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            ))}
                        </div>
                    )}
            </div>

            {confirmAll && grading && (
                <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
                    <div style={{ background: '#fff', borderRadius: 16, padding: 28, maxWidth: 400, width: '90%', textAlign: 'center', boxShadow: '0 20px 40px rgba(0,0,0,0.15)' }}>
                        <p style={{ fontSize: 15, fontWeight: 600, margin: '0 0 8px' }}>Выставить оценку всем?</p>
                        <p style={{ fontSize: 13, color: '#6b7280', margin: '0 0 20px' }}>
                            Оценка <b>{grading.grade}/10</b> будет проставлена {grading.ids.length} студентам в этой команде.
                        </p>
                        <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
                            <button onClick={() => { setConfirmAll(false); setGrading(null); }}
                                    style={{ background: '#f3f4f6', border: 'none', borderRadius: 8, padding: '10px 24px', cursor: 'pointer', fontSize: 13 }}>Отмена</button>
                            <button onClick={() => submitGrade(grading.ids)}
                                    style={{ background: '#111827', color: '#fff', border: 'none', borderRadius: 8, padding: '10px 24px', cursor: 'pointer', fontSize: 13, fontWeight: 600 }}>Подтвердить</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default TeacherLabCheckPage;