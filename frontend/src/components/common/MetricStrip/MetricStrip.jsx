import Card from '../Card/Card';
import styles from './MetricStrip.module.css';

export default function MetricStrip({ metrics }) {
  return (
    <Card variant="metrics" noPadding>
      <dl className={styles.metrics}>
        {metrics.map(({ label, value, Icon, tone = 'primary' }) => (
          <div key={label} className={styles.metric}>
            <span className={[styles.icon, styles[tone]].join(' ')}><Icon size={18} aria-hidden="true" /></span>
            <div><dt>{label}</dt><dd>{value}</dd></div>
          </div>
        ))}
      </dl>
    </Card>
  );
}
