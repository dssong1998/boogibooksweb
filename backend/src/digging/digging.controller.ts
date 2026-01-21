import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Headers,
} from '@nestjs/common';
import { DiggingService } from './digging.service';
import { CreateDiggingDto } from './dto/create-digging.dto';
import { UpdateDiggingDto } from './dto/update-digging.dto';
import { CreateDiggingFromBotDto } from './dto/create-digging-from-bot.dto';


@Controller('digging')
export class DiggingController {
  constructor(private readonly diggingService: DiggingService) {}

  @Post()
  create(
    @Headers('x-user-id') userId: string,
    @Body() createDiggingDto: CreateDiggingDto,
  ) {
    console.log('userId', userId);
    // TODO: JWT에서 userId 추출하도록 변경
    return this.diggingService.create(userId, createDiggingDto);
  }

  @Post('bot')
  createFromBot(
    @Body() createDiggingFromBotDto: CreateDiggingFromBotDto,
  ) {
    // TODO: JWT에서 userId 추출하도록 변경
    return this.diggingService.createFromBot(createDiggingFromBotDto);
  }

  @Get()
  findAll(@Headers('x-user-id') userId: string) {
    // TODO: JWT에서 userId 추출하도록 변경
    return this.diggingService.findAll(userId);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.diggingService.findOne(id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateDiggingDto: UpdateDiggingDto) {
    return this.diggingService.update(id, updateDiggingDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.diggingService.remove(id);
  }
}
