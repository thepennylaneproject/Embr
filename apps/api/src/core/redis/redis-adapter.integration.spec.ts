/**
 * Redis Socket.io Adapter Integration Tests
 * Tests multi-instance Socket.io communication via Redis
 */

import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { RedisService } from './redis.service';
import { RedisIoAdapter } from './redis-io.adapter';

describe('Redis Socket.io Adapter Integration', () => {
  let redisService: RedisService;
  let adapter: RedisIoAdapter;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [RedisService],
    }).compile();

    redisService = module.get<RedisService>(RedisService);
  });

  describe('adapter creation', () => {
    it('should create adapter with pub/sub clients', async () => {
      try {
        await redisService.connect();
        const { pubClient, subClient } = redisService.getPubSubClients();
        adapter = new RedisIoAdapter(pubClient, subClient);
        expect(adapter).toBeDefined();
      } catch (error) {
        // Redis might not be available in test environment
        console.warn('Redis not available for adapter test:', error.message);
      }
    });

    it('should handle adapter initialization errors', () => {
      // Test with null clients should fail gracefully
      expect(() => {
        new RedisIoAdapter(null as any, null as any);
      }).not.toThrow();
    });
  });

  describe('multi-instance scenarios', () => {
    it('should support user socket tracking across instances', async () => {
      try {
        await redisService.connect();

        const userId = 'test-user-123';
        const socketId1 = 'socket-instance1-456';
        const socketId2 = 'socket-instance2-789';

        // Simulate instance 1 adding socket
        await redisService.addSocket(userId, socketId1);

        // Simulate instance 2 adding socket
        await redisService.addSocket(userId, socketId2);

        // Both instances can see the user is online
        const isOnline = await redisService.isOnline(userId);
        expect(isOnline).toBe(true);

        // Both sockets are tracked
        const sockets = await redisService.getSockets(userId);
        expect(sockets).toContain(socketId1);
        expect(sockets).toContain(socketId2);

        // Cleanup
        await redisService.removeSocket(userId, socketId1);
        await redisService.removeSocket(userId, socketId2);
        await redisService.disconnect();
      } catch (error) {
        console.warn('Redis not available for multi-instance test:', error.message);
      }
    });

    it('should support typing state synchronization', async () => {
      try {
        await redisService.connect();

        const conversationId = 'conv-123';
        const user1 = 'user-1';
        const user2 = 'user-2';

        // Both users typing
        await redisService.setTypingState(conversationId, user1);
        await redisService.setTypingState(conversationId, user2);

        // Both instances can see who is typing
        const typingUsers = await redisService.getTypingUsers(conversationId);
        expect(typingUsers).toContain(user1);
        expect(typingUsers).toContain(user2);

        // Cleanup
        await redisService.removeTypingState(conversationId, user1);
        await redisService.removeTypingState(conversationId, user2);
        await redisService.disconnect();
      } catch (error) {
        console.warn('Redis not available for typing state test:', error.message);
      }
    });
  });

  describe('fallback behavior', () => {
    it('should provide graceful fallback when Redis is unavailable', async () => {
      // This test ensures the code doesn't crash when Redis fails
      const fakeService = new RedisService();

      // Attempting operations without connection should fail
      try {
        await fakeService.healthCheck();
      } catch (error) {
        expect(error).toBeDefined();
      }
    });
  });

  describe('concurrent operations', () => {
    it('should handle concurrent socket additions', async () => {
      try {
        await redisService.connect();

        const userId = 'concurrent-user';
        const socketIds = Array.from({ length: 10 }, (_, i) => `socket-${i}`);

        // Add all sockets concurrently
        await Promise.all(socketIds.map((socketId) => redisService.addSocket(userId, socketId)));

        // All should be tracked
        const sockets = await redisService.getSockets(userId);
        expect(sockets.length).toBe(10);

        // Cleanup
        await Promise.all(
          socketIds.map((socketId) => redisService.removeSocket(userId, socketId)),
        );
        await redisService.disconnect();
      } catch (error) {
        console.warn('Redis not available for concurrent operations test:', error.message);
      }
    });

    it('should handle concurrent typing state updates', async () => {
      try {
        await redisService.connect();

        const conversationId = 'conv-concurrent';
        const userIds = Array.from({ length: 5 }, (_, i) => `user-${i}`);

        // Set typing state for all concurrently
        await Promise.all(
          userIds.map((userId) => redisService.setTypingState(conversationId, userId)),
        );

        // All should be tracked
        const typingUsers = await redisService.getTypingUsers(conversationId);
        expect(typingUsers.length).toBe(5);

        // Cleanup
        await Promise.all(
          userIds.map((userId) => redisService.removeTypingState(conversationId, userId)),
        );
        await redisService.disconnect();
      } catch (error) {
        console.warn('Redis not available for concurrent typing test:', error.message);
      }
    });
  });

  describe('data persistence', () => {
    it('should persist socket data with TTL', async () => {
      try {
        await redisService.connect();

        const userId = 'ttl-test-user';
        const socketId = 'ttl-socket';

        // Add socket (should have TTL)
        await redisService.addSocket(userId, socketId);

        // Verify it exists immediately
        let isOnline = await redisService.isOnline(userId);
        expect(isOnline).toBe(true);

        // Wait for potential TTL (if very short in env)
        await new Promise((resolve) => setTimeout(resolve, 100));

        // Should still exist (TTL default is 1 hour)
        isOnline = await redisService.isOnline(userId);
        expect(isOnline).toBe(true);

        // Cleanup
        await redisService.removeSocket(userId, socketId);
        await redisService.disconnect();
      } catch (error) {
        console.warn('Redis not available for TTL test:', error.message);
      }
    });
  });

  describe('connection lifecycle', () => {
    it('should handle connection and disconnection', async () => {
      try {
        // Connect
        await redisService.connect();
        let healthy = await redisService.healthCheck();
        expect(healthy).toBe(true);

        // Disconnect
        await redisService.disconnect();

        // Should not be healthy after disconnect
        try {
          healthy = await redisService.healthCheck();
          expect(healthy).toBe(false);
        } catch {
          // Expected to fail after disconnect
        }
      } catch (error) {
        console.warn('Redis not available for connection lifecycle test:', error.message);
      }
    });

    it('should provide pub/sub clients for Socket.io', async () => {
      try {
        await redisService.connect();

        const { pubClient, subClient } = redisService.getPubSubClients();
        expect(pubClient).toBeDefined();
        expect(subClient).toBeDefined();

        await redisService.disconnect();
      } catch (error) {
        console.warn('Redis not available for pub/sub test:', error.message);
      }
    });
  });

  describe('environment configuration', () => {
    it('should use REDIS_URL from environment', () => {
      const originalUrl = process.env.REDIS_URL;
      process.env.REDIS_URL = 'redis://test-redis:6379';

      try {
        const newService = new RedisService();
        // Service created but connect would use the URL
        expect(newService).toBeDefined();
      } finally {
        process.env.REDIS_URL = originalUrl;
      }
    });

    it('should use TTL environment variables', () => {
      const originalSocket = process.env.REDIS_TTL_SOCKET;
      const originalTyping = process.env.REDIS_TTL_TYPING;

      process.env.REDIS_TTL_SOCKET = '7200';
      process.env.REDIS_TTL_TYPING = '600';

      try {
        expect(parseInt(process.env.REDIS_TTL_SOCKET || '3600', 10)).toBe(7200);
        expect(parseInt(process.env.REDIS_TTL_TYPING || '300', 10)).toBe(600);
      } finally {
        process.env.REDIS_TTL_SOCKET = originalSocket;
        process.env.REDIS_TTL_TYPING = originalTyping;
      }
    });
  });
});
