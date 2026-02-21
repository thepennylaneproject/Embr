import { Module } from '@nestjs/common';
import { FollowsController } from './controllers/follows.controller';
import { UserDiscoveryController } from './controllers/user-discovery.controller';
import { FollowsService } from './services/follows.service';
import { UserDiscoveryService } from './services/user-discovery.service';

@Module({
  controllers: [FollowsController, UserDiscoveryController],
  providers: [FollowsService, UserDiscoveryService],
  exports: [FollowsService, UserDiscoveryService],
})
export class SocialGraphModule {}
