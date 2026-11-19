import Loader from '../Loader/Loader';
import styles from './Button.module.css';

export default function Button({ children, variant = 'primary', size = 'md', type = 'button', loading = false,
  icon, className = '', disabled = false, ...props }) {
  return (
    <button {...props} type={type} className={`${styles.btn} ${styles[variant]} ${styles[size] || ''} ${className}`}
      disabled={loading || disabled} aria-busy={loading || undefined}>
      {loading ? <Loader size="sm" /> :
        icon && <span className={styles.icon} aria-hidden="true">{icon}</span>}
      {children}
    </button>
  );
}
