import React, { useState, useEffect } from 'react';
import { Mail, Search, RefreshCw, Star, Trash2, Archive, Inbox, Send, FileText, AlertCircle, CheckCircle, Clock, Download, User, Plus, Filter, MoreVertical, MailOpen, X, Reply, Send as SendIcon } from 'lucide-react';
import axios from 'axios';
import { format } from 'date-fns';
import styles from './EmailManager.module.css';

interface Email {
  _id: string;
  subject: string;
  from: {
    email: string;
    name: string;
  };
  to: Array<{
    email: string;
    name: string;
  }>;
  body: string;
  htmlBody: string;
  receivedAt: string;
  isRead: boolean;
  isStarred: boolean;
  isImportant: boolean;
  folder: string;
  autoCategory: string;
  hasAttachments: boolean;
  attachmentCount: number;
  spamScore: number;
  isSpam: boolean;
  priority: number;
  tags: string[];
  senderAccountId: string; // Added for reply functionality
}

interface Sender {
  _id: string;
  email: string;
  name?: string;
  isActive: boolean;
  imapHost?: string;
  imapPort?: number;
  imapSecure?: boolean;
  unreadCount?: number;
  totalEmails?: number;
}

interface EmailManagerProps {
  senderId?: string;
  onNavigateToSenders?: () => void;
}

