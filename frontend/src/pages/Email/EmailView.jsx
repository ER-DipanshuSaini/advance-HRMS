import { usePopover } from '../../hooks/usePopover';
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import DOMPurify from 'dompurify';
import { Mail, FileText, Trash2, Reply, ReplyAll, Forward, MoreHorizontal, Paperclip, ArrowLeft, ExternalLink, RotateCcw } from 'lucide-react';
import { apiClient } from '../../api/apiClient';
import styles from './EmailClient.module.css';
import { API_BASE, getAvatarColor } from './mailUtils';

export default function EmailView({ email, folder, onBack, onReply, onReplyAll, onForward, onTrash, onMarkUnread, onRecover }) {
  const [downloadError, setDownloadError] = useState('');

  async function downloadAttachment(attachment) {
    setDownloadError('');
    try {
      const blob = await apiClient(`${API_BASE}/attachment/${attachment.id}/`, { responseType: 'blob' });
      if (!blob) return;
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = attachment.file_name;
      link.click();
      setTimeout(() => URL.revokeObjectURL(url), 10000);
    } catch (error) {
      setDownloadError(error.message);
    }
  }

  const { isOpen: showMore, containerRef, panelId, close, trigger } = usePopover();
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
          <div className={styles.moreMenuWrapper} ref={containerRef}>
            <button className={`${styles.viewActionBtn} ${showMore ? styles.viewActionBtnActive : ''}`} aria-label="More options" {...trigger}>
              <MoreHorizontal size={15} />
            </button>
            <AnimatePresence>
              {showMore && (
                <motion.div
                  id={panelId} className={styles.moreDropdownMenu}
                  initial={{ opacity: 0, y: -4, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ duration: 0.15 }}
                >
                  <button onClick={() => { close(); onForward(email); }}>
                    <Forward size={14} /> Forward
                  </button>
                  {!isOutgoing && (
                    <button onClick={() => { close(); onMarkUnread(email); }}>
                      <Mail size={14} /> Mark as unread
                    </button>
                  )}
                  {isTrash && (
                    <button onClick={() => { close(); onRecover(email); }}>
                      <RotateCcw size={14} /> Recover
                    </button>
                  )}
                  <div className={styles.dropdownDivider} />
                  <button className={styles.dangerText} onClick={() => { close(); onTrash(email); }}>
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
      {email.body_html ? (
        <iframe
          title="Email body"
          className={styles.viewBody}
          sandbox=""
          referrerPolicy="no-referrer"
          style={{ width: '100%', minHeight: 360, border: 0 }}
          srcDoc={`<meta http-equiv="Content-Security-Policy" content="default-src 'none'; img-src data:; style-src 'unsafe-inline'; base-uri 'none'; form-action 'none'">${DOMPurify.sanitize(email.body_html, {
            USE_PROFILES: { html: true },
            FORBID_TAGS: ['form', 'iframe'],
            FORBID_ATTR: ['srcset'],
          })}`}
        />
      ) : (
        <div className={styles.viewBody} style={{ whiteSpace: 'pre-wrap' }}>{email.body_text}</div>
      )}

      {downloadError && <p role="alert">{downloadError}</p>}
      {/* Attachments Section */}
      {email.attachments && email.attachments.length > 0 && (
        <div className={styles.viewAttachments}>
          <div className={styles.attachTitle}>
            <Paperclip size={14} /> Attachments ({email.attachments.length})
          </div>
          <div className={styles.attachGrid}>
            {email.attachments.map(att => (
              <button type="button"
                key={att.id}
                onClick={() => downloadAttachment(att)}
                className={styles.viewAttachCard}
                title={`Download ${att.file_name}`}
              >
                <div className={styles.attachIcon}><FileText size={18} /></div>
                <div className={styles.attachMeta}>
                  <div className={styles.attachName}>{att.file_name}</div>
                  <div className={styles.attachSize}>{(att.file_size / 1024).toFixed(1)} KB</div>
                </div>
                <span className={styles.attachDownloadBtn}><ExternalLink size={14} /></span></button>
            ))}
          </div>
        </div>
      )}

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
