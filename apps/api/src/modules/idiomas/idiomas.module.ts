import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { IdiomasController } from './idiomas.controller';
import { IdiomasService } from './idiomas.service';

@Module({
  imports: [PrismaModule],
  controllers: [IdiomasController],
  providers: [IdiomasService],
  exports: [IdiomasService],
})
export class IdiomasModule {}
