import {
  Controller,
  Post,
  Body,
  Headers,
  HttpCode,
  HttpStatus,
  Logger,
  BadRequestException,
} from '@nestjs/common';
import Stripe from 'stripe';
import { TipService } from '../services/tip.service';
import { PayoutService } from '../services/payout.service';
import { StripeConnectService } from '../services/stripe-connect.service';

@Controller('webhooks/stripe')
export class StripeWebhookController {
  private readonly logger = new Logger(StripeWebhookController.name);
  private stripe: Stripe;

  constructor(
    private tipService: TipService,
    private payoutService: PayoutService,
    private stripeConnectService: StripeConnectService,
  ) {
    this.stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
      apiVersion: '2023-10-16',
    });
  }

  /**
   * POST /webhooks/stripe
   * Handle Stripe webhook events
   */
  @Post()
  @HttpCode(HttpStatus.OK)
  async handleWebhook(
    @Body() rawBody: Buffer,
    @Headers('stripe-signature') signature: string,
  ) {
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

    if (!webhookSecret) {
      this.logger.error('Stripe webhook secret not configured');
      throw new BadRequestException('Webhook secret not configured');
    }

    let event: Stripe.Event;

    try {
      // Verify webhook signature
      event = this.stripe.webhooks.constructEvent(
        rawBody,
        signature,
        webhookSecret,
      );
    } catch (error) {
      this.logger.error(`Webhook signature verification failed: ${error.message}`);
      throw new BadRequestException('Invalid signature');
    }

    this.logger.log(`Received webhook: ${event.type}`);

    try {
      // Handle the event
      switch (event.type) {
        case 'payment_intent.succeeded':
          await this.handlePaymentIntentSucceeded(event.data.object as Stripe.PaymentIntent);
          break;

        case 'payment_intent.payment_failed':
          await this.handlePaymentIntentFailed(event.data.object as Stripe.PaymentIntent);
          break;

        case 'payout.paid':
          await this.handlePayoutPaid(event.data.object as Stripe.Payout);
          break;

        case 'payout.failed':
          await this.handlePayoutFailed(event.data.object as Stripe.Payout);
          break;

        case 'account.updated':
          await this.handleAccountUpdated(event.data.object as Stripe.Account);
          break;

        default:
          this.logger.log(`Unhandled event type: ${event.type}`);
      }

      return { received: true };
    } catch (error) {
      this.logger.error(`Error processing webhook: ${error.message}`);
      throw error;
    }
  }

  /**
   * Handle successful payment intent (tip payment)
   */
  private async handlePaymentIntentSucceeded(
    paymentIntent: Stripe.PaymentIntent,
  ): Promise<void> {
    const tipId = paymentIntent.metadata?.tipId;

    if (!tipId) {
      this.logger.warn('Payment intent has no tipId in metadata');
      return;
    }

    this.logger.log(`Payment succeeded for tip: ${tipId}`);

    try {
      await this.tipService.completeTip(tipId);
    } catch (error) {
      this.logger.error(`Failed to complete tip ${tipId}: ${error.message}`);
    }
  }

  /**
   * Handle failed payment intent
   */
  private async handlePaymentIntentFailed(
    paymentIntent: Stripe.PaymentIntent,
  ): Promise<void> {
    const tipId = paymentIntent.metadata?.tipId;

    if (!tipId) {
      return;
    }

    this.logger.error(`Payment failed for tip: ${tipId}`);

    // Mark tip as failed (already handled in TipService)
    // Could send notification to user here
  }

  /**
   * Handle successful payout
   */
  private async handlePayoutPaid(payout: Stripe.Payout): Promise<void> {
    this.logger.log(`Payout completed: ${payout.id}`);

    try {
      await this.payoutService.completePayout(payout.id);
    } catch (error) {
      this.logger.error(`Failed to complete payout ${payout.id}: ${error.message}`);
    }
  }

  /**
   * Handle failed payout
   */
  private async handlePayoutFailed(payout: Stripe.Payout): Promise<void> {
    this.logger.error(`Payout failed: ${payout.id}`);

    // TODO: Update payout status to FAILED and notify user
    // Could implement retry logic or refund to wallet
  }

  /**
   * Handle Stripe Connect account update
   */
  private async handleAccountUpdated(account: Stripe.Account): Promise<void> {
    this.logger.log(`Account updated: ${account.id}`);

    try {
      await this.stripeConnectService.handleAccountUpdate(account.id);
    } catch (error) {
      this.logger.error(
        `Failed to handle account update ${account.id}: ${error.message}`,
      );
    }
  }
}
