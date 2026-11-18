import { Link, useOutletContext } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { navigation } from '../../navigation';
import { displayName, hasPermission } from '../../session';
import styles from './DashboardOverview.module.css';

export default function DashboardOverview() {
  const user = useOutletContext();
  return (
    <section className={styles.dashboard}>
      <h1>Welcome, {user?.first_name || displayName(user)}</h1>
      <div className={styles.links}>
        {navigation.filter(item => item.description && hasPermission(user, item.permission)).map(({ href, label, description, Icon }) => (
          <Link key={href} to={href} className={styles.card}>
            <span className={styles.icon}><Icon size={20} aria-hidden="true" /></span>
            <span><strong>{label}</strong><span className={styles.description}>{description}</span></span>
            <ArrowRight size={17} className={styles.arrow} aria-hidden="true" />
          </Link>
        ))}
      </div>
    </section>
  );
}
