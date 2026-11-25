/**
 * Layout Component
 * App shell: four places (Kitchen, Plan, Recipes, Shopping), the account menu,
 * and the timer dock that follows the cook to every screen.
 */

import { useEffect, useRef, useState } from 'react';
import { Link, NavLink } from 'react-router-dom';
import { Timer, CalendarClock, BookOpen, ShoppingBasket, Moon, Sun, LogOut, Users, UserRound, Check } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useFamily } from '../../contexts/FamilyContext';
import { useTheme } from '../../contexts/ThemeContext';
import { Avatar } from '../kit';
import { TimerDock } from './TimerDock';

interface LayoutProps {
  children: React.ReactNode;
  /** Wider canvas for screens with a side column */
  wide?: boolean;
  /** Hide the floating timer dock on a screen that already shows the board */
  dock?: boolean;
}

const PLACES = [
  { to: '/', label: 'Kitchen', icon: Timer, end: true },
  { to: '/plan', label: 'Plan', icon: CalendarClock, end: false },
  { to: '/recipes', label: 'Recipes', icon: BookOpen, end: false },
  { to: '/shopping', label: 'Shopping', icon: ShoppingBasket, end: false },
];

const AccountMenu = () => {
  const { user, logout } = useAuth();
  const { activeFamily, families, setActiveFamily } = useFamily();
  const { theme, toggleTheme } = useTheme();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: PointerEvent) => {
      if (!ref.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };
    document.addEventListener('pointerdown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('pointerdown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open]);

  if (!user) return null;

  const itemClass =
    'flex w-full items-center gap-3 rounded-control px-3 py-2 text-left text-[0.95rem] hover:bg-paper-2';

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        aria-haspopup="menu"
        className="flex items-center gap-2 rounded-full py-1 pl-1 pr-1 sm:pr-3 hover:bg-paper"
      >
        <Avatar user={user} />
        <span className="hidden max-w-40 truncate text-sm font-semibold sm:block">
          {activeFamily?.name ?? user.first_name}
        </span>
        <span className="sr-only">Account menu</span>
      </button>

      {open && (
        <div
          role="menu"
          className="absolute right-0 top-full z-40 mt-2 w-72 rounded-surface border border-line bg-paper p-2 shadow-[var(--shadow-overlay)]"
        >
          <div className="px-3 pb-2 pt-1">
            <p className="font-semibold">
              {user.first_name} {user.last_name}
            </p>
            <p className="truncate text-sm text-ink-2">{user.email}</p>
          </div>

          {families.length > 1 && (
            <div className="border-t border-line py-2">
              <p className="px-3 pb-1 text-sm text-ink-2">Cooking with</p>
              {families.map((family) => (
                <button
                  key={family.id}
                  type="button"
                  role="menuitemradio"
                  aria-checked={family.id === activeFamily?.id}
                  className={itemClass}
                  onClick={() => {
                    setActiveFamily(family);
                    setOpen(false);
                  }}
                >
                  <span className="grid h-5 w-5 place-items-center">
                    {family.id === activeFamily?.id && <Check size={18} aria-hidden="true" />}
                  </span>
                  <span className="truncate">{family.name}</span>
                </button>
              ))}
            </div>
          )}

          <div className="border-t border-line pt-2">
            <Link to="/families" role="menuitem" className={itemClass} onClick={() => setOpen(false)}>
              <Users size={18} aria-hidden="true" />
              Family and members
            </Link>
            <Link to="/profile" role="menuitem" className={itemClass} onClick={() => setOpen(false)}>
              <UserRound size={18} aria-hidden="true" />
              Your profile
            </Link>
            <button type="button" role="menuitem" className={itemClass} onClick={toggleTheme}>
              {theme === 'dark' ? <Sun size={18} aria-hidden="true" /> : <Moon size={18} aria-hidden="true" />}
              {theme === 'dark' ? 'Use light theme' : 'Use dark theme'}
            </button>
            <button
              type="button"
              role="menuitem"
              className={itemClass}
              onClick={() => {
                setOpen(false);
                logout();
              }}
            >
              <LogOut size={18} aria-hidden="true" />
              Log out
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export const Layout: React.FC<LayoutProps> = ({ children, wide = false, dock = true }) => {
  return (
    <div className="min-h-dvh bg-counter text-ink">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-control focus:bg-ink focus:px-4 focus:py-2 focus:text-paper"
      >
        Skip to main content
      </a>

      <header className="sticky top-0 z-30 border-b border-line bg-counter/90 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-6xl items-center gap-6 px-4 sm:px-6">
          <Link to="/" className="marker text-xl tracking-tight">
            MealTogether
          </Link>

          <nav aria-label="Main navigation" className="hidden items-center gap-1 md:flex">
            {PLACES.map(({ to, label, end }) => (
              <NavLink
                key={to}
                to={to}
                end={end}
                className={({ isActive }) =>
                  `rounded-control px-3 py-2 text-[0.95rem] font-semibold ${
                    isActive
                      ? 'text-ink underline decoration-rule decoration-[3px] underline-offset-[7px]'
                      : 'text-ink-2 hover:text-ink'
                  }`
                }
              >
                {label}
              </NavLink>
            ))}
          </nav>

          <div className="ml-auto flex items-center gap-2">
            <AccountMenu />
          </div>
        </div>
      </header>

      <main
        id="main-content"
        className={`mx-auto px-4 pb-40 pt-6 sm:px-6 sm:pt-8 md:pb-24 ${wide ? 'max-w-6xl' : 'max-w-4xl'}`}
      >
        {children}
      </main>

      {dock && <TimerDock />}

      <nav
        aria-label="Main navigation"
        className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-paper pb-[env(safe-area-inset-bottom)] md:hidden"
      >
        <div className="grid grid-cols-4">
          {PLACES.map(({ to, label, icon: Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) =>
                `flex flex-col items-center gap-0.5 py-2 text-xs font-semibold ${
                  isActive ? 'text-ink' : 'text-ink-3'
                }`
              }
            >
              {({ isActive }) => (
                <>
                  <span
                    className={`grid h-8 w-14 place-items-center rounded-full ${isActive ? 'bg-rule-soft' : ''}`}
                  >
                    <Icon size={22} aria-hidden="true" />
                  </span>
                  {label}
                </>
              )}
            </NavLink>
          ))}
        </div>
      </nav>
    </div>
  );
};

export default Layout;
