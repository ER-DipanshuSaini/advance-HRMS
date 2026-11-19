import Card from '../Card/Card';
import Loader from '../Loader/Loader';
import styles from './MetricStrip.module.css';

export default function MetricStrip({ metrics, loading = false, error }) {
  return (
    <Card variant="metrics" noPadding>
      <dl className={styles.metrics}>
        {metrics.map(({ label, value, Icon, tone = 'primary', loading: pending = loading, error: unavailable = error }) => (
          <div key={label} className={styles.metric}>
            <span className={[styles.icon, styles[tone]].join(' ')}><Icon size={18} aria-hidden="true" /></span>
            <div>
              <dt>{label}</dt>
              <dd className={styles.value}>
                {pending && !unavailable ? (
                  <Loader size="sm" label={'Loading ' + label.toLowerCase()} />
                ) : unavailable || value == null ? (
                  <span className={styles.unavailable}>Unavailable</span>
                ) : (
                  <span key={value} className={styles.reveal}>{value}</span>
                )}
              </dd>
            </div>
          </div>
        ))}
      </dl>
    </Card>
  );
}
