import { plainToInstance, Type } from 'class-transformer';
import {
  IsInt,
  IsOptional,
  IsString,
  IsUrl,
  validateSync,
} from 'class-validator';

export class EnvConfig {
  @Type(() => Number)
  @IsInt()
  PORT: number = 3000;

  @IsUrl({ require_protocol: true, require_tld: false })
  PUBLIC_BASE_URL: string;

  @IsString()
  AWS_REGION: string;

  @IsOptional()
  @IsString()
  AWS_ENDPOINT?: string;

  @IsString()
  URL_TABLE: string;

  @IsString()
  URL_USER_INDEX: string;

  @IsString()
  USER_TABLE: string;

  @IsString()
  USER_USERNAME_INDEX: string;

  @IsString()
  JWT_SECRET: string;

  @IsString()
  JWT_EXPIRES_IN: string = '7d';
}

export function validateEnv(raw: Record<string, unknown>): EnvConfig {
  const config = plainToInstance(EnvConfig, raw, {
    enableImplicitConversion: true,
  });
  const errors = validateSync(config, { skipMissingProperties: false });
  if (errors.length) {
    throw new Error(
      `Invalid environment:\n${errors.map((e) => e.toString()).join('\n')}`,
    );
  }
  return config;
}
