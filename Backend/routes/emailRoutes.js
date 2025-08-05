const express = require('express');
const { body, param, query, validationResult } = require('express-validator');
const router = express.Router();
const {
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
} = require('../controllers/emailController');

// Validation middleware
const validateRequest = (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({
            success: false,
            message: 'Validation failed',
            errors: errors.array()
        });
    }
    next();
};

// Validation rules
const senderIdValidation = param('senderId')
    .isMongoId()
    .withMessage('Invalid sender ID format');

const emailIdValidation = param('emailId')
    .isMongoId()
    .withMessage('Invalid email ID format');

const folderValidation = body('folder')
    .optional()
    .isIn(['INBOX', 'SENT', 'DRAFTS', 'TRASH', 'SPAM', 'ARCHIVE'])
    .withMessage('Invalid folder name');

const limitValidation = body('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit must be between 1 and 100');

const enabledValidation = body('enabled')
    .isBoolean()
    .withMessage('Enabled must be a boolean value');

const operationValidation = body('operation')
    .isIn(['markAsRead', 'markAsUnread', 'moveToFolder', 'delete', 'permanentlyDelete'])
    .withMessage('Invalid operation');

const emailIdsValidation = body('emailIds')
    .isArray({ min: 1 })
    .withMessage('Email IDs must be an array with at least one item');

const searchQueryValidation = query('query')
    .isLength({ min: 2 })
    .withMessage('Search query must be at least 2 characters long');

const sendEmailValidation = [
    body('senderId').isMongoId().withMessage('Invalid sender ID format'),
    body('to').isEmail().withMessage('Invalid recipient email format'),
    body('subject').isLength({ min: 1, max: 200 }).withMessage('Subject must be between 1 and 200 characters'),
    body('body').isLength({ min: 1 }).withMessage('Email body cannot be empty'),
    body('isReply').optional().isBoolean().withMessage('isReply must be a boolean value'),
    body('originalEmailId').optional().isMongoId().withMessage('Invalid original email ID format')
];

// Routes

// GET /api/emails/:senderId - Get emails with filters and pagination
router.get('/:senderId',
    [
        senderIdValidation,
        query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
        query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100'),
        query('isRead').optional().isIn(['true', 'false']).withMessage('isRead must be true or false'),
        query('hasAttachments').optional().isIn(['true', 'false']).withMessage('hasAttachments must be true or false'),
        query('isStarred').optional().isIn(['true', 'false']).withMessage('isStarred must be true or false'),
        query('isImportant').optional().isIn(['true', 'false']).withMessage('isImportant must be true or false'),
        query('sortBy').optional().isIn(['receivedAt', 'sentAt', 'subject', 'from.email']).withMessage('Invalid sort field'),
        query('sortOrder').optional().isIn(['asc', 'desc']).withMessage('Sort order must be asc or desc'),
        query('category').optional().isIn(['marketing', 'support', 'sales', 'spam', 'personal', 'other']).withMessage('Invalid category'),
        validateRequest
    ],
    getEmails
);

// GET /api/emails/detail/:emailId - Get email details
router.get('/detail/:emailId',
    [
        emailIdValidation,
        validateRequest
    ],
    getEmailById
);

// POST /api/emails/:senderId/fetch - Fetch emails from IMAP server
router.post('/:senderId/fetch',
    [
        senderIdValidation,
        folderValidation,
        limitValidation,
        validateRequest
    ],
    fetchEmailsFromServer
);

// PUT /api/emails/:emailId/read - Mark email as read/unread
router.put('/:emailId/read',
    [
        emailIdValidation,
        body('isRead').optional().isBoolean().withMessage('isRead must be a boolean value'),
        validateRequest
    ],
    markAsRead
);

// PUT /api/emails/:emailId/move - Move email to different folder
router.put('/:emailId/move',
    [
        emailIdValidation,
        body('folder').isIn(['INBOX', 'SENT', 'DRAFTS', 'TRASH', 'SPAM', 'ARCHIVE']).withMessage('Invalid folder name'),
        validateRequest
    ],
    moveToFolder
);

// DELETE /api/emails/:emailId - Delete email (move to trash)
router.delete('/:emailId',
    [
        emailIdValidation,
        validateRequest
    ],
    deleteEmail
);

// DELETE /api/emails/:emailId/permanent - Permanently delete email
router.delete('/:emailId/permanent',
    [
        emailIdValidation,
        validateRequest
    ],
    permanentlyDeleteEmail
);

// GET /api/emails/:senderId/stats - Get email statistics
router.get('/:senderId/stats',
    [
        senderIdValidation,
        validateRequest
    ],
    getEmailStats
);

// PUT /api/emails/:senderId/sync - Toggle email sync
router.put('/:senderId/sync',
    [
        senderIdValidation,
        enabledValidation,
        validateRequest
    ],
    toggleEmailSync
);

// POST /api/emails/:senderId/bulk - Bulk operations
router.post('/:senderId/bulk',
    [
        senderIdValidation,
        operationValidation,
        emailIdsValidation,
        body('folder').optional().isIn(['INBOX', 'SENT', 'DRAFTS', 'TRASH', 'SPAM', 'ARCHIVE']).withMessage('Invalid folder name'),
        validateRequest
    ],
    bulkOperations
);

// GET /api/emails/:senderId/search - Search emails
router.get('/:senderId/search',
    [
        senderIdValidation,
        searchQueryValidation,
        query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100'),
        validateRequest
    ],
    searchEmails
);

// GET /api/emails/thread/:emailId - Get email thread
router.get('/thread/:emailId',
    [
        emailIdValidation,
        validateRequest
    ],
    getEmailThread
);

// POST /api/emails/send - Send email (reply or new email)
router.post('/send',
    [
        ...sendEmailValidation,
        validateRequest
    ],
    sendEmail
);

// Error handling middleware
router.use((err, req, res, next) => {
    console.error('[EmailRoutes] Error:'.red, err);
    res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
});

module.exports = router; 