import { Loader2 } from 'lucide-react';
import styles from './Button.module.css';

export default function Button({ children, variant = 'primary', type = 'button', loading = false,
  icon, className = '', disabled = false, ...props }) {
  return (
    <button {...props} type={type} className={`${styles.btn} ${styles[variant]} ${className}`}
      disabled={loading || disabled} aria-busy={loading || undefined}>
      {loading ? <Loader2 className={styles.spinner} size={18} aria-hidden="true" /> :
        icon && <span className={styles.icon} aria-hidden="true">{icon}</span>}
      {children}
    </button>
  );
}
