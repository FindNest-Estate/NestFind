'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { getCurrentUser } from '@/lib/authApi';
import {
  LayoutDashboard, Building2, Grid3X3, HandshakeIcon, GitBranch,
  Users2, UserCheck, FileText, BarChart3, Settings, Menu, X,
  ChevronRight, Bell, LogOut, ShieldCheck
} from 'lucide-react';
import styles from './developer.module.css';

const NAV_ITEMS = [
  { href: '/developer', label: 'Dashboard', icon: LayoutDashboard, exact: true },
  { href: '/developer/projects', label: 'Projects', icon: Building2 },
  { href: '/developer/inventory', label: 'Inventory', icon: Grid3X3 },
  { href: '/developer/offers', label: 'Offers & Negotiations', icon: HandshakeIcon },
  { href: '/developer/deals', label: 'Deal Pipeline', icon: GitBranch },
  { href: '/developer/leads', label: 'Leads', icon: Users2 },
  { href: '/developer/agents', label: 'Agents', icon: UserCheck },
  { href: '/developer/documents', label: 'Documents', icon: FileText },
  { href: '/developer/analytics', label: 'Analytics', icon: BarChart3 },
  { href: '/developer/settings', label: 'Settings', icon: Settings },
  { href: '/developer/verification', label: 'Verification', icon: ShieldCheck, verificationNav: true },
];

export default function DeveloperLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [user, setUser] = useState<any>(null);
  const [devStatus, setDevStatus] = useState<string>('PENDING');
  const [isLoading, setIsLoading] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    async function checkAuth() {
      try {
        const userData = await getCurrentUser();
        if (!userData?.role?.includes('DEVELOPER') && !userData?.roles?.includes('DEVELOPER')) {
          router.replace('/dashboard');
          return;
        }
        setUser(userData);
        // Fetch developer status
        try {
          const { settingsApi } = await import('@/lib/developerApi');
          const r = await settingsApi.get();
          if (r.success) setDevStatus((r.data as any).status || 'PENDING');
        } catch {}
      } catch {
        router.replace('/login');
      } finally {
        setIsLoading(false);
      }
    }
    checkAuth();
  }, [router]);

  const isPending = devStatus !== 'APPROVED';

  if (isLoading) {
    return (
      <div className={styles.loadingScreen}>
        <div className={styles.loadingSpinner} />
        <p>Loading Developer Portal…</p>
      </div>
    );
  }

  if (!user) return null;

  const isActive = (href: string, exact?: boolean) =>
    exact ? pathname === href : pathname.startsWith(href);

  return (
    <div className={styles.shell}>
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div className={styles.overlay} onClick={() => setSidebarOpen(false)} />
      )}

      {/* Sidebar */}
      <aside className={`${styles.sidebar} ${sidebarOpen ? styles.sidebarOpen : ''}`}>
        {/* Logo */}
        <div className={styles.sidebarLogo}>
          <div>
            <span className={styles.logoTitle}>NestFind</span>
            <span className={styles.logoBadge}>Developer</span>
          </div>
          <button className={styles.closeBtn} onClick={() => setSidebarOpen(false)}>
            <X size={20} />
          </button>
        </div>

        {/* Nav */}
        <nav className={styles.nav}>
          {NAV_ITEMS.map(({ href, label, icon: Icon, exact, verificationNav }: any) => (
            <Link
              key={href}
              href={href}
              className={`${styles.navItem} ${isActive(href, exact) ? styles.navItemActive : ''}`}
              style={verificationNav && isPending ? { color: '#B45309', background: 'rgba(180, 83, 9, 0.05)' } : undefined}
              onClick={() => setSidebarOpen(false)}
            >
              <Icon size={18} className={styles.navIcon} />
              <span>{label}</span>
              {verificationNav && isPending && (
                <span style={{ marginLeft: 'auto', fontSize: 9, fontWeight: 800, background: '#FFF4E5', color: '#B45309', padding: '2px 6px', borderRadius: 4, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Pending</span>
              )}
              {isActive(href, exact) && !verificationNav && <ChevronRight size={14} className={styles.navChevron} />}
            </Link>
          ))}

          {/* Pending notice */}
          {isPending && !pathname.startsWith('/developer/verification') && (
            <div style={{ margin: '12px 10px 0', padding: '12px 14px', background: '#FFF7ED', border: '1px solid #FFEDD5', borderRadius: 12 }}>
              <div style={{ fontSize: 11, fontWeight: 800, color: '#9A3412', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.5px' }}>⚠ Not Verified</div>
              <div style={{ fontSize: 12, color: '#9A3412', lineHeight: 1.5 }}>Complete verification to list projects and access full features.</div>
            </div>
          )}
        </nav>

        {/* User info */}
        <div className={styles.sidebarFooter}>
          <div className={styles.userInfo}>
            <div className={styles.userAvatar}>
              {user.full_name?.[0]?.toUpperCase() || 'D'}
            </div>
            <div className={styles.userDetails}>
              <span className={styles.userName}>{user.full_name || 'Developer'}</span>
              <span className={styles.userRole}>Developer Account</span>
            </div>
          </div>
          <button className={styles.logoutBtn} onClick={() => {
            localStorage.removeItem('access_token');
            router.replace('/login');
          }} title="Sign out">
            <LogOut size={16} />
          </button>
        </div>
      </aside>

      {/* Main content */}
      <div className={styles.main}>
        {/* Topbar */}
        <header className={styles.topbar}>
          <button className={styles.menuBtn} onClick={() => setSidebarOpen(true)}>
            <Menu size={22} />
          </button>

          <div className={styles.topbarTitle}>
            {NAV_ITEMS.find(n => isActive(n.href, n.exact))?.label || 'Developer Portal'}
          </div>

          <div className={styles.topbarActions}>
            <button className={styles.topbarBtn}>
              <Bell size={20} />
            </button>
          </div>
        </header>

        {/* Page content */}
        <main className={styles.content}>
          {children}
        </main>
      </div>
    </div>
  );
}
