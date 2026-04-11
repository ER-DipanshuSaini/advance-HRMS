import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Mail, Send, FileText, Trash2, Star, Search,
  Inbox, RefreshCw, Pencil, ChevronDown, ChevronRight,
  Reply, ReplyAll, Forward, MoreHorizontal, Paperclip,
  X, Settings, Check, AlertCircle, ArrowLeft,
  Bold, Italic, Underline, Link2, AlignLeft, AlignCenter,
  AlignRight, List, ListOrdered, Plus, Filter, Tag,
  UserCircle, Building2, ShieldCheck,
  ExternalLink, Image as ImageIcon, Strikethrough,
  RotateCcw, RotateCw, MinusSquare, Maximize2, CheckCircle2,
  Database, Cpu, Zap, Server, UserCheck
} from 'lucide-react';
import { apiClient } from '../../api/apiClient';
import Button from '../../components/common/Button/Button';
import Badge from '../../components/common/Badge/Badge';
import Toast from '../../components/common/Toast/Toast';
import styles from './EmailClient.module.css';

const API_BASE = '/communication';

const PROVIDER_ICONS = {
  gmail: { label: 'Gmail', color: '#ea4335', icon: <Mail size={22} /> },
  outlook: { label: 'Outlook', color: '#0078d4', icon: <Mail size={22} /> },
  hostinger: { label: 'Hostinger', color: '#4b32c3', icon: <Mail size={22} /> },
  custom: { label: 'Custom IMAP', color: '#64748b', icon: <Mail size={22} /> },
};

/* ═══════════════════════════════════════════════════
   RICH TEXT EDITOR TOOLBAR
═══════════════════════════════════════════════════ */
function RichEditor({ value, onChange, placeholder = 'Write your message here...' }) {
  const editorRef = useRef(null);

  const exec = (cmd, val = null) => {
    editorRef.current?.focus();
    document.execCommand(cmd, false, val);
  };

  const handleInput = () => {
    onChange(editorRef.current?.innerHTML || '');
  };

  const handleLink = () => {
    const url = window.prompt('Enter URL:', 'https://');
    if (url) exec('createLink', url);
  };



  const TOOLS = [
    {
      group: 'history', items: [
        { title: 'Undo', icon: <RotateCcw size={14} />, cmd: () => exec('undo') },
        { title: 'Redo', icon: <RotateCw size={14} />, cmd: () => exec('redo') },
      ]
    },
    {
      group: 'format', items: [
        { title: 'Bold', icon: <Bold size={14} />, cmd: () => exec('bold') },
        { title: 'Italic', icon: <Italic size={14} />, cmd: () => exec('italic') },
        { title: 'Underline', icon: <Underline size={14} />, cmd: () => exec('underline') },
        { title: 'Strikethrough', icon: <Strikethrough size={14} />, cmd: () => exec('strikeThrough') },
      ]
    },
    {
      group: 'align', items: [
        { title: 'Align Left', icon: <AlignLeft size={14} />, cmd: () => exec('justifyLeft') },
        { title: 'Align Center', icon: <AlignCenter size={14} />, cmd: () => exec('justifyCenter') },
        { title: 'Align Right', icon: <AlignRight size={14} />, cmd: () => exec('justifyRight') },
      ]
    },
    {
      group: 'list', items: [
        { title: 'Bullet List', icon: <List size={14} />, cmd: () => exec('insertUnorderedList') },
        { title: 'Numbered List', icon: <ListOrdered size={14} />, cmd: () => exec('insertOrderedList') },
      ]
    },
    {
      group: 'insert', items: [
        { title: 'Insert Link', icon: <Link2 size={14} />, cmd: handleLink },
      ]
    },
  ];

  return (
    <div className={styles.richEditor}>
      <div className={styles.richToolbar}>
        {TOOLS.map((group, gi) => (
          <React.Fragment key={group.group}>
            {gi > 0 && <div className={styles.toolbarDivider} />}
            <div className={styles.toolbarGroup}>
              {group.items.map(tool => (
                <button
                  key={tool.title}
                  type="button"
                  className={styles.toolbarBtn}
                  title={tool.title}
                  onMouseDown={e => { e.preventDefault(); tool.cmd(); }}
                >
                  {tool.icon}
                </button>
              ))}
            </div>
          </React.Fragment>
        ))}
      </div>
      <div
        ref={editorRef}
        className={styles.richBody}
        contentEditable
        suppressContentEditableWarning
        onInput={handleInput}
        data-placeholder={placeholder}
      />
    </div>
  );
}

/* ═══════════════════════════════════════════════════
   EMAIL CHIP INPUT
═══════════════════════════════════════════════════ */
function EmailChipInput({ value, onChange, placeholder }) {
  const [inputVal, setInputVal] = useState('');

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      addEmail(inputVal);
    } else if (e.key === 'Backspace' && !inputVal && value.length > 0) {
      onChange(value.slice(0, -1));
    }
  };

  const handleBlur = () => { if (inputVal) addEmail(inputVal); };

  const addEmail = (email) => {
    const trimmed = email.match(/([a-zA-Z0-9._-]+@[a-zA-Z0-9._-]+\.[a-zA-Z0-9_-]+)/gi)?.[0] || email.trim().replace(/,$/, '');
    if (trimmed && !value.includes(trimmed)) onChange([...value, trimmed]);
    setInputVal('');
  };

  return (
    <div className={styles.emailChipContainer} onClick={() => document.getElementById(`chip-${placeholder}`)?.focus()}>
      {value.map(email => (
        <span key={email} className={styles.emailChip}>
          {email} <button type="button" onMouseDown={(e) => { e.preventDefault(); onChange(value.filter(em => em !== email)); }}><X size={10} /></button>
        </span>
      ))}
      <input
        id={`chip-${placeholder}`}
        className={styles.emailChipInput}
        value={inputVal}
        onChange={e => setInputVal(e.target.value)}
        onKeyDown={handleKeyDown}
        onBlur={handleBlur}
        placeholder={value.length === 0 ? placeholder : ''}
      />
    </div>
  );
}

