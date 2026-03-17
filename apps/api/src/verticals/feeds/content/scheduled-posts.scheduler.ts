import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { ScheduledPostsService } from './services/scheduled-posts.service';

@Injectable()
export class ScheduledPostsScheduler {
  private readonly logger = new Logger(ScheduledPostsScheduler.name);

  constructor(private readonly scheduledPostsService: ScheduledPostsService) {}

  /**
   * Poll for due scheduled posts every minute.
   *
   * Minute-level granularity is required because users can schedule posts to
   * go live at a specific time. A coarser interval (e.g. hourly) would cause
   * posts to be published up to an hour late.
   */
  @Cron(CronExpression.EVERY_MINUTE)
  async processScheduledPosts(): Promise<void> {
    try {
      const results = await this.scheduledPostsService.publishDueScheduledPosts();

      if (results.published > 0 || results.failed > 0) {
        this.logger.log(
          `Scheduled posts run complete — published: ${results.published}, failed: ${results.failed}`,
        );
      }

      if (results.errors.length > 0) {
        results.errors.forEach((err) => this.logger.error(err));
      }
    } catch (error) {
      this.logger.error('Scheduled posts processor encountered an unexpected error', error);
    }
  }
}
