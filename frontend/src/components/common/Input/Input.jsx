import { useId } from 'react';
import styles from './Input.module.css';

export default function Input({ as: Control = 'input', children, label, error, icon, suffix, className = '', containerClass = '',
  id, 'aria-describedby': description, ...props }) {
  const generatedId = useId();
  const inputId = id || generatedId;
  const errorId = error ? inputId + '-error' : undefined;

  return (
    <div className={`${styles.inputGroup} ${containerClass}`}>
      {label && <label htmlFor={inputId} className={styles.label}>{label}</label>}
      <div className={styles.inputWrapper}>
        {icon && <span className={styles.icon} aria-hidden="true">{icon}</span>}
        <Control {...props} id={inputId}
          className={[styles.input, icon && styles.hasIcon, suffix && styles.hasSuffix, className].filter(Boolean).join(' ')}
          aria-invalid={error ? true : props['aria-invalid']}
          aria-describedby={[description, errorId].filter(Boolean).join(' ') || undefined}>{children}</Control>
        {suffix && <span className={styles.suffix}>{suffix}</span>}
      </div>
      {error && <span id={errorId} className={styles.errorText}>{error}</span>}
    </div>
  );
}
