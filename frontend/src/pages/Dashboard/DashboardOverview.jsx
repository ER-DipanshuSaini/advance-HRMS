import PageLayout from '../../components/common/PageLayout';
import PageHeader from '../../components/common/PageHeader/PageHeader';
import Card from '../../components/common/Card/Card';
import { Link, useOutletContext } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { navigation } from '../../navigation';
import { displayName, hasPermission } from '../../session';
import styles from './DashboardOverview.module.css';

export default function DashboardOverview() {
  const user = useOutletContext();
  return (
    <PageLayout>
      <PageHeader title={'Welcome, ' + (user?.first_name || displayName(user))} />
      <div className={styles.links}>
        {navigation.filter(item => item.description && hasPermission(user, item.permission)).map(({ href, label, description, Icon }) => (
          <Card as={Link} variant="shortcut" key={href} to={href} noPadding>
            <span className={styles.cardContent}>
            <span className={styles.icon}><Icon size={20} aria-hidden="true" /></span>
            <span><strong>{label}</strong><span className={styles.description}>{description}</span></span>
            <ArrowRight size={17} className={styles.arrow} aria-hidden="true" />
          </span></Card>
        ))}
      </div>
    </PageLayout>
  );
}
