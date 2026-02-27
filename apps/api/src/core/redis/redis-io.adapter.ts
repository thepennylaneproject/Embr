/**
 * Redis Socket.io Adapter Factory
 * Creates and configures Socket.io Redis pub/sub adapter for multi-instance deployments
 */

import { IoAdapter } from '@nestjs/platform-socket.io';
import { createAdapter } from '@socket.io/redis-adapter';
import { RedisClientType } from 'redis';
import { Logger } from '@nestjs/common';

export class RedisIoAdapter extends IoAdapter {
  private pubClient: RedisClientType;
  private subClient: RedisClientType;
  private readonly logger = new Logger(RedisIoAdapter.name);

  constructor(pubClient: RedisClientType, subClient: RedisClientType) {
    super();
    this.pubClient = pubClient;
    this.subClient = subClient;
  }

  /**
   * Create IO server with Redis adapter
   */
  createIOServer(port: number, options?: any) {
    const server = super.createIOServer(port, options);

    // Create and attach Redis adapter
    const adapter = createAdapter(this.pubClient, this.subClient);
    server.adapter(adapter);

    this.logger.log(`Redis adapter initialized for Socket.io on port ${port}`);

    // Handle adapter errors
    this.pubClient.on('error', (err) => {
      this.logger.error(`Redis adapter pub client error: ${err.message}`);
    });

    this.subClient.on('error', (err) => {
      this.logger.error(`Redis adapter sub client error: ${err.message}`);
    });

    return server;
  }
}