/* ═══════════════════════════════════════════════════
   COMPOSE WINDOW (Gmail-style floating panel)
═══════════════════════════════════════════════════ */
function ComposeWindow({ onClose, onSend, onToast, activeAccount, replyTo = null }) {
  const initialTo = replyTo?.isDraft ? (replyTo.to ? replyTo.to.split(',').map(e => e.trim()) : []) :
    replyTo?.isForward ? [] :
      replyTo?.isReplyAll ? [replyTo.fromEmail, ...(replyTo?.cc ? replyTo.cc.split(',').map(e => e.trim()) : [])].filter(Boolean) :
        replyTo ? [replyTo.fromEmail] : [];

  const [to, setTo] = useState(initialTo);
  const [cc, setCc] = useState(replyTo?.isDraft && replyTo.cc ? replyTo.cc.split(',').map(e => e.trim()) : []);
  const [bcc, setBcc] = useState(replyTo?.isDraft && replyTo.bcc ? replyTo.bcc.split(',').map(e => e.trim()) : []);
  const [subject, setSubject] = useState(
    replyTo?.isDraft ? replyTo.subject :
      replyTo?.isForward ? `Fwd: ${replyTo.subject}` :
        replyTo ? `Re: ${replyTo.subject}` : ''
  );
  const [body, setBody] = useState(replyTo?.isDraft ? replyTo.body : '');
  const [showCc, setShowCc] = useState(replyTo?.isDraft && (replyTo.cc || replyTo.bcc) ? true : false);
  const [minimized, setMinimized] = useState(false);
  const [maximized, setMaximized] = useState(false);
  const [attachments, setAttachments] = useState([]);
  const fileRef = useRef(null);

  const formatSize = (bytes) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  const handleAttach = (e) => {
    const files = Array.from(e.target.files || []);
    const validFiles = [];
    let hasLarge = false;
    files.forEach(f => {
      if (f.size > 10 * 1024 * 1024) hasLarge = true;
      else validFiles.push({ name: f.name, size: formatSize(f.size), file: f });
    });
    if (hasLarge && onToast) {
      onToast({ message: 'Files larger than 10MB are not allowed.', type: 'error' });
    }
    setAttachments(prev => [...prev, ...validFiles]);
  };

  const handleSend = () => {
    if (to.length === 0) {
      if (onToast) onToast({ message: 'Please specify at least one recipient.', type: 'error' });
      return;
    }
    onSend({
      to: to.join(', '),
      cc: cc.join(', '),
      bcc: bcc.join(', '),
      subject, body,
      attachments: attachments.map(a => a.name)
    });
    onClose();
  };

  return (
    <motion.div
      className={`${styles.composeWindow} ${maximized ? styles.composeMaximized : ''} ${minimized ? styles.composeMinimized : ''}`}
      initial={{ y: 80, opacity: 0, scale: 0.95 }}
      animate={{ y: 0, opacity: 1, scale: 1 }}
      exit={{ y: 80, opacity: 0, scale: 0.95 }}
      transition={{ type: 'spring', damping: 28, stiffness: 300 }}
    >
      {/* Header */}
      <div className={styles.composeHead}>
        <div className={styles.composeHeadLeft}>
          <Pencil size={14} />
          <span>{replyTo ? `Reply — ${replyTo.subject}` : 'New Message'}</span>
        </div>
        <div className={styles.composeHeadActions}>
          <button title="Discard" onClick={onClose} className={styles.composeHeadDiscard}>
            <Trash2 size={14} />
          </button>
          <div className={styles.composeHeadDivider} />
          <button title="Minimize" onClick={() => setMinimized(m => !m)}>
            <MinusSquare size={15} />
          </button>
          <button title={maximized ? 'Restore' : 'Expand'} onClick={() => setMaximized(m => !m)}>
            <Maximize2 size={15} />
          </button>
          <button title="Close" onClick={onClose}>
            <X size={15} />
          </button>
        </div>
      </div>

      {!minimized && (
        <>
          {/* Fields */}
          <div className={styles.composeFields}>
            <div className={styles.composeRow}>
              <span className={styles.composeField}>To</span>
              <EmailChipInput value={to} onChange={setTo} placeholder="Recipients" />
              <button className={styles.ccToggle} onClick={() => setShowCc(v => !v)}>Cc Bcc</button>
            </div>
            {showCc && (
              <>
                <div className={styles.composeSep} />
                <div className={styles.composeRow}>
                  <span className={styles.composeField}>Cc</span>
                  <EmailChipInput value={cc} onChange={setCc} placeholder="Carbon Copy" />
                </div>
                <div className={styles.composeSep} />
                <div className={styles.composeRow}>
                  <span className={styles.composeField}>Bcc</span>
                  <EmailChipInput value={bcc} onChange={setBcc} placeholder="Blind Carbon Copy" />
                </div>
              </>
            )}
            <div className={styles.composeSep} />
            <div className={styles.composeRow}>
              <span className={styles.composeField}>Subject</span>
              <input className={styles.composeInput} value={subject} onChange={e => setSubject(e.target.value)} placeholder="Subject" />
            </div>
            <div className={styles.composeSep} />
          </div>

          {/* Rich editor */}
          <RichEditor value={body} onChange={setBody} />

          {/* Attachments */}
          {attachments.length > 0 && (
            <div className={styles.composeAttachments}>
              {attachments.map((a, i) => (
                <span key={i} className={styles.attachChip}>
                  <Paperclip size={11} /> <span className={styles.attachName}>{a.name}</span> <span className={styles.attachSize}>({a.size})</span>
                  <button onClick={() => setAttachments(prev => prev.filter((_, j) => j !== i))}><X size={10} /></button>
                </span>
              ))}
            </div>
          )}

          {/* Footer */}
          <div className={styles.composeFooter}>
            <div className={styles.composeFrom}>
              <div className={styles.accountDotSmall} style={{ background: '#64748b' }} />
              <span>{activeAccount?.email_address}</span>
            </div>
            <div className={styles.composeActions}>
              <input ref={fileRef} type="file" multiple hidden onChange={handleAttach} />
              <button className={styles.composeToolBtn} title="Attach File" onClick={() => fileRef.current?.click()}>
                <Paperclip size={15} />
              </button>
              <Button variant="primary" icon={<Send size={14} />} onClick={handleSend}>
                Send
              </Button>
            </div>
          </div>
        </>
      )}
    </motion.div>
  );
}

