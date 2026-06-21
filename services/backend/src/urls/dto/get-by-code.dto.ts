import { Length, Matches } from 'class-validator';

export class GetByCodeDto {
  @Length(1, 32, { message: 'Invalid short code' })
  @Matches(/^[a-zA-Z0-9_-]+$/, { message: 'Invalid short code' })
  code: string;
}
