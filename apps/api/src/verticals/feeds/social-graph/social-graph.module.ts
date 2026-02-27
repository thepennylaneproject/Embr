import { Module } from '@nestjs/common';
import { SafetyModule } from '../../../core/safety/safety.module';
import { FollowsController } from './controllers/follows.controller';
import { UserDiscoveryController } from './controllers/user-discovery.controller';
import { FollowsService } from './services/follows.service';
import { UserDiscoveryService } from './services/user-discovery.service';

@Module({
  imports: [SafetyModule],
  controllers: [FollowsController, UserDiscoveryController],
  providers: [FollowsService, UserDiscoveryService],
  exports: [FollowsService, UserDiscoveryService],
})
export class SocialGraphModule {}
