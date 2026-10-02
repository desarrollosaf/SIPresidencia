import { IsIn, IsInt, IsOptional, Max, Min } from 'class-validator';

export const BANCOS_P6 = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'] as const;

export class DispararPadDto {
  @IsIn(BANCOS_P6)
  bank: string;

  @IsInt()
  @Min(1)
  @Max(6)
  pad: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(127)
  velocity?: number;
}
