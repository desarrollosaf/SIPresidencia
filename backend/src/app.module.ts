import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { SequelizeModule, SequelizeModuleOptions } from '@nestjs/sequelize';
import databaseConfig from './config/database.config';
import authConfig from './config/auth.config';
import registroConfig from './config/registro.config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { RegistroParlamentarioModule } from './registro-parlamentario/registro-parlamentario.module';
import { SesionesModule } from './sesiones/sesiones.module';

interface MysqlConnectionConfig {
  host: string;
  port: number;
  username: string;
  password: string;
  database: string;
}

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [databaseConfig, authConfig, registroConfig],
    }),
    SequelizeModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService): SequelizeModuleOptions => {
        const db = config.get<MysqlConnectionConfig>('database')!;
        return {
          dialect: 'mysql',
          ...db,
          models: [],
          autoLoadModels: true,
          synchronize: false,
        };
      },
    }),
    AuthModule,
    RegistroParlamentarioModule,
    SesionesModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
