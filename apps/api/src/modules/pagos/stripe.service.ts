import { Injectable, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
const Stripe = require('stripe');

@Injectable()
export class StripeService {
  private stripe: any;

  constructor(private readonly configService: ConfigService) {
    const secretKey = this.configService.get<string>('STRIPE_SECRET_KEY');
    if (!secretKey) {
      throw new Error('STRIPE_SECRET_KEY is not defined');
    }
    this.stripe = new Stripe(secretKey);
  }

  async createPaymentIntent(amount: number, moneda: string, metadata: Record<string, any>) {
    try {
      const intent = await this.stripe.paymentIntents.create({
        amount: Math.round(amount * 100),
        currency: moneda.toLowerCase(),
        payment_method_types: ['card'],
        metadata,
      });
      return {
        clientSecret: intent.client_secret,
        paymentIntentId: intent.id,
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
}
