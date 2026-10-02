import { Module } from '@nestjs/common';
import { JwtAuthModule } from '../auth/jwt-auth.module';
import { P6Controller } from './p6.controller';
import { P6Gateway } from './p6.gateway';

@Module({
  imports: [JwtAuthModule],
  controllers: [P6Controller],
  providers: [P6Gateway],
})
export class P6Module {}
