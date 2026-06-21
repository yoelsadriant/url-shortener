import {
  IsOptional,
  IsString,
  IsUrl,
  IsUUID,
  Length,
  Matches,
} from 'class-validator';

export class CreateShortUrlDto {
  @IsUrl({ require_protocol: true })
  url: string;

  @IsUUID(4)
  userId: string;

  @IsString()
  @IsOptional()
  @Length(1, 32)
  @Matches(/^[a-zA-Z0-9_-]+$/)
  customUrl?: string;
}
