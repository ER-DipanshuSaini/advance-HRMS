import React from 'react';
import styles from './Badge.module.css';

/**
 * Standard Atomic Badge Component
 * @param {string} variant - success | warning | danger | primary | info
 */
export default function Badge({ children, variant = 'primary', className = '', ...props }) {
  const badgeClass = `${styles.badge} ${styles[variant]} ${className}`;

  return (
    <span className={badgeClass} {...props}>
      {children}
    </span>
  );
}
