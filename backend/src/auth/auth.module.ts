import { Module } from '@nestjs/common';
import { SequelizeModule } from '@nestjs/sequelize';
import { Usuario } from '../database/models/usuario.model';
import { JwtAuthModule } from './jwt-auth.module';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';

@Module({
  imports: [SequelizeModule.forFeature([Usuario]), JwtAuthModule],
  controllers: [AuthController],
  providers: [AuthService],
  exports: [JwtAuthModule],
})
export class AuthModule {}
