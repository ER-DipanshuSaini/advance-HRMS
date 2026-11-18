import { useEffect, useId, useRef } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import styles from './Modal.module.css';

export default function Modal({ isOpen, onClose, title, children, footer, size = 'md' }) {
  const ref = useRef(null);
  const titleId = useId();

  useEffect(() => {
    const dialog = ref.current;
    if (!isOpen || !dialog) return;
    const opener = document.activeElement;
    dialog.showModal();
    return () => {
      dialog.close();
      if (opener instanceof HTMLElement && opener.isConnected) opener.focus();
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return createPortal(
    <dialog ref={ref} className={[styles.modal, styles[size]].join(' ')} aria-labelledby={titleId}
      onCancel={event => { event.preventDefault(); onClose(); }}>
      <header className={styles.header}>
        <h2 id={titleId}>{title}</h2>
        <button type="button" className={styles.closeBtn} onClick={onClose} aria-label="Close dialog">
          <X size={19} aria-hidden="true" />
        </button>
      </header>
      <div className={styles.body}>{children}</div>
      {footer && <footer className={styles.footer}>{footer}</footer>}
    </dialog>,
    document.body
  );
}
