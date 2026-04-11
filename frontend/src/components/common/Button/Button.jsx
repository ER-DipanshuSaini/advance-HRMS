import React from 'react';
import { Loader2 } from 'lucide-react';
import styles from './Button.module.css';

/**
 * Standard Atomic Button Component
 * @param {string} variant - primary | outline | danger | ghost
 * @param {boolean} loading - Displays a spinner and disables the button
 * @param {React.ReactNode} icon - Optional icon to display before text
 */
export default function Button({ 
  children, 
  variant = 'primary', 
  loading = false, 
  icon = null, 
  className = '', 
  disabled = false,
  ...props 
}) {
  const buttonClass = `${styles.btn} ${styles[variant]} ${className}`;

  return (
    <button 
      className={buttonClass} 
      disabled={loading || disabled} 
      {...props}
    >
      {loading ? (
        <Loader2 className={styles.spinner} size={18} />
      ) : (
        <>
          {icon && <span className={styles.icon}>{icon}</span>}
          {children}
        </>
      )}
    </button>
  );
}
