/**
 * Redis Service
 * Handles Redis operations for caching and Socket.io adapter
 */

import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { createClient, RedisClientType } from 'redis';

@Injectable()
export class RedisService implements OnModuleInit {
  private redisClient: RedisClientType;
  private pubClient: RedisClientType;
  private subClient: RedisClientType;
  private readonly logger = new Logger(RedisService.name);
  private isConnected = false;

  async onModuleInit() {
    await this.connect();
  }

  /**
   * Connect to Redis
   */
  async connect(): Promise<void> {
    try {
      const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';

      // Create main client for general operations
      this.redisClient = createClient({
        url: redisUrl,
        socket: {
          reconnectStrategy: (retries) => Math.min(retries * 50, 500),
        },
      });

      // Create pub/sub clients for Socket.io adapter
      this.pubClient = this.redisClient.duplicate();
      this.subClient = this.redisClient.duplicate();

      // Handle errors
      this.redisClient.on('error', (err) =>
        this.logger.error(`Redis Client Error: ${err}`),
      );
      this.pubClient.on('error', (err) =>
        this.logger.error(`Redis Pub Error: ${err}`),
      );
      this.subClient.on('error', (err) =>
        this.logger.error(`Redis Sub Error: ${err}`),
      );

      // Connect all clients
      await this.redisClient.connect();
      await this.pubClient.connect();
      await this.subClient.connect();

      this.isConnected = true;
      this.logger.log('Redis connected successfully');
    } catch (error) {
      this.logger.error(`Failed to connect to Redis: ${error.message}`);
      this.isConnected = false;
      throw error;
    }
  }

  /**
   * Get Redis client
   */
  getClient(): RedisClientType {
    if (!this.isConnected) {
      throw new Error('Redis client is not connected');
    }
    return this.redisClient;
  }

  /**
   * Get pub/sub clients for Socket.io
   */
  getPubSubClients() {
    if (!this.isConnected) {
      throw new Error('Redis pub/sub clients are not connected');
    }
    return { pubClient: this.pubClient, subClient: this.subClient };
  }

  /**
   * Check Redis connection health
   */
  async healthCheck(): Promise<boolean> {
    try {
      if (!this.isConnected) {
        return false;
      }
      await this.redisClient.ping();
      return true;
    } catch (error) {
      this.logger.error(`Redis health check failed: ${error.message}`);
      return false;
    }
  }

  /**
   * Set a value in Redis
   */
  async set(key: string, value: string | number | object, ttlSeconds?: number): Promise<void> {
    try {
      if (typeof value === 'object') {
        value = JSON.stringify(value);
      }

      if (ttlSeconds) {
        await this.redisClient.setEx(key, ttlSeconds, String(value));
      } else {
        await this.redisClient.set(key, String(value));
      }
    } catch (error) {
      this.logger.error(`Redis set error for key ${key}: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get a value from Redis
   */
  async get(key: string): Promise<string | null> {
    try {
      return await this.redisClient.get(key);
    } catch (error) {
      this.logger.error(`Redis get error for key ${key}: ${error.message}`);
      throw error;
    }
  }

  /**
   * Delete a key from Redis
   */
  async del(key: string): Promise<number> {
    try {
      return await this.redisClient.del(key);
    } catch (error) {
      this.logger.error(`Redis del error for key ${key}: ${error.message}`);
      throw error;
    }
  }

  /**
   * Add socket ID to user's socket set
   */
  async addSocket(userId: string, socketId: string): Promise<void> {
    const key = `user:${userId}:sockets`;
    const ttl = parseInt(process.env.REDIS_TTL_SOCKET || '3600', 10); // 1 hour default

    try {
      await this.redisClient.sAdd(key, socketId);
      await this.redisClient.expire(key, ttl);
    } catch (error) {
      this.logger.error(`Error adding socket for user ${userId}: ${error.message}`);
      throw error;
    }
  }

  /**
   * Remove socket ID from user's socket set
   */
  async removeSocket(userId: string, socketId: string): Promise<void> {
    const key = `user:${userId}:sockets`;

    try {
      await this.redisClient.sRem(key, socketId);
    } catch (error) {
      this.logger.error(`Error removing socket for user ${userId}: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get all socket IDs for a user
   */
  async getSockets(userId: string): Promise<string[]> {
    const key = `user:${userId}:sockets`;

    try {
      const sockets = await this.redisClient.sMembers(key);
      return sockets || [];
    } catch (error) {
      this.logger.error(`Error getting sockets for user ${userId}: ${error.message}`);
      throw error;
    }
  }

  /**
   * Check if user is online (has active sockets)
   */
  async isOnline(userId: string): Promise<boolean> {
    const sockets = await this.getSockets(userId);
    return sockets.length > 0;
  }

  /**
   * Get all online users
   */
  async getOnlineUsers(): Promise<string[]> {
    try {
      const keys = await this.redisClient.keys('user:*:sockets');
      const userIds = keys
        .map((key) => key.match(/^user:(.+):sockets$/)?.[1])
        .filter((userId) => userId !== undefined) as string[];

      return userIds;
    } catch (error) {
      this.logger.error(`Error getting online users: ${error.message}`);
      throw error;
    }
  }

  /**
   * Set typing state for user in conversation
   */
  async setTypingState(conversationId: string, userId: string): Promise<void> {
    const key = `typing:${conversationId}:${userId}`;
    const ttl = parseInt(process.env.REDIS_TTL_TYPING || '300', 10); // 5 minutes default

    try {
      await this.set(key, 'true', ttl);
    } catch (error) {
      this.logger.error(
        `Error setting typing state for user ${userId} in conversation ${conversationId}: ${error.message}`,
      );
      throw error;
    }
  }

  /**
   * Remove typing state for user in conversation
   */
  async removeTypingState(conversationId: string, userId: string): Promise<void> {
    const key = `typing:${conversationId}:${userId}`;

    try {
      await this.del(key);
    } catch (error) {
      this.logger.error(
        `Error removing typing state for user ${userId} in conversation ${conversationId}: ${error.message}`,
      );
      throw error;
    }
  }

  /**
   * Get typing users for a conversation
   */
  async getTypingUsers(conversationId: string): Promise<string[]> {
    try {
      const keys = await this.redisClient.keys(`typing:${conversationId}:*`);
      const userIds = keys
        .map((key) => key.match(/^typing:.+:(.+)$/)?.[1])
        .filter((userId) => userId !== undefined) as string[];

      return userIds;
    } catch (error) {
      this.logger.error(
        `Error getting typing users for conversation ${conversationId}: ${error.message}`,
      );
      throw error;
    }
  }

  /**
   * Cleanup all data for a user
   */
  async cleanupUser(userId: string): Promise<void> {
    try {
      const keys = await this.redisClient.keys(`user:${userId}:*`);
      const typingKeys = await this.redisClient.keys(`typing:*:${userId}`);

      const allKeys = [...keys, ...typingKeys];

      if (allKeys.length > 0) {
        await this.redisClient.del(allKeys);
      }
    } catch (error) {
      this.logger.error(`Error cleaning up user data for ${userId}: ${error.message}`);
      throw error;
    }
  }

  /**
   * Disconnect from Redis
   */
  async disconnect(): Promise<void> {
    try {
      if (this.redisClient) {
        await this.redisClient.quit();
      }
      if (this.pubClient) {
        await this.pubClient.quit();
      }
      if (this.subClient) {
        await this.subClient.quit();
      }
      this.isConnected = false;
      this.logger.log('Redis disconnected');
    } catch (error) {
      this.logger.error(`Error disconnecting from Redis: ${error.message}`);
    }
  }
}
