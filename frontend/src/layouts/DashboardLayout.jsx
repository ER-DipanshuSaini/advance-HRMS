import { useState, useEffect } from 'react';
import { NavLink, Outlet, useNavigate, useLocation } from 'react-router-dom';
import {
  BarChart3, Users, ShieldCheck, LogOut, ChevronLeft,
  ChevronRight, Building2, UserCircle, Menu, X, Clock, CalendarDays, Mail, Briefcase
} from 'lucide-react';
import styles from './DashboardLayout.module.css';

export default function DashboardLayout() {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [user, setUser] = useState({ first_name: 'Guest', last_name: '', role: 'Unknown', permissions: [] });
  const navigate = useNavigate();
  const location = useLocation();

  const displayName = `${user.first_name || ''} ${user.last_name || ''}`.trim() || user.email || 'Guest';

  useEffect(() => {
    const loadUser = () => {
      const storedUser = localStorage.getItem('hireflow_user');
      if (storedUser) {
        setUser(JSON.parse(storedUser));
      } else {
        navigate('/login');
      }
    };

    loadUser(); // Load immediately on mount

    // Listen for custom dispatch events to dynamically sync components
    window.addEventListener('hireflow_user_updated', loadUser);
    return () => window.removeEventListener('hireflow_user_updated', loadUser);
  }, [navigate]);

  const handleLogout = () => {
    localStorage.removeItem('hireflow_auth');
    localStorage.removeItem('hireflow_user');
    localStorage.removeItem('hireflow_token');
    navigate('/login');
  };

  const hasPerm = (permCode) => {
    const perms = user.permissions || [];
    return perms.includes(permCode) || user.role === 'SuperAdmin' || user.role_name === 'SuperAdmin';
  };

  // Dynamic breadcrumb logic
  const getPageTitle = () => {
    const path = location.pathname;
    if (path === '/') return 'Dashboard';
    if (path === '/org') return 'Organization Structure';
    if (path === '/employees') return 'Employee Directory';
    if (path === '/roles') return 'Security & Permissions';
    if (path === '/profile') return 'My Profile';
    if (path === '/my-calendar') return 'My Calendar';
    if (path === '/email') return 'Mail';
    if (path.startsWith('/recruitment')) return 'Recruitments';
    return 'HireFlow';
  };

  const menuGroups = [
    {
      title: "OVERVIEW",
      links: [
        { to: "/", icon: <BarChart3 size={18} />, label: "Dashboard", id: 'dash' }
      ]
    },
    {
      title: "ORGANIZATION",
      links: [
        { to: "/org", icon: <Building2 size={18} />, label: "Org Structure", perm: 'depts:view' },
        { to: "/employees", icon: <Users size={18} />, label: "Employee Directory", perm: 'users:view' }
      ]
    },
    {
      title: "RECRUITMENT",
      links: [
        { to: "/recruitment", icon: <Briefcase size={18} />, label: "Recruitments", id: 'recruit' }
      ]
    },
    {
      title: "SYSTEM",
      links: [
        { to: "/roles", icon: <ShieldCheck size={18} />, label: "Roles & Perms", perm: 'roles:view' }
      ]
    },
    {
      title: "PERSONAL",
      links: [
        { to: "/email", icon: <Mail size={18} />, label: "Mail", id: 'email' },
        { to: "/my-calendar", icon: <CalendarDays size={18} />, label: "My Calendar", id: 'att' },
        { to: "/profile", icon: <UserCircle size={18} />, label: "My Profile", perm: 'profile:view' }
      ]
    }
  ];

  return (
    <div className={styles.layoutContainer}>
      {/* Mobile Overlay */}
      {mobileOpen && (
        <div className={styles.sidebarOverlay} onClick={() => setMobileOpen(false)} />
      )}

      <aside className={`${styles.sidebar} ${collapsed ? styles.sidebarCollapsed : ''} ${mobileOpen ? styles.sidebarMobileOpen : ''}`}>
        <div className={styles.sidebarHeader}>
          <div className={styles.brandBox}>
            <div className={styles.logoMark}><ShieldCheck size={16} color="white" /></div>
            {!collapsed && <span className={styles.brandName}>HireFlow V2</span>}
          </div>
          <button className={styles.collapseBtn} onClick={() => setCollapsed(!collapsed)}>
            {collapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
          </button>
          <button className={styles.closeMobileBtn} onClick={() => setMobileOpen(false)}>
            <X size={18} />
          </button>
        </div>

        <nav className={styles.navMenu}>
          {menuGroups.map((group, idx) => {
            const visibleLinks = group.links.filter(link => !link.perm || hasPerm(link.perm));
            if (visibleLinks.length === 0) return null;

            return (
              <div key={idx} className={styles.navGroup}>
                {!collapsed && <h4 className={styles.groupTitle}>{group.title}</h4>}
                {visibleLinks.map((link, j) => (
                  <NavLink
                    key={j}
                    to={link.to}
                    end={link.to === '/'}
                    className={({ isActive }) => `${styles.navItem} ${isActive ? styles.navItemActive : ''}`}
                    onClick={() => setMobileOpen(false)}
                  >
                    <span className={styles.navIcon}>{link.icon}</span>
                    {!collapsed && <span className={styles.navLabel}>{link.label}</span>}
                  </NavLink>
                ))}
              </div>
            );
          })}
        </nav>

        <div className={styles.sidebarFooter}>
          <div className={styles.userInfoBox}>
            <div className={styles.userAvatar}>
              {user.profile?.profile_picture ? (
                <img
                  src={user.profile.profile_picture.startsWith('http') ? user.profile.profile_picture : `http://localhost:8000${user.profile.profile_picture}`}
                  alt={displayName}
                  className={styles.avatarImage}
                />
              ) : (
                displayName.charAt(0)
              )}
            </div>
            {!collapsed && (
              <div className={styles.userDetails}>
                <span className={styles.userName}>{displayName}</span>
                <span className={styles.userRole}>{user.role_name}</span>
              </div>
            )}
          </div>
          <button className={styles.logoutBtn} onClick={handleLogout} title="Sign Out">
            <LogOut size={16} /> {!collapsed && <span>Sign Out</span>}
          </button>
        </div>
      </aside>

      <main className={styles.mainContent}>
        <header className={styles.topBar}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.875rem' }}>
            <button className={styles.mobileMenuBtn} onClick={() => setMobileOpen(true)}>
              <Menu size={20} color="#1e293b" />
            </button>
            <div className={styles.pageIndicator}>
              <span style={{ color: '#94a3b8' }}>HireFlow / </span><span className={styles.activePage}>{getPageTitle()}</span>
            </div>
          </div>
          <div className={styles.topActions}>
            <div className={styles.statusBadge}>System Online</div>
            <div className={styles.userCircle}>
              {user.profile?.profile_picture ? (
                <img
                  src={user.profile.profile_picture.startsWith('http') ? user.profile.profile_picture : `http://localhost:8000${user.profile.profile_picture}`}
                  alt={displayName}
                  className={styles.avatarImage}
                />
              ) : (
                displayName.charAt(0)
              )}
            </div>
          </div>
        </header>

        <div className={styles.pageContainer}>
          <Outlet />
        </div>
      </main>
    </div>
  );
}

// EOF
