import { Body, Controller, Post } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { IsEmail } from 'class-validator';
import { EmailService } from './email.service';

class UnsubscribeDto {
  @IsEmail() email!: string;
}

@Controller('email')
export class EmailController {
  constructor(private readonly emailService: EmailService) {}

  /**
   * Baja de correos (CAN-SPAM). Endpoint público al que apunta el header
   * List-Unsubscribe y la página /unsubscribe del frontend. Limitado para evitar abuso.
   */
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @Post('unsubscribe')
  async unsubscribe(@Body() dto: UnsubscribeDto): Promise<{ ok: true }> {
    return this.emailService.recordUnsubscribeRequest(dto.email);
  }
}
