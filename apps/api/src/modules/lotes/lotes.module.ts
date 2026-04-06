import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { LotesController } from './lotes.controller';
import { LotesService } from './lotes.service';

@Module({ imports: [PrismaModule], controllers: [LotesController], providers: [LotesService] })
export class LotesModule {}
