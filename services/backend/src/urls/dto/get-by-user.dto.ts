import { IsUUID } from 'class-validator';

export class GetByUserDto {
  @IsUUID(4)
  user: string;
}
