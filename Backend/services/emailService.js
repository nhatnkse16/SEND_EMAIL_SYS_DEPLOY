const Imap = require('imap');
const { simpleParser } = require('mailparser');
const mongoose = require('mongoose');
const Email = require('../models/emailModel');
const Sender = require('../models/senderModel');
const colors = require('colors');
const crypto = require('crypto');

class EmailService {
    constructor() {
        this.imapConnections = new Map();
        this.connectionTimeouts = new Map();
        this.maxConnections = 5;
        this.connectionTimeout = 30000; // 30 seconds
        this.fetchTimeout = 60000; // 60 seconds
    }

    // Kết nối IMAP cho một sender account
    async connectIMAP(sender) {
        return new Promise((resolve, reject) => {
            if (!sender.imapHost) {
                reject(new Error('IMAP host not configured'));
                return;
            }

            const connectionId = `${sender._id}-${Date.now()}`;
            
            const imap = new Imap({
                user: sender.email,
                password: sender.appPassword,
                host: sender.imapHost,
                port: sender.imapPort,
                tls: sender.imapSecure,
                tlsOptions: { 
                    rejectUnauthorized: false,
                    secureProtocol: 'TLSv1_2_method'
                },
                connTimeout: this.connectionTimeout,
                authTimeout: this.connectionTimeout,
                debug: process.env.NODE_ENV === 'development' ? console.log : null
            });

            // Setup connection timeout
            const timeout = setTimeout(() => {
                imap.end();
                reject(new Error('IMAP connection timeout'));
            }, this.connectionTimeout);

            imap.once('ready', () => {
                clearTimeout(timeout);
                console.log(`[IMAP] Connected to ${sender.email}`.green);
                this.imapConnections.set(connectionId, imap);
                resolve({ imap, connectionId });
            });

            imap.once('error', (err) => {
                clearTimeout(timeout);
                console.error(`[IMAP] Error connecting to ${sender.email}:`.red, err);
                this.imapConnections.delete(connectionId);
                reject(err);
            });

            imap.once('end', () => {
                clearTimeout(timeout);
                console.log(`[IMAP] Connection ended for ${sender.email}`.yellow);
                this.imapConnections.delete(connectionId);
            });

            imap.connect();
        });
    }

    // Fetch emails từ IMAP server
    async fetchEmails(senderId, folder = 'INBOX', limit = 50) {
        let connection = null;
        let connectionId = null;

        try {
            const sender = await Sender.findById(senderId);
            if (!sender || !sender.isEmailSyncEnabled) {
                throw new Error('Sender not found or email sync not enabled');
            }

            console.log(`[EmailService] Fetching emails from ${sender.email}`.cyan);

            // Kết nối IMAP
            const connectionResult = await this.connectIMAP(sender);
            connection = connectionResult.imap;
            connectionId = connectionResult.connectionId;

            const emails = await this.fetchEmailsFromConnection(connection, folder, limit);
            
            // Process và lưu emails
            const savedEmails = await this.processAndSaveEmails(emails, sender);

            // Cập nhật lastSyncAt
            await Sender.findByIdAndUpdate(senderId, {
                lastSyncAt: new Date()
            });

            console.log(`[EmailService] Fetched ${savedEmails.length} new emails from ${sender.email}`.green);

            return savedEmails;

        } catch (error) {
            console.error(`[EmailService] Error fetching emails:`.red, error);
            throw error;
        } finally {
            // Cleanup connection
            if (connection) {
                connection.end();
                this.imapConnections.delete(connectionId);
            }
        }
    }

