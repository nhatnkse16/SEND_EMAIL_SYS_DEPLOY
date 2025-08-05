const Imap = require('imap');
const colors = require('colors');

class ConnectionPool {
    constructor() {
        this.pools = new Map();
        this.maxConnections = 3; // Max connections per sender
        this.connectionTimeout = 30000;
        this.idleTimeout = 60000;
        this.cleanupInterval = 300000; // 5 minutes
        
        // Start cleanup interval
        this.startCleanupInterval();
    }

    // Create connection pool for a sender
    createPool(senderId) {
        if (this.pools.has(senderId)) {
            return this.pools.get(senderId);
        }

        const pool = {
            connections: [],
            waiting: [],
            maxConnections: this.maxConnections,
            senderId: senderId
        };

        this.pools.set(senderId, pool);
        console.log(`[ConnectionPool] Created pool for sender ${senderId}`.cyan);
        
        return pool;
    }

    // Get connection from pool
    async getConnection(sender, timeout = this.connectionTimeout) {
        const pool = this.createPool(sender._id);
        
        // Check if we have an available connection
        const availableConnection = pool.connections.find(conn => 
            conn.status === 'idle' && !conn.inUse
        );

        if (availableConnection) {
            availableConnection.inUse = true;
            availableConnection.lastUsed = Date.now();
            console.log(`[ConnectionPool] Reusing connection for sender ${sender._id}`.green);
            return availableConnection;
        }

        // Check if we can create a new connection
        if (pool.connections.length < pool.maxConnections) {
            const connection = await this.createNewConnection(sender);
            pool.connections.push(connection);
            connection.inUse = true;
            connection.lastUsed = Date.now();
            console.log(`[ConnectionPool] Created new connection for sender ${sender._id}`.green);
            return connection;
        }

        // Wait for a connection to become available
        return new Promise((resolve, reject) => {
            const timeoutId = setTimeout(() => {
                const index = pool.waiting.findIndex(w => w.resolve === resolve);
                if (index !== -1) {
                    pool.waiting.splice(index, 1);
                }
                reject(new Error('Connection timeout'));
            }, timeout);

            pool.waiting.push({
                resolve: (connection) => {
                    clearTimeout(timeoutId);
                    resolve(connection);
                },
                reject: (error) => {
                    clearTimeout(timeoutId);
                    reject(error);
                },
                timestamp: Date.now()
            });
        });
    }

