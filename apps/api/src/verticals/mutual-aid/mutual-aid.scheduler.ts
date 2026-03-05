import { Injectable } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { MutualAidService } from './services/mutual-aid.service';

@Injectable()
export class MutualAidScheduler {
  constructor(private readonly mutualAidService: MutualAidService) {}

  @Cron(CronExpression.EVERY_HOUR)
  async expireStaleAidPosts() {
    await this.mutualAidService.expireStale();
  }
}
