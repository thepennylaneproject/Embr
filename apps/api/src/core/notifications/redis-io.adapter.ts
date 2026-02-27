/**
 * Redis Socket.IO Adapter
 * Enables real-time synchronization across multiple server instances
 * Required for scaled deployments with load balancing
 */

import { IoAdapter } from '@nestjs/platform-socket.io';
import { ServerOptions } from 'socket.io';
import { createAdapter } from '@socket.io/redis-adapter';
import { createClient } from 'redis';
import { Logger } from '@nestjs/common';

export class RedisIoAdapter extends IoAdapter {
  private readonly logger = new Logger(RedisIoAdapter.name);
  private pubClient: any;
  private subClient: any;
  private isInitialized = false;

  async connectToRedis(): Promise<void> {
    if (this.isInitialized) {
      return;
    }

    try {
      const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';

      this.pubClient = createClient({ url: redisUrl });
      this.subClient = this.pubClient.duplicate();

      await Promise.all([this.pubClient.connect(), this.subClient.connect()]);

      this.logger.log('Connected to Redis for Socket.IO adapter');
      this.isInitialized = true;
    } catch (error) {
      this.logger.error(
        `Failed to connect to Redis for Socket.IO: ${error.message}`,
      );
      throw error;
    }
  }

  createIOServer(port: number, options?: ServerOptions) {
    const server = super.createIOServer(port, options);

    // Set up Redis adapter for cross-server communication
    if (this.isInitialized && this.pubClient && this.subClient) {
      server.adapter(createAdapter(this.pubClient, this.subClient));
      this.logger.log('Redis adapter enabled for Socket.IO');
    } else {
      this.logger.warn(
        'Redis adapter not initialized, using in-memory adapter (single instance only)',
      );
    }

    return server;
  }

  async disconnect() {
    try {
      if (this.pubClient) {
        await this.pubClient.disconnect();
      }
      if (this.subClient) {
        await this.subClient.disconnect();
      }
      this.isInitialized = false;
      this.logger.log('Disconnected from Redis');
    } catch (error) {
      this.logger.error(`Error disconnecting from Redis: ${error.message}`);
    }
  }
}
