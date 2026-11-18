import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Mail, Send, FileText, Trash2, Star, Search, Inbox, RefreshCw, Pencil, ChevronRight, ChevronLeft, X, Check, Plus, Filter, ShieldCheck, Database, Zap, Server, UserCheck } from 'lucide-react';
import { apiClient } from '../../api/apiClient';
import Button from '../../components/common/Button/Button';
import Toast from '../../components/common/Toast/Toast';
import styles from './EmailClient.module.css';
import ComposeWindow from './ComposeWindow';
import { AccountConfigModal, AccountSwitcher } from './MailboxAccounts';
import FilterPanel from './FilterPanel';
import EmailView from './EmailView';
import { API_BASE, getAvatarColor, stripHtml } from './mailUtils';

const PAGE_SIZE = 50;
const defaultFilters = { readStatus: '', starred: '', hasAttachment: '', sortBy: 'newest' };

function compareMessages(first, second, sortBy) {
  if (sortBy === 'sender') return (first.sender || '').localeCompare(second.sender || '');
  const dateDifference = Date.parse(first.received_at) - Date.parse(second.received_at);
  return sortBy === 'oldest' ? dateDifference : -dateDifference;
}

export default function EmailClient() {
  const [accounts, setAccounts] = useState([]);
  const [activeAccountId, setActiveAccountId] = useState(null);
  const [emails, setEmails] = useState([]);
  const [folder, setFolder] = useState('inbox');
  const [selectedEmail, setSelectedEmail] = useState(null);
  const [composing, setComposing] = useState(false);
  const [replyTo, setReplyTo] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [showFilter, setShowFilter] = useState(false);
  const [filters, setFilters] = useState(defaultFilters);
  const [showConfigModal, setShowConfigModal] = useState(false);
  const [editingAccount, setEditingAccount] = useState(null);
  const [configured, setConfigured] = useState(false);
  const [toast, setToast] = useState(null);
  const [confirmRemove, setConfirmRemove] = useState(null);
  const [isSyncing, setIsSyncing] = useState(false);

  // Extraction feature
  const [extractionEnabled, setExtractionEnabled] = useState(false);
  const [isUpdatingExtraction, setIsUpdatingExtraction] = useState(false);
  const [showExtractionModal, setShowExtractionModal] = useState(false);

  const activeAccount = Array.isArray(accounts)
    ? accounts.find(a => a.id === activeAccountId) || null
    : null;

  // Sync extraction state with active account
  useEffect(() => {
    if (activeAccount) {
      setExtractionEnabled(!!activeAccount.is_etl_enabled);
    }
  }, [activeAccount?.id, activeAccount?.is_etl_enabled]);

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
      setToast({ message: 'Mailbox sync queued.', type: 'success' });
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
    // Poll for account status if any account is syncing
    const anySyncing = accounts.some(acc => acc.sync_status === 'syncing');
    if (anySyncing) {
      const timer = setInterval(() => {
        fetchAccounts();
        fetchMessages();
      }, 5000);
      return () => clearInterval(timer);
    }
  }, [accounts, activeAccountId, folder]);

  useEffect(() => {
    fetchMessages();
  }, [activeAccountId, folder]);

  // Apply search + filters locally on the current folder set
  const q = searchQuery.trim().toLowerCase();
  const filteredEmails = (Array.isArray(emails) ? emails : []).filter(e => {
    const matchSearch = !q || [e.sender, e.recipient, e.subject, e.body_text].some(v => (v || '').toLowerCase().includes(q));
    const matchRead = !filters.readStatus || (filters.readStatus === 'unread' ? !e.is_read : e.is_read);
    const matchStar = !filters.starred || (filters.starred === 'yes' ? e.is_starred : !e.is_starred);
    const hasAttachments = Boolean(e.attachments?.length);
    const matchAttachment = !filters.hasAttachment || (filters.hasAttachment === 'yes') === hasAttachments;
    return matchSearch && matchRead && matchStar && matchAttachment;
  }).sort((first, second) => compareMessages(first, second, filters.sortBy));

  const totalPages = Math.ceil(filteredEmails.length / PAGE_SIZE);
  const paginatedEmails = filteredEmails.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  const hasActiveFilters = Object.entries(filters).some(([k, v]) => v !== defaultFilters[k]);

  useEffect(() => { setCurrentPage(1); }, [searchQuery, filters]);

  const clearFilters = () => setFilters(defaultFilters);

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
    try {
      const res = await apiClient(`${API_BASE}/messages/${emailId}/star/`, { method: 'POST' });
      if (res.success) {
        setEmails(prev => prev.map(e => e.id === emailId ? { ...e, is_starred: res.is_starred } : e));
        if (selectedEmail?.id === emailId) {
          setSelectedEmail(prev => ({ ...prev, is_starred: res.is_starred }));
        }
      }
    } catch (err) {
      setToast({ message: 'Failed to star/unstar message.', type: 'error' });
    }
  };

  const handleOpenEmail = async (email) => {
    if (email.folder === 'drafts') {
      setReplyTo({
        ...email,
        isDraft: true,
        to: email.recipient,
        body: email.body_html || email.body_text
      });
      setComposing(true);
      return;
    }

    setSelectedEmail(email);
    // Only mark as read if it's in the inbox and currently unread
    if (!email.is_read && email.folder === 'inbox') {
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
      const formData = new FormData();
      formData.append('to', data.to);
      formData.append('cc', data.cc);
      formData.append('bcc', data.bcc);
      formData.append('subject', data.subject);
      formData.append('body', data.body);
      if (data.draft_id) formData.append('draft_id', data.draft_id);

      if (data.attachments && data.attachments.length > 0) {
        data.attachments.forEach(file => {
          formData.append('attachments', file);
        });
      }

      await apiClient(`${API_BASE}/send/${activeAccountId}/`, {
        method: 'POST',
        // Note: Don't set Content-Type header when using FormData; the browser will set it with the correct boundary
        body: formData
      });
      // If we were sending a draft, delete the draft first
      if (data.draft_id) {
        await apiClient(`${API_BASE}/messages/${data.draft_id}/`, { method: 'DELETE' });
      }
      setToast({ message: 'Email sent successfully!', type: 'success' });
      setComposing(false);
      setReplyTo(null);
      fetchMessages();
    } catch (err) {
      setToast({ message: 'Failed to send email.', type: 'error' });
    }
  };

  const handleSaveDraft = async (data, silent = false) => {
    try {
      const method = data.draft_id ? 'PATCH' : 'POST';
      const endpoint = data.draft_id ? `${API_BASE}/messages/${data.draft_id}/` : `${API_BASE}/messages/`;

      await apiClient(endpoint, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          account: activeAccountId,
          sender: activeAccount?.email_address,
          subject: data.subject || '(No Subject)',
          recipient: data.to,
          cc: data.cc,
          bcc: data.bcc,
          body_text: stripHtml(data.body),
          body_html: data.body,
          folder: 'drafts',
          received_at: new Date().toISOString(),
          uid: `draft_${Date.now()}`
        })
      });
      if (!silent) setToast({ message: 'Draft saved.', type: 'success' });
      fetchMessages();
    } catch (err) {
      if (!silent) setToast({ message: 'Failed to save draft.', type: 'error' });
    }
  };

  const handleAddAccount = async (config) => {
    try {
      const res = await apiClient(`${API_BASE}/accounts/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config)
      });

      await fetchAccounts(res.id);

      setShowConfigModal(false);
      setToast({ message: 'Account connected! Welcome to your new inbox.', type: 'success' });
    } catch (err) {
      setToast({ message: 'Failed to add account.', type: 'error' });
      throw err; // Re-throw to let modal know it failed
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

  const handleTrash = async (email) => {
    try {
      if (folder === 'trash') {
        await apiClient(`${API_BASE}/messages/${email.id}/`, { method: 'DELETE' });
        setToast({ message: 'Message deleted permanently.', type: 'success' });
      } else {
        await apiClient(`${API_BASE}/messages/${email.id}/`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ folder: 'trash', is_starred: false })
        });
        setToast({ message: 'Moved to Trash.', type: 'success' });
      }
      setSelectedEmail(null);
      fetchMessages();
    } catch (err) {
      setToast({ message: 'Failed to remove message.', type: 'error' });
    }
  };

  const handleMarkUnread = async (email) => {
    try {
      await apiClient(`${API_BASE}/messages/${email.id}/`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_read: false })
      });
      setEmails(prev => prev.map(e => e.id === email.id ? { ...e, is_read: false } : e));
      setSelectedEmail(null);
      fetchMessages();
      setToast({ message: 'Marked as unread.', type: 'success' });
    } catch (err) {
      setToast({ message: 'Failed to mark as unread.', type: 'error' });
    }
  };

  const handleRecover = async (email) => {
    try {
      await apiClient(`${API_BASE}/messages/${email.id}/`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ folder: 'inbox' })
      });
      setSelectedEmail(null);
      fetchMessages();
      setToast({ message: 'Recovered to Inbox.', type: 'success' });
    } catch (err) {
      setToast({ message: 'Failed to recover.', type: 'error' });
    }
  };

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
            onSaveDraft={handleSaveDraft}
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
                loading={isUpdatingExtraction}
                onClick={async () => {
                  if (!activeAccountId) return;
                  setIsUpdatingExtraction(true);
                  try {
                    const newValue = !extractionEnabled;
                    await apiClient(`${API_BASE}/accounts/${activeAccountId}/`, {
                      method: 'PATCH',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ is_etl_enabled: newValue })
                    });

                    setExtractionEnabled(newValue);
                    // Update local accounts state to keep it in sync
                    setAccounts(prev => prev.map(acc =>
                      acc.id === activeAccountId ? { ...acc, is_etl_enabled: newValue } : acc
                    ));

                    setShowExtractionModal(false);
                    setToast({
                      message: newValue ? 'Resume extraction enabled!' : 'Resume extraction deactivated.',
                      type: 'success'
                    });
                  } catch (err) {
                    setToast({ message: 'Failed to update extraction settings.', type: 'error' });
                  } finally {
                    setIsUpdatingExtraction(false);
                  }
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
              onSwitch={id => {
                setActiveAccountId(id);
                setSelectedEmail(null);
                setFolder('inbox');
                setCurrentPage(1);
              }}
              onAdd={() => { setEditingAccount(null); setShowConfigModal(true); }}
              onEdit={acc => { setEditingAccount(acc); setShowConfigModal(true); }}
              onRemove={id => setConfirmRemove(id)}
            />

            <div className={styles.sidebarContent}>
              <Button
                variant="primary"
                icon={<Pencil size={13} />}
                className={styles.composeBtn}
                onClick={() => { setReplyTo(null); setComposing(true); }}
              >
                Compose
              </Button>

              <nav className={styles.folderNav} aria-label="Mail folders">
                {FOLDERS.map(f => (
                  <button
                    key={f.key} aria-current={folder === f.key ? 'page' : undefined}
                    className={`${styles.folderItem} ${folder === f.key ? styles.folderActive : ''}`}
                    onClick={() => { setFolder(f.key); setSelectedEmail(null); setCurrentPage(1); }}
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
                  <div className={styles.syncMetaInfo}>
                    <span className={styles.lastSyncText}>
                      Last sync: {formatLastSync(activeAccount.last_sync_at)}
                    </span>
                    {activeAccount.sync_status === 'syncing' && (
                      <span className={styles.backgroundSyncBadge}>
                        <RefreshCw size={10} className={styles.spinning} />
                        Syncing Historical Emails...
                      </span>
                    )}
                  </div>
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
                    <button className={styles.searchClear} aria-label="Clear mail search" onClick={() => setSearchQuery('')}>
                      <X size={12} />
                    </button>
                  )}
                </div>
                <button
                  className={`${styles.toolbarIconBtn} ${showFilter ? styles.toolbarIconBtnActive : ''}`}
                  title="Filters" aria-label="Filter messages" aria-expanded={showFilter}
                  onClick={() => setShowFilter(v => !v)}
                >
                  <Filter size={14} />
                  {hasActiveFilters && <span className={styles.filterDot} />}
                </button>
                <button
                  className={styles.toolbarIconBtn}
                  title={activeAccount?.sync_status === 'syncing' ? "Sync in progress" : "Refresh & Sync"}
                  onClick={() => handleSync()}
                  disabled={isSyncing || activeAccount?.sync_status === 'syncing'}
                  style={{ opacity: (isSyncing || activeAccount?.sync_status === 'syncing') ? 0.5 : 1 }}
                >
                  <RefreshCw size={14} className={(isSyncing || activeAccount?.sync_status === 'syncing') ? styles.spinning : ''} />
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
                    paginatedEmails.map((email, idx) => {
                      const isSent = folder === 'sent' || folder === 'drafts';
                      const displayName = isSent ? `To: ${email.recipient}` : (email.sender?.split('<')[0]?.trim() || email.sender);
                      const isUnread = !email.is_read && folder === 'inbox';
                      const isSelected = selectedEmail?.id === email.id;
                      const avatarLetter = (displayName || '?')[0].toUpperCase();
                      const timeStr = new Date(email.received_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

                      return (
                        <motion.div
                          key={email.id}
                          layout
                          className={`${styles.emailItem} ${isSelected ? styles.emailItemSelected : ''} ${isUnread ? styles.emailItemUnread : ''}`}
                          initial={{ opacity: 0, y: 6 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -6 }}
                          transition={{ delay: idx * 0.03 }}

                        >
                          <div className={styles.emailAvatar} style={{ background: getAvatarColor(displayName) }}>{avatarLetter}</div>
                          <button type="button" className={styles.emailItemContent} onClick={() => handleOpenEmail(email)}>
                            <div className={styles.emailItemTop}>
                              <span className={styles.emailItemSender}>{displayName}</span>
                              <span className={styles.emailItemTime}>{timeStr}</span>
                            </div>
                            <div className={styles.emailItemSubject}>{email.subject}</div>
                            <div className={styles.emailItemPreview}>
                              {stripHtml(email.body_text || email.body_html).slice(0, 100)}
                            </div>
                          </button>
                          <div className={styles.emailItemSide}>
                            {folder !== 'trash' && (
                              <button type="button" aria-label={email.is_starred ? 'Unstar message' : 'Star message'} aria-pressed={email.is_starred} className={`${styles.starBtn} ${email.is_starred ? styles.starActive : ''}`} onClick={e => toggleStar(email.id, e)}>
                                <Star size={13} fill={email.is_starred ? "currentColor" : "none"} />
                              </button>
                            )}
                            {isUnread && <div className={styles.unreadDot} />}
                          </div>
                        </motion.div>
                      );
                    })
                  )}
                </AnimatePresence>

                {totalPages > 1 && (
                  <div className={styles.pagination}>
                    <button
                      className={styles.paginationBtn}
                      disabled={currentPage === 1}
                      onClick={() => setCurrentPage(prev => prev - 1)}
                    >
                      <ChevronLeft size={16} />
                    </button>
                    <span className={styles.pageInfo}>
                      {currentPage} / {totalPages}
                    </span>
                    <button
                      className={styles.paginationBtn}
                      disabled={currentPage === totalPages}
                      onClick={() => setCurrentPage(prev => prev + 1)}
                    >
                      <ChevronRight size={16} />
                    </button>
                  </div>
                )}
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
