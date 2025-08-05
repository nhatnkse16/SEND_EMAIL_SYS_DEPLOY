const mongoose = require('mongoose');

const emailSchema = new mongoose.Schema({
  // Thông tin cơ bản
  messageId: { 
    type: String, 
    required: true,
    index: true 
  },
  subject: { 
    type: String, 
    default: '',
    index: true 
  },
  body: { 
    type: String, 
    default: '',
    index: true 
  },
  htmlBody: { 
    type: String, 
    default: '' 
  },
  
  // Thông tin người gửi/nhận
  from: {
    email: { 
      type: String, 
      required: true,
      index: true 
    },
    name: { 
      type: String, 
      default: '' 
    }
  },
  to: [{
    email: { 
      type: String, 
      required: true 
    },
    name: { 
      type: String, 
      default: '' 
    }
  }],
  cc: [{
    email: { 
      type: String 
    },
    name: { 
      type: String, 
      default: '' 
    }
  }],
  bcc: [{
    email: { 
      type: String 
    },
    name: { 
      type: String, 
      default: '' 
    }
  }],
  
  // Thread và references
  threadId: { 
    type: String, 
    index: true 
  },
  inReplyTo: { 
    type: String,
    index: true 
  },
  references: [{ 
    type: String 
  }],
  
  // Trạng thái và phân loại
  folder: { 
    type: String, 
    enum: ['INBOX', 'SENT', 'DRAFTS', 'TRASH', 'SPAM', 'ARCHIVE'],
    default: 'INBOX',
    index: true 
  },
  isRead: { 
    type: Boolean, 
    default: false,
    index: true 
  },
  isStarred: { 
    type: Boolean, 
    default: false,
    index: true 
  },
  isImportant: { 
    type: Boolean, 
    default: false,
    index: true 
  },
  isFlagged: { 
    type: Boolean, 
    default: false,
    index: true 
  },
  labels: [{ 
    type: String,
    index: true 
  }],
  
  // Attachments
  attachments: [{
    filename: String,
    contentType: String,
    size: Number,
    path: String,
    contentId: String,
    checksum: String
  }],
  
  // Metadata
  receivedAt: { 
    type: Date, 
    default: Date.now,
    index: true 
  },
  sentAt: { 
    type: Date,
    index: true 
  },
  createdAt: { 
    type: Date, 
    default: Date.now,
    index: true 
  },
  updatedAt: { 
    type: Date, 
    default: Date.now,
    index: true 
  },
  
  // Liên kết với sender account
  senderAccountId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Sender',
    required: true,
    index: true 
  },
  
  // Thêm fields cho unified inbox
  accountEmail: { 
    type: String, 
    required: true,
    index: true 
  },
  
  // Auto-categorization
  autoCategory: {
    type: String,
    enum: ['marketing', 'support', 'sales', 'spam', 'personal', 'other'],
    default: 'other',
    index: true 
  },
  
  // Priority based on sender
  priority: {
    type: Number,
    default: 1,
    index: true 
  },
  
  // Tags for better organization
  tags: [{ 
    type: String,
    index: true 
  }],
  
  // Response tracking
  hasReplied: { 
    type: Boolean, 
    default: false,
    index: true 
  },
  replyCount: { 
    type: Number, 
    default: 0 
  },
  lastReplyAt: { 
    type: Date 
  },
  
  // Follow-up tracking
  needsFollowUp: { 
    type: Boolean, 
    default: false,
    index: true 
  },
  followUpDate: { 
    type: Date,
    index: true 
  },
  
  // Email type detection
  emailType: {
    type: String,
    enum: ['incoming', 'outgoing', 'auto-reply', 'bounce', 'notification'],
    default: 'incoming',
    index: true 
  },

  // Security & Spam
  spamScore: {
    type: Number,
    default: 0,
    min: 0,
    max: 10
  },
  isSpam: {
    type: Boolean,
    default: false,
    index: true 
  },

  // Email headers
  headers: {
    type: Map,
    of: String
  },

  // Size information
  size: {
    type: Number,
    default: 0
  },

  // Encryption
  isEncrypted: {
    type: Boolean,
    default: false
  },

  // Forward/Reply chain
  originalMessageId: {
    type: String,
    index: true 
  },
  forwardedFrom: {
    type: String,
    index: true 
  },

  // User interactions
  openedAt: {
    type: Date
  },
  clickedAt: {
    type: Date
  },
  downloadCount: {
    type: Number,
    default: 0
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Compound indexes cho performance
emailSchema.index({ senderAccountId: 1, folder: 1 });
emailSchema.index({ senderAccountId: 1, isRead: 1 });
emailSchema.index({ senderAccountId: 1, receivedAt: -1 });
emailSchema.index({ threadId: 1 });
emailSchema.index({ accountEmail: 1, receivedAt: -1 });
emailSchema.index({ autoCategory: 1, receivedAt: -1 });
emailSchema.index({ tags: 1 });
emailSchema.index({ isSpam: 1, receivedAt: -1 });
emailSchema.index({ needsFollowUp: 1, followUpDate: 1 });
emailSchema.index({ isImportant: 1, receivedAt: -1 });

// Virtual fields
emailSchema.virtual('isUnread').get(function() {
  return !this.isRead;
});

emailSchema.virtual('isFromOwnAccount').get(function() {
  return this.from.email === this.accountEmail;
});

emailSchema.virtual('hasAttachments').get(function() {
  return this.attachments && this.attachments.length > 0;
});

emailSchema.virtual('attachmentCount').get(function() {
  return this.attachments ? this.attachments.length : 0;
});

emailSchema.virtual('totalSize').get(function() {
  if (!this.attachments || this.attachments.length === 0) {
    return this.size || 0;
  }
  const attachmentSize = this.attachments.reduce((sum, att) => sum + (att.size || 0), 0);
  return (this.size || 0) + attachmentSize;
});

// Pre-save middleware
emailSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  
  // Tự động set accountEmail từ senderAccountId nếu chưa có
  if (this.isModified('senderAccountId') && !this.accountEmail) {
    // Sẽ được set trong service layer
  }
  
  // Tự động categorize email
  if (!this.autoCategory || this.autoCategory === 'other') {
    this.autoCategory = this.categorizeEmail();
  }

  // Tự động set threadId nếu chưa có
  if (!this.threadId) {
    this.threadId = this.generateThreadId();
  }

  // Tự động set spam status
  if (this.spamScore >= 7) {
    this.isSpam = true;
    this.folder = 'SPAM';
  }

  next();
});

