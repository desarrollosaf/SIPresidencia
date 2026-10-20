import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { P6Module } from '../p6/p6.module';
import { SpidAuthGuard } from './spid-auth.guard';
import { SpidController } from './spid.controller';

@Module({
  imports: [HttpModule, P6Module],
  controllers: [SpidController],
  providers: [SpidAuthGuard],
})
export class SpidModule {}
