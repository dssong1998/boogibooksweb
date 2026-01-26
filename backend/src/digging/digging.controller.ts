import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Headers,
  UnauthorizedException,
} from '@nestjs/common';
import { DiggingService } from './digging.service';
import { CreateDiggingDto } from './dto/create-digging.dto';
import { UpdateDiggingDto } from './dto/update-digging.dto';
import { CreateDiggingFromBotDto } from './dto/create-digging-from-bot.dto';
import { AuthService } from '../auth/auth.service';

@Controller('digging')
export class DiggingController {
  constructor(
    private readonly diggingService: DiggingService,
    private readonly authService: AuthService,
  ) {}

  private getUserId(authHeader: string | undefined): string {
    const userId = this.authService.extractUserIdFromToken(authHeader);
    if (!userId) throw new UnauthorizedException('Invalid or missing token');
    return userId;
  }

  @Post()
  create(
    @Headers('Authorization') authHeader: string,
    @Body() createDiggingDto: CreateDiggingDto,
  ) {
    const userId = this.getUserId(authHeader);
    return this.diggingService.create(userId, createDiggingDto);
  }

  @Post('bot')
  createFromBot(@Body() createDiggingFromBotDto: CreateDiggingFromBotDto) {
    return this.diggingService.createFromBot(createDiggingFromBotDto);
  }

  @Get()
  findAll(@Headers('Authorization') authHeader: string) {
    const userId = this.getUserId(authHeader);
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