/* ═══════════════════════════════════════════════════
   ACCOUNT CONFIGURATION MODAL (2-Step Validation)
   ═══════════════════════════════════════════════════ */
function AccountConfigModal({ onClose, onSave, onToast, editAccount = null }) {
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
        onSave(config);
      } else {
        setValidationError(res.error || 'Validation failed');
      }
    } catch (err) {
      setValidationError(err.message || 'Connection error. Check settings.');
    } finally {
      setIsValidating(false);
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
          {step === 1 ? (
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
                    <div className={styles.configFormGroup}><label>IMAP Host</label><input className={styles.configInput} placeholder="imap.example.com" value={config.imap_host} onChange={e => setConfig({ ...config, imap_host: e.target.value })} /></div>
                    <div className={styles.configFormGroup}><label>SMTP Host</label><input className={styles.configInput} placeholder="smtp.example.com" value={config.smtp_host} onChange={e => setConfig({ ...config, smtp_host: e.target.value })} /></div>
                  </>
                )}
              </div>

              {validationError && (
                <motion.div 
                  initial={{ opacity: 0, y: 10 }} 
                  animate={{ opacity: 1, y: 0 }} 
                  className={styles.configError}
                >
                  <AlertCircle size={16} /> 
                  <div className={styles.errorContent}>
                    <strong>Connection Failed</strong>
                    <span>{validationError}</span>
                  </div>
                </motion.div>
              )}
            </div>

          )}
        </div>

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
      </motion.div>
    </div>
  );
}


