import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import DOMPurify from 'dompurify';
import { Send, Trash2, Pencil, Reply, Paperclip, X, Bold, Italic, Underline, Link2, AlignLeft, AlignCenter, AlignRight, List, ListOrdered, Strikethrough, RotateCcw, RotateCw, MinusSquare, Maximize2, Loader2 } from 'lucide-react';
import Button from '../../components/common/Button/Button';
import styles from './EmailClient.module.css';

function RichEditor({ value, onChange, placeholder = 'Write your message here...' }) {
  const editorRef = useRef(null);

  useEffect(() => {
    if (editorRef.current && value && !editorRef.current.innerHTML) {
      editorRef.current.innerHTML = DOMPurify.sanitize(value, {
        ALLOWED_TAGS: ['p', 'div', 'br', 'b', 'strong', 'i', 'em', 'u', 's', 'strike', 'ul', 'ol', 'li', 'a', 'blockquote'],
        ALLOWED_ATTR: ['href', 'align'],
      });
    }
  }, [value]);

  const exec = (cmd, val = null) => {
    editorRef.current?.focus();
    document.execCommand(cmd, false, val);
  };

  const handleInput = () => {
    onChange(editorRef.current?.innerHTML || '');
  };

  const handleLink = () => {
    const url = window.prompt('Enter URL:', 'https://');
    if (/^https?:\/\//i.test(url || '')) exec('createLink', url);
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
        onPaste={event => {
          event.preventDefault();
          exec('insertText', event.clipboardData.getData('text/plain'));
          handleInput();
        }}
        onDrop={event => event.preventDefault()}
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
export default function ComposeWindow({ onClose, onSend, onSaveDraft, onToast, activeAccount, replyTo = null }) {
  const initialTo = replyTo?.isDraft ? (replyTo.recipient ? replyTo.recipient.split(',').map(e => e.trim()) : []) :
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
  const [body, setBody] = useState(replyTo?.isDraft ? (replyTo.body_html || replyTo.body_text || '') : '');
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

  const [lastSaved, setLastSaved] = useState(null);
  const [isSaving, setIsSaving] = useState(false);
  const lastContent = useRef({ to, cc, bcc, subject, body });

  useEffect(() => {
    lastContent.current = { to, cc, bcc, subject, body };
  }, [to, cc, bcc, subject, body]);

  useEffect(() => {
    const timer = setInterval(() => {
      const current = { to, cc, bcc, subject, body };
      const hasChanged = JSON.stringify(current) !== JSON.stringify(lastContent.current);

      if (hasChanged || (replyTo?.isDraft && !lastSaved)) {
        handleDraftAuto();
      }
    }, 30000);
    return () => clearInterval(timer);
  }, [to, cc, bcc, subject, body]);

  const handleDraftAuto = async () => {
    setIsSaving(true);
    await onSaveDraft({
      to: to.join(', '),
      cc: cc.join(', '),
      bcc: bcc.join(', '),
      subject, body,
      is_draft: true,
      draft_id: replyTo?.id || null
    }, true);
    setLastSaved(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
    setIsSaving(false);
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
      attachments: attachments.map(a => a.file), // Pass the actual File objects
      draft_id: replyTo?.id || null
    });
    onClose();
  };

  const handleDraft = () => {
    onSaveDraft({
      to: to.join(', '),
      cc: cc.join(', '),
      bcc: bcc.join(', '),
      subject, body,
      is_draft: true,
      draft_id: replyTo?.id || null
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
          <Pencil size={14} color="#ffffff" />
          <span style={{ color: '#ffffff' }}>
            {replyTo?.isDraft ? `Draft — ${replyTo.subject || '(No Subject)'}` :
              replyTo ? `Reply — ${replyTo.subject}` : 'New Message'}
          </span>
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
              {lastSaved && <span className={styles.draftStatus}> • Saved at {lastSaved}</span>}
              {isSaving && <Loader2 size={12} className={styles.spinning} />}
            </div>
            <div className={styles.composeActions}>
              <input ref={fileRef} type="file" multiple hidden onChange={handleAttach} />
              <button className={styles.composeToolBtn} title="Attach File" onClick={() => fileRef.current?.click()}>
                <Paperclip size={15} />
              </button>
              <Button variant="outline" onClick={handleDraft} style={{ marginRight: '0.5rem' }}>
                Save Draft
              </Button>
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
