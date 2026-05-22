import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class PaypalService {
  private readonly logger = new Logger(PaypalService.name);
  private clientId: string;
  private clientSecret: string;
  private mode: 'sandbox' | 'live';
  private webhookId: string;

  constructor(private readonly configService: ConfigService) {
    this.clientId = this.configService.get<string>('PAYPAL_CLIENT_ID') ?? '';
    this.clientSecret = this.configService.get<string>('PAYPAL_CLIENT_SECRET') ?? '';
    this.mode = (this.configService.get<string>('PAYPAL_MODE') || 'sandbox') as 'sandbox' | 'live';
    this.webhookId = this.configService.get<string>('PAYPAL_WEBHOOK_ID') || '';
  }

  private getBaseUrl(): string {
    return this.mode === 'sandbox' ? 'https://api-m.sandbox.paypal.com' : 'https://api-m.paypal.com';
  }

  private async getAccessToken(): Promise<string> {
    const baseUrl = this.getBaseUrl();
    const auth = Buffer.from(`${this.clientId}:${this.clientSecret}`).toString('base64');

    try {
      const response = await fetch(`${baseUrl}/v1/oauth2/token`, {
        method: 'POST',
        headers: {
          'Authorization': `Basic ${auth}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: 'grant_type=client_credentials',
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`PayPal token error: ${error}`);
      }

      const data = await response.json() as { access_token: string };
      return data.access_token;
    } catch (error) {
      this.logger.error('Failed to get PayPal access token', error);
      throw new BadRequestException('PayPal authentication failed');
    }
  }

  async createOrder(
    input: {
      totalAmount: number; // in major units (e.g. 49.99)
      currency: string;    // ISO 4217
      referenceId: string; // pedido ID or similar for tracking
      recipientName?: string;
      shippingAddress?: {
        line1: string;
        line2?: string;
        city: string;
        state: string;
        postal_code: string;
        country: string; // ISO-2
      };
    }
  ): Promise<{ orderId: string; approveUrl: string }> {
    const token = await this.getAccessToken();
    const baseUrl = this.getBaseUrl();
    const totalCents = Math.round(input.totalAmount * 100);

    const body = {
      intent: 'CAPTURE',
      payer: {},
      purchase_units: [
        {
          reference_id: input.referenceId,
          amount: {
            currency_code: input.currency.toUpperCase(),
            value: input.totalAmount.toFixed(2),
            breakdown: {
              item_total: {
                currency_code: input.currency.toUpperCase(),
                value: input.totalAmount.toFixed(2),
              },
            },
          },
          shipping: input.shippingAddress
            ? {
                name: { full_name: input.recipientName || 'Customer' },
                address: {
                  address_line_1: input.shippingAddress.line1,
                  ...(input.shippingAddress.line2 && { address_line_2: input.shippingAddress.line2 }),
                  admin_area_2: input.shippingAddress.city,
                  admin_area_1: input.shippingAddress.state,
                  postal_code: input.shippingAddress.postal_code,
                  country_code: input.shippingAddress.country.toUpperCase(),
                },
              }
            : undefined,
        },
      ],
      application_context: {
        brand_name: 'Marketplace Residencia',
        user_action: 'PAY_NOW',
        return_url: `${this.configService.get('FRONTEND_URL')}/tienda/checkout/pago-exitoso`,
        cancel_url: `${this.configService.get('FRONTEND_URL')}/tienda/checkout`,
      },
    };

    try {
      const response = await fetch(`${baseUrl}/v2/checkout/orders`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        const error = await response.json();
        this.logger.error('PayPal createOrder failed', error);
        throw new BadRequestException(`PayPal error: ${JSON.stringify(error)}`);
      }

      const data = await response.json() as { id: string; links: Array<{ rel: string; href: string }> };
      const approveUrl = data.links.find((link) => link.rel === 'approve')?.href;

      if (!approveUrl) {
        throw new BadRequestException('No approve link in PayPal response');
      }

      return {
        orderId: data.id,
        approveUrl,
      };
    } catch (error) {
      if (error instanceof BadRequestException) throw error;
      this.logger.error('PayPal createOrder error', error);
      throw new BadRequestException(`Failed to create PayPal order: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async captureOrder(orderId: string): Promise<{ captureId: string; status: string }> {
    const token = await this.getAccessToken();
    const baseUrl = this.getBaseUrl();

    try {
      const response = await fetch(`${baseUrl}/v2/checkout/orders/${orderId}/capture`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({}),
      });

      if (!response.ok) {
        const error = await response.json();
        this.logger.error('PayPal captureOrder failed', error);
        throw new BadRequestException(`PayPal capture error: ${JSON.stringify(error)}`);
      }

      const data = await response.json() as {
        id: string;
        purchase_units: Array<{
          payments: { captures: Array<{ id: string; status: string }> };
        }>;
      };

      const capture = data.purchase_units[0]?.payments?.captures[0];
      if (!capture) {
        throw new BadRequestException('No capture in PayPal response');
      }

      return {
        captureId: capture.id,
        status: capture.status,
      };
    } catch (error) {
      if (error instanceof BadRequestException) throw error;
      this.logger.error('PayPal captureOrder error', error);
      throw new BadRequestException(`Failed to capture PayPal order: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async createRefund(captureId: string, amount?: number): Promise<{ refundId: string; status: string }> {
    const token = await this.getAccessToken();
    const baseUrl = this.getBaseUrl();

    const body = amount ? { amount: { value: amount.toFixed(2) } } : {};

    try {
      const response = await fetch(`${baseUrl}/v2/payments/captures/${captureId}/refund`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        const error = await response.json();
        this.logger.error('PayPal createRefund failed', error);
        throw new BadRequestException(`PayPal refund error: ${JSON.stringify(error)}`);
      }

      const data = await response.json() as { id: string; status: string };
      return {
        refundId: data.id,
        status: data.status,
      };
    } catch (error) {
      if (error instanceof BadRequestException) throw error;
      this.logger.error('PayPal createRefund error', error);
      throw new BadRequestException(`Failed to refund PayPal capture: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async createPayout(input: {
    paypalEmail: string;
    amountUSD: number; // in major units
    referenceId: string;
    senderBatchId?: string;
  }): Promise<{ batchId: string; status: string }> {
    const token = await this.getAccessToken();
    const baseUrl = this.getBaseUrl();

    const body = {
      sender_batch_header: {
        sender_batch_id: input.senderBatchId || `payout-${input.referenceId}-${Date.now()}`,
        email_subject: 'Marketplace Residencia - Payout',
        email_message: 'Payout from Marketplace Residencia',
      },
      items: [
        {
          recipient_type: 'EMAIL',
          amount: {
            value: input.amountUSD.toFixed(2),
            currency: 'USD',
          },
          description: `Payout for order ${input.referenceId}`,
          receiver: input.paypalEmail,
          reference_id: input.referenceId,
        },
      ],
    };

    try {
      const response = await fetch(`${baseUrl}/v1/payments/payouts`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        const error = await response.json();
        this.logger.error('PayPal createPayout failed', error);
        throw new BadRequestException(`PayPal payout error: ${JSON.stringify(error)}`);
      }

      const data = await response.json() as { batch_header: { payout_batch_id: string; batch_status: string } };
      return {
        batchId: data.batch_header.payout_batch_id,
        status: data.batch_header.batch_status,
      };
    } catch (error) {
      if (error instanceof BadRequestException) throw error;
      this.logger.error('PayPal createPayout error', error);
      throw new BadRequestException(`Failed to create PayPal payout: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async verifyWebhookSignature(headers: Record<string, any>, rawBody: Buffer): Promise<boolean> {
    const token = await this.getAccessToken();
    const baseUrl = this.getBaseUrl();

    // PayPal webhook verification expects specific headers
    const verificationData = {
      transmission_id: headers['paypal-transmission-id'],
      transmission_time: headers['paypal-transmission-time'],
      cert_url: headers['paypal-cert-url'],
      auth_algo: headers['paypal-auth-algo'],
      transmission_sig: headers['paypal-transmission-sig'],
      webhook_id: this.webhookId,
      webhook_event: JSON.parse(rawBody.toString()),
    };

    try {
      const response = await fetch(`${baseUrl}/v1/notifications/verify-webhook-signature`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(verificationData),
      });

      const data = await response.json() as { verification_status: string };
      return data.verification_status === 'SUCCESS';
    } catch (error) {
      this.logger.error('PayPal webhook verification error', error);
      return false;
    }
  }

  async getOrderDetails(orderId: string): Promise<{ status: string; purchase_units: Array<{ payments: any }> }> {
    const token = await this.getAccessToken();
    const baseUrl = this.getBaseUrl();

    try {
      const response = await fetch(`${baseUrl}/v2/checkout/orders/${orderId}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        const error = await response.json();
        throw new BadRequestException(`PayPal getOrderDetails error: ${JSON.stringify(error)}`);
      }

      return await response.json() as { status: string; purchase_units: Array<{ payments: any }> };
    } catch (error) {
      this.logger.error('PayPal getOrderDetails error', error);
      throw new BadRequestException(`Failed to get PayPal order details: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
}
