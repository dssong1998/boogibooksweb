import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  Headers,
  UnauthorizedException,
} from '@nestjs/common';
import { BooksService } from './books.service';
import { CreateBookDto } from './dto/create-book.dto';
import { UpdateBookDto } from './dto/update-book.dto';
import { CreateBookFromBotDto } from './dto/create-book-from-bot.dto';
import { AuthService } from '../auth/auth.service';

@Controller('books')
export class BooksController {
  constructor(
    private readonly booksService: BooksService,
    private readonly authService: AuthService,
  ) {}

  private getUserId(authHeader: string | undefined): string {
    const userId = this.authService.extractUserIdFromToken(authHeader);
    if (!userId) throw new UnauthorizedException('Invalid or missing token');
    return userId;
  }

  @Get('search')
  searchNaver(@Query('query') query: string, @Query('display') display = 10) {
    return this.booksService.searchNaver(query, display);
  }

  @Post()
  create(
    @Headers('Authorization') authHeader: string,
    @Body() createBookDto: CreateBookDto,
  ) {
    const userId = this.getUserId(authHeader);
    return this.booksService.create(userId, createBookDto);
  }

  @Post('bot')
  createFromBot(@Body() createBookFromBotDto: CreateBookFromBotDto) {
    return this.booksService.createFromBot(createBookFromBotDto);
  }

  @Get()
  findAll(@Headers('Authorization') authHeader: string) {
    const userId = this.getUserId(authHeader);
    return this.booksService.findAll(userId);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.booksService.findOne(id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateBookDto: UpdateBookDto) {
    return this.booksService.update(id, updateBookDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.booksService.remove(id);
  }
}
