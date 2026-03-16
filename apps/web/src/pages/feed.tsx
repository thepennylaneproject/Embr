import Head from 'next/head';
import { ProtectedPageShell } from '@/components/layout';
import { FeedTabs } from '@/components/content';
import { copy } from '@/lib/copy';

export default function FeedPage() {
  return (
    <>
      <Head>
        <title>{copy.brand.pageTitle(copy.dashboard.feed.title)}</title>
      </Head>
      <ProtectedPageShell
        title={copy.dashboard.feed.title}
        subtitle={copy.dashboard.feed.subtitle}
        breadcrumbs={[{ label: copy.dashboard.feed.title }]}
      >
        <FeedTabs />
      </ProtectedPageShell>
    </>
  );
}
