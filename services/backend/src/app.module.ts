import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { AuthModule } from './auth/auth.module';
import { HttpLoggerMiddleware } from './common/http-logger.middleware';
import { HealthController } from './health/health.controller';
import { UrlsModule } from './urls/urls.module';
import { UsersModule } from './users/users.module';
import { ConfigModule } from './config/config.service';

@Module({
  imports: [ConfigModule, AuthModule, UrlsModule, UsersModule],
  controllers: [HealthController],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(HttpLoggerMiddleware).forRoutes('*');
  }
}
