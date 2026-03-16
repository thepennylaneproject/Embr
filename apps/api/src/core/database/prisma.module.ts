import { Global, Module } from '@nestjs/common';
import { PrismaService } from './prisma.service';
import { RlsContextService } from './rls-context.service';

@Global()
@Module({
  providers: [RlsContextService, PrismaService],
  exports: [PrismaService, RlsContextService],
})
export class PrismaModule {}