    // Fetch emails từ IMAP connection
    async fetchEmailsFromConnection(imap, folder, limit) {
        return new Promise((resolve, reject) => {
            const emails = [];
            let fetchTimeout;

            // Thử mở folder được chỉ định, nếu không có thì dùng INBOX
            imap.openBox(folder, false, (err, box) => {
                if (err) {
                    console.log(`[IMAP] Folder '${folder}' not found, trying INBOX`);
                    imap.openBox('INBOX', false, (err2, box2) => {
                        if (err2) {
                            console.log(`[IMAP] INBOX also not found, trying default`);
                            // Thử folder đầu tiên có sẵn
                            imap.listMailboxes((err3, mailboxes) => {
                                if (err3 || !mailboxes || mailboxes.length === 0) {
                                    reject(new Error(`No accessible mailboxes found: ${err.message}`));
                                    return;
                                }
                                const defaultBox = mailboxes[0];
                                console.log(`[IMAP] Using default mailbox: ${defaultBox.name}`);
                                imap.openBox(defaultBox.name, false, (err4, box4) => {
                                    if (err4) {
                                        reject(err4);
                                        return;
                                    }
                                    this.processFetch(imap, box4, limit, emails, resolve, reject, fetchTimeout);
                                });
                            });
                            return;
                        }
                        this.processFetch(imap, box2, limit, emails, resolve, reject, fetchTimeout);
                    });
                    return;
                }
                this.processFetch(imap, box, limit, emails, resolve, reject, fetchTimeout);
            });
        });
    }

    processFetch(imap, box, limit, emails, resolve, reject, fetchTimeout) {
        const messageCount = Math.min(limit, box.messages.total);
        if (messageCount === 0) {
            resolve([]);
            return;
        }

        const fetch = imap.seq.fetch(`1:${messageCount}`, {
            bodies: '',
            struct: true,
            envelope: true,
            flags: true
        });

        fetch.on('message', (msg, seqno) => {
            const email = {
                attachments: [],
                headers: new Map()
            };

            msg.on('body', (stream, info) => {
                simpleParser(stream, (err, parsed) => {
                    if (err) {
                        console.error('Error parsing email:', err);
                        return;
                    }

                    // Map parsed data to our email structure
                    this.mapParsedEmail(parsed, email);
                    emails.push(email);
                });
            });

            msg.once('attributes', (attrs) => {
                email.flags = attrs.flags;
                email.uid = attrs.uid;
                email.modSeq = attrs.modSeq;
            });
        });

        fetch.once('error', (err) => {
            clearTimeout(fetchTimeout);
            reject(err);
        });

        fetch.once('end', () => {
            clearTimeout(fetchTimeout);
            resolve(emails);
        });

        // Set fetch timeout
        fetchTimeout = setTimeout(() => {
            imap.end();
            reject(new Error('Fetch timeout'));
        }, this.fetchTimeout);
    }

    // Map parsed email data to our structure
    mapParsedEmail(parsed, email) {
        email.messageId = parsed.messageId || this.generateMessageId();
        email.subject = parsed.subject || '';
        email.body = parsed.text || '';
        email.htmlBody = parsed.html || '';
        email.receivedAt = parsed.date || new Date();
        email.sentAt = parsed.date || new Date();
        email.size = parsed.size || 0;

        // Parse from
        if (parsed.from && parsed.from.value.length > 0) {
            email.from = {
                email: parsed.from.value[0].address,
                name: parsed.from.value[0].name || ''
            };
        }

        // Parse to
        if (parsed.to && parsed.to.value.length > 0) {
            email.to = parsed.to.value.map(addr => ({
                email: addr.address,
                name: addr.name || ''
            }));
        }

        // Parse cc
        if (parsed.cc && parsed.cc.value.length > 0) {
            email.cc = parsed.cc.value.map(addr => ({
                email: addr.address,
                name: addr.name || ''
            }));
        }

        // Parse bcc
        if (parsed.bcc && parsed.bcc.value.length > 0) {
            email.bcc = parsed.bcc.value.map(addr => ({
                email: addr.address,
                name: addr.name || ''
            }));
        }

        // Thread information
        email.inReplyTo = parsed.inReplyTo;
        email.references = parsed.references || [];
        email.threadId = this.generateThreadId(parsed);

        // Attachments
        if (parsed.attachments && parsed.attachments.length > 0) {
            email.attachments = parsed.attachments.map(att => ({
                filename: att.filename,
                contentType: att.contentType,
                size: att.size,
                contentId: att.contentId,
                checksum: this.calculateChecksum(att.content)
            }));
        }

        // Headers
        if (parsed.headers) {
            email.headers = new Map(Object.entries(parsed.headers));
        }

        // Spam score calculation
        email.spamScore = this.calculateSpamScore(parsed);
    }

