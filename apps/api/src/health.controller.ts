import { Controller, Get, ServiceUnavailableException } from '@nestjs/common';
import { Public } from './core/auth/decorators/public.decorator';
import { PrismaService } from './core/database/prisma.service';
import { RedisService } from './core/redis/redis.service';

@Controller()
export class HealthController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly redisService: RedisService,
  ) {}

  @Public()
  @Get('health')
  async healthCheck() {
    const [database, redis] = await Promise.all([
      this.checkDatabase(),
      this.redisService.healthCheck(),
    ]);

    if (!database || !redis) {
      throw new ServiceUnavailableException({
        status: 'unhealthy',
        dependencies: { database, redis },
      });
    }

    return {
      status: 'ok',
      dependencies: { database, redis },
    };
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
