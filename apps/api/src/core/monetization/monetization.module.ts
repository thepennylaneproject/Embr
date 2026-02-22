import { Module } from '@nestjs/common';
import { WalletController } from './controllers/wallet.controller';
import { TipController } from './controllers/tip.controller';
import { PayoutController } from './controllers/payout.controller';
import { StripeConnectController } from './controllers/stripe-connect.controller';
import { LicensingPaymentController } from './controllers/licensing-payment.controller';
import { StripeWebhookController } from './webhooks/stripe-webhook.controller';
import { WalletService } from './services/wallet.service';
import { TipService } from './services/tip.service';
import { PayoutService } from './services/payout.service';
import { StripeConnectService } from './services/stripe-connect.service';
import { LicensingPaymentService } from './services/licensing-payment.service';
import { TransactionService } from './services/transaction.service';

@Module({
  controllers: [
    WalletController,
    TipController,
    PayoutController,
    StripeConnectController,
    LicensingPaymentController,
    StripeWebhookController,
  ],
  providers: [
    WalletService,
    TipService,
    PayoutService,
    StripeConnectService,
    LicensingPaymentService,
    TransactionService,
  ],
  exports: [
    WalletService,
    TipService,
    PayoutService,
    StripeConnectService,
    LicensingPaymentService,
    TransactionService,
  ],
})
export class MonetizationModule {}