    // Process và lưu emails
    async processAndSaveEmails(emails, sender) {
        const savedEmails = [];
        
        for (const emailData of emails) {
            try {
                // Kiểm tra email đã tồn tại chưa
                const existingEmail = await Email.findOne({ 
                    messageId: emailData.messageId,
                    senderAccountId: sender._id
                });

                if (existingEmail) {
                    continue; // Skip nếu đã tồn tại
                }

                // Set sender info
                emailData.senderAccountId = sender._id;
                emailData.accountEmail = sender.email;

                // Tự động categorize
                if (!emailData.autoCategory || emailData.autoCategory === 'other') {
                    emailData.autoCategory = this.categorizeEmail(emailData);
                }

                // Set priority based on sender category
                emailData.priority = this.calculatePriority(sender, emailData);

                // Lưu email
                const savedEmail = await Email.create(emailData);
                savedEmails.push(savedEmail);

            } catch (error) {
                console.error('Error saving email:', error);
                // Continue với email tiếp theo
            }
        }

        return savedEmails;
    }

    // Lấy emails từ database
    async getEmails(senderId, options = {}) {
        const {
            folder = 'INBOX',
            page = 1,
            limit = 20,
            isRead = null,
            search = null,
            category = null,
            sortBy = 'receivedAt',
            sortOrder = 'desc',
            hasAttachments = null,
            isStarred = null,
            isImportant = null
        } = options;

        const query = { 
            senderAccountId: mongoose.Types.ObjectId.isValid(senderId) ? senderId : senderId, 
            folder 
        };

        // Filter by read status
        if (isRead !== null) {
            query.isRead = isRead;
        }

        // Filter by category
        if (category) {
            query.autoCategory = category;
        }

        // Filter by attachments
        if (hasAttachments !== null) {
            if (hasAttachments) {
                query['attachments.0'] = { $exists: true };
            } else {
                query.attachments = { $size: 0 };
            }
        }

        // Filter by starred
        if (isStarred !== null) {
            query.isStarred = isStarred;
        }

        // Filter by important
        if (isImportant !== null) {
            query.isImportant = isImportant;
        }

        // Search functionality
        if (search) {
            query.$or = [
                { subject: { $regex: search, $options: 'i' } },
                { 'from.name': { $regex: search, $options: 'i' } },
                { 'from.email': { $regex: search, $options: 'i' } },
                { body: { $regex: search, $options: 'i' } },
                { tags: { $in: [new RegExp(search, 'i')] } }
            ];
        }

        const sort = {};
        sort[sortBy] = sortOrder === 'desc' ? -1 : 1;

        const skip = (page - 1) * limit;

        const emails = await Email.find(query)
            .sort(sort)
            .skip(skip)
            .limit(limit);

        const total = await Email.countDocuments(query);

        return {
            emails,
            pagination: {
                page,
                limit,
                total,
                pages: Math.ceil(total / limit)
            }
        };
    }

    // Lấy email theo ID
    async getEmailById(emailId) {
        const email = await Email.findById(emailId)
            .populate('senderAccountId', 'email displayName category');

        if (!email) {
            throw new Error('Email not found');
        }

        return email;
    }

    // Đánh dấu email đã đọc/chưa đọc
    async markAsRead(emailId, isRead = true) {
        const email = await Email.findById(emailId);
        if (!email) {
            throw new Error('Email not found');
        }

        if (isRead) {
            await email.markAsRead();
        } else {
            await email.markAsUnread();
        }

        return email;
    }

    // Di chuyển email sang folder khác
    async moveToFolder(emailId, folder) {
        const email = await Email.findById(emailId);
        if (!email) {
            throw new Error('Email not found');
        }

        await email.moveToFolder(folder);
        return email;
    }

    // Xóa email (chuyển vào trash)
    async deleteEmail(emailId) {
        return await this.moveToFolder(emailId, 'TRASH');
    }

