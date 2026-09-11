import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { RegistroParlamentarioService } from './registro-parlamentario.service';

@Module({
  imports: [HttpModule],
  providers: [RegistroParlamentarioService],
  exports: [RegistroParlamentarioService],
})
export class RegistroParlamentarioModule {}
