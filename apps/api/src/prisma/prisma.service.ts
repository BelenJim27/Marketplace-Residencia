import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { PrismaNeon } from '@prisma/adapter-neon';
import { Pool, neonConfig } from '@neondatabase/serverless';
import WebSocket from 'ws';

// Node.js requires an explicit WebSocket constructor for @neondatabase/serverless.
neonConfig.webSocketConstructor = WebSocket;

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PrismaService.name);

  constructor() {
    const connectionString = process.env.DATABASE_URL ?? '';
    const pool = new Pool({ connectionString });
    const adapter = new PrismaNeon(pool);
    super({ adapter } as any);
  }

  async onModuleInit() {
    try {
      await this.$connect();
      this.logger.log('Database connected successfully');
    } catch (error) {
      this.logger.warn('Database connection failed. Continuing without database connection.');
    }
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}
