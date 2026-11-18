import { useEffect, useId, useRef, useState } from 'react';

export function usePopover() {
  const [isOpen, setOpen] = useState(false);
  const containerRef = useRef(null);
  const triggerRef = useRef(null);
  const panelId = useId();

  useEffect(() => {
    if (!isOpen) return;
    function dismissOutside(event) {
      if (!containerRef.current?.contains(event.target)) setOpen(false);
    }
    function dismissOnEscape(event) {
      if (event.key !== 'Escape') return;
      setOpen(false);
      triggerRef.current?.focus();
    }
    document.addEventListener('pointerdown', dismissOutside);
    document.addEventListener('keydown', dismissOnEscape);
    return () => {
      document.removeEventListener('pointerdown', dismissOutside);
      document.removeEventListener('keydown', dismissOnEscape);
    };
  }, [isOpen]);

  return {
    isOpen, containerRef, panelId,
    close: () => setOpen(false),
    trigger: {
      ref: triggerRef,
      type: 'button',
      'aria-expanded': isOpen,
      'aria-controls': isOpen ? panelId : undefined,
      onClick: () => setOpen(open => !open),
    },
  };
}