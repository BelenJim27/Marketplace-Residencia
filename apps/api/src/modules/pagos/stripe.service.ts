import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
const Stripe = require('stripe');

export interface StripeShippingAddress {
  line1: string;
  line2?: string;
  city: string;
  state: string;        // 2-letter for US (e.g. "CA")
  postal_code: string;
  country: string;      // ISO-2 (e.g. "US", "MX")
}

export interface CreatePaymentIntentInput {
  subtotal: number;                 // pre-tax, in major units (e.g. 49.99)
  shippingAmount?: number;          // shipping cost in major units
  taxAmount?: number;               // pre-computed tax amount (manual, from tasas_impuesto)
  currency: string;                 // ISO 4217 (case-insensitive)
  shippingAddress: StripeShippingAddress;
  recipientName?: string;
  customerId?: string;              // Stripe customer id (optional)
  metadata?: Record<string, any>;
  /**
   * Stripe Connect Direct Charge: when set, the platform charges on behalf of the
   * connected account, takes `applicationFeeAmount` (in major units) as marketplace
   * fee, and routes the rest to the productor's account automatically.
   */
  connectedAccountId?: string;
  applicationFeeAmount?: number;    // marketplace fee in major units
  transferGroup?: string;           // for tracking transfers alongside this intent
}

export interface CreatePaymentIntentResult {
  clientSecret: string;
  paymentIntentId: string;
  subtotal: number;                 // major units
  taxAmount: number;
  shippingAmount: number;
  totalAmount: number;
  currency: string;
}

@Injectable()
export class StripeService {
  private readonly logger = new Logger(StripeService.name);
  private stripe: any;

  constructor(private readonly configService: ConfigService) {
    const secretKey = this.configService.get<string>('STRIPE_SECRET_KEY');
    if (!secretKey) {
      throw new Error('STRIPE_SECRET_KEY is not defined');
    }
    const webhookSecret = this.configService.get<string>('STRIPE_WEBHOOK_SECRET');
    if (!webhookSecret) {
      throw new Error('STRIPE_WEBHOOK_SECRET is not defined');
    }
    this.stripe = new Stripe(secretKey);
  }

  async createPaymentIntent(input: CreatePaymentIntentInput): Promise<CreatePaymentIntentResult> {
    const {
      subtotal,
      shippingAmount = 0,
      taxAmount = 0,
      currency,
      shippingAddress,
      recipientName,
      customerId,
      metadata = {},
    } = input;

    if (!subtotal || subtotal <= 0) {
      throw new BadRequestException('subtotal debe ser mayor a 0');
    }
    if (!shippingAddress?.country || !shippingAddress.line1) {
      throw new BadRequestException('shippingAddress incompleto: line1 y country son obligatorios');
    }

    const cur = currency.toLowerCase();
    const subtotalCents = Math.round(subtotal * 100);
    const shippingCents = Math.round(shippingAmount * 100);
    const taxCents = Math.round(taxAmount * 100);
    const totalCents = subtotalCents + shippingCents + taxCents;

    const stripeAddress = {
      line1: shippingAddress.line1,
      line2: shippingAddress.line2,
      city: shippingAddress.city,
      state: shippingAddress.state,
      postal_code: shippingAddress.postal_code,
      country: shippingAddress.country.toUpperCase(),
    };

    const connectedAccountId = input.connectedAccountId;
    const applicationFeeCents = input.applicationFeeAmount != null
      ? Math.round(input.applicationFeeAmount * 100)
      : undefined;

    try {
      const intent = await this.stripe.paymentIntents.create({
        amount: totalCents,
        currency: cur,
        customer: customerId,
        shipping: {
          name: recipientName ?? 'Customer',
          address: stripeAddress,
        },
        automatic_payment_methods: { enabled: true },
        ...(connectedAccountId
          ? {
              on_behalf_of: connectedAccountId,
              transfer_data: { destination: connectedAccountId },
              ...(applicationFeeCents != null && applicationFeeCents > 0
                ? { application_fee_amount: applicationFeeCents }
                : {}),
            }
          : {}),
        ...(input.transferGroup ? { transfer_group: input.transferGroup } : {}),
        metadata: {
          ...metadata,
          subtotal_cents: String(subtotalCents),
          shipping_cents: String(shippingCents),
          tax_cents: String(taxCents),
          ...(applicationFeeCents != null
            ? { application_fee_cents: String(applicationFeeCents) }
            : {}),
        },
      });

      return {
        clientSecret: intent.client_secret,
        paymentIntentId: intent.id,
        subtotal: subtotalCents / 100,
        taxAmount: taxCents / 100,
        shippingAmount: shippingCents / 100,
        totalAmount: totalCents / 100,
        currency: cur,
      };
    } catch (error: any) {
      throw new BadRequestException(`Stripe error: ${error.message}`);
    }
  }

