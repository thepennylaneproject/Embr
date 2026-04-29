import { isMusicEnabled } from '@/lib/features';

export function getMusicGateServerSideProps() {
  if (!isMusicEnabled()) {
    return { notFound: true };
  }

  return { props: {} };
}