/* ═══════════════════════════════════════════════════
   ACCOUNT SWITCHER DROPDOWN
═══════════════════════════════════════════════════ */
function AccountSwitcher({ accounts, activeId, onSwitch, onAdd, onEdit, onRemove }) {
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
        <div className={styles.accountAvatar} style={{ background: active.avatarColor }}>
          {active.avatar}
        </div>
        <div className={styles.accountMeta}>
          <span className={styles.accountEmail}>{active.email_address || active.email}</span>
          <span className={styles.accountRole}>
            {PROVIDER_ICONS[active.provider]?.label || 'Set up'}
          </span>
        </div>
        <ChevronDown size={14} className={`${styles.chevronDown} ${open ? styles.chevronUp : ''}`} />
      </button>


      <AnimatePresence>
        {open && (
          <motion.div
            className={styles.accountDropdown}
            initial={{ opacity: 0, y: -8, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.97 }}
            transition={{ duration: 0.15 }}
          >
            <div className={styles.dropdownSection}>All Accounts</div>
            {accounts.map(acc => (
              <div key={acc.id} className={styles.dropdownAccountRow}>
                <button
                  className={`${styles.dropdownAccount} ${acc.id === activeId ? styles.dropdownAccountActive : ''}`}
                  onClick={() => { onSwitch(acc.id); setOpen(false); }}
                >
                  <div className={styles.accountAvatarSm} style={{ background: acc.avatarColor }}>{acc.avatar}</div>
                  <div className={styles.dropdownAccountMeta}>
                    <span className={styles.dropdownEmail}>{acc.email_address || acc.email}</span>
                    <span className={styles.dropdownRole}>
                      {PROVIDER_ICONS[acc.provider]?.label} · {acc.role || 'Active'}
                    </span>
                  </div>

                  {acc.id === activeId && <Check size={14} style={{ color: 'var(--primary)', flexShrink: 0 }} />}
                  {acc.unread > 0 && <span className={styles.miniUnreadBadge}>{acc.unread}</span>}
                </button>
                <button
                  className={styles.dropdownRemoveBtn}
                  title={`Remove ${acc.email}`}
                  onClick={(e) => { e.stopPropagation(); setOpen(false); onRemove(acc.id); }}
                >
                  <Trash2 size={13} />
                </button>
              </div>
            ))}
            <div className={styles.dropdownDivider} />
            <button className={styles.dropdownAddBtn} onClick={() => { onAdd(); setOpen(false); }}>
              <Plus size={14} /> Add another account
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/* ═══════════════════════════════════════════════════
   FILTER PANEL (Deep Filters)
═══════════════════════════════════════════════════ */
function FilterPanel({ filters, onChange, onClear, emailCount }) {
  return (
    <motion.div
      className={styles.filterPanel}
      initial={{ height: 0, opacity: 0 }}
      animate={{ height: 'auto', opacity: 1 }}
      exit={{ height: 0, opacity: 0 }}
      transition={{ duration: 0.2 }}
    >
      <div className={styles.filterGrid}>
        <div className={styles.filterGroup}>
          <label className={styles.filterLabel}>Read Status</label>
          <select
            className={styles.filterSelect}
            value={filters.readStatus}
            onChange={e => onChange({ ...filters, readStatus: e.target.value })}
          >
            <option value="">All</option>
            <option value="unread">Unread only</option>
            <option value="read">Read only</option>
          </select>
        </div>

        <div className={styles.filterGroup}>
          <label className={styles.filterLabel}>Starred</label>
          <select
            className={styles.filterSelect}
            value={filters.starred}
            onChange={e => onChange({ ...filters, starred: e.target.value })}
          >
            <option value="">All</option>
            <option value="yes">Starred only</option>
            <option value="no">Not starred</option>
          </select>
        </div>

        <div className={styles.filterGroup}>
          <label className={styles.filterLabel}>Has Attachment</label>
          <select
            className={styles.filterSelect}
            value={filters.hasAttachment}
            onChange={e => onChange({ ...filters, hasAttachment: e.target.value })}
          >
            <option value="">All</option>
            <option value="yes">With attachments</option>
            <option value="no">Without attachments</option>
          </select>
        </div>



        <div className={styles.filterGroup}>
          <label className={styles.filterLabel}>Sort By</label>
          <select
            className={styles.filterSelect}
            value={filters.sortBy}
            onChange={e => onChange({ ...filters, sortBy: e.target.value })}
          >
            <option value="newest">Newest First</option>
            <option value="oldest">Oldest First</option>
            <option value="sender">Sender A–Z</option>
          </select>
        </div>
      </div>

      <div className={styles.filterFooter}>
        <span className={styles.filterResultCount}>
          {emailCount} message{emailCount !== 1 ? 's' : ''} match filters
        </span>
        <Button variant="outline" onClick={onClear}>
          <X size={13} /> Clear Filters
        </Button>
      </div>
    </motion.div>
  );
}

/* ═══════════════════════════════════════════════════
   EMAIL VIEW PANEL
═══════════════════════════════════════════════════ */
function EmailView({ email, folder, onBack, onReply, onReplyAll, onForward, onTrash, onMarkUnread, onRecover }) {
  const [showMore, setShowMore] = useState(false);
  const isOutgoing = folder === 'sent' || folder === 'drafts';
  const isTrash = folder === 'trash';
  const senderName = isOutgoing ? (email.recipient || 'Recipients') : (email.sender?.split('<')[0]?.trim() || email.sender);
  const senderEmail = isOutgoing ? email.recipient : (email.sender?.match(/<([^>]+)>/)?.[1] || email.sender);
  const avatarLetter = (senderName || '?')[0].toUpperCase();

  const dateObj = new Date(email.received_at);
  const dateStr = dateObj.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  const timeStr = dateObj.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });

  return (
    <motion.div
      className={styles.emailView}
      key={email.id}
      initial={{ opacity: 0, x: 24 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.18 }}
    >
      {/* View Header */}
      <div className={styles.viewHeader}>
        <button className={styles.viewBackBtn} onClick={onBack}>
          <ArrowLeft size={15} />
        </button>
        <h2 className={styles.viewSubject}>{email.subject}</h2>
        <div className={styles.viewHeaderActions}>
          {!isOutgoing && (
            <>
              <button className={styles.viewActionBtn} title="Reply" onClick={() => onReply(email)}>
                <Reply size={15} />
              </button>
              <button className={styles.viewActionBtn} title="Reply All" onClick={() => onReplyAll(email)}>
                <ReplyAll size={15} />
              </button>
            </>
          )}
          <div className={styles.moreMenuWrapper}>
            <button className={`${styles.viewActionBtn} ${showMore ? styles.viewActionBtnActive : ''}`} title="More options" onClick={() => setShowMore(!showMore)}>
              <MoreHorizontal size={15} />
            </button>
            <AnimatePresence>
              {showMore && (
                <motion.div
                  className={styles.moreDropdownMenu}
                  initial={{ opacity: 0, y: -4, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ duration: 0.15 }}
                >
                  <button onClick={() => { setShowMore(false); onForward(email); }}>
                    <Forward size={14} /> Forward
                  </button>
                  {!isOutgoing && (
                    <button onClick={() => { setShowMore(false); onMarkUnread(email); }}>
                      <Mail size={14} /> Mark as unread
                    </button>
                  )}
                  {isTrash && (
                    <button onClick={() => { setShowMore(false); onRecover(email); }}>
                      <RotateCcw size={14} /> Recover
                    </button>
                  )}
                  <div className={styles.dropdownDivider} />
                  <button className={styles.dangerText} onClick={() => { setShowMore(false); onTrash(email); }}>
                    <Trash2 size={14} /> {isTrash ? 'Delete permanently' : 'Delete'}
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>

      {/* Sender meta */}
      <div className={styles.viewMeta}>
        <div 
          className={`${styles.emailAvatar} ${styles.avatarLg}`} 
          style={{ background: getAvatarColor(senderName), color: 'rgba(0,0,0,0.7)' }}
        >
          {avatarLetter}
        </div>
        <div className={styles.viewMetaInfo}>
          <div className={styles.viewSender}>
            <strong>{senderName}</strong>
            <span className={styles.viewSenderEmail}>&lt;{senderEmail}&gt;</span>
          </div>
          <div className={styles.viewDate}>{dateStr} · {timeStr}</div>
          {email.cc && <div className={styles.viewDate}>Cc: {email.cc}</div>}
        </div>
      </div>

      {/* Body */}
      <div
        className={styles.viewBody}
        dangerouslySetInnerHTML={{ __html: email.body_html || email.body_text }}
      />

      {/* Quick Reply */}
      {!isOutgoing && (
        <div className={styles.quickReplyContainer}>
          <button className={styles.quickReplyBtn} onClick={() => onReply(email)}>
            <Reply size={16} /> Reply
          </button>
          <button className={styles.quickReplyBtn} onClick={() => onReplyAll(email)}>
            <ReplyAll size={16} /> Reply All
          </button>
          <button className={styles.quickReplyBtn} onClick={() => onForward(email)}>
            <Forward size={16} /> Forward
          </button>
        </div>
      )}
    </motion.div>
  );
}

/* ═══════════════════════════════════════════════════
   MAIN EMAIL CLIENT
═══════════════════════════════════════════════════ */
const AVATAR_COLORS = [
  '#e0e7ff', '#fce7f3', '#fef3c7', '#d1fae5', 
  '#dbeafe', '#ede9fe', '#cffafe', '#fee2e2'
];

const getAvatarColor = (name) => {
  if (!name) return AVATAR_COLORS[0];
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
};

export default function EmailClient() {
  const [accounts, setAccounts] = useState([]);
  const [activeAccountId, setActiveAccountId] = useState(null);
  const [emails, setEmails] = useState([]);
  const [folder, setFolder] = useState('inbox');
  const [selectedEmail, setSelectedEmail] = useState(null);
  const [composing, setComposing] = useState(false);
  const [replyTo, setReplyTo] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [showFilter, setShowFilter] = useState(false);
  const [filters, setFilters] = useState({
    readStatus: '', starred: '', hasAttachment: '', sortBy: 'newest'
  });
  const [showConfigModal, setShowConfigModal] = useState(false);
  const [editingAccount, setEditingAccount] = useState(null);
  const [configured, setConfigured] = useState(false);
  const [toast, setToast] = useState(null);
  const [confirmRemove, setConfirmRemove] = useState(null);
  const [isSyncing, setIsSyncing] = useState(false);

  // Extraction feature
  const [extractionEnabled, setExtractionEnabled] = useState(false);
  const [showExtractionModal, setShowExtractionModal] = useState(false);

  const activeAccount = Array.isArray(accounts) 
    ? accounts.find(a => a.id === activeAccountId) || null
    : null;

  // ── API HANDLERS ──

  const fetchAccounts = async (switchToNewId = null) => {
    try {
      const data = await apiClient(`${API_BASE}/accounts/`);
      const results = Array.isArray(data) ? data : (data?.results || []);
      setAccounts(results);
      
      if (results.length > 0) {
        setConfigured(true);
        if (switchToNewId) {
          setActiveAccountId(switchToNewId);
        } else if (!activeAccountId) {
          setActiveAccountId(results[0].id);
        }
      } else {
        setConfigured(false);
        setShowConfigModal(true);
      }
    } catch (err) {
      console.error("Failed to fetch accounts", err);
    }
  };

  const fetchMessages = async () => {
    if (!activeAccountId) return;
    try {
      const data = await apiClient(`${API_BASE}/messages/?account_id=${activeAccountId}&folder=${folder}`);
      const results = Array.isArray(data) ? data : (data?.results || []);
      setEmails(results);
    } catch (err) {
      console.error("Failed to fetch messages", err);
    }
  };

  const handleSync = async (targetId = null) => {
    const id = targetId || activeAccountId;
    if (!id || isSyncing) return;
    setIsSyncing(true);
    try {
      await apiClient(`${API_BASE}/sync/${id}/`, { method: 'POST' });
      await fetchMessages();
      await fetchAccounts(); 
      setToast({ message: 'Mailbox synced successfully.', type: 'success' });
    } catch (err) {
      setToast({ message: 'Sync failed. Check connection.', type: 'error' });
    } finally {
      setIsSyncing(false);
    }
  };

  useEffect(() => {
    fetchAccounts();
  }, []);

  useEffect(() => {
    fetchMessages();
  }, [activeAccountId, folder]);

  // Apply search + filters locally on the current folder set
  const filteredEmails = (Array.isArray(emails) ? emails : []).filter(e => {
    const q = searchQuery.toLowerCase();
    const matchSearch = !q || [e.sender, e.recipient, e.subject, e.body_text].some(v => (v || '').toLowerCase().includes(q));
    const matchRead = !filters.readStatus || (filters.readStatus === 'unread' ? !e.is_read : e.is_read);
    const matchStar = !filters.starred || (filters.starred === 'yes' ? e.is_starred : !e.is_starred);
    return matchSearch && matchRead && matchStar;
  });

  const hasActiveFilters = Object.entries(filters).some(([k, v]) => k !== 'sortBy' && v !== '');

  const clearFilters = () => setFilters({ readStatus: '', starred: '', hasAttachment: '', sortBy: 'newest' });

  // Folders definition
  const FOLDERS = [
    { key: 'inbox', icon: <Inbox size={16} />, label: 'Inbox' },
    { key: 'sent', icon: <Send size={16} />, label: 'Sent' },
    { key: 'drafts', icon: <FileText size={16} />, label: 'Drafts' },
    { key: 'starred', icon: <Star size={16} />, label: 'Starred' },
    { key: 'trash', icon: <Trash2 size={16} />, label: 'Trash' },
  ];

  const toggleStar = async (emailId, e) => {
    e.stopPropagation();
    setToast({ message: 'Star feature coming soon to backend sync...', type: 'info' });
  };

  const handleOpenEmail = async (email) => {
    setSelectedEmail(email);
    if (!email.is_read) {
      try {
        await apiClient(`${API_BASE}/messages/${email.id}/`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ is_read: true })
        });
        setEmails(prev => prev.map(e => e.id === email.id ? { ...e, is_read: true } : e));
      } catch (err) {
        console.error("Failed to mark as read", err);
      }
    }
  };

  const handleSend = async (data) => {
    try {
      await apiClient(`${API_BASE}/send/${activeAccountId}/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      setToast({ message: 'Email sent successfully!', type: 'success' });
      setComposing(false);
      setReplyTo(null);
      fetchMessages();
    } catch (err) {
      setToast({ message: 'Failed to send email.', type: 'error' });
    }
  };

  const handleAddAccount = async (config) => {
    try {
      const res = await apiClient(`${API_BASE}/accounts/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config)
      });
      setShowConfigModal(false);
      await fetchAccounts(res.id);
      
      // Auto-trigger first sync
      setToast({ message: 'Account connected! Fetching your inbox...', type: 'success' });
      handleSync(res.id);
    } catch (err) {
      setToast({ message: 'Failed to add account.', type: 'error' });
    }
  };

  const handleRemoveAccount = async (id) => {
    try {
      await apiClient(`${API_BASE}/accounts/${id}/`, { method: 'DELETE' });
      setAccounts(prev => Array.isArray(prev) ? prev.filter(a => a.id !== id) : []);
      if (activeAccountId === id) {
        setActiveAccountId(prev => {
          const remaining = Array.isArray(accounts) ? accounts.filter(a => a.id !== id) : [];
          return remaining.length > 0 ? remaining[0].id : null;
        });
      }
      setConfirmRemove(null);
      setToast({ message: 'Account removed.', type: 'success' });
    } catch (err) {
      setToast({ message: 'Error removing account.', type: 'error' });
    }
  };

  const formatLastSync = (dateStr) => {
    if (!dateStr) return 'Never';
    const date = new Date(dateStr);
    return date.toLocaleString('en-US', {
      month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
    });
  };

  const handleReply = (email) => { setReplyTo(email); setComposing(true); };
  const handleReplyAll = (email) => { setReplyTo({ ...email, isReplyAll: true }); setComposing(true); };
  const handleForward = (email) => { setReplyTo({ ...email, isForward: true }); setComposing(true); };
  const handleTrash = (email) => { setToast({ message: 'Delete coming soon...', type: 'info' }); };
  const handleMarkUnread = (email) => { setToast({ message: 'Feature coming soon...', type: 'info' }); };
  const handleRecover = (email) => { setToast({ message: 'Feature coming soon...', type: 'info' }); };

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35 }}
      style={{ display: 'contents' }}
    >
      {/* Account Config Modal */}
      <AnimatePresence>
        {showConfigModal && (
          <AccountConfigModal
            onClose={() => {
              setShowConfigModal(false);
              if (!configured) {
                setToast({ message: 'Add at least one account to initiate the Communication Hub.', type: 'info' });
              }
            }}
            onSave={handleAddAccount}
            editAccount={editingAccount}
          />
        )}
      </AnimatePresence>

      {/* Compose Window */}
      <AnimatePresence>
        {composing && (
          <ComposeWindow
            onClose={() => { setComposing(false); setReplyTo(null); }}
            onSend={handleSend}
            onToast={setToast}
            activeAccount={activeAccount}
            replyTo={replyTo}
          />
        )}
      </AnimatePresence>

      {/* Toast */}
      {toast && <Toast {...toast} onClose={() => setToast(null)} />}

      {/* Remove Account Confirmation */}
      {confirmRemove && (() => {
        const acc = Array.isArray(accounts) ? accounts.find(a => a.id === confirmRemove) : null;
        return (
          <div className={styles.confirmOverlay}>
            <div className={styles.confirmBox}>
              <div className={styles.confirmIcon}><Trash2 size={22} /></div>
              <h4 className={styles.confirmTitle}>Remove Account</h4>
              <p className={styles.confirmMsg}>
                Are you sure you want to remove <strong>{acc?.email_address || acc?.email}</strong>? This cannot be undone.
              </p>
              <div className={styles.confirmActions}>
                <Button variant="outline" onClick={() => setConfirmRemove(null)}>Cancel</Button>
                <Button variant="danger" onClick={() => handleRemoveAccount(confirmRemove)}>Remove</Button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* Extraction Config Modal */}
      {showExtractionModal && (
        <div className={styles.confirmOverlay}>
          <div className={styles.extractionModalBox}>
            <div className={styles.extractionHeader}>
              <div className={styles.extractionIcon}><Database size={24} /></div>
              <h4 className={styles.confirmTitle}>
                {extractionEnabled ? 'Pause Resume Extraction?' : 'Enable Resume Extraction?'}
              </h4>
            </div>

            <div className={styles.extractionBody}>
              {extractionEnabled ? (
                <p className={styles.extractionTextMain}>Are you sure you want to pause Resume Extraction for <strong>{activeAccount?.email_address}</strong>? The automated cron parser will safely halt and resume parsing will stop immediately.</p>
              ) : (
                <>
                  <p className={styles.extractionTextMain}>Setting up <strong>{activeAccount?.email_address}</strong> for automated HR pipeline parsing.</p>

                  <ul className={styles.extractionList}>
                    <li>
                      <Zap size={15} className={styles.liIcon} />
                      <span><strong>Automated Processing:</strong> Runs reliably twice a day at 12:00 AM & 12:00 PM efficiently.</span>
                    </li>
                    <li>
                      <Server size={15} className={styles.liIcon} />
                      <span><strong>Centralized DB:</strong> Discovered resumes are seamlessly routed into the Candidate Database.</span>
                    </li>
                    <li>
                      <UserCheck size={15} className={styles.liIcon} />
                      <span><strong>Dashboard Sync:</strong> Profiles instantly populate available slots in the Recruitment Dashboard based on matched roles.</span>
                    </li>
                  </ul>
                </>
              )}
            </div>

            <div className={styles.extractionPrivacyBox}>
              <ShieldCheck size={16} className={styles.privacyIcon} />
              <div className={styles.privacyText}>
                <strong>Privacy Guaranteed</strong>
                <span>This engine strictly scans incoming application attachments. No internal email communication or personal data is collected.</span>
              </div>
            </div>

            <div className={styles.confirmActions} style={{ marginTop: '0.5rem' }}>
              <Button variant="outline" onClick={() => setShowExtractionModal(false)}>Cancel</Button>
              <Button
                variant={extractionEnabled ? "danger" : "primary"}
                onClick={() => {
                  setExtractionEnabled(!extractionEnabled);
                  setShowExtractionModal(false);
                  setToast({ message: extractionEnabled ? 'Resume extraction deactivated.' : 'Resume extraction enabled!', type: 'success' });
                }}
              >
                {extractionEnabled ? 'Pause Extraction' : 'Enable Extraction'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {configured ? (
        <div className={styles.emailShell}>
          <aside className={styles.emailSidebar}>
            <AccountSwitcher
              accounts={accounts}
              activeId={activeAccountId}
              onSwitch={id => { setActiveAccountId(id); setSelectedEmail(null); setFolder('inbox'); }}
              onAdd={() => { setEditingAccount(null); setShowConfigModal(true); }}
              onEdit={acc => { setEditingAccount(acc); setShowConfigModal(true); }}
              onRemove={id => setConfirmRemove(id)}
            />

            <Button
              variant="primary"
              icon={<Pencil size={13} />}
              className={styles.composeBtn}
              onClick={() => { setReplyTo(null); setComposing(true); }}
            >
              Compose
            </Button>

            <nav className={styles.folderNav}>
              {FOLDERS.map(f => (
                <button
                  key={f.key}
                  className={`${styles.folderItem} ${folder === f.key ? styles.folderActive : ''}`}
                  onClick={() => { setFolder(f.key); setSelectedEmail(null); }}
                >
                  <span className={styles.folderIcon}>{f.icon}</span>
                  <span className={styles.folderLabel}>{f.label}</span>
                </button>
              ))}
            </nav>

            <div className={styles.extractionToggleBtn}>
              <div className={styles.extractionToggleInfo} onClick={() => setShowExtractionModal(true)}>
                <Database size={15} />
                <span>Resume Extraction</span>
              </div>
              <button
                className={`${styles.toggleSwitch} ${extractionEnabled ? styles.toggleSwitchOn : ''}`}
                onClick={() => setShowExtractionModal(true)}
              >
                <div className={`${styles.toggleKnob}`} />
              </button>
            </div>
          </aside>

          <main className={styles.emailMain}>
            <div className={styles.mailToolbar}>
              <div className={styles.toolbarLeft}>
                <h2 className={styles.folderTitle}>
                  {FOLDERS.find(f => f.key === folder)?.label}
                  <span className={styles.folderCount}>{filteredEmails.length}</span>
                </h2>
                {activeAccount && (
                  <span className={styles.lastSyncText}>
                    Last sync: {formatLastSync(activeAccount.last_sync_at)}
                  </span>
                )}
              </div>
              <div className={styles.toolbarRight}>
                <div className={styles.searchWrap}>
                  <Search size={13} className={styles.searchIcon} />
                  <input
                    className={styles.searchInput}
                    placeholder={`Search in ${folder}...`}
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                  />
                  {searchQuery && (
                    <button className={styles.searchClear} onClick={() => setSearchQuery('')}>
                      <X size={12} />
                    </button>
                  )}
                </div>
                <button
                  className={`${styles.toolbarIconBtn} ${showFilter ? styles.toolbarIconBtnActive : ''}`}
                  title="Deep Filter"
                  onClick={() => setShowFilter(v => !v)}
                >
                  <Filter size={14} />
                  {hasActiveFilters && <span className={styles.filterDot} />}
                </button>
                <button
                  className={`${styles.toolbarIconBtn} ${isSyncing ? styles.syncSpin : ''}`}
                  title="Refresh & Sync"
                  onClick={() => handleSync()}
                  disabled={isSyncing}
                >
                  <RefreshCw size={14} />
                </button>
              </div>
            </div>

            <AnimatePresence>
              {showFilter && (
                <FilterPanel
                  filters={filters}
                  onChange={setFilters}
                  onClear={clearFilters}
                  emailCount={filteredEmails.length}
                />
              )}
            </AnimatePresence>

            <div className={styles.mailContent}>
              <div className={styles.emailList}>
                <AnimatePresence mode="popLayout">
                  {filteredEmails.length === 0 ? (
                    <motion.div key="empty" className={styles.emptyState} initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                      <div className={styles.emptyIcon}>
                        {isSyncing ? (
                          <RefreshCw size={32} className={styles.syncSpin} />
                        ) : (
                          <Inbox size={32} />
                        )}
                      </div>
                      <p className={styles.emptyTitle}>
                        {isSyncing 
                          ? 'Fetching your inbox for the first time...' 
                          : (searchQuery || hasActiveFilters ? 'No emails match search' : `No messages in ${folder}`)}
                      </p>
                      {isSyncing && <p className={styles.emptySub}>This may take a moment depending on your connection.</p>}
                    </motion.div>
                  ) : (
                    filteredEmails.map((email, idx) => {
                      const isSent = folder === 'sent' || folder === 'drafts';
                      const displayName = isSent ? `To: ${email.recipient}` : (email.sender?.split('<')[0]?.trim() || email.sender);
                      const isUnread = !email.is_read && folder === 'inbox';
                      const isSelected = selectedEmail?.id === email.id;
                      const avatarLetter = (displayName || '?')[0].toUpperCase();
                      const timeStr = new Date(email.received_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

                      return (
                        <motion.button
                          key={email.id}
                          layout
                          className={`${styles.emailItem} ${isSelected ? styles.emailItemSelected : ''} ${isUnread ? styles.emailItemUnread : ''}`}
                          initial={{ opacity: 0, y: 6 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -6 }}
                          transition={{ delay: idx * 0.03 }}
                          onClick={() => handleOpenEmail(email)}
                        >
                          <div className={styles.emailAvatar} style={{ background: getAvatarColor(displayName) }}>{avatarLetter}</div>
                          <div className={styles.emailItemContent}>
                            <div className={styles.emailItemTop}>
                              <span className={styles.emailItemSender}>{displayName}</span>
                              <span className={styles.emailItemTime}>{timeStr}</span>
                            </div>
                            <div className={styles.emailItemSubject}>{email.subject}</div>
                            <div className={styles.emailItemPreview}>{email.body_text?.slice(0, 100)}</div>
                          </div>
                          <div className={styles.emailItemSide}>
                            <button className={`${styles.starBtn} ${email.is_starred ? styles.starActive : ''}`} onClick={e => toggleStar(email.id, e)}>
                              <Star size={13} />
                            </button>
                            {isUnread && <div className={styles.unreadDot} />}
                          </div>
                        </motion.button>
                      );
                    })
                  )}
                </AnimatePresence>
              </div>

              <AnimatePresence mode="wait">
                {selectedEmail ? (
                  <div className={styles.readingPane}>
                    <EmailView
                      key={selectedEmail.id}
                      email={selectedEmail}
                      folder={folder}
                      onBack={() => setSelectedEmail(null)}
                      onReply={handleReply}
                      onReplyAll={handleReplyAll}
                      onForward={handleForward}
                      onTrash={handleTrash}
                      onMarkUnread={handleMarkUnread}
                      onRecover={handleRecover}
                    />
                  </div>
                ) : (
                  <motion.div key="placeholder" className={styles.readingPanePlaceholder} initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                    <div className={styles.placeholderIcon}><Mail size={36} /></div>
                    <p>Select a message to read</p>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </main>
        </div>
      ) : (
        <div className={styles.onboardingContainer}>
          <motion.div 
            className={styles.onboardingCard}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
          >
            <div className={styles.onboardingIllustration}>
              <Mail size={48} color="var(--primary)" />
            </div>
            <h2 className={styles.onboardingTitle}>Welcome to Communication Hub</h2>
            <p className={styles.onboardingText}>
              Connect your email account to start managing your inbox, sync applications, and automate resume extraction.
            </p>
            <div className={styles.onboardingActions}>
              <Button 
                variant="primary" 
                size="lg" 
                onClick={() => setShowConfigModal(true)}
                icon={<Plus size={18} />}
              >
                Connect Your First Account
              </Button>
            </div>
            <div className={styles.onboardingFooter}>
              <ShieldCheck size={14} />
              <span>Secure IMAP/SMTP Connection Support</span>
            </div>
          </motion.div>
        </div>
      )}
    </motion.div>
  );
}