  constructWebhookEvent(rawBody: Buffer, signature: string, secret: string) {
    try {
      return this.stripe.webhooks.constructEvent(rawBody, signature, secret);
    } catch (error: any) {
      throw new BadRequestException(`Webhook signature verification failed: ${error.message}`);
    }
  }

  async retrievePaymentIntent(paymentIntentId: string) {
    return this.stripe.paymentIntents.retrieve(paymentIntentId);
  }

  async createTaxTransactionFromCalculation(calculationId: string, reference: string) {
    return this.stripe.tax.transactions.createFromCalculation({
      calculation: calculationId,
      reference,
    });
  }

  async retrieveAccount(accountId: string) {
    return this.stripe.accounts.retrieve(accountId);
  }

  async createTransfer(input: {
    amountCents: number;
    currency: string;
    destination: string;
    transferGroup: string;
    idempotencyKey?: string;
    metadata?: Record<string, string>;
  }) {
    return this.stripe.transfers.create(
      {
        amount: input.amountCents,
        currency: input.currency.toLowerCase(),
        destination: input.destination,
        transfer_group: input.transferGroup,
        metadata: input.metadata ?? {},
      },
      input.idempotencyKey ? { idempotencyKey: input.idempotencyKey } : undefined,
    );
  }

  async createRefund(input: {
    paymentIntentId: string;
    reverseTransfer?: boolean;
    refundApplicationFee?: boolean;
  }) {
    return this.stripe.refunds.create({
      payment_intent: input.paymentIntentId,
      reverse_transfer: input.reverseTransfer ?? false,
      refund_application_fee: input.refundApplicationFee ?? false,
    });
  }

  async createTransferReversal(transferId: string) {
    return this.stripe.transfers.createReversal(transferId);
  }

  /**
   * Obtiene la comisión que Stripe cobró (processing fee) de un PaymentIntent
   * completado, leyendo el balance_transaction del cargo. Devuelve el fee en la
   * unidad menor (centavos) y la moneda en ISO mayúsculas, o null si no aplica.
   * Se usa para poblar payment_fees y poder conciliar el margen real.
   */
  async getProcessingFee(
    paymentIntentId: string,
  ): Promise<{ feeMinor: number; currency: string } | null> {
    try {
      const pi: any = await this.stripe.paymentIntents.retrieve(paymentIntentId, {
        expand: ['latest_charge.balance_transaction'],
      });
      const bt: any = pi?.latest_charge?.balance_transaction;
      if (!bt || typeof bt.fee !== 'number') return null;
      return { feeMinor: bt.fee, currency: String(bt.currency ?? pi.currency ?? 'mxn').toUpperCase() };
    } catch (error: any) {
      this.logger.error(`[stripe] Error obteniendo processing fee de ${paymentIntentId}: ${error?.message}`);
      return null;
    }
  }

  /**
   * Verifica si existe alguna disputa abierta relacionada con un cargo.
   * Retorna true si hay disputas activas (no resueltas), false en caso contrario.
   */
  async hasOpenDispute(chargeId: string): Promise<boolean> {
    try {
      const disputes = await this.stripe.disputes.list({
        charge: chargeId,
        status: 'open', // solo disputas abiertas
        limit: 1,
      });
      return disputes.data.length > 0;
    } catch (error: any) {
      this.logger.error(`[stripe] Error checking disputes for charge ${chargeId}: ${error?.message}`);
      // En caso de error, asumir que hay disputa (ser conservador)
      return true;
    }
  }

  /**
   * Verifica disputas de un PaymentIntent (que puede tener múltiples charges).
   * Retorna el número de disputas abiertas.
   */
  async countOpenDisputesForPaymentIntent(paymentIntentId: string): Promise<number> {
    try {
      const pi = await this.stripe.paymentIntents.retrieve(paymentIntentId);
      if (!pi.charges?.data || pi.charges.data.length === 0) {
        return 0;
      }

      let openDisputeCount = 0;
      for (const charge of pi.charges.data) {
        const hasDispute = await this.hasOpenDispute(charge.id);
        if (hasDispute) {
          openDisputeCount++;
        }
      }
      return openDisputeCount;
    } catch (error: any) {
      this.logger.error(`[stripe] Error checking disputes for payment intent ${paymentIntentId}: ${error?.message}`);
      return 0;
    }
  }
}
