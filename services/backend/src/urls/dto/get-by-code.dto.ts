import { Matches } from 'class-validator';

export class GetByCodeDto {
  @Matches(/^[a-zA-Z0-9]{8}$/, { message: 'Invalid short code' })
  code: string;
}