// Pre-find middleware để populate sender info
emailSchema.pre('find', function() {
  this.populate('senderAccountId', 'email displayName category');
});

emailSchema.pre('findOne', function() {
  this.populate('senderAccountId', 'email displayName category');
});

// Instance methods
emailSchema.methods.categorizeEmail = function() {
  const subject = (this.subject || '').toLowerCase();
  const body = (this.body || '').toLowerCase();
  const fromEmail = (this.from.email || '').toLowerCase();
  
  // Marketing emails
  if (subject.includes('promotion') || subject.includes('sale') || 
      subject.includes('discount') || subject.includes('newsletter') ||
      subject.includes('offer') || subject.includes('deal')) {
    return 'marketing';
  }
  
  // Support emails
  if (subject.includes('support') || subject.includes('help') || 
      subject.includes('issue') || subject.includes('problem') ||
      subject.includes('ticket') || subject.includes('assistance')) {
    return 'support';
  }
  
  // Sales emails
  if (subject.includes('quote') || subject.includes('pricing') || 
      subject.includes('demo') || subject.includes('meeting') ||
      subject.includes('proposal') || subject.includes('contract')) {
    return 'sales';
  }
  
  // Spam detection
  if (subject.includes('viagra') || subject.includes('lottery') || 
      subject.includes('urgent') || subject.includes('limited time') ||
      subject.includes('free money') || subject.includes('click here')) {
    return 'spam';
  }

  // Personal emails
  if (fromEmail.includes('gmail.com') || fromEmail.includes('yahoo.com') ||
      fromEmail.includes('outlook.com') || fromEmail.includes('hotmail.com')) {
    return 'personal';
  }
  
  return 'other';
};

emailSchema.methods.generateThreadId = function() {
  if (this.inReplyTo) {
    return this.inReplyTo;
  }
  if (this.references && this.references.length > 0) {
    return this.references[0];
  }
  return this.messageId;
};

emailSchema.methods.markAsRead = function() {
  this.isRead = true;
  this.openedAt = new Date();
  return this.save();
};

emailSchema.methods.markAsUnread = function() {
  this.isRead = false;
  this.openedAt = null;
  return this.save();
};

emailSchema.methods.moveToFolder = function(folder) {
  this.folder = folder;
  return this.save();
};

emailSchema.methods.addLabel = function(label) {
  if (!this.labels.includes(label)) {
    this.labels.push(label);
  }
  return this.save();
};

emailSchema.methods.removeLabel = function(label) {
  this.labels = this.labels.filter(l => l !== label);
  return this.save();
};

emailSchema.methods.addTag = function(tag) {
  if (!this.tags.includes(tag)) {
    this.tags.push(tag);
  }
  return this.save();
};

emailSchema.methods.removeTag = function(tag) {
  this.tags = this.tags.filter(t => t !== tag);
  return this.save();
};

// Static methods
emailSchema.statics.findByThread = function(threadId) {
  return this.find({ threadId }).sort({ receivedAt: 1 });
};

emailSchema.statics.findUnread = function(senderId) {
  return this.find({ 
    senderAccountId: senderId, 
    isRead: false,
    folder: { $ne: 'TRASH' }
  }).sort({ receivedAt: -1 });
};

emailSchema.statics.findByCategory = function(senderId, category) {
  return this.find({ 
    senderAccountId: senderId, 
    autoCategory: category 
  }).sort({ receivedAt: -1 });
};

emailSchema.statics.searchEmails = function(senderId, query) {
  return this.find({
    senderAccountId: senderId,
    $or: [
      { subject: { $regex: query, $options: 'i' } },
      { body: { $regex: query, $options: 'i' } },
      { 'from.name': { $regex: query, $options: 'i' } },
      { 'from.email': { $regex: query, $options: 'i' } },
      { tags: { $in: [new RegExp(query, 'i')] } }
    ]
  }).sort({ receivedAt: -1 });
};

module.exports = mongoose.model('Email', emailSchema); 