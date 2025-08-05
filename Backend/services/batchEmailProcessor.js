const { EventEmitter } = require('events');
const Email = require('../models/emailModel');
const colors = require('colors');

class BatchEmailProcessor extends EventEmitter {
    constructor() {
        super();
        this.batchSize = 50; // Emails processed per batch
        this.maxConcurrentBatches = 3; // Concurrent batches
        this.processingDelay = 1000; // Delay between batches
        this.activeBatches = 0;
        this.queue = [];
        this.isProcessing = false;
        this.stats = {
            totalProcessed: 0,
            totalBatches: 0,
            totalErrors: 0,
            startTime: null,
            endTime: null
        };
    }

    // Add emails to processing queue
    addEmailsToQueue(emails, sender) {
        if (!Array.isArray(emails)) {
            emails = [emails];
        }

        const emailChunks = this.chunkArray(emails, this.batchSize);
        
        emailChunks.forEach((chunk, index) => {
            this.queue.push({
                emails: chunk,
                sender: sender,
                batchIndex: index,
                priority: this.calculatePriority(chunk, sender)
            });
        });

        console.log(`[BatchProcessor] Added ${emails.length} emails in ${emailChunks.length} batches to queue`.cyan);
        
        // Start processing if not already running
        if (!this.isProcessing) {
            this.startProcessing();
        }

        return emailChunks.length;
    }

    // Start processing queue
    async startProcessing() {
        if (this.isProcessing) {
            return;
        }

        this.isProcessing = true;
        this.stats.startTime = new Date();
        console.log(`[BatchProcessor] Starting batch processing`.green);

        this.emit('processingStarted', {
            queueLength: this.queue.length,
            batchSize: this.batchSize,
            maxConcurrentBatches: this.maxConcurrentBatches
        });

        while (this.queue.length > 0 && this.activeBatches < this.maxConcurrentBatches) {
            const batch = this.queue.shift();
            this.activeBatches++;
            
            this.processBatch(batch).catch(error => {
                console.error(`[BatchProcessor] Batch processing error:`.red, error);
                this.stats.totalErrors++;
            });
        }

        // Wait for all active batches to complete
        while (this.activeBatches > 0) {
            await this.delay(100);
        }

        this.isProcessing = false;
        this.stats.endTime = new Date();
        
        console.log(`[BatchProcessor] Batch processing completed`.green);
        console.log(`[BatchProcessor] Stats:`, this.stats);

        this.emit('processingCompleted', this.stats);
    }

    // Process a single batch
    async processBatch(batch) {
        const { emails, sender, batchIndex } = batch;
        
        console.log(`[BatchProcessor] Processing batch ${batchIndex} with ${emails.length} emails`.yellow);

        try {
            const startTime = Date.now();
            const results = await this.processChunk(emails, sender);
            const endTime = Date.now();

            this.stats.totalProcessed += results.successCount;
            this.stats.totalBatches++;

            console.log(`[BatchProcessor] Batch ${batchIndex} completed in ${endTime - startTime}ms`.green);
            console.log(`[BatchProcessor] Success: ${results.successCount}, Errors: ${results.errorCount}`);

            this.emit('batchCompleted', {
                batchIndex,
                results,
                duration: endTime - startTime
            });

            // Add delay between batches to prevent overwhelming the database
            await this.delay(this.processingDelay);

        } catch (error) {
            console.error(`[BatchProcessor] Error processing batch ${batchIndex}:`.red, error);
            this.stats.totalErrors++;
            
            this.emit('batchError', {
                batchIndex,
                error: error.message
            });
        } finally {
            this.activeBatches--;
            
            // Process next batch if available
            if (this.queue.length > 0 && this.activeBatches < this.maxConcurrentBatches) {
                const nextBatch = this.queue.shift();
                this.activeBatches++;
                this.processBatch(nextBatch).catch(error => {
                    console.error(`[BatchProcessor] Next batch processing error:`.red, error);
                    this.stats.totalErrors++;
                });
            }
        }
    }

