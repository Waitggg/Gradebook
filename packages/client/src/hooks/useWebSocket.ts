import { useEffect, useState } from 'react';
import io, { Socket } from 'socket.io-client';

interface Notification {
  id: number;
  grade: number;
  subject_name: string;
  teacher_name: string;
  date: string;
  grade_type: string;
  comment: string | null;
  timestamp: string;
}

export function useWebSocket() {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    const newSocket = io('http://localhost:3000', {
      withCredentials: true
    });
    
    setSocket(newSocket);

    newSocket.on('new_grade', (data: Notification) => {
      setNotifications(prev => [data, ...prev]);
      setUnreadCount(prev => prev + 1);
      
      if (Notification.permission === 'granted') {
        new Notification('Новая оценка!', {
          body: `${data.subject_name}: ${data.grade}`,
          icon: '/vite.svg'
        });
      }
    });

    return () => {
      newSocket.close();
    };
  }, []);

  const markAsRead = () => {
    setUnreadCount(0);
  };

  const clearNotifications = () => {
    setNotifications([]);
    setUnreadCount(0);
  };

  return { socket, notifications, unreadCount, markAsRead, clearNotifications };
}