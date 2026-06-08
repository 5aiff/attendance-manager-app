import { AttendanceSession } from '../types';

export function toDateKey(date: Date) {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, '0');
  const day = `${date.getDate()}`.padStart(2, '0');

  return `${year}-${month}-${day}`;
}

export function getSessionsForDate(date: Date): AttendanceSession[] {
  const day = date.getDay();

  if (day === 5) {
    return ['single'];
  }

  return ['morning', 'afternoon'];
}

export function getMonthBounds(date: Date) {
  const currentMonthStart = new Date(date.getFullYear(), date.getMonth(), 1);
  const nextMonthStart = new Date(date.getFullYear(), date.getMonth() + 1, 1);
  const previousMonthStart = new Date(date.getFullYear(), date.getMonth() - 1, 1);

  return {
    currentMonthStart: toDateKey(currentMonthStart),
    nextMonthStart: toDateKey(nextMonthStart),
    previousMonthStart: toDateKey(previousMonthStart),
  };
}

export function formatDisplayDate(date: Date) {
  return date.toLocaleDateString(undefined, {
    weekday: 'long',
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  });
}

export function getSessionLabel(session: AttendanceSession) {
  switch (session) {
    case 'morning':
      return 'Morning Session';
    case 'afternoon':
      return 'Afternoon Session';
    case 'single':
      return 'Friday Session';
    default:
      return session;
  }
}