    // Xóa vĩnh viễn
    async permanentlyDeleteEmail(emailId) {
        const email = await Email.findById(emailId);
        if (!email) {
            throw new Error('Email not found');
        }

        await Email.findByIdAndDelete(emailId);
        return { success: true };
    }

    // Lấy thống kê email
    async getEmailStats(senderId) {
        const stats = await Email.aggregate([
            { $match: { senderAccountId: senderId } },
            {
                $group: {
                    _id: '$folder',
                    count: { $sum: 1 },
                    unreadCount: {
                        $sum: { $cond: [{ $eq: ['$isRead', false] }, 1, 0] }
                    },
                    totalSize: { $sum: '$size' }
                }
            }
        ]);

        // Format stats
        const formattedStats = {
            INBOX: { count: 0, unreadCount: 0, totalSize: 0 },
            SENT: { count: 0, unreadCount: 0, totalSize: 0 },
            DRAFTS: { count: 0, unreadCount: 0, totalSize: 0 },
            TRASH: { count: 0, unreadCount: 0, totalSize: 0 },
            SPAM: { count: 0, unreadCount: 0, totalSize: 0 },
            ARCHIVE: { count: 0, unreadCount: 0, totalSize: 0 }
        };

        stats.forEach(stat => {
            formattedStats[stat._id] = {
                count: stat.count,
                unreadCount: stat.unreadCount,
                totalSize: stat.totalSize
            };
        });

        return formattedStats;
    }

    // Utility methods
    generateMessageId() {
        return crypto.randomBytes(16).toString('hex');
    }

    generateThreadId(parsed) {
        if (parsed.inReplyTo) {
            return parsed.inReplyTo;
        }
        if (parsed.references && parsed.references.length > 0) {
            return parsed.references[0];
        }
        return parsed.messageId || this.generateMessageId();
    }

    calculateChecksum(content) {
        return crypto.createHash('md5').update(content).digest('hex');
    }

    categorizeEmail(emailData) {
        const subject = (emailData.subject || '').toLowerCase();
        const body = (emailData.body || '').toLowerCase();
        const fromEmail = (emailData.from?.email || '').toLowerCase();

        // Marketing emails
        if (subject.includes('promotion') || subject.includes('sale') || 
            subject.includes('discount') || subject.includes('newsletter')) {
            return 'marketing';
        }

        // Support emails
        if (subject.includes('support') || subject.includes('help') || 
            subject.includes('issue') || subject.includes('problem')) {
            return 'support';
        }

        // Sales emails
        if (subject.includes('quote') || subject.includes('pricing') || 
            subject.includes('demo') || subject.includes('meeting')) {
            return 'sales';
        }

        // Spam detection
        if (subject.includes('viagra') || subject.includes('lottery') || 
            subject.includes('urgent') || subject.includes('limited time')) {
            return 'spam';
        }

        return 'other';
    }

    calculatePriority(sender, emailData) {
        let priority = 1;

        // Priority based on sender category
        switch (sender.category) {
            case 'support':
                priority = 5;
                break;
            case 'sales':
                priority = 4;
                break;
            case 'marketing':
                priority = 2;
                break;
            default:
                priority = 3;
        }

        // Priority based on email content
        const subject = (emailData.subject || '').toLowerCase();
        if (subject.includes('urgent') || subject.includes('important')) {
            priority += 2;
        }

        return priority;
    }

    calculateSpamScore(parsed) {
        let score = 0;
        const subject = (parsed.subject || '').toLowerCase();
        const fromEmail = (parsed.from?.value[0]?.address || '').toLowerCase();

        // Spam indicators
        if (subject.includes('viagra')) score += 3;
        if (subject.includes('lottery')) score += 3;
        if (subject.includes('urgent')) score += 2;
        if (subject.includes('free money')) score += 3;
        if (subject.includes('click here')) score += 2;
        if (fromEmail.includes('noreply')) score += 1;
        if (fromEmail.includes('donotreply')) score += 1;

        return Math.min(score, 10);
    }

    // Cleanup connections
    cleanupConnections() {
        this.imapConnections.forEach((connection, id) => {
            connection.end();
        });
        this.imapConnections.clear();
    }
}

module.exports = new EmailService(); 