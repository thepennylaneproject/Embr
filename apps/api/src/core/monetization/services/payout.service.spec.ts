/**
 * PayoutService Unit Tests
 * Verifies that verifyWalletIntegrity is called and enforced before
 * payout requests are created and before Stripe transfer is initiated.
 */

import { Test, TestingModule } from '@nestjs/testing';
import { UnprocessableEntityException, NotFoundException, BadRequestException } from '@nestjs/common';
import { PayoutService } from './payout.service';
import { PrismaService } from '../../database/prisma.service';
import { WalletService } from './wallet.service';
import { TransactionService } from './transaction.service';
import { PayoutStatus as PrismaPayoutStatus } from '@prisma/client';

// Stripe is called only when Stripe payout is actually sent; mock it at module level.
// The stripe package uses `module.exports = Stripe` (CJS default), so we wrap it the
// same way ts-jest resolves it via esModuleInterop.
const mockStripePayoutsCreate = jest.fn().mockResolvedValue({ id: 'po_test_stripe' });
const MockStripe = jest.fn().mockImplementation(() => ({
  payouts: { create: mockStripePayoutsCreate },
}));
jest.mock('stripe', () => {
  // ts-jest with esModuleInterop resolves the default export as `module.default`
  const ctor = jest.fn().mockImplementation(() => ({
    payouts: { create: jest.fn().mockResolvedValue({ id: 'po_test_stripe' }) },
  }));
  return { default: ctor, __esModule: true };
});

const PAYOUT_ID = 'payout-uuid-001';
const USER_ID = 'user-uuid-001';
const ADMIN_ID = 'admin-uuid-001';
const WALLET_ID = 'wallet-uuid-001';

/** A minimal pending payout row as returned by Prisma */
const makePendingPayout = (overrides: Partial<any> = {}) => ({
  id: PAYOUT_ID,
  userId: USER_ID,
  amount: 5000,
  currency: 'USD',
  status: PrismaPayoutStatus.PENDING,
  note: null,
  stripePayoutId: null,
  approvedBy: null,
  approvedAt: null,
  rejectedBy: null,
  rejectedAt: null,
  rejectionReason: null,
  failureReason: null,
  processedAt: null,
  completedAt: null,
  createdAt: new Date(),
  updatedAt: new Date(),
  user: {
    id: USER_ID,
    email: 'creator@embr.app',
    wallet: {
      id: WALLET_ID,
      userId: USER_ID,
      stripeConnectAccountId: 'acct_test',
      payoutsEnabled: true,
      balance: 5000,
    },
    profile: { username: 'creator', displayName: 'Creator' },
  },
  ...overrides,
});

