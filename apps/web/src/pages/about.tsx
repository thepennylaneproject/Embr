import Link from 'next/link';
import { AppShell } from '@/components/layout/AppShell';
import { copy } from '@/lib/copy';

export default function AboutPage() {
  return (
    <AppShell
      title="Why Embr?"
      subtitle="An alternative to corporate extraction"
      breadcrumbs={[{ label: 'About' }]}
    >
      <div style={{ maxWidth: '800px', margin: '0 auto' }}>
        {/* The Problem */}
        <section style={{ marginBottom: '64px', paddingBottom: '64px', borderBottom: '1px solid #e0e0e0' }}>
          <h2 style={{ fontSize: '32px', fontWeight: 600, marginBottom: '24px', color: '#000' }}>
            The Problem
          </h2>

          <p style={{ fontSize: '18px', lineHeight: '1.6', marginBottom: '16px', color: '#333' }}>
            Creators deserve better.
          </p>

          <div style={{ fontSize: '18px', lineHeight: '1.6', color: '#666', marginBottom: '32px' }}>
            <p style={{ marginBottom: '16px' }}>
              <strong>Spotify takes 70%</strong> of what you earn. You get 30%.
            </p>
            <p style={{ marginBottom: '16px' }}>
              <strong>PayPal charges 3.49% + $0.30</strong> per transaction. Stripe does the same.
            </p>
            <p style={{ marginBottom: '16px' }}>
              <strong>YouTube's algorithm</strong> decides if you eat this month.
            </p>
            <p style={{ marginBottom: '16px' }}>
              <strong>Patreon takes 8%.</strong> Substack takes 10%. Your data? Owned by corporations.
            </p>
            <p>
              <strong>Your audience isn't yours.</strong> The platform can delete your account. Shadow-ban your content. Change the rules. And you have no recourse.
            </p>
          </div>

          <p style={{ fontSize: '18px', lineHeight: '1.6', color: '#333' }}>
            This extraction is systematic. It's designed to funnel money to shareholders, not creators.
          </p>
        </section>

        {/* Embr's Answer */}
        <section style={{ marginBottom: '64px', paddingBottom: '64px', borderBottom: '1px solid #e0e0e0' }}>
          <h2 style={{ fontSize: '32px', fontWeight: 600, marginBottom: '24px', color: '#000' }}>
            Embr: The Alternative
          </h2>

          <p style={{ fontSize: '18px', lineHeight: '1.6', marginBottom: '32px', color: '#333' }}>
            A platform owned by and for creators.
          </p>

          <div style={{ fontSize: '18px', lineHeight: '1.6', color: '#333' }}>
            <h3 style={{ fontSize: '24px', fontWeight: 600, marginBottom: '16px', color: '#000' }}>
              2% Platform Fee (Lowest in industry)
            </h3>
            <p style={{ marginBottom: '32px', color: '#666' }}>
              Patreon: 8% + payment processor fees
              <br />
              Substack: 10%
              <br />
              YouTube: 45%
              <br />
              Spotify: 70%
              <br />
              <br />
              <strong>Embr: 2% platform fee + 3% payment processor = 5% total</strong>
              <br />
              <strong>You keep 95% of what you earn.</strong>
            </p>

            <h3 style={{ fontSize: '24px', fontWeight: 600, marginBottom: '16px', color: '#000' }}>
              Transparent Fees
            </h3>
            <p style={{ marginBottom: '32px', color: '#666' }}>
              No hidden extraction. See exactly where your 2% goes:
              <br />
              - Servers & infrastructure
              <br />
              - Team salaries
              <br />
              - Legal & compliance
              <br />
              - Building new features
              <br />
              <br />
              We publish these numbers quarterly. You can audit us.
            </p>

            <h3 style={{ fontSize: '24px', fontWeight: 600, marginBottom: '16px', color: '#000' }}>
              Multiple Revenue Streams
            </h3>
            <p style={{ marginBottom: '32px', color: '#666' }}>
              ✓ Subscriptions (recurring support from your audience)
              <br />
              ✓ Tips (one-time love from fans)
              <br />
              ✓ Gigs & Services (direct work)
              <br />
              ✓ Digital Sales (sell your work)
              <br />
              ✓ Music Licensing (direct from creators)
              <br />
              <br />
              You choose which models work for you. You're not locked into one way of earning.
            </p>

            <h3 style={{ fontSize: '24px', fontWeight: 600, marginBottom: '16px', color: '#000' }}>
              You Own Your Audience
            </h3>
            <p style={{ marginBottom: '32px', color: '#666' }}>
              No algorithm deciding who sees your work. Chronological feed, creator-controlled.
              <br />
              Your data is yours. You can export it. You can leave without losing everything.
              <br />
              Your account won't be deleted arbitrarily. You have recourse.
            </p>

            <h3 style={{ fontSize: '24px', fontWeight: 600, marginBottom: '16px', color: '#000' }}>
              Organize Collectively
            </h3>
            <p style={{ marginBottom: '32px', color: '#666' }}>
              Musicians, journalists, historians, scientists—get stronger together.
              <br />
              Pool resources. Make decisions collectively. Bargain for better terms.
              <br />
              Embr is built for collectives, not just individuals.
            </p>

            <h3 style={{ fontSize: '24px', fontWeight: 600, marginBottom: '16px', color: '#000' }}>
              Radical Transparency
            </h3>
            <p style={{ marginBottom: '32px', color: '#666' }}>
              Public moderation log: See why content was removed. Appeal decisions.
              <br />
              Financial transparency: See how money flows, where it goes.
              <br />
              Creator bill of rights: No shadow banning. Your data isn't sold.
              <br />
              Community governance: Creators have a say in how this is run.
            </p>
          </div>
        </section>

        {/* For Different Creators */}
        <section style={{ marginBottom: '64px', paddingBottom: '64px', borderBottom: '1px solid #e0e0e0' }}>
          <h2 style={{ fontSize: '32px', fontWeight: 600, marginBottom: '24px', color: '#000' }}>
            For All Creators
          </h2>

          <div style={{ fontSize: '18px', lineHeight: '1.8', color: '#666' }}>
            <p style={{ marginBottom: '24px' }}>
              <strong style={{ color: '#000' }}>Musicians:</strong> Keep 95% of earnings from streaming, gigs, and sales. No Spotify middleman.
            </p>
            <p style={{ marginBottom: '24px' }}>
              <strong style={{ color: '#000' }}>Journalists:</strong> Direct subscription from readers. No publication gatekeeping your work or your income.
            </p>
            <p style={{ marginBottom: '24px' }}>
              <strong style={{ color: '#000' }}>Historians:</strong> Sell your research. Build a subscriber community. Keep people paying for truth.
            </p>
            <p style={{ marginBottom: '24px' }}>
              <strong style={{ color: '#000' }}>Scientists:</strong> Publish your work. Earn from consulting. Build a platform of people who understand your field.
            </p>
            <p style={{ marginBottom: '24px' }}>
              <strong style={{ color: '#000' }}>Activists & Organizers:</strong> Coordinate collectives. Pool resources. Organize locally. Build power.
            </p>
            <p>
              <strong style={{ color: '#000' }}>Artists of all kinds:</strong> Sell your work. Get paid fairly. Own your audience. No algorithm deciding if you eat.
            </p>
          </div>
        </section>

        {/* This Is Different */}
        <section style={{ marginBottom: '64px', paddingBottom: '64px', borderBottom: '1px solid #e0e0e0' }}>
          <h2 style={{ fontSize: '32px', fontWeight: 600, marginBottom: '24px', color: '#000' }}>
            This Is Different
          </h2>

          <div style={{ fontSize: '18px', lineHeight: '1.8', color: '#666' }}>
            <p style={{ marginBottom: '24px' }}>
              Embr isn't venture-backed. We're not trying to flip this for $1B acquisition. We're building this to last.
            </p>
            <p style={{ marginBottom: '24px' }}>
              We're not optimizing for engagement metrics. No infinite scroll. No notifications designed to addict. No engagement-driven algorithm.
            </p>
            <p style={{ marginBottom: '24px' }}>
              We're not selling your data. We're not running ads. We're not deciding what content is "trending" to maximize ad views.
            </p>
            <p style={{ marginBottom: '24px' }}>
              We're not watching you. We're building tools so you can build a living doing what you love.
            </p>
            <p>
              And we're transparent about all of it. Every financial decision. Every moderation choice. Every feature we build.
            </p>
          </div>
        </section>

        {/* CTA */}
        <section style={{ textAlign: 'center' }}>
          <h2 style={{ fontSize: '32px', fontWeight: 600, marginBottom: '32px', color: '#000' }}>
            Ready to Own Your Work?
          </h2>

          <p style={{ fontSize: '18px', lineHeight: '1.6', marginBottom: '32px', color: '#666' }}>
            Join creators who are building an alternative to corporate extraction.
          </p>

          <div style={{ display: 'flex', gap: '16px', justifyContent: 'center', flexWrap: 'wrap' }}>
            <Link href="/feed">
              <button
                style={{
                  padding: '12px 32px',
                  fontSize: '18px',
                  fontWeight: 600,
                  backgroundColor: '#E8998D',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  transition: 'background-color 200ms',
                }}
                onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#d88a7f')}
                onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#E8998D')}
              >
                {copy.actions.goToFeed}
              </button>
            </Link>
            <Link href="/create">
              <button
                style={{
                  padding: '12px 32px',
                  fontSize: '18px',
                  fontWeight: 600,
                  backgroundColor: 'transparent',
                  color: '#E8998D',
                  border: '2px solid #E8998D',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  transition: 'all 200ms',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = '#E8998D';
                  e.currentTarget.style.color = 'white';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = 'transparent';
                  e.currentTarget.style.color = '#E8998D';
                }}
              >
                Create
              </button>
            </Link>
          </div>
        </section>
      </div>
    </AppShell>
  );
}
