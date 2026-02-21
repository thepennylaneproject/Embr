import { Module } from '@nestjs/common';
import { GigsController } from './controllers/gigs.controller';
import { ApplicationsController } from './controllers/applications.controller';
import { EscrowController } from './controllers/escrow.controller';
import { GigsService } from './services/gigs.service';
import { ApplicationsService } from './services/applications.service';
import { EscrowService } from './services/escrow.service';

@Module({
  controllers: [GigsController, ApplicationsController, EscrowController],
  providers: [GigsService, ApplicationsService, EscrowService],
  exports: [GigsService, ApplicationsService, EscrowService],
})
export class GigsModule {}
