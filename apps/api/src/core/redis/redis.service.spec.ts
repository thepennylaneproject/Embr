/**
 * Redis Service Unit Tests
 * Tests Redis client operations and Socket.io integration
 */

import { Test, TestingModule } from '@nestjs/testing';
import { RedisService } from './redis.service';

/**
 * Mock Redis client for testing
 */
const createMockRedisClient = () => ({
  connect: jest.fn().mockResolvedValue(undefined),
  disconnect: jest.fn().mockResolvedValue(undefined),
  quit: jest.fn().mockResolvedValue(undefined),
  ping: jest.fn().mockResolvedValue('PONG'),
  get: jest.fn(),
  set: jest.fn().mockResolvedValue('OK'),
  setEx: jest.fn().mockResolvedValue('OK'),
  del: jest.fn().mockResolvedValue(1),
  sAdd: jest.fn().mockResolvedValue(1),
  sRem: jest.fn().mockResolvedValue(1),
  sMembers: jest.fn().mockResolvedValue([]),
  expire: jest.fn().mockResolvedValue(1),
  keys: jest.fn().mockResolvedValue([]),
  on: jest.fn(),
  duplicate: jest.fn(),
});

describe('RedisService', () => {
  let service: RedisService;
  let mockRedisClient: any;

  beforeEach(async () => {
    mockRedisClient = createMockRedisClient();
    mockRedisClient.duplicate = jest.fn().mockReturnValue(createMockRedisClient());

    // Mock the redis module
    jest.mock('redis', () => ({
      createClient: jest.fn().mockReturnValue(mockRedisClient),
    }));

    const module: TestingModule = await Test.createTestingModule({
      providers: [RedisService],
    }).compile();

    service = module.get<RedisService>(RedisService);
  });

  afterEach(async () => {
    jest.clearAllMocks();
  });

  describe('connect', () => {
    it('should connect to Redis successfully', async () => {
      await service.connect();
      expect(mockRedisClient.connect).toHaveBeenCalled();
    });

    it('should handle connection errors', async () => {
      const error = new Error('Connection failed');
      mockRedisClient.connect = jest.fn().mockRejectedValue(error);

      await expect(service.connect()).rejects.toThrow('Connection failed');
    });
  });

  describe('healthCheck', () => {
    it('should return true for healthy connection', async () => {
      await service.connect();
      const result = await service.healthCheck();
      expect(result).toBe(true);
    });

    it('should return false for failed health check', async () => {
      mockRedisClient.ping = jest.fn().mockRejectedValue(new Error('Connection lost'));
      await service.connect();

      const result = await service.healthCheck();
      expect(result).toBe(false);
    });
  });

  describe('set and get operations', () => {
    beforeEach(async () => {
      await service.connect();
    });

    it('should set a string value', async () => {
      await service.set('test-key', 'test-value');
      expect(mockRedisClient.set).toHaveBeenCalledWith('test-key', 'test-value');
    });

    it('should set a value with TTL', async () => {
      await service.set('test-key', 'test-value', 3600);
      expect(mockRedisClient.setEx).toHaveBeenCalledWith('test-key', 3600, 'test-value');
    });

    it('should set an object value as JSON', async () => {
      const obj = { name: 'test', id: 123 };
      await service.set('test-key', obj);
      expect(mockRedisClient.set).toHaveBeenCalledWith('test-key', JSON.stringify(obj));
    });

    it('should get a value', async () => {
      mockRedisClient.get = jest.fn().mockResolvedValue('test-value');
      const result = await service.get('test-key');
      expect(result).toBe('test-value');
      expect(mockRedisClient.get).toHaveBeenCalledWith('test-key');
    });

    it('should delete a key', async () => {
      const result = await service.del('test-key');
      expect(result).toBe(1);
      expect(mockRedisClient.del).toHaveBeenCalledWith('test-key');
    });
  });

  describe('socket management', () => {
    beforeEach(async () => {
      await service.connect();
    });

    it('should add socket for user', async () => {
      await service.addSocket('user-123', 'socket-456');
      expect(mockRedisClient.sAdd).toHaveBeenCalledWith('user:user-123:sockets', 'socket-456');
      expect(mockRedisClient.expire).toHaveBeenCalled();
    });

    it('should remove socket for user', async () => {
      await service.removeSocket('user-123', 'socket-456');
      expect(mockRedisClient.sRem).toHaveBeenCalledWith('user:user-123:sockets', 'socket-456');
    });

    it('should get sockets for user', async () => {
      mockRedisClient.sMembers = jest
        .fn()
        .mockResolvedValue(['socket-1', 'socket-2', 'socket-3']);

      const result = await service.getSockets('user-123');

      expect(result).toEqual(['socket-1', 'socket-2', 'socket-3']);
      expect(mockRedisClient.sMembers).toHaveBeenCalledWith('user:user-123:sockets');
    });

    it('should check if user is online', async () => {
      mockRedisClient.sMembers = jest.fn().mockResolvedValue(['socket-1']);
      const result = await service.isOnline('user-123');
      expect(result).toBe(true);

      mockRedisClient.sMembers = jest.fn().mockResolvedValue([]);
      const result2 = await service.isOnline('user-123');
      expect(result2).toBe(false);
    });

    it('should get all online users', async () => {
      mockRedisClient.keys = jest
        .fn()
        .mockResolvedValue(['user:user-1:sockets', 'user:user-2:sockets', 'user:user-3:sockets']);

      const result = await service.getOnlineUsers();

      expect(result).toEqual(['user-1', 'user-2', 'user-3']);
    });
  });

  describe('typing state management', () => {
    beforeEach(async () => {
      await service.connect();
    });

    it('should set typing state', async () => {
      await service.setTypingState('conv-123', 'user-456');
      expect(mockRedisClient.setEx).toHaveBeenCalled();
    });

    it('should remove typing state', async () => {
      await service.removeTypingState('conv-123', 'user-456');
      expect(mockRedisClient.del).toHaveBeenCalledWith('typing:conv-123:user-456');
    });

    it('should get typing users for conversation', async () => {
      mockRedisClient.keys = jest
        .fn()
        .mockResolvedValue(['typing:conv-123:user-1', 'typing:conv-123:user-2']);

      const result = await service.getTypingUsers('conv-123');

      expect(result).toEqual(['user-1', 'user-2']);
    });
  });

  describe('user cleanup', () => {
    beforeEach(async () => {
      await service.connect();
    });

    it('should cleanup all user data', async () => {
      mockRedisClient.keys = jest
        .fn()
        .mockResolvedValueOnce(['user:user-123:sockets', 'user:user-123:typing'])
        .mockResolvedValueOnce(['typing:conv-1:user-123', 'typing:conv-2:user-123']);

      await service.cleanupUser('user-123');

      expect(mockRedisClient.del).toHaveBeenCalled();
    });

    it('should handle cleanup errors gracefully', async () => {
      mockRedisClient.keys = jest.fn().mockRejectedValue(new Error('Redis error'));

      await expect(service.cleanupUser('user-123')).rejects.toThrow();
    });
  });

  describe('disconnect', () => {
    beforeEach(async () => {
      await service.connect();
    });

    it('should disconnect from Redis', async () => {
      await service.disconnect();
      expect(mockRedisClient.quit).toHaveBeenCalled();
    });

    it('should handle disconnect errors', async () => {
      mockRedisClient.quit = jest.fn().mockRejectedValue(new Error('Disconnect error'));

      // Should not throw, just log error
      await expect(service.disconnect()).resolves.toBeUndefined();
    });
  });

  describe('error handling', () => {
    beforeEach(async () => {
      await service.connect();
    });

    it('should handle set errors', async () => {
      mockRedisClient.set = jest.fn().mockRejectedValue(new Error('Set failed'));

      await expect(service.set('key', 'value')).rejects.toThrow('Set failed');
    });

    it('should handle get errors', async () => {
      mockRedisClient.get = jest.fn().mockRejectedValue(new Error('Get failed'));

      await expect(service.get('key')).rejects.toThrow('Get failed');
    });

    it('should handle socket operations errors', async () => {
      mockRedisClient.sAdd = jest.fn().mockRejectedValue(new Error('Add socket failed'));

      await expect(service.addSocket('user-123', 'socket-456')).rejects.toThrow(
        'Add socket failed',
      );
    });
  });
});
