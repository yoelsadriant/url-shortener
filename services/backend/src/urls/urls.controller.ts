import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  Redirect,
} from '@nestjs/common';
import { CreateShortUrlDto } from './dto/create-short-url.dto';
import { GetByCodeDto } from './dto/get-by-code.dto';
import { GetByUserDto } from './dto/get-by-user.dto';
import { UrlsService } from './urls.service';

@Controller('url')
export class UrlsController {
  constructor(private readonly urlsService: UrlsService) {}

  @Post()
  create(@Body() args: CreateShortUrlDto) {
    return this.urlsService.create(args);
  }

  @Get()
  getByUser(@Query() query: GetByUserDto) {
    return this.urlsService.getByUser(query.user);
  }

  @Get(':code')
  @Redirect()
  async getByCode(@Param() params: GetByCodeDto) {
    const item = await this.urlsService.getByCode(params.code);
    return { url: item.originUrl, statusCode: 302 };
  }
}
