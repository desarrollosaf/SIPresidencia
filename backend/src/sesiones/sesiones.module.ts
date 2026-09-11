import { Module } from '@nestjs/common';
import { RegistroParlamentarioModule } from '../registro-parlamentario/registro-parlamentario.module';
import { JwtAuthModule } from '../auth/jwt-auth.module';
import { SesionesController } from './sesiones.controller';
import { SesionesService } from './sesiones.service';

@Module({
  imports: [RegistroParlamentarioModule, JwtAuthModule],
  controllers: [SesionesController],
  providers: [SesionesService],
})
export class SesionesModule {}
