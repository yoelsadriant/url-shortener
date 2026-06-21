import { IsString, Length, Matches } from 'class-validator';

export class RenameCodeDto {
  @IsString()
  @Length(1, 32)
  @Matches(/^[a-zA-Z0-9_-]+$/)
  newCode: string;
}
