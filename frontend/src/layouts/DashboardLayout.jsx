import { useEffect, useRef, useState } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { ChevronLeft, ChevronRight, LogOut, Menu, ShieldCheck, X } from 'lucide-react';
import { clearSession, displayName, hasPermission, readUser } from '../session';
import { navigation, navigationGroups } from '../navigation';
import { resolveMediaUrl } from '../api/apiClient';
import styles from './DashboardLayout.module.css';

export default function DashboardLayout() {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [imageFailed, setImageFailed] = useState(false);
  const [user, setUser] = useState(readUser);
  const menuButton = useRef(null);
  const closeButton = useRef(null);
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const name = displayName(user);
  const image = resolveMediaUrl(user?.profile?.profile_picture);
  const page = navigation.find(({ href }) => pathname === href || pathname.startsWith(href + '/'));

  const avatar = image && !imageFailed ?
    <img src={image} alt="" className={styles.avatarImage} onError={() => setImageFailed(true)} /> :
    name.charAt(0).toUpperCase();

  useEffect(() => {
    const update = () => {
      setUser(readUser());
      setImageFailed(false);
    };
    window.addEventListener('hireflow_user_updated', update);
    return () => window.removeEventListener('hireflow_user_updated', update);
  }, []);

  function closeMenu() {
    setMobileOpen(false);
    menuButton.current?.focus();
  }

  useEffect(() => {
    if (mobileOpen) closeButton.current?.focus();
  }, [mobileOpen]);

  return (
    <div className={styles.layoutContainer} onKeyDown={event => {
      if (mobileOpen && event.key === 'Escape') closeMenu();
    }}>
      <a className={styles.skipLink} href="#main-content">Skip to content</a>
      {mobileOpen && <div className={styles.sidebarOverlay} onClick={closeMenu} aria-hidden="true" />}
      <aside id="primary-navigation" className={[
        styles.sidebar, collapsed && styles.sidebarCollapsed, mobileOpen && styles.sidebarMobileOpen,
      ].filter(Boolean).join(' ')}>
        <div className={styles.sidebarHeader}>
          <NavLink to="/" className={styles.brandBox} aria-label="HireFlow home" onClick={() => setMobileOpen(false)}>
            <span className={styles.logoMark}><ShieldCheck size={19} aria-hidden="true" /></span>
            <span className={styles.brandName}>HireFlow V2</span>
          </NavLink>
          <button type="button" className={styles.collapseBtn} onClick={() => setCollapsed(value => !value)}
            aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}>
            {collapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
          </button>
          <button type="button" ref={closeButton} className={styles.closeMobileBtn} onClick={closeMenu} aria-label="Close navigation">
            <X size={20} />
          </button>
        </div>
        <nav className={styles.navMenu} aria-label="Main navigation">
          {navigationGroups.map(({ label, links }) => {
            const visible = links.filter(item => hasPermission(user, item.permission));
            return visible.length > 0 && (
              <div className={styles.navGroup} key={label}>
                <h2 className={styles.groupTitle}>{label}</h2>
                {visible.map(({ href, label: linkLabel, Icon }) => (
                  <NavLink key={href} to={href} end={href === '/'} aria-label={linkLabel}
                    title={collapsed ? linkLabel : undefined}
                    className={({ isActive }) => [styles.navItem, isActive && styles.navItemActive].filter(Boolean).join(' ')}
                    onClick={() => setMobileOpen(false)}>
                    <span className={styles.navIcon}><Icon size={18} aria-hidden="true" /></span>
                    <span className={styles.navLabel}>{linkLabel}</span>
                  </NavLink>
                ))}
              </div>
            );
          })}
        </nav>
        <div className={styles.sidebarFooter}>
          <div className={styles.userInfoBox}>
            <span className={styles.userAvatar} aria-hidden="true">
              {avatar}
            </span>
            <div className={styles.userDetails}>
              <span className={styles.userName}>{name}</span>
              {user?.role_name && <span className={styles.userRole}>{user.role_name}</span>}
            </div>
          </div>
          <button type="button" className={styles.logoutBtn} aria-label="Sign out" onClick={() => {
            clearSession();
            navigate('/login', { replace: true });
          }}>
            <LogOut size={17} aria-hidden="true" /><span className={styles.navLabel}>Sign out</span>
          </button>
        </div>
      </aside>
      <main id="main-content" tabIndex={-1} className={styles.mainContent}>
        <header className={styles.topBar}>
          <div className={styles.topBarStart}>
            <button type="button" ref={menuButton} className={styles.mobileMenuBtn} onClick={() => setMobileOpen(true)}
              aria-label="Open navigation" aria-controls="primary-navigation" aria-expanded={mobileOpen}>
              <Menu size={20} />
            </button>
            <div className={styles.pageIndicator}>
              <span>HireFlow / </span><span className={styles.activePage}>{page?.label || 'HireFlow'}</span>
            </div>
          </div>
          <div className={styles.userCircle} aria-hidden="true">{avatar}</div>
        </header>
        <div className={styles.pageContainer}><Outlet context={user} /></div>
      </main>
    </div>
  );
}
