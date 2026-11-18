import Card from '../Card/Card';
import styles from './PageHeader.module.css';

export default function PageHeader({ title, description, actions }) {
  return (
    <Card as="header" variant="pageHeader" noPadding>
      <div className={styles.layout}>
        <div><h1>{title}</h1>{description && <p>{description}</p>}</div>
        {actions && <div className={styles.actions}>{actions}</div>}
      </div>
    </Card>
  );
}
