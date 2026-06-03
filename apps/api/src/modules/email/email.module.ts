import { Module } from '@nestjs/common';
import { EmailService } from './email.service';
import { FacturaPdfService } from './factura-pdf.service';
import { PrismaModule } from '../../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  providers: [EmailService, FacturaPdfService],
  exports: [EmailService],
})
export class EmailModule {}