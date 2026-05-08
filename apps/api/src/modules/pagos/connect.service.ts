import { Injectable, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../prisma/prisma.service';
const Stripe = require('stripe');

export interface ConnectStatus {
  connected: boolean;
  account_id: string | null;
  charges_enabled: boolean;
  payouts_enabled: boolean;
  details_submitted: boolean;
  onboarding_completed: boolean;
}

@Injectable()
export class ConnectService {
  private stripe: any;
  private frontendUrl: string;

  constructor(
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService,
  ) {
    const secretKey = this.configService.get<string>('STRIPE_SECRET_KEY');
    if (!secretKey) throw new Error('STRIPE_SECRET_KEY is not defined');
    this.stripe = new Stripe(secretKey);
    this.frontendUrl = this.configService.get<string>('FRONTEND_URL') ?? 'http://localhost:3000';
  }

  private async getProductorOrThrow(id_productor: number) {
    const prod = await this.prisma.productores.findUnique({
      where: { id_productor },
      include: { usuarios: { select: { email: true, nombre: true } } },
    });
    if (!prod) throw new NotFoundException('Productor no encontrado');
    return prod;
  }

  private async ensureAccount(id_productor: number): Promise<string> {
    const prod = await this.getProductorOrThrow(id_productor);
    if (prod.stripe_account_id) return prod.stripe_account_id;

    const account = await this.stripe.accounts.create({
      type: 'express',
      country: 'MX',
      email: prod.usuarios?.email ?? undefined,
      capabilities: {
        card_payments: { requested: true },
        transfers: { requested: true },
      },
      business_type: 'individual',
      metadata: { id_productor: String(id_productor) },
    });

    await this.prisma.productores.update({
      where: { id_productor },
      data: { stripe_account_id: account.id },
    });

    return account.id;
  }

  async createOnboardingLink(id_productor: number) {
    const accountId = await this.ensureAccount(id_productor);
    const link = await this.stripe.accountLinks.create({
      account: accountId,
      refresh_url: `${this.frontendUrl}/dashboard/productor/ingresos?stripe_refresh=1`,
      return_url: `${this.frontendUrl}/dashboard/productor/ingresos?stripe_return=1`,
      type: 'account_onboarding',
    });
    return {
      url: link.url,
      expires_at: link.expires_at,
      account_id: accountId,
    };
  }

  async getStatus(id_productor: number): Promise<ConnectStatus> {
    const prod = await this.getProductorOrThrow(id_productor);
    if (!prod.stripe_account_id) {
      return {
        connected: false,
        account_id: null,
        charges_enabled: false,
        payouts_enabled: false,
        details_submitted: false,
        onboarding_completed: false,
      };
    }
    const acc = await this.stripe.accounts.retrieve(prod.stripe_account_id);
    return {
      connected: true,
      account_id: acc.id,
      charges_enabled: !!acc.charges_enabled,
      payouts_enabled: !!acc.payouts_enabled,
      details_submitted: !!acc.details_submitted,
      onboarding_completed: prod.stripe_onboarding_completed,
    };
  }

  async syncFromAccountUpdated(account: any) {
    if (!account?.id) return { matched: 0, completed: false };
    const completed = !!(account.charges_enabled && account.payouts_enabled && account.details_submitted);
    const result = await this.prisma.productores.updateMany({
      where: { stripe_account_id: account.id },
      data: { stripe_onboarding_completed: completed },
    });
    return { matched: result.count, completed };
  }

  async getProductorByStripeAccount(id_productor: number) {
    return this.prisma.productores.findUnique({
      where: { id_productor },
      select: {
        id_productor: true,
        stripe_account_id: true,
        stripe_onboarding_completed: true,
      },
    });
  }
}