const EmailManager: React.FC<EmailManagerProps> = ({ senderId: initialSenderId, onNavigateToSenders }) => {
  const [senders, setSenders] = useState<Sender[]>([]);
  const [selectedSenderId, setSelectedSenderId] = useState<string>(initialSenderId || '');
  const [emails, setEmails] = useState<Email[]>([]);
  const [selectedEmails, setSelectedEmails] = useState<string[]>([]);
  const [currentEmail, setCurrentEmail] = useState<Email | null>(null);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [currentFolder, setCurrentFolder] = useState('INBOX');
  const [filterCategory, setFilterCategory] = useState('');
  const [showUnreadOnly, setShowUnreadOnly] = useState(false);
  const [sortBy, setSortBy] = useState('receivedAt');
  const [sortOrder, setSortOrder] = useState('desc');
  const [stats, setStats] = useState<any>(null);
  const [showFilters, setShowFilters] = useState(false);
  const [selectedEmail, setSelectedEmail] = useState<Email | null>(null);
  const [showReplyForm, setShowReplyForm] = useState(false);
  const [replyData, setReplyData] = useState({
    to: '',
    subject: '',
    body: ''
  });
  const [sendingReply, setSendingReply] = useState(false);

  // Fetch senders
  const fetchSenders = async () => {
    try {
      const response = await axios.get('http://localhost:5000/api/senders');
      // Đảm bảo luôn là mảng
      setSenders(Array.isArray(response.data) ? response.data : (response.data.data || []));
      if ((Array.isArray(response.data) ? response.data : (response.data.data || [])).length > 0 && !selectedSenderId) {
        setSelectedSenderId((Array.isArray(response.data) ? response.data : (response.data.data || []))[0]._id);
      }
    } catch (error) {
      console.error('Error fetching senders:', error);
    }
  };

  // Fetch emails
  const fetchEmails = async () => {
    if (!selectedSenderId) return;
    
    setLoading(true);
    try {
      const params = new URLSearchParams({
        folder: currentFolder,
        page: '1',
        limit: '50',
        sortBy,
        sortOrder,
        ...(searchQuery && { search: searchQuery }),
        ...(filterCategory && { category: filterCategory }),
        ...(showUnreadOnly && { isRead: 'false' })
      });

      const response = await axios.get(`http://localhost:5000/api/emails/${selectedSenderId}?${params}`);
      console.log('Email response:', response.data);
      const emailsData = response.data.data || [];
      console.log('Emails data:', emailsData);
      setEmails(emailsData);
    } catch (error) {
      console.error('Error fetching emails:', error);
    } finally {
      setLoading(false);
    }
  };

  // Fetch stats
  const fetchStats = async () => {
    if (!selectedSenderId) return;
    
    try {
      const response = await axios.get(`http://localhost:5000/api/emails/${selectedSenderId}/stats`);
      setStats(response.data.data || {});
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  // Fetch emails from IMAP server
  const fetchFromServer = async () => {
    if (!selectedSenderId) return;
    
    setLoading(true);
    try {
      await axios.post(`http://localhost:5000/api/emails/${selectedSenderId}/fetch`, {
        folder: currentFolder,
        limit: 50
      });
      await fetchEmails();
    } catch (error) {
      console.error('Error fetching from server:', error);
    } finally {
      setLoading(false);
    }
  };

  // Mark email as read/unread
  const toggleRead = async (emailId: string, isRead: boolean) => {
    try {
      await axios.put(`http://localhost:5000/api/emails/${emailId}/read`, { isRead });
      setEmails(emails.map(email => 
        email._id === emailId ? { ...email, isRead } : email
      ));
    } catch (error) {
      console.error('Error toggling read status:', error);
    }
  };

  // Move email to folder
  const moveToFolder = async (emailId: string, folder: string) => {
    try {
      await axios.put(`http://localhost:5000/api/emails/${emailId}/move`, { folder });
      await fetchEmails();
    } catch (error) {
      console.error('Error moving email:', error);
    }
  };

  // Delete email
  const deleteEmail = async (emailId: string) => {
    try {
      await axios.delete(`http://localhost:5000/api/emails/${emailId}`);
      await fetchEmails();
    } catch (error) {
      console.error('Error deleting email:', error);
    }
  };

  // Bulk operations
  const bulkOperation = async (operation: string, folder?: string) => {
    if (selectedEmails.length === 0 || !selectedSenderId) return;

    try {
      await axios.post(`http://localhost:5000/api/emails/${selectedSenderId}/bulk`, {
        operation,
        emailIds: selectedEmails,
        ...(folder && { folder })
      });
      setSelectedEmails([]);
      await fetchEmails();
    } catch (error) {
      console.error('Error performing bulk operation:', error);
    }
  };

  // Toggle email selection
  const toggleEmailSelection = (emailId: string) => {
    setSelectedEmails(prev => 
      prev.includes(emailId) 
        ? prev.filter(id => id !== emailId)
        : [...prev, emailId]
    );
  };

  // Select all emails
  const selectAllEmails = () => {
    setSelectedEmails((emails || []).map(email => email._id));
  };

  // Clear selection
  const clearSelection = () => {
    setSelectedEmails([]);
  };

  // Handle email click to view details
  const handleEmailClick = (email: Email) => {
    setSelectedEmail(email);
  };

  // Close email detail
  const closeEmailDetail = () => {
    setSelectedEmail(null);
    setShowReplyForm(false);
  };

  // Handle reply to email
  const handleReply = () => {
    if (!selectedEmail) return;
    
    setReplyData({
      to: selectedEmail.from?.email || '',
      subject: `Re: ${selectedEmail.subject || '(No subject)'}`,
      body: `\n\n--- Original Message ---\nFrom: ${selectedEmail.from?.name || selectedEmail.from?.email || 'Unknown'}\nDate: ${new Date(selectedEmail.receivedAt).toLocaleString()}\nSubject: ${selectedEmail.subject || '(No subject)'}\n\n${selectedEmail.body || selectedEmail.htmlBody || ''}`
    });
    setShowReplyForm(true);
  };

  // Send reply
  const sendReply = async () => {
    if (!selectedEmail || !replyData.to || !replyData.subject || !replyData.body) {
      alert('Please fill in all required fields');
      return;
    }

    setSendingReply(true);
    try {
      // Find the sender account for this email
      const senderAccount = senders.find(sender => sender._id === selectedEmail.senderAccountId);
      if (!senderAccount) {
        throw new Error('Sender account not found');
      }

      const response = await axios.post(`http://localhost:5000/api/emails/send`, {
        senderId: senderAccount._id,
        to: replyData.to,
        subject: replyData.subject,
        body: replyData.body,
        isReply: true,
        originalEmailId: selectedEmail._id
      });

      if (response.data.success) {
        alert('Reply sent successfully!');
        setShowReplyForm(false);
        setReplyData({ to: '', subject: '', body: '' });
        // Optionally refresh emails or mark as replied
      } else {
        throw new Error(response.data.message || 'Failed to send reply');
      }
    } catch (error) {
      console.error('Error sending reply:', error);
      alert(`Failed to send reply: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setSendingReply(false);
    }
  };

  // Cancel reply
  const cancelReply = () => {
    setShowReplyForm(false);
    setReplyData({ to: '', subject: '', body: '' });
  };

  useEffect(() => {
    fetchSenders();
  }, []);

  useEffect(() => {
    if (selectedSenderId) {
      fetchEmails();
      fetchStats();
    }
  }, [selectedSenderId, currentFolder, searchQuery, filterCategory, showUnreadOnly, sortBy, sortOrder]);

  const folders = [
    { id: 'INBOX', name: 'Inbox', icon: Inbox, count: stats?.INBOX?.count || 0, unread: stats?.INBOX?.unreadCount || 0 },
    { id: 'SENT', name: 'Sent', icon: Send, count: stats?.SENT?.count || 0, unread: 0 },
    { id: 'DRAFTS', name: 'Drafts', icon: FileText, count: stats?.DRAFTS?.count || 0, unread: 0 },
    { id: 'ARCHIVE', name: 'Archive', icon: Archive, count: stats?.ARCHIVE?.count || 0, unread: 0 },
    { id: 'TRASH', name: 'Trash', icon: Trash2, count: stats?.TRASH?.count || 0, unread: 0 },
    { id: 'SPAM', name: 'Spam', icon: AlertCircle, count: stats?.SPAM?.count || 0, unread: 0 }
  ];

  const categories = [
    { id: '', name: 'All Categories' },
    { id: 'marketing', name: 'Marketing' },
    { id: 'support', name: 'Support' },
    { id: 'sales', name: 'Sales' },
    { id: 'personal', name: 'Personal' },
    { id: 'spam', name: 'Spam' },
    { id: 'other', name: 'Other' }
  ];

  // If no sender is selected, show sender selection
  if (!selectedSenderId) {
    return (
      <div className={styles.emailManager}>
        <div className={styles.senderSelection}>
          <div className={styles.senderSelectionContent}>
            <User className={styles.senderSelectionIcon} />
            <h2>Select Email Account</h2>
            <p>Choose an email account to manage your inbox</p>
            
            {senders.length === 0 ? (
              <div className={styles.noSenders}>
                <p>No email accounts found. Please add an account first.</p>
                <button 
                  className={`${styles.btn} ${styles.btnPrimary}`}
                  onClick={onNavigateToSenders}
                >
                  <Plus size={16} />
                  Add Email Account
                </button>
              </div>
            ) : (
              <div className={styles.senderList}>
                {senders.map(sender => (
                  <div
                    key={sender._id}
                    className={`${styles.senderItem} ${!sender.isActive ? styles.inactive : ''}`}
                    onClick={() => sender.isActive && setSelectedSenderId(sender._id)}
                  >
                    <div className={styles.senderInfo}>
                      <span className={styles.senderEmail}>{sender.email}</span>
                      {sender.name && <span className={styles.senderName}>{sender.name}</span>}
                    </div>
                    <div className={styles.senderStatus}>
                      <span className={`${styles.statusBadge} ${sender.isActive ? styles.active : styles.inactive}`}>
                        {sender.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.emailManager}>
      {/* Header */}
      <div className={styles.emailHeader}>
        <div className={styles.emailHeaderLeft}>
          <div className={styles.accountSelector}>
            <select
              value={selectedSenderId}
              onChange={(e) => setSelectedSenderId(e.target.value)}
              className={styles.accountSelect}
            >
              {senders.map(sender => (
                <option key={sender._id} value={sender._id}>
                  {sender.email} {!sender.isActive ? '(Inactive)' : ''}
                </option>
              ))}
            </select>
          </div>
          <div className={styles.emailActions}>
            <button 
              className={`${styles.btn} ${styles.btnPrimary}`}
              onClick={fetchFromServer}
              disabled={loading}
            >
              <RefreshCw className={`${styles.icon} ${loading ? styles.animateSpin : ''}`} />
              Sync
            </button>
            <button 
              className={`${styles.btn} ${styles.btnSecondary}`}
              onClick={fetchEmails}
              disabled={loading}
            >
              <RefreshCw className={styles.icon} />
              Refresh
            </button>
            <button 
              className={`${styles.btn} ${styles.btnSecondary}`}
              onClick={() => setShowFilters(!showFilters)}
            >
              <Filter className={styles.icon} />
              Filters
            </button>
          </div>
        </div>
        <div className={styles.searchBox}>
          <Search className={styles.icon} />
          <input
            type="text"
            placeholder="Search emails..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      {/* Main Content Area - Vertical Layout */}
      <div className={styles.mainContent}>
        {/* Folders Section */}
        <div className={styles.foldersSection}>
          <div className={styles.foldersHeader}>
            <h3>Folders</h3>
          </div>
          <div className={styles.folderList}>
            {folders.map(folder => (
              <div
                key={folder.id}
                className={`${styles.folderItem} ${currentFolder === folder.id ? styles.active : ''}`}
                onClick={() => setCurrentFolder(folder.id)}
              >
                <folder.icon className={styles.icon} />
                <span className={styles.folderName}>{folder.name}</span>
                <div className={styles.folderCounts}>
                  {folder.unread > 0 && (
                    <span className={styles.unreadCount}>{folder.unread}</span>
                  )}
                  <span className={styles.totalCount}>({folder.count})</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Filters Section */}
        {showFilters && (
          <div className={styles.filtersSection}>
            <div className={styles.filtersHeader}>
              <h3>Filters</h3>
            </div>
            <div className={styles.filterControls}>
              <div className={styles.filterGroup}>
                <label className={styles.filterLabel}>Category</label>
                <select
                  value={filterCategory}
                  onChange={(e) => setFilterCategory(e.target.value)}
                  className={styles.filterSelect}
                >
                  {categories.map(category => (
                    <option key={category.id} value={category.id}>
                      {category.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className={styles.filterGroup}>
                <label className={styles.filterCheckbox}>
                  <input
                    type="checkbox"
                    checked={showUnreadOnly}
                    onChange={(e) => setShowUnreadOnly(e.target.checked)}
                  />
                  Show unread only
                </label>
              </div>
            </div>
          </div>
        )}

        {/* Email List Section */}
        <div className={styles.emailListSection}>
          {/* Email List Header */}
          <div className={styles.emailListHeader}>
            <div className={styles.emailListHeaderLeft}>
              <input
                type="checkbox"
                checked={selectedEmails.length === (emails || []).length}
                onChange={(e) => e.target.checked ? selectAllEmails() : clearSelection()}
                className={styles.selectAllCheckbox}
              />
              <span>Select all</span>
              <span className={styles.emailCount}>
                ({emails.length} emails)
              </span>
            </div>
            <div className={styles.emailListHeaderRight}>
              <button
                className={`${styles.btn} ${styles.btnSm} ${styles.btnSecondary}`}
                onClick={fetchFromServer}
                disabled={loading}
                title="Sync emails from server"
              >
                {loading ? (
                  <>
                    <RefreshCw className={`${styles.icon} ${styles.animateSpin}`} />
                    Syncing...
                  </>
                ) : (
                  <>
                    <RefreshCw className={styles.icon} />
                    Sync
                  </>
                )}
              </button>
              <select
                value={`${sortBy}-${sortOrder}`}
                onChange={(e) => {
                  const [field, order] = e.target.value.split('-');
                  setSortBy(field);
                  setSortOrder(order);
                }}
                className={styles.sortSelect}
              >
                <option value="receivedAt-desc">Newest first</option>
                <option value="receivedAt-asc">Oldest first</option>
                <option value="subject-asc">Subject A-Z</option>
                <option value="subject-desc">Subject Z-A</option>
              </select>
            </div>
          </div>

          {/* Bulk Actions */}
          {selectedEmails.length > 0 && (
            <div className={styles.bulkActions}>
              <div className={styles.bulkInfo}>
                {selectedEmails.length} email(s) selected
                <button className={styles.btnLink} onClick={clearSelection}>
                  Clear selection
                </button>
              </div>
              <div className={styles.bulkButtons}>
                <button 
                  className={`${styles.btn} ${styles.btnSm} ${styles.btnSuccess}`}
                  onClick={() => bulkOperation('markAsRead')}
                >
                  Mark as read
                </button>
                <button 
                  className={`${styles.btn} ${styles.btnSm} ${styles.btnSecondary}`}
                  onClick={() => bulkOperation('markAsUnread')}
                >
                  Mark as unread
                </button>
                <button 
                  className={`${styles.btn} ${styles.btnSm} ${styles.btnWarning}`}
                  onClick={() => bulkOperation('moveToFolder', 'ARCHIVE')}
                >
                  Archive
                </button>
                <button 
                  className={`${styles.btn} ${styles.btnSm} ${styles.btnError}`}
                  onClick={() => bulkOperation('delete')}
                >
                  Delete
                </button>
              </div>
            </div>
          )}

          {/* Email List */}
          <div className={styles.emailList}>
            {loading ? (
              <div className={styles.loadingState}>
                <RefreshCw className={`${styles.icon} ${styles.animateSpin}`} />
                <p>Loading emails...</p>
              </div>
            ) : (emails || []).length === 0 ? (
              <div className={styles.emptyState}>
                <Mail className={styles.icon} />
                <h3>No emails found</h3>
                <p>Try changing your filters or syncing with the server.</p>
                <div className={styles.emptyStateActions}>
                  <button 
                    className={`${styles.btn} ${styles.btnPrimary}`}
                    onClick={fetchFromServer}
                  >
                    <RefreshCw className={styles.icon} />
                    Sync with Server
                  </button>
                  <button 
                    className={`${styles.btn} ${styles.btnSecondary}`}
                    onClick={() => {
                      setSearchQuery('');
                      setFilterCategory('');
                      setShowUnreadOnly(false);
                    }}
                  >
                    Clear Filters
                  </button>
                </div>
              </div>
            ) : (
              <div className={styles.emailItems}>
                {(emails || []).map(email => (
                  <div
                    key={email._id}
                    className={`${styles.emailItem} ${!email.isRead ? styles.unread : ''} ${selectedEmails.includes(email._id) ? styles.selected : ''}`}
                    onClick={() => handleEmailClick(email)}
                  >
                    <div className={styles.emailItemLeft}>
                      <input
                        type="checkbox"
                        checked={selectedEmails.includes(email._id)}
                        onChange={(e) => {
                          e.stopPropagation();
                          toggleEmailSelection(email._id);
                        }}
                        className={styles.emailCheckbox}
                      />
                      {!email.isRead && <div className={styles.unreadIndicator} />}
                      <div className={styles.emailInfo}>
                        <div className={styles.emailSubject}>
                          {email.subject || '(No subject)'}
                          {email.hasAttachments && <Download className={styles.attachmentIcon} />}
                        </div>
                        <div className={styles.emailMeta}>
                          <span className={styles.emailFrom}>
                            {email.from?.name || email.from?.email || 'Unknown'}
                          </span>
                          <span className={styles.emailDate}>
                            {new Date(email.receivedAt).toLocaleDateString('en-US', {
                              month: 'short',
                              day: 'numeric',
                              hour: 'numeric',
                              minute: '2-digit',
                              hour12: true
                            })}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className={styles.emailItemRight}>
                      <span className={`${styles.categoryBadge} ${styles[`category${email.autoCategory?.charAt(0).toUpperCase() + email.autoCategory?.slice(1)}`] || styles.categoryOther}`}>
                        {email.autoCategory?.toUpperCase() || 'OTHER'}
                      </span>
                      <div className={styles.emailActions}>
                        <button
                          className={styles.btnIcon}
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleRead(email._id, !email.isRead);
                          }}
                          title={email.isRead ? 'Mark as unread' : 'Mark as read'}
                        >
                          {email.isRead ? <Mail className={styles.icon} /> : <MailOpen className={styles.icon} />}
                        </button>
                        <button
                          className={styles.btnIcon}
                          onClick={(e) => {
                            e.stopPropagation();
                            moveToFolder(email._id, 'ARCHIVE');
                          }}
                          title="Archive"
                        >
                          <Archive className={styles.icon} />
                        </button>
                        <button
                          className={styles.btnIcon}
                          onClick={(e) => {
                            e.stopPropagation();
                            deleteEmail(email._id);
                          }}
                          title="Delete"
                        >
                          <Trash2 className={styles.icon} />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Email Detail Panel */}
      {selectedEmail && (
        <div className={styles.emailDetailPanel}>
          <div className={styles.emailDetailHeader}>
            <div className={styles.emailDetailHeaderLeft}>
              <button
                className={styles.closeButton}
                onClick={closeEmailDetail}
                title="Close"
              >
                <X className={styles.icon} />
              </button>
              <h2>{selectedEmail.subject || '(No subject)'}</h2>
            </div>
            <div className={styles.emailDetailActions}>
              <button
                className={styles.btnIcon}
                onClick={handleReply}
                title="Reply"
              >
                <Reply className={styles.icon} />
              </button>
              <button
                className={styles.btnIcon}
                onClick={() => toggleRead(selectedEmail._id, !selectedEmail.isRead)}
                title={selectedEmail.isRead ? 'Mark as unread' : 'Mark as read'}
              >
                {selectedEmail.isRead ? <Mail className={styles.icon} /> : <MailOpen className={styles.icon} />}
              </button>
              <button
                className={styles.btnIcon}
                onClick={() => moveToFolder(selectedEmail._id, 'ARCHIVE')}
                title="Archive"
              >
                <Archive className={styles.icon} />
              </button>
              <button
                className={styles.btnIcon}
                onClick={() => deleteEmail(selectedEmail._id)}
                title="Delete"
              >
                <Trash2 className={styles.icon} />
              </button>
            </div>
          </div>
          
          <div className={styles.emailDetailContent}>
            <div className={styles.emailDetailMeta}>
              <div className={styles.metaRow}>
                <span className={styles.metaLabel}>From:</span>
                <span className={styles.metaValue}>
                  {selectedEmail.from?.name && `${selectedEmail.from.name} `}
                  &lt;{selectedEmail.from?.email}&gt;
                </span>
              </div>
              {selectedEmail.to && selectedEmail.to.length > 0 && (
                <div className={styles.metaRow}>
                  <span className={styles.metaLabel}>To:</span>
                  <span className={styles.metaValue}>
                    {selectedEmail.to.map(recipient => 
                      `${recipient.name || ''} <${recipient.email}>`
                    ).join(', ')}
                  </span>
                </div>
              )}
              <div className={styles.metaRow}>
                <span className={styles.metaLabel}>Date:</span>
                <span className={styles.metaValue}>
                  {new Date(selectedEmail.receivedAt).toLocaleString('en-US', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                    hour: 'numeric',
                    minute: '2-digit',
                    hour12: true
                  })}
                </span>
              </div>
              {selectedEmail.autoCategory && (
                <div className={styles.metaRow}>
                  <span className={styles.metaLabel}>Category:</span>
                  <span className={`${styles.categoryBadge} ${styles[`category${selectedEmail.autoCategory.charAt(0).toUpperCase() + selectedEmail.autoCategory.slice(1)}`] || styles.categoryOther}`}>
                    {selectedEmail.autoCategory.toUpperCase()}
                  </span>
                </div>
              )}
            </div>

            <div className={styles.emailDetailBody}>
              {showReplyForm ? (
                <div className={styles.replyForm}>
                  <div className={styles.replyFormHeader}>
                    <h3>Reply to Email</h3>
                  </div>
                  
                  <div className={styles.replyFormFields}>
                    <div className={styles.formField}>
                      <label className={styles.formLabel}>To:</label>
                      <input
                        type="email"
                        value={replyData.to}
                        onChange={(e) => setReplyData({ ...replyData, to: e.target.value })}
                        className={styles.formInput}
                        placeholder="Recipient email"
                        required
                      />
                    </div>
                    
                    <div className={styles.formField}>
                      <label className={styles.formLabel}>Subject:</label>
                      <input
                        type="text"
                        value={replyData.subject}
                        onChange={(e) => setReplyData({ ...replyData, subject: e.target.value })}
                        className={styles.formInput}
                        placeholder="Email subject"
                        required
                      />
                    </div>
                    
                    <div className={styles.formField}>
                      <label className={styles.formLabel}>Message:</label>
                      <textarea
                        value={replyData.body}
                        onChange={(e) => setReplyData({ ...replyData, body: e.target.value })}
                        className={styles.formTextarea}
                        placeholder="Type your reply message..."
                        rows={12}
                        required
                      />
                    </div>
                  </div>
                  
                  <div className={styles.replyFormActions}>
                    <button
                      className={`${styles.btn} ${styles.btnSecondary}`}
                      onClick={cancelReply}
                      disabled={sendingReply}
                    >
                      Cancel
                    </button>
                    <button
                      className={`${styles.btn} ${styles.btnPrimary}`}
                      onClick={sendReply}
                      disabled={sendingReply}
                    >
                      {sendingReply ? (
                        <>
                          <RefreshCw className={`${styles.icon} ${styles.animateSpin}`} />
                          Sending...
                        </>
                      ) : (
                        <>
                          <SendIcon className={styles.icon} />
                          Send Reply
                        </>
                      )}
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  {selectedEmail.htmlBody ? (
                    <div 
                      className={styles.emailHtmlContent}
                      dangerouslySetInnerHTML={{ __html: selectedEmail.htmlBody }} 
                    />
                  ) : (
                    <div className={styles.emailTextContent}>
                      <pre>{selectedEmail.body || 'No content available'}</pre>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default EmailManager; 