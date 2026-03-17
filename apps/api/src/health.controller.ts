import { Controller, Get, HttpStatus, Res } from '@nestjs/common';
import { Response } from 'express';
import { Public } from './core/auth/decorators/public.decorator';
import { PrismaService } from './core/database/prisma.service';
import { RedisService } from './core/redis/redis.service';

interface HealthStatus {
  status: 'ok' | 'unhealthy';
  timestamp: string;
  uptime: number;
  dependencies: {
    database: boolean;
    redis: boolean;
  };
}

@Controller()
export class HealthController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly redisService: RedisService,
  ) {}

  @Public()
  @Get('health')
  async healthCheck(@Res() res: Response): Promise<void> {
    const [database, redis] = await Promise.all([
      this.checkDatabase(),
      this.redisService.healthCheck(),
    ]);

    const healthy = database && redis;

    const body: HealthStatus = {
      status: healthy ? 'ok' : 'unhealthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      dependencies: { database, redis },
    };

    res.status(healthy ? HttpStatus.OK : HttpStatus.SERVICE_UNAVAILABLE).json(body);
  }

  private async checkDatabase(): Promise<boolean> {
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      return true;
    } catch (_error) {
      return false;
    }
  }
}