    // Process a chunk of emails
    async processChunk(emails, sender) {
        const results = {
            successCount: 0,
            errorCount: 0,
            errors: []
        };

        for (const emailData of emails) {
            try {
                await this.processSingleEmail(emailData, sender);
                results.successCount++;
            } catch (error) {
                results.errorCount++;
                results.errors.push({
                    emailId: emailData.messageId,
                    error: error.message
                });
                console.error(`[BatchProcessor] Error processing email ${emailData.messageId}:`.red, error);
            }
        }

        return results;
    }

    // Process a single email
    async processSingleEmail(emailData, sender) {
        try {
            // Check if email already exists
            const existingEmail = await Email.findOne({ 
                messageId: emailData.messageId,
                senderAccountId: sender._id
            });

            if (existingEmail) {
                return existingEmail; // Skip if already exists
            }

            // Set sender info
            emailData.senderAccountId = sender._id;
            emailData.accountEmail = sender.email;

            // Auto categorize if not set
            if (!emailData.autoCategory || emailData.autoCategory === 'other') {
                emailData.autoCategory = this.categorizeEmail(emailData);
            }

            // Set priority based on sender category
            emailData.priority = this.calculatePriority([emailData], sender);

            // Create email
            const savedEmail = await Email.create(emailData);
            
            return savedEmail;

        } catch (error) {
            console.error(`[BatchProcessor] Error saving email:`.red, error);
            throw error;
        }
    }

    // Categorize email
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

    // Calculate priority for batch
    calculatePriority(emails, sender) {
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
        const urgentEmails = emails.filter(email => {
            const subject = (email.subject || '').toLowerCase();
            return subject.includes('urgent') || subject.includes('important');
        });

        if (urgentEmails.length > 0) {
            priority += 2;
        }

        return priority;
    }

    // Utility methods
    chunkArray(array, size) {
        const chunks = [];
        for (let i = 0; i < array.length; i += size) {
            chunks.push(array.slice(i, i + size));
        }
        return chunks;
    }

    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    // Get queue status
    getQueueStatus() {
        return {
            isProcessing: this.isProcessing,
            queueLength: this.queue.length,
            activeBatches: this.activeBatches,
            maxConcurrentBatches: this.maxConcurrentBatches,
            batchSize: this.batchSize,
            stats: this.stats
        };
    }

    // Pause processing
    pause() {
        this.isProcessing = false;
        console.log(`[BatchProcessor] Processing paused`.yellow);
        this.emit('processingPaused');
    }

    // Resume processing
    resume() {
        if (!this.isProcessing && this.queue.length > 0) {
            this.startProcessing();
        }
    }

    // Clear queue
    clearQueue() {
        this.queue = [];
        console.log(`[BatchProcessor] Queue cleared`.yellow);
        this.emit('queueCleared');
    }

    // Update batch size
    updateBatchSize(newSize) {
        if (newSize > 0 && newSize <= 200) {
            this.batchSize = newSize;
            console.log(`[BatchProcessor] Batch size updated to ${newSize}`.cyan);
        }
    }

    // Update max concurrent batches
    updateMaxConcurrentBatches(newMax) {
        if (newMax > 0 && newMax <= 10) {
            this.maxConcurrentBatches = newMax;
            console.log(`[BatchProcessor] Max concurrent batches updated to ${newMax}`.cyan);
        }
    }

    // Reset statistics
    resetStats() {
        this.stats = {
            totalProcessed: 0,
            totalBatches: 0,
            totalErrors: 0,
            startTime: null,
            endTime: null
        };
        console.log(`[BatchProcessor] Statistics reset`.cyan);
    }

    // Get processing statistics
    getStatistics() {
        const duration = this.stats.endTime && this.stats.startTime 
            ? this.stats.endTime - this.stats.startTime 
            : 0;

        return {
            ...this.stats,
            duration,
            averageTimePerEmail: this.stats.totalProcessed > 0 
                ? duration / this.stats.totalProcessed 
                : 0,
            successRate: this.stats.totalProcessed > 0 
                ? ((this.stats.totalProcessed - this.stats.totalErrors) / this.stats.totalProcessed) * 100 
                : 0
        };
    }
}

module.exports = new BatchEmailProcessor(); 