import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Put,
  Query,
  Redirect,
} from '@nestjs/common';
import { CreateShortUrlDto } from './dto/create-short-url.dto';
import { GetByCodeDto } from './dto/get-by-code.dto';
import { GetByUserDto } from './dto/get-by-user.dto';
import { UrlsService } from './urls.service';
import { RenameCodeDto } from './dto/rename-code.dto';

@Controller()
export class UrlsController {
  constructor(private readonly urlsService: UrlsService) {}

  @Post('url')
  create(@Body() input: CreateShortUrlDto) {
    return this.urlsService.create(input);
  }

  @Get('url')
  getByUser(@Query() query: GetByUserDto) {
    return this.urlsService.getByUser(query.user);
  }

  @Delete('url/:code')
  @HttpCode(HttpStatus.NO_CONTENT)
  delete(@Param() params: GetByCodeDto, @Query() query: GetByUserDto) {
    return this.urlsService.delete(params.code, query.user);
  }

  @Put('url/:code/rename')
  renameCode(
    @Param() params: GetByCodeDto,
    @Query() query: GetByUserDto,
    @Body() input: RenameCodeDto,
  ) {
    return this.urlsService.renameCode(params.code, input.newCode, query.user);
  }

  @Get(':code')
  @Redirect()
  async redirect(@Param() params: GetByCodeDto) {
    const item = await this.urlsService.getByCode(params.code);
    return { url: item.originUrl, statusCode: 302 };
  }
}
