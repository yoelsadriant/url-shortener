import { Module } from '@nestjs/common';
import { ConfigModule } from '@/config/config.module';
import { UsersService } from './users.service';

@Module({
  imports: [ConfigModule],
  providers: [UsersService],
  exports: [UsersService],
})
export class UsersModule {}
