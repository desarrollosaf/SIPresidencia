import {
  ArrayMinSize,
  IsArray,
  IsInt,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';

export class EnviarAvisoDto {
  // A quién avisar (ids de contactos_aviso). Para "todos" el frontend manda la lista completa.
  @IsArray()
  @ArrayMinSize(1)
  @IsInt({ each: true })
  contactos: number[];

  @IsOptional()
  @IsString()
  @MaxLength(200)
  mensaje?: string;

  // Solo tableta: slug del equipo desde el que se llama; su encargado firma la alerta.
  @IsOptional()
  @IsString()
  @MaxLength(40)
  equipo?: string;
}
