import { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  HandCoins,
  ArrowLeftRight,
  BookOpen,
  LogOut,
  Menu,
  X,
  TrendingUp,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { authService } from '@/services/auth.service';

const navItems = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/prestamos', label: 'Préstamos', icon: HandCoins },
  { to: '/operaciones', label: 'Operaciones', icon: ArrowLeftRight },
  { to: '/movimientos', label: 'Movimientos', icon: BookOpen },
];

interface LayoutProps {
  children: React.ReactNode;
}

export function Layout({ children }: LayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const navigate = useNavigate();

  const handleLogout = async () => {
    await authService.logout();
    navigate('/login');
  };

  return (
    <div className="flex h-screen bg-background overflow-hidden">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-20 bg-black/50 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-30 w-60 flex flex-col bg-card border-r border-border transition-transform duration-200 lg:relative lg:translate-x-0',
          sidebarOpen ? 'translate-x-0' : '-translate-x-full',
        )}
      >
        {/* Logo */}
        <div className="flex items-center gap-2.5 px-5 h-14 border-b border-border shrink-0">
          <TrendingUp className="h-5 w-5 text-primary drop-shadow-[0_0_6px_hsl(var(--primary)/0.8)]" />
          <span className="font-bold text-sm tracking-wide text-foreground">Préstamos & Trading</span>
          <button
            className="ml-auto lg:hidden text-muted-foreground hover:text-foreground"
            onClick={() => setSidebarOpen(false)}
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          {navItems.map(({ to, label, icon: Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) =>
                cn(
                  'flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-all duration-150',
                  isActive
                    ? 'bg-primary/15 text-primary border border-primary/30 shadow-[0_0_12px_hsl(var(--primary)/0.15)]'
                    : 'text-muted-foreground hover:bg-accent hover:text-foreground border border-transparent',
                )
              }
              onClick={() => setSidebarOpen(false)}
            >
              <Icon className="h-4 w-4 shrink-0" />
              {label}
            </NavLink>
          ))}
        </nav>

        {/* Logout */}
        <div className="px-3 py-4 border-t border-border">
          <Button
            variant="ghost"
            size="sm"
            className="w-full justify-start gap-3 text-muted-foreground hover:text-foreground"
            onClick={handleLogout}
          >
            <LogOut className="h-4 w-4" />
            Cerrar sesión
          </Button>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top bar (mobile) */}
        <header className="h-14 border-b border-border flex items-center px-4 shrink-0 lg:hidden">
          <button
            className="text-muted-foreground hover:text-foreground"
            onClick={() => setSidebarOpen(true)}
          >
            <Menu className="h-5 w-5" />
          </button>
          <div className="flex items-center gap-2 ml-3">
            <TrendingUp className="h-4 w-4 text-primary drop-shadow-[0_0_6px_hsl(var(--primary)/0.8)]" />
            <span className="font-bold text-sm">Préstamos & Trading</span>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-4 lg:p-6">{children}</main>
      </div>
    </div>
  );
}
