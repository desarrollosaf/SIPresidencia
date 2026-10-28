import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { SequelizeModule } from '@nestjs/sequelize';
import { JwtAuthModule } from '../auth/jwt-auth.module';
import { ContactoAviso } from '../database/models/contacto-aviso.model';
import { EquipoAviso } from '../database/models/equipo-aviso.model';
import { Usuario } from '../database/models/usuario.model';
import { AvisosController } from './avisos.controller';
import { AvisosService } from './avisos.service';
import { LlaveTabletaGuard } from './llave-tableta.guard';
import { TabletaController } from './tableta.controller';

@Module({
  imports: [
    HttpModule,
    JwtAuthModule,
    SequelizeModule.forFeature([ContactoAviso, EquipoAviso, Usuario]),
  ],
  controllers: [AvisosController, TabletaController],
  providers: [AvisosService, LlaveTabletaGuard],
})
export class AvisosModule {}
