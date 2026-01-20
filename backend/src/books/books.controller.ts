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
} from '@nestjs/common';
import { BooksService } from './books.service';
import { CreateBookDto } from './dto/create-book.dto';
import { UpdateBookDto } from './dto/update-book.dto';

@Controller('books')
export class BooksController {
  constructor(private readonly booksService: BooksService) {}

  @Get('search')
  searchNaver(@Query('query') query: string, @Query('display') display = 10) {
    return this.booksService.searchNaver(query, display);
  }

  @Post()
  create(
    @Headers('x-user-id') userId: string,
    @Body() createBookDto: CreateBookDto,
  ) {
    // TODO: JWT에서 userId 추출하도록 변경
    return this.booksService.create(userId, createBookDto);
  }

  @Get()
  findAll(@Headers('x-user-id') userId: string) {
    // TODO: JWT에서 userId 추출하도록 변경
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
