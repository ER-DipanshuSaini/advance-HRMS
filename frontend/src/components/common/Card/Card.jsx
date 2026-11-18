
import styles from './Card.module.css';

/**
 * Standard Atomic Card Component
 * @param {string} title - Optional title to display in the header
 * @param {React.ReactNode} extra - Optional secondary content (e.g. actions) to display in the header
 * @param {React.ReactNode} footer - Optional footer content
 * @param {string} padding - Header/Body/Footer padding
 */
export default function Card({ 
  as: Element = 'div',
  variant = 'default',
  title, 
  extra, 
  children, 
  footer, 
  className = '', 
  noPadding = false,
  ...props 
}) {
  const cardClass = [styles.card, styles[variant], className].filter(Boolean).join(' ');

  return (
    <Element className={cardClass} {...props}>
      {(title || extra) && (
        <div className={styles.header}>
          {title && <h3 className={styles.title}>{title}</h3>}
          {extra && <div className={styles.extra}>{extra}</div>}
        </div>
      )}
      <div className={`${styles.body} ${noPadding ? styles.noPadding : ''}`}>
        {children}
      </div>
      {footer && (
        <div className={styles.footer}>
          {footer}
        </div>
      )}
    </Element>
  );
}
