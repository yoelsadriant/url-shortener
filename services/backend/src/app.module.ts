import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AuthModule } from './auth/auth.module';
import { HttpLoggerMiddleware } from './common/http-logger.middleware';
import { HealthModule } from './health/health.module';
import { UrlsModule } from './urls/urls.module';
import { UsersModule } from './users/users.module';
import { validateEnv } from './config/env.schema';

@Module({
  imports: [
    ConfigModule.forRoot({ validate: validateEnv }),
    HealthModule,
    AuthModule,
    UrlsModule,
    UsersModule,
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(HttpLoggerMiddleware).forRoutes('*');
  }
}
