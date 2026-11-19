import PageState from '../../components/common/PageState';
import { usePopover } from '../../hooks/usePopover';
import Modal from '../../components/common/Modal/Modal';
import Input from '../../components/common/Input/Input';
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Mail, Trash2, ChevronDown, X, Check, AlertCircle, Plus } from 'lucide-react';
import { apiClient } from '../../api/apiClient';
import Button from '../../components/common/Button/Button';
import styles from './EmailClient.module.css';
import { API_BASE } from './mailUtils';

const PROVIDER_ICONS = {
  gmail: { label: 'Gmail', color: '#ea4335', icon: <Mail size={22} /> },
  outlook: { label: 'Outlook', color: '#0078d4', icon: <Mail size={22} /> },
  hostinger: { label: 'Hostinger', color: '#4b32c3', icon: <Mail size={22} /> },
  custom: { label: 'Custom IMAP', color: '#64748b', icon: <Mail size={22} /> },
};

export function AccountConfigModal({ onClose, onSave, onToast, editAccount = null }) {
  const [step, setStep] = useState(1);
  const [isValidating, setIsValidating] = useState(false);
  const [validationError, setValidationError] = useState(null);

  const [config, setConfig] = useState(editAccount || {
    provider: 'gmail', email_address: '', password: '', display_name: '',
    imap_host: 'imap.gmail.com', imap_port: 993,
    smtp_host: 'smtp.gmail.com', smtp_port: 587,
  });

  const PROVIDERS = [
    { id: 'gmail', label: 'Gmail', imap_host: 'imap.gmail.com', smtp_host: 'smtp.gmail.com' },
    { id: 'outlook', label: 'Outlook / M365', imap_host: 'outlook.office365.com', smtp_host: 'smtp.office365.com' },
    { id: 'hostinger', label: 'Hostinger Mail', imap_host: 'imap.hostinger.com', smtp_host: 'smtp.hostinger.com' },
    { id: 'custom', label: 'Custom SMTP/IMAP', imap_host: '', smtp_host: '' },
  ];

  const [isSyncingInitial, setIsSyncingInitial] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const selectProvider = (p) => {
    setConfig(c => ({ ...c, provider: p.id, imap_host: p.imap_host, smtp_host: p.smtp_host }));
    setStep(2);
  };

  const handleValidate = async () => {
    setIsValidating(true);
    setValidationError(null);
    try {
      const res = await apiClient(`${API_BASE}/validate/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config)
      });
      if (res.success) {
        setIsSuccess(true);
        setIsSyncingInitial(true);
        await onSave(config);
      } else {
        setValidationError(res.error || 'Validation failed');
      }
    } catch (err) {
      setValidationError(err.message || 'Connection error. Check settings.');
    } finally {
      setIsValidating(false);
      setIsSyncingInitial(false);
    }
  };

  return (
    <Modal isOpen onClose={() => { if (!isValidating && !isSyncingInitial) onClose(); }}
      title={editAccount ? 'Edit email account' : 'Add email account'} size="lg"
      footer={!isSyncingInitial && step === 2 && <>
        <Button variant="outline" disabled={isValidating} onClick={() => setStep(1)}>Back</Button>
        <Button loading={isValidating} onClick={handleValidate}>Validate and connect</Button>
      </>}>
      <p className={styles.configSub}>Step {step} of 2 · {step === 1 ? 'Choose provider' : 'Enter credentials'}</p>
          {isSyncingInitial ? (
            <PageState tone="loading" title="Saving mailbox settings..." />
          ) : step === 1 ? (
            <div className={styles.providerGrid}>
              {PROVIDERS.map(p => {
                const brandColor = PROVIDER_ICONS[p.id]?.color || '#f1f5f9';
                return (
                  <button
                    key={p.id}
                    className={`${styles.providerCard} ${config.provider === p.id ? styles.providerActive : ''}`}
                    onClick={() => selectProvider(p)}
                  >
                    <div className={styles.providerIconCircle} style={{ background: `${brandColor}15`, color: brandColor }}>
                      {PROVIDER_ICONS[p.id]?.icon || <Mail size={22} />}
                    </div>
                    <span>{p.label}</span>
                  </button>
                );
              })}
            </div>
          ) : (
            <div className={styles.configForm}>
              <div className={styles.configFormGrid}>
                <Input label="Display Name" placeholder="e.g. Sarah J." value={config.display_name} onChange={e => setConfig({ ...config, display_name: e.target.value })} />
                <Input label="Email Address" type="email" placeholder="name@company.com" value={config.email_address} onChange={e => setConfig({ ...config, email_address: e.target.value })} />
                <Input label="Application Password" type="password" value={config.password} onChange={e => setConfig({ ...config, password: e.target.value })} />

                {config.provider === 'custom' && (
                  <>
                    <Input label="IMAP Host" value={config.imap_host} onChange={e => setConfig({ ...config, imap_host: e.target.value })} />
                    <Input label="SMTP Host" value={config.smtp_host} onChange={e => setConfig({ ...config, smtp_host: e.target.value })} />
                  </>
                )}
              </div>

              {validationError && (
                <motion.div
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  className={styles.configError}
                >
                  <AlertCircle size={14} /> <span>{validationError}</span>
                </motion.div>
              )}
            </div>
          )}
    </Modal>
  );
}

export function AccountSwitcher({ accounts, activeId, onSwitch, onAdd, onEdit, onRemove }) {
  const { isOpen: open, containerRef, panelId, close, trigger } = usePopover();
  const active = (Array.isArray(accounts) && accounts.find(a => a.id === activeId)) || (accounts?.[0]) || {
    email: 'No Account',
    provider: 'custom',
    avatar: '?',
    avatarColor: '#94a3b8'
  };


  return (
    <div className={styles.accountSwitcherWrap} ref={containerRef}>
      <button className={styles.accountSwitcherBtn} {...trigger}>
        <div className={styles.accountMeta}>
          <span className={styles.accountEmail}>{active.email_address || active.email}</span>
          <span className={styles.accountDisplayName}>{active.display_name || 'Switch Account'}</span>
        </div>
        <ChevronDown size={18} className={open ? `${styles.chevronDown} ${styles.chevronUp}` : styles.chevronDown} />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            id={panelId} className={styles.accountDropdown}
            initial={{ opacity: 0, y: 8, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.95 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
          >
            <div className={styles.dropdownSection}>Manage Accounts</div>

            <div className={styles.accountsList}>
              {accounts.map(acc => (
                <div
                  key={acc.id}
                  className={`${styles.dropdownAccountRow} ${acc.id === activeId ? styles.dropdownAccountActive : ''}`}
                  onClick={() => { onSwitch(acc.id); close(); }}
                >
                  <div className={styles.dropdownAccountHeader}>
                    <span className={styles.dropdownEmail}>{acc.email_address || acc.email}</span>
                    <button
                      className={styles.dropdownRemoveBtn}
                      aria-label={`Remove ${acc.email_address || acc.email}`}
                      onClick={(e) => { e.stopPropagation(); close(); onRemove(acc.id); }}
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                  <div className={styles.dropdownAccountFooter}>
                    <span className={styles.dropdownDisplayName}>{acc.display_name}</span>
                    {acc.id === activeId && <span className={styles.activeBadge}>Active</span>}
                  </div>
                </div>
              ))}
            </div>

            <div className={styles.dropdownDivider} />

            <button className={styles.dropdownAddBtn} onClick={() => { onAdd(); close(); }}>
              <Plus size={16} /> Add another account
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
