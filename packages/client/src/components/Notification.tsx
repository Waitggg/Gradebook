import { useState, useEffect } from 'react';
import { useWebSocket } from '../hooks/useWebSocket';

function GradeNotification() {
  const { notifications, unreadCount, markAsRead, clearNotifications } = useWebSocket();
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    if (Notification.permission === 'default') {
      Notification.requestPermission();
    }
  }, []);

  const getGradeTypeText = (type: string) => {
    switch (type) {
      case 'exam': return 'Экзамен';
      case 'test': return 'Контрольная работа';
      case 'homework': return 'Домашняя работа';
      default: return 'Классная работа';
    }
  };

  const getGradeColor = (grade: number) => {
    if (grade >= 9) return '#10b981';
    if (grade >= 7) return '#3b82f6';
    if (grade >= 4) return '#f59e0b';
    return '#ef4444';
  };

  return (
    <div style={{ position: 'relative' }}>
      <button
        onClick={() => {
          setIsOpen(!isOpen);
          if (isOpen) markAsRead();
        }}
        style={{
          background: 'none',
          border: 'none',
          fontSize: '24px',
          cursor: 'pointer',
          position: 'relative',
          padding: '8px'
        }}
      >
        🔔
        {unreadCount > 0 && (
          <span style={{
            position: 'absolute',
            top: '0',
            right: '0',
            background: '#ef4444',
            color: 'white',
            borderRadius: '50%',
            width: '18px',
            height: '18px',
            fontSize: '12px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            {unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div style={{
          position: 'absolute',
          top: '50px',
          right: '0',
          width: '350px',
          maxHeight: '400px',
          background: 'white',
          borderRadius: '12px',
          boxShadow: '0 10px 25px -5px rgba(0,0,0,0.1)',
          zIndex: 1000,
          overflow: 'hidden'
        }}>
          <div style={{
            padding: '12px 16px',
            borderBottom: '1px solid #e5e7eb',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center'
          }}>
            <h3 style={{ margin: 0, fontSize: '16px', fontWeight: '600' }}>
              Уведомления
            </h3>
            {notifications.length > 0 && (
              <button
                onClick={clearNotifications}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#6b7280',
                  cursor: 'pointer',
                  fontSize: '12px'
                }}
              >
                Очистить
              </button>
            )}
          </div>
          
          <div style={{ maxHeight: '350px', overflowY: 'auto' }}>
            {notifications.length === 0 ? (
              <div style={{ padding: '40px', textAlign: 'center', color: '#9ca3af' }}>
                Нет уведомлений
              </div>
            ) : (
              notifications.map((notif, idx) => (
                <div
                  key={idx}
                  style={{
                    padding: '12px 16px',
                    borderBottom: '1px solid #f3f4f6',
                    transition: 'background 0.2s'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{
                      width: '40px',
                      height: '40px',
                      borderRadius: '50%',
                      background: getGradeColor(notif.grade),
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: 'white',
                      fontWeight: 'bold',
                      fontSize: '18px'
                    }}>
                      {notif.grade}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: '600', fontSize: '14px' }}>
                        {notif.subject_name}
                      </div>
                      <div style={{ fontSize: '12px', color: '#6b7280' }}>
                        {getGradeTypeText(notif.grade_type)} • {notif.teacher_name}
                      </div>
                      <div style={{ fontSize: '11px', color: '#9ca3af' }}>
                        {new Date(notif.date).toLocaleDateString()}
                      </div>
                    </div>
                  </div>
                  {notif.comment && (
                    <div style={{
                      marginTop: '8px',
                      padding: '6px 8px',
                      background: '#f3f4f6',
                      borderRadius: '6px',
                      fontSize: '12px',
                      color: '#4b5563'
                    }}>
                      💬 {notif.comment}
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default GradeNotification;