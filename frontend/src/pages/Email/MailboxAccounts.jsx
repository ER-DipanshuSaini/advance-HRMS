import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Mail, Trash2, ChevronDown, X, Check, AlertCircle, Plus, ShieldCheck } from 'lucide-react';
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
      // We don't set setIsSyncingInitial(false) here because if onSave finishes, modal closes anyway
    }
  };

  return (
    <div className={styles.configOverlay} onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <motion.div
        className={styles.configModal}
        initial={{ scale: 0.94, opacity: 0, y: 20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
      >
        <div className={styles.configHeader}>
          <div className={styles.configHeaderLeft}>
            <div className={styles.configIconBox}><Mail size={18} /></div>
            <div>
              <h3 className={styles.configTitle}>{editAccount ? 'Edit Account' : 'Add Email Account'}</h3>
              <div className={styles.stepperContainer}>
                {[1, 2].map(n => (
                  <div key={n} className={`${styles.stepDot} ${step >= n ? styles.stepDotActive : ''}`} />
                ))}
                <span className={styles.configSub}>Step {step} of 2: {step === 1 ? 'Choose Provider' : 'Enter Credentials'}</span>
              </div>
            </div>
          </div>
          <button className={styles.configCloseBtn} onClick={onClose}><X size={17} /></button>
        </div>

        <div className={styles.configBody}>
          {isSyncingInitial ? (
            <div className={styles.syncLoadingState}>
              <div className={styles.syncLoadingIcon}>
                <div className={styles.pulseRing} />
                <ShieldCheck size={40} className={styles.successIcon} />
              </div>
              <h4 className={styles.syncLoadingTitle}>Validation Success!</h4>
              <p className={styles.syncLoadingMsg}>
                Your credentials are secure. We're now fetching your some of emails to get you started...
              </p>
              <div className={styles.inlineLoader}>
                <div className={styles.inlineLoaderBar} />
              </div>
            </div>
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
                <div className={styles.configFormGroup}>
                  <label>Display Name</label>
                  <input className={styles.configInput} placeholder="e.g. Sarah J." value={config.display_name} onChange={e => setConfig({ ...config, display_name: e.target.value })} />
                </div>
                <div className={styles.configFormGroup}>
                  <label>Email Address</label>
                  <input className={styles.configInput} type="email" placeholder="name@company.com" value={config.email_address} onChange={e => setConfig({ ...config, email_address: e.target.value })} />
                </div>
                <div className={styles.configFormGroup}>
                  <label>Application Password</label>
                  <input className={styles.configInput} type="password" placeholder="••••••••••••" value={config.password} onChange={e => setConfig({ ...config, password: e.target.value })} />
                </div>

                {config.provider === 'custom' && (
                  <>
                    <div className={styles.configFormGroup}><label>IMAP Host</label><input className={styles.configInput} value={config.imap_host} onChange={e => setConfig({ ...config, imap_host: e.target.value })} /></div>
                    <div className={styles.configFormGroup}><label>SMTP Host</label><input className={styles.configInput} value={config.smtp_host} onChange={e => setConfig({ ...config, smtp_host: e.target.value })} /></div>
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
        </div>

        {!isSyncingInitial && (
          <div className={styles.configFooter}>
            {step === 2 && <Button variant="outline" onClick={() => setStep(1)}>Back</Button>}
            <span style={{ flex: 1 }} />
            {step === 2 && (
              <Button
                variant="primary"
                loading={isValidating}
                onClick={handleValidate}
              >
                {isValidating ? 'Validating...' : 'Validate & Connect'}
              </Button>
            )}
          </div>
        )}
      </motion.div>
    </div>
  );
}


/* ═══════════════════════════════════════════════════
   ACCOUNT SWITCHER DROPDOWN
═══════════════════════════════════════════════════ */
export function AccountSwitcher({ accounts, activeId, onSwitch, onAdd, onEdit, onRemove }) {
  const [open, setOpen] = useState(false);
  const active = (Array.isArray(accounts) && accounts.find(a => a.id === activeId)) || (accounts?.[0]) || {
    email: 'No Account',
    provider: 'custom',
    avatar: '?',
    avatarColor: '#94a3b8'
  };
  const ref = useRef(null);

  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  return (
    <div className={styles.accountSwitcherWrap} ref={ref}>
      <button className={styles.accountSwitcherBtn} onClick={() => setOpen(o => !o)}>
        <div className={styles.accountMeta}>
          <span className={styles.accountEmail}>{active.email_address || active.email}</span>
          <span className={styles.accountDisplayName}>{active.display_name || 'Switch Account'}</span>
        </div>
        <ChevronDown size={18} className={open ? `${styles.chevronDown} ${styles.chevronUp}` : styles.chevronDown} />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            className={styles.accountDropdown}
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
                  onClick={() => { onSwitch(acc.id); setOpen(false); }}
                >
                  <div className={styles.dropdownAccountHeader}>
                    <span className={styles.dropdownEmail}>{acc.email_address || acc.email}</span>
                    <button
                      className={styles.dropdownRemoveBtn}
                      title={`Remove ${acc.email}`}
                      onClick={(e) => { e.stopPropagation(); setOpen(false); onRemove(acc.id); }}
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

            <button className={styles.dropdownAddBtn} onClick={() => { onAdd(); setOpen(false); }}>
              <Plus size={16} /> Add another account
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
