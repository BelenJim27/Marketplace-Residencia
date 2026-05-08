import { Controller, ForbiddenException, Get, Post, Req, UseGuards } from '@nestjs/common';
import { Request } from 'express';
import { AuthGuard } from '../auth/guards/auth.guard';
import { ConnectService } from './connect.service';

@Controller('pagos/connect')
@UseGuards(AuthGuard)
export class ConnectController {
  constructor(private readonly connectService: ConnectService) {}

  private requireProductor(req: Request): number {
    const user = (req as any).user;
    if (!user?.id_productor) {
      throw new ForbiddenException('Solo productores pueden gestionar la cuenta de pagos');
    }
    return user.id_productor as number;
  }

  @Post('onboard')
  onboard(@Req() req: Request) {
    return this.connectService.createOnboardingLink(this.requireProductor(req));
  }

  @Post('refresh')
  refresh(@Req() req: Request) {
    return this.connectService.createOnboardingLink(this.requireProductor(req));
  }

  @Get('status')
  status(@Req() req: Request) {
    return this.connectService.getStatus(this.requireProductor(req));
  }
}