describe('PayoutService – wallet integrity gate', () => {
  let service: PayoutService;
  let prisma: jest.Mocked<PrismaService>;
  let walletService: jest.Mocked<WalletService>;
  let transactionService: jest.Mocked<TransactionService>;

  beforeEach(async () => {
    const prismaMock: Partial<jest.Mocked<PrismaService>> = {
      user: {
        findUnique: jest.fn(),
        findMany: jest.fn(),
      } as any,
      wallet: {
        findUnique: jest.fn(),
        update: jest.fn(),
      } as any,
      payout: {
        create: jest.fn(),
        findUnique: jest.fn(),
        findFirst: jest.fn(),
        update: jest.fn(),
        findMany: jest.fn(),
        count: jest.fn(),
        aggregate: jest.fn(),
      } as any,
      transaction: {
        create: jest.fn(),
      } as any,
      notification: {
        create: jest.fn(),
      } as any,
      $transaction: jest.fn(),
    };

    const walletMock: Partial<jest.Mocked<WalletService>> = {
      getWalletBalance: jest.fn(),
    };

    const transactionMock: Partial<jest.Mocked<TransactionService>> = {
      verifyWalletIntegrity: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PayoutService,
        { provide: PrismaService, useValue: prismaMock },
        { provide: WalletService, useValue: walletMock },
        { provide: TransactionService, useValue: transactionMock },
      ],
    }).compile();

    service = module.get<PayoutService>(PayoutService);
    prisma = module.get(PrismaService);
    walletService = module.get(WalletService);
    transactionService = module.get(TransactionService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  // ---------------------------------------------------------------------------
  // createPayoutRequest — defense-in-depth gate
  // ---------------------------------------------------------------------------
  describe('createPayoutRequest', () => {
    const validUser = {
      id: USER_ID,
      email: 'creator@embr.app',
      wallet: {
        stripeConnectAccountId: 'acct_test',
        payoutsEnabled: true,
        balance: 10000,
      },
      profile: { username: 'creator', displayName: 'Creator' },
    };

    it('throws UnprocessableEntityException when wallet integrity is invalid', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(validUser);
      (transactionService.verifyWalletIntegrity as jest.Mock).mockResolvedValue({
        valid: false,
        walletBalance: 10000,
        computedBalance: 8000,
        difference: 2000,
      });

      await expect(
        service.createPayoutRequest(USER_ID, { amount: 5000 }),
      ).rejects.toThrow(UnprocessableEntityException);

      // processStripePayout / payout.create must NOT have been called
      expect(prisma.payout.create).not.toHaveBeenCalled();
    });

    it('calls verifyWalletIntegrity with the correct userId', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(validUser);
      (transactionService.verifyWalletIntegrity as jest.Mock).mockResolvedValue({
        valid: false,
        walletBalance: 10000,
        computedBalance: 8000,
        difference: 2000,
      });

      await expect(
        service.createPayoutRequest(USER_ID, { amount: 5000 }),
      ).rejects.toThrow(UnprocessableEntityException);

      expect(transactionService.verifyWalletIntegrity).toHaveBeenCalledWith(USER_ID);
    });

    it('proceeds past integrity gate when wallet is valid', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(validUser);
      (transactionService.verifyWalletIntegrity as jest.Mock).mockResolvedValue({
        valid: true,
        walletBalance: 10000,
        computedBalance: 10000,
        difference: 0,
      });
      (walletService.getWalletBalance as jest.Mock).mockResolvedValue({ available: 10000, pending: 0 });
      (prisma.payout.findFirst as jest.Mock).mockResolvedValue(null);
      (prisma.payout.create as jest.Mock).mockResolvedValue({
        id: PAYOUT_ID,
        userId: USER_ID,
        amount: 5000,
        status: PrismaPayoutStatus.PENDING,
        user: validUser,
      });
      (prisma.user.findMany as jest.Mock).mockResolvedValue([]); // no admins for notification

      const result = await service.createPayoutRequest(USER_ID, { amount: 5000 });

      expect(result.id).toBe(PAYOUT_ID);
      expect(prisma.payout.create).toHaveBeenCalledTimes(1);
    });
  });

  // ---------------------------------------------------------------------------
  // approvePayout — primary integrity gate before Stripe transfer
  // ---------------------------------------------------------------------------
  describe('approvePayout', () => {
    it('throws UnprocessableEntityException when wallet integrity is invalid at approval', async () => {
      (prisma.payout.findUnique as jest.Mock).mockResolvedValue(makePendingPayout());
      (transactionService.verifyWalletIntegrity as jest.Mock).mockResolvedValue({
        valid: false,
        walletBalance: 5000,
        computedBalance: 3000,
        difference: 2000,
      });

      await expect(
        service.approvePayout(ADMIN_ID, { payoutRequestId: PAYOUT_ID, approve: true }),
      ).rejects.toThrow(UnprocessableEntityException);
    });

    it('does NOT update payout status to APPROVED when integrity check fails', async () => {
      (prisma.payout.findUnique as jest.Mock).mockResolvedValue(makePendingPayout());
      (transactionService.verifyWalletIntegrity as jest.Mock).mockResolvedValue({
        valid: false,
        walletBalance: 5000,
        computedBalance: 3000,
        difference: 2000,
      });

      await expect(
        service.approvePayout(ADMIN_ID, { payoutRequestId: PAYOUT_ID, approve: true }),
      ).rejects.toThrow(UnprocessableEntityException);

      // Wallet deduction and Stripe transfer must not have been attempted
      expect(prisma.payout.update).not.toHaveBeenCalled();
      expect(prisma.$transaction).not.toHaveBeenCalled();
    });

    it('proceeds to Stripe payout when wallet integrity is valid', async () => {
      const pendingPayout = makePendingPayout();
      // All findUnique calls return the pending payout (status check only happens on the first call)
      (prisma.payout.findUnique as jest.Mock).mockResolvedValue(pendingPayout);
      (transactionService.verifyWalletIntegrity as jest.Mock).mockResolvedValue({
        valid: true,
        walletBalance: 5000,
        computedBalance: 5000,
        difference: 0,
      });
      (prisma.payout.update as jest.Mock).mockResolvedValue({ ...pendingPayout, status: 'APPROVED' });
      // $transaction executes the callback with a mini-Prisma tx client
      (prisma.$transaction as jest.Mock).mockImplementation(async (fn: any) => fn({
        wallet: { findUnique: jest.fn().mockResolvedValue({ id: WALLET_ID, userId: USER_ID, balance: 5000 }), update: jest.fn() },
        transaction: { create: jest.fn() },
        payout: { update: jest.fn() },
      }));
      (prisma.notification.create as jest.Mock).mockResolvedValue({});

      // Should not throw
      await expect(
        service.approvePayout(ADMIN_ID, { payoutRequestId: PAYOUT_ID, approve: true }),
      ).resolves.not.toThrow();

      expect(transactionService.verifyWalletIntegrity).toHaveBeenCalledWith(USER_ID);
    });

    it('does NOT call verifyWalletIntegrity when rejecting a payout', async () => {
      (prisma.payout.findUnique as jest.Mock).mockResolvedValue(makePendingPayout());
      (prisma.payout.update as jest.Mock).mockResolvedValue({ ...makePendingPayout(), status: 'REJECTED' });
      (prisma.notification.create as jest.Mock).mockResolvedValue({});

      await service.approvePayout(ADMIN_ID, {
        payoutRequestId: PAYOUT_ID,
        approve: false,
        rejectionReason: 'Test rejection',
      });

      expect(transactionService.verifyWalletIntegrity).not.toHaveBeenCalled();
    });
  });
});
