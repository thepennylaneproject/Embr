import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const [wallet, tip, payout, transaction, track, artistStat] = await Promise.all([
    prisma.wallet.aggregate({ _max: { balance: true, totalEarned: true } }),
    prisma.tip.aggregate({ _max: { amount: true } }),
    prisma.payout.aggregate({ _max: { amount: true } }),
    prisma.transaction.aggregate({ _max: { amount: true } }),
    prisma.track.aggregate({ _max: { price: true } }),
    prisma.artistStat.aggregate({ _max: { revenue: true } }),
  ]);

  const report = {
    walletMaxBalanceCents: wallet._max.balance ?? 0,
    walletMaxTotalEarnedCents: wallet._max.totalEarned ?? 0,
    tipMaxAmountCents: tip._max.amount ?? 0,
    payoutMaxAmountCents: payout._max.amount ?? 0,
    transactionMaxAmountCents: transaction._max.amount ?? 0,
    trackMaxPriceCents: track._max.price ?? 0,
    artistStatMaxRevenueCents: artistStat._max.revenue ?? 0,
  };

  console.log(JSON.stringify(report, null, 2));
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
