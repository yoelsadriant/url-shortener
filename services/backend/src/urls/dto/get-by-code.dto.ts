import { Length, Matches } from 'class-validator';

export class GetByCodeDto {
  @Length(1, 32)
  @Matches(/^[a-zA-Z0-9_-]+$/)
  code: string;
}
