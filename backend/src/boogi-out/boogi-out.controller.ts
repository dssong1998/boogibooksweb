import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Headers,
  Param,
  Patch,
  Post,
  Query,
  UnauthorizedException,
  UploadedFile,
  UseInterceptors,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import type { Express } from 'express';
import { AuthService } from '../auth/auth.service';
import { BoogiOutService } from './boogi-out.service';
import { CreateBoogiOutDto } from './dto/create-boogi-out.dto';
import { ApplyBoogiOutDto } from './dto/apply-boogi-out.dto';
import { ConfirmBoogiOutDateDto } from './dto/confirm-date.dto';
import { AfterPartySettleDto } from './dto/after-party.dto';
import { BoogiOutCostMode } from '@prisma/client';

@Controller('boogi-out')
export class BoogiOutController {
  constructor(
    private readonly boogiOutService: BoogiOutService,
    private readonly authService: AuthService,
  ) {}

  private getUserId(authHeader: string | undefined): string {
    const userId = this.authService.extractUserIdFromToken(authHeader);
    if (!userId) throw new UnauthorizedException('Invalid or missing token');
    return userId;
  }

  /** 멀티파트 file 필드 — 업로드 후 반환된 url을 기획안 promotionalImageUrl에 넣습니다. */
  @Post('upload-image')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(),
      limits: { fileSize: 8 * 1024 * 1024 },
    }),
  )
  uploadPromoImage(
    @Headers('Authorization') authHeader: string,
    @UploadedFile() file: Express.Multer.File | undefined,
  ) {
    const userId = this.getUserId(authHeader);
    if (!file) {
      throw new BadRequestException('파일(file) 필드가 필요합니다.');
    }
    return this.boogiOutService.uploadPromotionalImage(userId, file);
  }

  @Get('calculate-preview')
  async calculatePreview(
    @Query('costMode') costMode: BoogiOutCostMode,
    @Query('costAmount') costAmount: string,
    @Query('participantCount') participantCount: string,
    @Query('feePercent') feePercent?: string,
  ) {
    const amount = parseInt(costAmount, 10);
    const n = parseInt(participantCount, 10);
    if (Number.isNaN(amount) || Number.isNaN(n)) {
      return { error: 'Invalid query' };
    }
    return this.boogiOutService.calculatePreview({
      costMode,
      costAmount: amount,
      participantCount: n,
      feePercent: feePercent ? parseInt(feePercent, 10) : 10,
    });
  }

  @Post()
  @UsePipes(new ValidationPipe({ whitelist: true, transform: true }))
  create(
    @Headers('Authorization') authHeader: string,
    @Body() dto: CreateBoogiOutDto,
  ) {
    const userId = this.getUserId(authHeader);
    return this.boogiOutService.create(userId, dto);
  }

  @Get()
  findAll() {
    return this.boogiOutService.findAll();
  }

  /** :id 보다 먼저 등록 (my-certificates가 id로 오인되지 않도록) */
  @Get('my-certificates')
  myCertificates(@Headers('Authorization') authHeader: string) {
    const userId = this.getUserId(authHeader);
    return this.boogiOutService.listMyCertificates(userId);
  }

  @Get(':id/proof/:token')
  proof(
    @Param('id') id: string,
    @Param('token') token: string,
  ) {
    return this.boogiOutService.findProofPage(id, token);
  }

  @Get(':id/me')
  myApplication(
    @Param('id') id: string,
    @Headers('Authorization') authHeader: string,
  ) {
    const userId = this.getUserId(authHeader);
    return this.boogiOutService.getMyApplication(id, userId);
  }

  @Delete(':id/my-application')
  cancelMyApplication(
    @Param('id') id: string,
    @Headers('Authorization') authHeader: string,
  ) {
    const userId = this.getUserId(authHeader);
    return this.boogiOutService.cancelMyApplication(id, userId);
  }

  @Post(':id/close-registrations')
  closeRegistrations(
    @Param('id') id: string,
    @Headers('Authorization') authHeader: string,
  ) {
    const userId = this.getUserId(authHeader);
    return this.boogiOutService.closeRegistrations(id, userId);
  }

  @Get(':id/applications')
  applications(
    @Param('id') id: string,
    @Headers('Authorization') authHeader: string,
  ) {
    const userId = this.getUserId(authHeader);
    return this.boogiOutService.listApplicationsForPlanner(id, userId);
  }

  @Get(':id')
  findOne(
    @Param('id') id: string,
    @Headers('authorization') authHeader?: string,
  ) {
    const userId =
      this.authService.extractUserIdFromToken(authHeader) ?? null;
    return this.boogiOutService.findOneForViewer(id, userId);
  }

  @Post(':id/apply')
  @UsePipes(new ValidationPipe({ whitelist: true }))
  apply(
    @Param('id') id: string,
    @Headers('Authorization') authHeader: string,
    @Body() dto: ApplyBoogiOutDto,
  ) {
    const userId = this.getUserId(authHeader);
    return this.boogiOutService.apply(id, userId, dto);
  }

  @Post(':id/confirm-date')
  @UsePipes(new ValidationPipe({ whitelist: true }))
  confirmDate(
    @Param('id') id: string,
    @Headers('Authorization') authHeader: string,
    @Body() dto: ConfirmBoogiOutDateDto,
  ) {
    const userId = this.getUserId(authHeader);
    return this.boogiOutService.confirmDate(id, userId, dto);
  }

  @Patch(':id/after-party')
  @UsePipes(new ValidationPipe({ whitelist: true }))
  settleAfterParty(
    @Param('id') id: string,
    @Headers('Authorization') authHeader: string,
    @Body() dto: AfterPartySettleDto,
  ) {
    const userId = this.getUserId(authHeader);
    return this.boogiOutService.settleAfterParty(id, userId, dto);
  }

  @Post(':id/confirm-payment')
  confirmPayment(
    @Param('id') id: string,
    @Headers('Authorization') authHeader: string,
  ) {
    const userId = this.getUserId(authHeader);
    return this.boogiOutService.confirmPayment(id, userId);
  }
}