    // Create new IMAP connection
    async createNewConnection(sender) {
        return new Promise((resolve, reject) => {
            if (!sender.imapHost) {
                reject(new Error('IMAP host not configured'));
                return;
            }

            const connection = {
                id: `${sender._id}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
                senderId: sender._id,
                imap: null,
                status: 'connecting',
                inUse: false,
                lastUsed: Date.now(),
                createdAt: Date.now(),
                errorCount: 0
            };

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

            const timeout = setTimeout(() => {
                imap.end();
                reject(new Error('IMAP connection timeout'));
            }, this.connectionTimeout);

            imap.once('ready', () => {
                clearTimeout(timeout);
                connection.status = 'idle';
                connection.imap = imap;
                console.log(`[ConnectionPool] Connection ready for sender ${sender._id}`.green);
                resolve(connection);
            });

            imap.once('error', (err) => {
                clearTimeout(timeout);
                connection.status = 'error';
                connection.errorCount++;
                console.error(`[ConnectionPool] Connection error for sender ${sender._id}:`.red, err);
                reject(err);
            });

            imap.once('end', () => {
                clearTimeout(timeout);
                connection.status = 'closed';
                console.log(`[ConnectionPool] Connection ended for sender ${sender._id}`.yellow);
                this.removeConnection(sender._id, connection.id);
            });

            imap.connect();
        });
    }

    // Release connection back to pool
    releaseConnection(senderId, connectionId) {
        const pool = this.pools.get(senderId);
        if (!pool) {
            return;
        }

        const connection = pool.connections.find(conn => conn.id === connectionId);
        if (connection) {
            connection.inUse = false;
            connection.lastUsed = Date.now();
            console.log(`[ConnectionPool] Released connection ${connectionId} for sender ${senderId}`.cyan);

            // Check if there are waiting requests
            if (pool.waiting.length > 0) {
                const waiting = pool.waiting.shift();
                waiting.resolve(connection);
            }
        }
    }

    // Remove connection from pool
    removeConnection(senderId, connectionId) {
        const pool = this.pools.get(senderId);
        if (!pool) {
            return;
        }

        const index = pool.connections.findIndex(conn => conn.id === connectionId);
        if (index !== -1) {
            const connection = pool.connections[index];
            if (connection.imap) {
                connection.imap.end();
            }
            pool.connections.splice(index, 1);
            console.log(`[ConnectionPool] Removed connection ${connectionId} from sender ${senderId}`.yellow);
        }

        // If no connections left, remove the pool
        if (pool.connections.length === 0) {
            this.pools.delete(senderId);
            console.log(`[ConnectionPool] Removed empty pool for sender ${senderId}`.yellow);
        }
    }

    // Cleanup idle connections
    cleanupIdleConnections() {
        const now = Date.now();
        let cleanedCount = 0;

        for (const [senderId, pool] of this.pools.entries()) {
            const idleConnections = pool.connections.filter(conn => 
                !conn.inUse && (now - conn.lastUsed) > this.idleTimeout
            );

            idleConnections.forEach(conn => {
                this.removeConnection(senderId, conn.id);
                cleanedCount++;
            });
        }

        if (cleanedCount > 0) {
            console.log(`[ConnectionPool] Cleaned up ${cleanedCount} idle connections`.cyan);
        }
    }

    // Start cleanup interval
    startCleanupInterval() {
        setInterval(() => {
            this.cleanupIdleConnections();
        }, this.cleanupInterval);
    }

    // Get pool status
    getPoolStatus(senderId) {
        const pool = this.pools.get(senderId);
        if (!pool) {
            return null;
        }

        return {
            senderId: pool.senderId,
            totalConnections: pool.connections.length,
            maxConnections: pool.maxConnections,
            idleConnections: pool.connections.filter(conn => !conn.inUse).length,
            activeConnections: pool.connections.filter(conn => conn.inUse).length,
            waitingRequests: pool.waiting.length,
            connections: pool.connections.map(conn => ({
                id: conn.id,
                status: conn.status,
                inUse: conn.inUse,
                lastUsed: conn.lastUsed,
                createdAt: conn.createdAt,
                errorCount: conn.errorCount
            }))
        };
    }

    // Get all pools status
    getAllPoolsStatus() {
        const status = {};
        for (const [senderId, pool] of this.pools.entries()) {
            status[senderId] = this.getPoolStatus(senderId);
        }
        return status;
    }

    // Close all connections
    async closeAllConnections() {
        console.log(`[ConnectionPool] Closing all connections...`.yellow);
        
        for (const [senderId, pool] of this.pools.entries()) {
            for (const connection of pool.connections) {
                if (connection.imap) {
                    connection.imap.end();
                }
            }
        }

        this.pools.clear();
        console.log(`[ConnectionPool] All connections closed`.green);
    }

    // Reset pool for sender
    resetPool(senderId) {
        const pool = this.pools.get(senderId);
        if (pool) {
            // Close all connections
            pool.connections.forEach(conn => {
                if (conn.imap) {
                    conn.imap.end();
                }
            });

            // Remove pool
            this.pools.delete(senderId);
            console.log(`[ConnectionPool] Reset pool for sender ${senderId}`.yellow);
        }
    }

    // Update pool configuration
    updatePoolConfig(senderId, config) {
        const pool = this.pools.get(senderId);
        if (pool) {
            if (config.maxConnections) {
                pool.maxConnections = config.maxConnections;
            }
            console.log(`[ConnectionPool] Updated pool config for sender ${senderId}`.cyan);
        }
    }

    // Get connection statistics
    getStatistics() {
        let totalConnections = 0;
        let totalActive = 0;
        let totalIdle = 0;
        let totalWaiting = 0;

        for (const pool of this.pools.values()) {
            totalConnections += pool.connections.length;
            totalActive += pool.connections.filter(conn => conn.inUse).length;
            totalIdle += pool.connections.filter(conn => !conn.inUse).length;
            totalWaiting += pool.waiting.length;
        }

        return {
            totalPools: this.pools.size,
            totalConnections,
            totalActive,
            totalIdle,
            totalWaiting,
            pools: this.getAllPoolsStatus()
        };
    }
}

module.exports = new ConnectionPool(); 