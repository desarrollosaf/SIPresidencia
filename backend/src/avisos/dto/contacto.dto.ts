import {
  IsBoolean,
  IsIn,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
} from 'class-validator';

// https://pushover.net/api#sounds
export const SONIDOS_PUSHOVER = [
  'pushover',
  'bike',
  'bugle',
  'cashregister',
  'classical',
  'cosmic',
  'falling',
  'gamelan',
  'incoming',
  'intermission',
  'magic',
  'mechanical',
  'pianobar',
  'siren',
  'spacealarm',
  'tugboat',
  'alien',
  'climb',
  'persistent',
  'echo',
  'updown',
  'vibrate',
  'none',
] as const;

const USER_KEY = /^[A-Za-z0-9]{30}$/;

export class CrearContactoDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  nombre: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  puesto?: string;

  @Matches(USER_KEY, {
    message: 'El User Key de Pushover debe tener 30 letras y números',
  })
  pushoverUser: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  pushoverDevice?: string;

  @IsOptional()
  @IsIn([...SONIDOS_PUSHOVER, ''])
  sonido?: string;

  // Equipo (encargado) al que pertenece: decide en qué tableta aparece.
  @IsInt({ message: 'Elige de qué equipo es' })
  equipoId: number;
}

export class ActualizarContactoDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  nombre?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  puesto?: string;

  @IsOptional()
  @Matches(USER_KEY, {
    message: 'El User Key de Pushover debe tener 30 letras y números',
  })
  pushoverUser?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  pushoverDevice?: string;

  @IsOptional()
  @IsIn([...SONIDOS_PUSHOVER, ''])
  sonido?: string;

  @IsOptional()
  @IsBoolean()
  activo?: boolean;

  @IsOptional()
  @IsInt({ message: 'Elige de qué equipo es' })
  equipoId?: number;
}
