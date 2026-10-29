import { useEffect, useState } from 'react';
import { today } from '../utils/dates';
export function useToday() {
  const [date, setDate] = useState(today);
  useEffect(() => {
    const update = () => setDate(today());
    const timer = setInterval(update, 60000);
    document.addEventListener('visibilitychange', update);
    return () => {
      clearInterval(timer);
      document.removeEventListener('visibilitychange', update);
    };
  }, []);
  return date;
}
