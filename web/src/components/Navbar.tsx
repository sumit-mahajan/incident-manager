import { useState, useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ChevronDown, AlertCircle, User } from 'lucide-react';
import { ThemeToggle } from './ThemeToggle';
import { useUserStore } from '../features/auth/UserStoreProvider';
import { useUsers, useUserGroups } from '../features/incidents/hooks';

function UserSwitcher() {
  const { activeUserId, setActiveUser } = useUserStore();
  const { data: users = [] } = useUsers();
  const { data: activeUserGroups = [] } = useUserGroups(activeUserId);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const activeUser = users.find((u) => u.userId === activeUserId);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-2 px-3 py-1.5 rounded-md border border-surface-border bg-surface hover:bg-surface-border transition-colors text-sm"
      >
        <User size={15} className="text-muted" />
        <span className="text-foreground font-medium">
          {activeUser ? activeUser.name : 'Select user'}
        </span>
        {activeUserGroups.length > 0 && (
          <span className="text-muted text-xs hidden sm:inline">
            ({activeUserGroups.map((g) => g.name).join(', ')})
          </span>
        )}
        <ChevronDown size={14} className="text-muted" />
      </button>

      {open && (
        <div className="absolute right-0 mt-1 w-72 bg-surface border border-surface-border rounded-md shadow-lg z-50 py-1 animate-fade-in">
          <p className="px-3 py-1.5 text-xs font-medium text-muted uppercase tracking-wide">
            Switch acting user
          </p>
          {users.map((user) => (
            <button
              key={user.userId}
              onClick={() => {
                setActiveUser(user.userId);
                setOpen(false);
              }}
              className={`w-full text-left px-3 py-2 text-sm hover:bg-background transition-colors ${
                user.userId === activeUserId ? 'text-accent font-medium' : 'text-foreground'
              }`}
            >
              {user.name}
              <span className="block text-xs text-muted">
                {user.groups && user.groups.length > 0
                  ? user.groups.map((g) => g.name).join(', ')
                  : 'No group'}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export function Navbar() {
  return (
    <nav className="border-b border-surface-border bg-surface sticky top-0 z-40">
      <div className="max-w-6xl mx-auto px-4 h-14 flex items-center gap-6">
        <Link to="/incidents" className="flex items-center gap-2 font-semibold text-foreground">
          <AlertCircle size={20} className="text-accent" />
          IncidentHub
        </Link>

        <div className="ml-auto flex items-center gap-2">
          <ThemeToggle />
          <UserSwitcher />
        </div>
      </div>
    </nav>
  );
}
