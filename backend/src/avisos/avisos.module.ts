import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { SequelizeModule } from '@nestjs/sequelize';
import { JwtAuthModule } from '../auth/jwt-auth.module';
import { ContactoAviso } from '../database/models/contacto-aviso.model';
import { Usuario } from '../database/models/usuario.model';
import { AvisosController } from './avisos.controller';
import { AvisosService } from './avisos.service';

@Module({
  imports: [
    HttpModule,
    JwtAuthModule,
    SequelizeModule.forFeature([ContactoAviso, Usuario]),
  ],
  controllers: [AvisosController],
  providers: [AvisosService],
})
export class AvisosModule {}
