import { useState, useEffect } from 'react';

export function useDarkMode() {
  const [dark, setDark] = useState(() => {
    try {
      return localStorage.getItem('admin2_dark') === 'true';
    } catch {
      return false;
    }
  });

  useEffect(() => {
    if (dark) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    try {
      localStorage.setItem('admin2_dark', String(dark));
    } catch { /* ignore */ }
  }, [dark]);

  return [dark, setDark];
}
