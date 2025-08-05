const Queue = require('bull');
const Email = require('../models/emailModel');
const Sender = require('../models/senderModel');
const emailService = require('./emailService');
const colors = require('colors');

class EmailSyncQueue {
    constructor() {
        this.syncQueue = new Queue('email-sync', {
            redis: {
                host: process.env.REDIS_HOST || 'localhost',
                port: process.env.REDIS_PORT || 6379,
                password: process.env.REDIS_PASSWORD
            },
            defaultJobOptions: {
                removeOnComplete: 100,
                removeOnFail: 50,
                attempts: 3,
                backoff: {
                    type: 'exponential',
                    delay: 2000
                }
            }
        });

        // Process jobs with concurrency limit
        this.syncQueue.process(5, this.processSyncJob.bind(this));
        
        // Event handlers
        this.syncQueue.on('completed', this.onJobCompleted.bind(this));
        this.syncQueue.on('failed', this.onJobFailed.bind(this));
        this.syncQueue.on('stalled', this.onJobStalled.bind(this));
        this.syncQueue.on('error', this.onQueueError.bind(this));
    }

    // Add sync job to queue
    async addSyncJob(senderId, options = {}) {
        try {
            const job = await this.syncQueue.add('sync-emails', {
                senderId,
                timestamp: new Date(),
                ...options
            }, {
                priority: options.priority || 1,
                delay: options.delay || 0,
                attempts: options.attempts || 3
            });

            console.log(`[EmailSyncQueue] Added sync job for sender ${senderId}`.cyan);
            return job;
        } catch (error) {
            console.error(`[EmailSyncQueue] Error adding sync job:`.red, error);
            throw error;
        }
    }

    // Process sync job
    async processSyncJob(job) {
        const { senderId, folder = 'INBOX', limit = 50 } = job.data;
        
        console.log(`[EmailSyncQueue] Processing sync job for sender ${senderId}`.yellow);
        
        try {
            // Check if sender exists and sync is enabled
            const sender = await Sender.findById(senderId);
            if (!sender) {
                throw new Error('Sender not found');
            }

            if (!sender.isEmailSyncEnabled) {
                throw new Error('Email sync is not enabled for this sender');
            }

            // Fetch emails
            const fetchedEmails = await emailService.fetchEmails(senderId, folder, limit);
            
            // Update job progress
            await job.progress(100);
            
            console.log(`[EmailSyncQueue] Successfully synced ${fetchedEmails.length} emails for sender ${senderId}`.green);
            
            return {
                senderId,
                fetchedCount: fetchedEmails.length,
                timestamp: new Date()
            };

        } catch (error) {
            console.error(`[EmailSyncQueue] Error processing sync job:`.red, error);
            throw error;
        }
    }

    // Job completed handler
    onJobCompleted(job, result) {
        console.log(`[EmailSyncQueue] Job ${job.id} completed successfully`.green);
        console.log(`[EmailSyncQueue] Result:`, result);
    }

    // Job failed handler
    onJobFailed(job, err) {
        console.error(`[EmailSyncQueue] Job ${job.id} failed:`.red, err);
        
        // Log detailed error information
        console.error(`[EmailSyncQueue] Job data:`, job.data);
        console.error(`[EmailSyncQueue] Error stack:`, err.stack);
    }

    // Job stalled handler
    onJobStalled(job) {
        console.warn(`[EmailSyncQueue] Job ${job.id} stalled`.yellow);
    }

    // Queue error handler
    onQueueError(error) {
        console.error(`[EmailSyncQueue] Queue error:`.red, error);
    }

    // Batch sync multiple senders
    async batchSyncSenders(senderIds, options = {}) {
        const jobs = [];
        
        for (const senderId of senderIds) {
            try {
                const job = await this.addSyncJob(senderId, options);
                jobs.push(job);
            } catch (error) {
                console.error(`[EmailSyncQueue] Error adding job for sender ${senderId}:`.red, error);
            }
        }

        return jobs;
    }

    // Get queue status
    async getQueueStatus() {
        try {
            const waiting = await this.syncQueue.getWaiting();
            const active = await this.syncQueue.getActive();
            const completed = await this.syncQueue.getCompleted();
            const failed = await this.syncQueue.getFailed();

            return {
                waiting: waiting.length,
                active: active.length,
                completed: completed.length,
                failed: failed.length,
                total: waiting.length + active.length + completed.length + failed.length
            };
        } catch (error) {
            console.error(`[EmailSyncQueue] Error getting queue status:`.red, error);
            throw error;
        }
    }

    // Pause queue
    async pauseQueue() {
        try {
            await this.syncQueue.pause();
            console.log(`[EmailSyncQueue] Queue paused`.yellow);
        } catch (error) {
            console.error(`[EmailSyncQueue] Error pausing queue:`.red, error);
            throw error;
        }
    }

    // Resume queue
    async resumeQueue() {
        try {
            await this.syncQueue.resume();
            console.log(`[EmailSyncQueue] Queue resumed`.green);
        } catch (error) {
            console.error(`[EmailSyncQueue] Error resuming queue:`.red, error);
            throw error;
        }
    }

    // Clean up old jobs
    async cleanupOldJobs() {
        try {
            const completedCount = await this.syncQueue.clean(24 * 60 * 60 * 1000, 'completed');
            const failedCount = await this.syncQueue.clean(24 * 60 * 60 * 1000, 'failed');
            
            console.log(`[EmailSyncQueue] Cleaned up ${completedCount} completed jobs and ${failedCount} failed jobs`.cyan);
            
            return { completedCount, failedCount };
        } catch (error) {
            console.error(`[EmailSyncQueue] Error cleaning up jobs:`.red, error);
            throw error;
        }
    }

    // Get job details
    async getJobDetails(jobId) {
        try {
            const job = await this.syncQueue.getJob(jobId);
            if (!job) {
                return null;
            }

            return {
                id: job.id,
                data: job.data,
                progress: job.progress(),
                status: await job.getState(),
                timestamp: job.timestamp,
                processedOn: job.processedOn,
                finishedOn: job.finishedOn,
                failedReason: job.failedReason
            };
        } catch (error) {
            console.error(`[EmailSyncQueue] Error getting job details:`.red, error);
            throw error;
        }
    }

    // Remove job
    async removeJob(jobId) {
        try {
            const job = await this.syncQueue.getJob(jobId);
            if (job) {
                await job.remove();
                console.log(`[EmailSyncQueue] Removed job ${jobId}`.cyan);
                return true;
            }
            return false;
        } catch (error) {
            console.error(`[EmailSyncQueue] Error removing job:`.red, error);
            throw error;
        }
    }

    // Retry failed job
    async retryJob(jobId) {
        try {
            const job = await this.syncQueue.getJob(jobId);
            if (job && job.failedReason) {
                await job.retry();
                console.log(`[EmailSyncQueue] Retrying job ${jobId}`.yellow);
                return true;
            }
            return false;
        } catch (error) {
            console.error(`[EmailSyncQueue] Error retrying job:`.red, error);
            throw error;
        }
    }

    // Close queue
    async close() {
        try {
            await this.syncQueue.close();
            console.log(`[EmailSyncQueue] Queue closed`.cyan);
        } catch (error) {
            console.error(`[EmailSyncQueue] Error closing queue:`.red, error);
            throw error;
        }
    }
}

module.exports = new EmailSyncQueue(); 