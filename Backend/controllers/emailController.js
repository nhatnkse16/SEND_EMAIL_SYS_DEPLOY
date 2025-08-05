const emailService = require('../services/emailService');
const Sender = require('../models/senderModel');
const Email = require('../models/emailModel');
const colors = require('colors');
const nodemailer = require('nodemailer');

// Lấy danh sách emails với pagination và filters
const getEmails = async (req, res) => {
    try {
        const { senderId } = req.params;
        const {
            folder = 'INBOX',
            page = 1,
            limit = 20,
            isRead,
            search,
            category,
            sortBy = 'receivedAt',
            sortOrder = 'desc',
            hasAttachments,
            isStarred,
            isImportant
        } = req.query;

        // Validate senderId
        if (!senderId) {
            return res.status(400).json({
                success: false,
                message: 'Sender ID is required'
            });
        }

        // Check if sender exists
        const sender = await Sender.findById(senderId);
        if (!sender) {
            return res.status(404).json({
                success: false,
                message: 'Sender not found'
            });
        }

        const options = {
            folder,
            page: parseInt(page),
            limit: Math.min(parseInt(limit), 100), // Max 100 emails per request
            isRead: isRead !== undefined ? isRead === 'true' : null,
            search,
            category,
            sortBy,
            sortOrder,
            hasAttachments: hasAttachments !== undefined ? hasAttachments === 'true' : null,
            isStarred: isStarred !== undefined ? isStarred === 'true' : null,
            isImportant: isImportant !== undefined ? isImportant === 'true' : null
        };

        const result = await emailService.getEmails(senderId, options);

        res.json({
            success: true,
            data: result.emails,
            pagination: result.pagination,
            filters: {
                folder,
                category,
                isRead: options.isRead,
                hasAttachments: options.hasAttachments,
                isStarred: options.isStarred,
                isImportant: options.isImportant
            }
        });

    } catch (error) {
        console.error('[EmailController] getEmails error:'.red, error);
        res.status(500).json({
            success: false,
            message: 'Internal server error',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};

// Lấy chi tiết email theo ID
const getEmailById = async (req, res) => {
    try {
        const { emailId } = req.params;

        if (!emailId) {
            return res.status(400).json({
                success: false,
                message: 'Email ID is required'
            });
        }

        const email = await emailService.getEmailById(emailId);

        // Auto mark as read when viewing
        if (!email.isRead) {
            await emailService.markAsRead(emailId, true);
        }

        res.json({
            success: true,
            data: email
        });

    } catch (error) {
        console.error('[EmailController] getEmailById error:'.red, error);
        
        if (error.message === 'Email not found') {
            return res.status(404).json({
                success: false,
                message: 'Email not found'
            });
        }

        res.status(500).json({
            success: false,
            message: 'Internal server error',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};

// Fetch emails từ IMAP server
const fetchEmailsFromServer = async (req, res) => {
    try {
        const { senderId } = req.params;
        const { folder = 'INBOX', limit = 50 } = req.body;

        if (!senderId) {
            return res.status(400).json({
                success: false,
                message: 'Sender ID is required'
            });
        }

        // Check if sender exists and has IMAP configured
        const sender = await Sender.findById(senderId);
        if (!sender) {
            return res.status(404).json({
                success: false,
                message: 'Sender not found'
            });
        }

        if (!sender.isEmailSyncEnabled) {
            return res.status(400).json({
                success: false,
                message: 'Email sync is not enabled for this sender'
            });
        }

        if (!sender.imapHost) {
            return res.status(400).json({
                success: false,
                message: 'IMAP configuration is missing'
            });
        }

        console.log(`[EmailController] Fetching emails for sender ${senderId}`.cyan);

        const fetchedEmails = await emailService.fetchEmails(senderId, folder, parseInt(limit));

        res.json({
            success: true,
            message: `Successfully fetched ${fetchedEmails.length} emails`,
            data: {
                fetchedCount: fetchedEmails.length,
                emails: fetchedEmails.slice(0, 10), // Return first 10 for preview
                lastSyncAt: new Date()
            }
        });

    } catch (error) {
        console.error('[EmailController] fetchEmailsFromServer error:'.red, error);
        
        let statusCode = 500;
        let message = 'Internal server error';

        if (error.message.includes('IMAP')) {
            statusCode = 400;
            message = 'IMAP connection failed';
        } else if (error.message.includes('authentication')) {
            statusCode = 401;
            message = 'Invalid email credentials';
        } else if (error.message.includes('timeout')) {
            statusCode = 408;
            message = 'Connection timeout';
        }

        res.status(statusCode).json({
            success: false,
            message,
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};

// Đánh dấu email đã đọc/chưa đọc
const markAsRead = async (req, res) => {
    try {
        const { emailId } = req.params;
        const { isRead = true } = req.body;

        if (!emailId) {
            return res.status(400).json({
                success: false,
                message: 'Email ID is required'
            });
        }

        const email = await emailService.markAsRead(emailId, isRead);

        res.json({
            success: true,
            message: `Email ${isRead ? 'marked as read' : 'marked as unread'}`,
            data: email
        });

    } catch (error) {
        console.error('[EmailController] markAsRead error:'.red, error);
        
        if (error.message === 'Email not found') {
            return res.status(404).json({
                success: false,
                message: 'Email not found'
            });
        }

        res.status(500).json({
            success: false,
            message: 'Internal server error',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};

// Di chuyển email sang folder khác
const moveToFolder = async (req, res) => {
    try {
        const { emailId } = req.params;
        const { folder } = req.body;

        if (!emailId) {
            return res.status(400).json({
                success: false,
                message: 'Email ID is required'
            });
        }

        if (!folder) {
            return res.status(400).json({
                success: false,
                message: 'Folder is required'
            });
        }

        // Validate folder
        const validFolders = ['INBOX', 'SENT', 'DRAFTS', 'TRASH', 'SPAM', 'ARCHIVE'];
        if (!validFolders.includes(folder)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid folder name'
            });
        }

        const email = await emailService.moveToFolder(emailId, folder);

        res.json({
            success: true,
            message: `Email moved to ${folder}`,
            data: email
        });

    } catch (error) {
        console.error('[EmailController] moveToFolder error:'.red, error);
        
        if (error.message === 'Email not found') {
            return res.status(404).json({
                success: false,
                message: 'Email not found'
            });
        }

        res.status(500).json({
            success: false,
            message: 'Internal server error',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};

// Xóa email (chuyển vào trash)
const deleteEmail = async (req, res) => {
    try {
        const { emailId } = req.params;

        if (!emailId) {
            return res.status(400).json({
                success: false,
                message: 'Email ID is required'
            });
        }

        const email = await emailService.deleteEmail(emailId);

        res.json({
            success: true,
            message: 'Email moved to trash',
            data: email
        });

    } catch (error) {
        console.error('[EmailController] deleteEmail error:'.red, error);
        
        if (error.message === 'Email not found') {
            return res.status(404).json({
                success: false,
                message: 'Email not found'
            });
        }

        res.status(500).json({
            success: false,
            message: 'Internal server error',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};

// Xóa vĩnh viễn
const permanentlyDeleteEmail = async (req, res) => {
    try {
        const { emailId } = req.params;

        if (!emailId) {
            return res.status(400).json({
                success: false,
                message: 'Email ID is required'
            });
        }

        await emailService.permanentlyDeleteEmail(emailId);

        res.json({
            success: true,
            message: 'Email permanently deleted'
        });

    } catch (error) {
        console.error('[EmailController] permanentlyDeleteEmail error:'.red, error);
        
        if (error.message === 'Email not found') {
            return res.status(404).json({
                success: false,
                message: 'Email not found'
            });
        }

        res.status(500).json({
            success: false,
            message: 'Internal server error',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};

// Lấy thống kê email
const getEmailStats = async (req, res) => {
    try {
        const { senderId } = req.params;

        if (!senderId) {
            return res.status(400).json({
                success: false,
                message: 'Sender ID is required'
            });
        }

        // Check if sender exists
        const sender = await Sender.findById(senderId);
        if (!sender) {
            return res.status(404).json({
                success: false,
                message: 'Sender not found'
            });
        }

        const stats = await emailService.getEmailStats(senderId);

        res.json({
            success: true,
            data: stats
        });

    } catch (error) {
        console.error('[EmailController] getEmailStats error:'.red, error);
        res.status(500).json({
            success: false,
            message: 'Internal server error',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};

// Toggle email sync cho sender
const toggleEmailSync = async (req, res) => {
    try {
        const { senderId } = req.params;
        const { enabled } = req.body;

        if (!senderId) {
            return res.status(400).json({
                success: false,
                message: 'Sender ID is required'
            });
        }

        if (typeof enabled !== 'boolean') {
            return res.status(400).json({
                success: false,
                message: 'Enabled must be a boolean value'
            });
        }

        const sender = await Sender.findById(senderId);
        if (!sender) {
            return res.status(404).json({
                success: false,
                message: 'Sender not found'
            });
        }

        // Update sync status
        sender.isEmailSyncEnabled = enabled;
        if (enabled) {
            sender.lastSyncAt = new Date();
        }
        await sender.save();

        res.json({
            success: true,
            message: `Email sync ${enabled ? 'enabled' : 'disabled'}`,
            data: {
                senderId: sender._id,
                email: sender.email,
                isEmailSyncEnabled: sender.isEmailSyncEnabled,
                lastSyncAt: sender.lastSyncAt
            }
        });

    } catch (error) {
        console.error('[EmailController] toggleEmailSync error:'.red, error);
        res.status(500).json({
            success: false,
            message: 'Internal server error',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};

// Bulk operations
const bulkOperations = async (req, res) => {
    try {
        const { senderId } = req.params;
        const { operation, emailIds, folder } = req.body;

        if (!senderId || !operation || !emailIds || !Array.isArray(emailIds)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid request parameters'
            });
        }

        const results = [];
        const errors = [];

        for (const emailId of emailIds) {
            try {
                let result;
                switch (operation) {
                    case 'markAsRead':
                        result = await emailService.markAsRead(emailId, true);
                        break;
                    case 'markAsUnread':
                        result = await emailService.markAsRead(emailId, false);
                        break;
                    case 'moveToFolder':
                        if (!folder) {
                            throw new Error('Folder is required for move operation');
                        }
                        result = await emailService.moveToFolder(emailId, folder);
                        break;
                    case 'delete':
                        result = await emailService.deleteEmail(emailId);
                        break;
                    case 'permanentlyDelete':
                        await emailService.permanentlyDeleteEmail(emailId);
                        result = { _id: emailId, deleted: true };
                        break;
                    default:
                        throw new Error('Invalid operation');
                }
                results.push(result);
            } catch (error) {
                errors.push({ emailId, error: error.message });
            }
        }

        res.json({
            success: true,
            message: `Bulk operation completed`,
            data: {
                operation,
                totalProcessed: emailIds.length,
                successCount: results.length,
                errorCount: errors.length,
                results,
                errors
            }
        });

    } catch (error) {
        console.error('[EmailController] bulkOperations error:'.red, error);
        res.status(500).json({
            success: false,
            message: 'Internal server error',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};

// Search emails
const searchEmails = async (req, res) => {
    try {
        const { senderId } = req.params;
        const { query, folder = 'INBOX', limit = 50 } = req.query;

        if (!senderId) {
            return res.status(400).json({
                success: false,
                message: 'Sender ID is required'
            });
        }

        if (!query || query.trim().length < 2) {
            return res.status(400).json({
                success: false,
                message: 'Search query must be at least 2 characters long'
            });
        }

        const emails = await Email.searchEmails(senderId, query.trim())
            .limit(parseInt(limit))
            .populate('senderAccountId', 'email displayName category');

        res.json({
            success: true,
            data: {
                query: query.trim(),
                results: emails,
                count: emails.length
            }
        });

    } catch (error) {
        console.error('[EmailController] searchEmails error:'.red, error);
        res.status(500).json({
            success: false,
            message: 'Internal server error',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};

// Get email thread
const getEmailThread = async (req, res) => {
    try {
        const { emailId } = req.params;

        if (!emailId) {
            return res.status(400).json({
                success: false,
                message: 'Email ID is required'
            });
        }

        const email = await Email.findById(emailId);
        if (!email) {
            return res.status(404).json({
                success: false,
                message: 'Email not found'
            });
        }

        const threadEmails = await Email.findByThread(email.threadId)
            .populate('senderAccountId', 'email displayName category');

        res.json({
            success: true,
            data: {
                threadId: email.threadId,
                emails: threadEmails,
                count: threadEmails.length
            }
        });

    } catch (error) {
        console.error('[EmailController] getEmailThread error:'.red, error);
        res.status(500).json({
            success: false,
            message: 'Internal server error',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};

// Gửi email (reply hoặc email mới)
const sendEmail = async (req, res) => {
    try {
        const { senderId, to, subject, body, isReply = false, originalEmailId } = req.body;

        // Validate required fields
        if (!senderId || !to || !subject || !body) {
            return res.status(400).json({
                success: false,
                message: 'Sender ID, recipient, subject, and body are required'
            });
        }

        // Check if sender exists
        const sender = await Sender.findById(senderId);
        if (!sender) {
            return res.status(404).json({
                success: false,
                message: 'Sender account not found'
            });
        }

        // Create transporter
        const transporter = nodemailer.createTransport({
            host: sender.smtpHost,
            port: sender.smtpPort,
            secure: sender.smtpSecure,
            auth: {
                user: sender.email,
                pass: sender.password
            }
        });

        // Prepare email content
        const mailOptions = {
            from: `"${sender.name || sender.email}" <${sender.email}>`,
            to: to,
            subject: subject,
            text: body,
            html: body.replace(/\n/g, '<br>') // Convert line breaks to HTML
        };

        // Send email
        const info = await transporter.sendMail(mailOptions);

        console.log(`[EmailController] Email sent successfully:`.green, {
            messageId: info.messageId,
            from: sender.email,
            to: to,
            subject: subject,
            isReply: isReply
        });

        // If this is a reply, optionally update the original email
        if (isReply && originalEmailId) {
            try {
                await Email.findByIdAndUpdate(originalEmailId, {
                    $set: { hasReplies: true, lastRepliedAt: new Date() }
                });
            } catch (updateError) {
                console.warn('[EmailController] Failed to update original email reply status:'.yellow, updateError.message);
            }
        }

        res.json({
            success: true,
            message: 'Email sent successfully',
            data: {
                messageId: info.messageId,
                from: sender.email,
                to: to,
                subject: subject,
                isReply: isReply
            }
        });

    } catch (error) {
        console.error('[EmailController] sendEmail error:'.red, error);
        
        // Handle specific SMTP errors
        if (error.code === 'EAUTH') {
            return res.status(401).json({
                success: false,
                message: 'Authentication failed. Please check your email credentials.'
            });
        } else if (error.code === 'ECONNECTION') {
            return res.status(503).json({
                success: false,
                message: 'Connection failed. Please check your SMTP settings.'
            });
        }

        res.status(500).json({
            success: false,
            message: 'Failed to send email',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};

module.exports = {
    getEmails,
    getEmailById,
    fetchEmailsFromServer,
    markAsRead,
    moveToFolder,
    deleteEmail,
    permanentlyDeleteEmail,
    getEmailStats,
    toggleEmailSync,
    bulkOperations,
    searchEmails,
    getEmailThread,
    sendEmail
}; 