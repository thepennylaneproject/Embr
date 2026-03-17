/**
 * Shared sanitization helpers for user and profile data in API responses.
 *
 * The Prisma User and Profile models contain fields that must never be
 * returned to clients (credentials, OAuth IDs, Stripe internals) and fields
 * that must only be visible to the record owner (email, notification prefs,
 * suspension details, etc.).  Using these helpers keeps that logic in one place
 * and prevents accidental leakage as new endpoints are added.
 */

/**
 * Strips private user-preference fields from a Profile record.
 * `notificationPreference` is a personal setting that other users must not see.
 */
export function sanitizePublicProfile(profile: any): any {
  if (!profile) return null;
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { notificationPreference, ...publicProfile } = profile;
  return publicProfile;
}

/**
 * Returns a safe representation of a User for display to *other* users
 * (social cards, follower/following lists, search results, gig listings, etc.).
 *
 * Strips all credentials, OAuth identifiers, Stripe IDs, internal counters,
 * moderation metadata, and financial relations.
 */
export function sanitizePublicUser(user: any): any {
  if (!user) return null;
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const {
    passwordHash,
    googleId,
    stripeCustomerId,
    email,
    suspended,
    suspendedUntil,
    lastLoginAt,
    deletedAt,
    unreadNotificationCount,
    wallet,
    refreshTokens,
    passwordResetTokens,
    emailVerificationTokens,
    ...publicFields
  } = user;

  if (publicFields.profile) {
    publicFields.profile = sanitizePublicProfile(publicFields.profile);
  }

  return publicFields;
}

/**
 * Returns a safe representation of a User for admin/moderator-facing responses.
 * Retains operational fields (email, role, moderation flags) but strips
 * credentials and Stripe-internal IDs that are useless outside of server code.
 */
export function sanitizeAdminUser(user: any): any {
  if (!user) return null;
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const {
    passwordHash,
    googleId,
    stripeCustomerId,
    refreshTokens,
    passwordResetTokens,
    emailVerificationTokens,
    ...adminFields
  } = user;
  return adminFields;
}
