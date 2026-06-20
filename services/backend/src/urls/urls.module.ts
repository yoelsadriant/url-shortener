import { Module } from '@nestjs/common';
import { ConfigModule } from '../config/config.module';
import { UrlsController } from './urls.controller';
import { UrlsService } from './urls.service';

@Module({
  imports: [ConfigModule],
  controllers: [UrlsController],
  providers: [UrlsService],
})
export class UrlsModule {}
