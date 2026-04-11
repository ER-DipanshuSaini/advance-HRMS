import React from 'react';
import styles from './Input.module.css';

/**
 * Standard Atomic Input Component
 * @param {string} label - Optional label for the input
 * @param {string} error - Optional error message
 * @param {React.ReactNode} icon - Optional icon to display before input
 * @param {React.ReactNode} suffix - Optional icon/button to display after input
 */
export default function Input({ 
  label, 
  error, 
  icon, 
  suffix,
  className = '', 
  containerClass = '', 
  ...props 
}) {
  return (
    <div className={`${styles.inputGroup} ${containerClass}`}>
      {label && <label className={styles.label}>{label}</label>}
      <div className={`${styles.inputWrapper} ${error ? styles.inputError : ''}`}>
        {icon && <span className={styles.icon}>{icon}</span>}
        <input 
          className={`${styles.input} ${icon ? styles.hasIcon : ''} ${suffix ? styles.hasSuffix : ''} ${className}`} 
          {...props} 
        />
        {suffix && <span className={styles.suffix}>{suffix}</span>}
      </div>
      {error && <span className={styles.errorText}>{error}</span>}
    </div>
  );
}
