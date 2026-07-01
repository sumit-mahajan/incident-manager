import { useState, useEffect } from 'react';
import { Moon, Sun } from 'lucide-react';

export function ThemeToggle() {
  const [dark, setDark] = useState(() => document.documentElement.classList.contains('dark'));

  useEffect(() => {
    if (dark) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('incidenthub-theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('incidenthub-theme', 'light');
    }
  }, [dark]);

  return (
    <button
      onClick={() => setDark((d) => !d)}
      aria-label="Toggle theme"
      className="p-2 rounded-md text-muted hover:text-foreground hover:bg-surface transition-colors"
    >
      {dark ? <Sun size={18} /> : <Moon size={18} />}
    </button>
  );
}
