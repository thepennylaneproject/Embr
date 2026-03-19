/**
 * Single source of truth for all UI copy in the Embr web app.
 *
 * Usage: import { copy } from '@/lib/copy';
 *
 * Sections:
 *   brand, nav, onboarding, onboardingWizard, onboardingChecklist, onboardingBanner,
 *   dashboard, jobs, applications, resumes,
 *   voice, personas, profile, settings, learn, transparency, upgrade,
 *   errors, success, confirmations, actions, emptyStates, pricing, ethics,
 *   eduPromo, marketing, trust
 */

export const copy = {
  brand: {
    name: 'Embr',
    tagline: 'A creator-focused social platform for your community.',
    homeTitle: 'Welcome to Embr',
    homeDescription: 'A creator-focused social platform for your community.',
    ariaLabel: 'Embr home',
    pageTitle: (section: string) => `${section} — Embr`,
  },

  nav: {
    feed: 'Feed',
    discover: 'Discover',
    create: 'Create',
    groups: 'Groups',
    events: 'Events',
    mutualAid: 'Mutual Aid',
    marketplace: 'Marketplace',
    music: 'Music',
    gigs: 'Gigs',
    earnings: 'Earnings',
    messages: 'Messages',
    profile: 'Profile',
    notifications: 'Notifications',
    settings: 'Settings',
    signOut: 'Sign out',
    toggleMenu: 'Toggle menu',
    primaryNav: 'Primary navigation',
    userMenu: 'User menu',
    quickCreate: {
      hostEvent: 'Host Event',
      createGroup: 'Create Group',
      sell: 'Sell',
    },
  },

  onboarding: {
    signIn: 'Sign in',
    signingIn: 'Signing in...',
    signInSubtitle: 'Continue building with Embr.',
    signInTitle: 'Sign in',
    createAccount: 'Create account',
    creatingAccount: 'Creating account...',
    createAccountTitle: 'Create account',
    createAccountSubtitle: 'Build your creator space on Embr.',
    forgotPassword: 'Forgot password?',
    needAccount: 'Need an account?',
    alreadyHaveAccount: 'Already have an account?',
    resetPassword: 'Reset password',
    resetPasswordSubtitle: 'Enter your email and we will send a secure reset link.',
    sendResetLink: 'Send reset link',
    sending: 'Sending...',
    checkEmail: 'Check your email',
    checkEmailDescription: (email: string) =>
      `If an account exists for ${email}, a reset link has been sent.`,
    signInToContinue: 'Sign in to continue',
    signInToContinueDesc: 'Create an account or sign in to access Embr.',
    welcomeBack: 'Welcome back',
    welcomeBackDesc: 'Continue to your feed.',
    goToFeed: 'Go to feed',
    loading: 'Loading',
    loadingDesc: 'Checking your authentication state.',
    loadingSession: 'Loading session',
    checkingAccountDetails: 'Checking your account details.',
    redirecting: 'Redirecting you to sign in',
    redirectingDesc: 'Please wait while we verify your session.',
    redirectingToSignInDesc:
      "Please wait while we redirect you to sign in. If this page doesn't redirect automatically, you can sign in manually.",
    signInToView: 'You need to sign in to view this page.',
    alreadySignedIn: 'You are already signed in.',
    setNewPassword: 'Set a new password',
    setNewPasswordSubtitle: 'Choose a secure password for your Embr account.',
    passwordReset: 'Password reset',
    passwordResetSuccess: 'Your password was updated. Redirecting to sign in.',
    missingResetToken: 'Missing reset token',
    missingResetTokenDesc: 'Open the password reset link from your email again.',
    resetting: 'Resetting...',
    backToSignIn: 'Back to sign in',
  },

  onboardingWizard: {
    dialogLabel: 'Welcome to Embr',
    skipOnboarding: 'Skip onboarding',

    // Step 0 — Welcome
    welcomeTitle: (displayName: string) => `Welcome to Embr, ${displayName}!`,
    welcomeSubtitle:
      'A creator-focused platform built for you — not advertisers. Own your audience, earn fairly, and build real community.',
    valuePropNoAds: '✅ No ads',
    valuePropRevenue: '✅ 85–90% revenue share',
    valuePropOpenPlatform: '✅ Open platform',
    getStarted: 'Get started →',

    // Step 1 — Role selection
    roleTitle: 'What brings you here?',
    roleSubtitle: 'We will personalise your experience — you can always change this later.',
    roles: {
      creator: {
        title: 'Creator',
        description: 'I make things — art, music, writing, video, code, or anything else.',
      },
      supporter: {
        title: 'Supporter',
        description: 'I discover great work and support the creators behind it.',
      },
      explorer: {
        title: 'Explorer',
        description: 'I am just looking around to see what Embr has to offer.',
      },
    },
    continue: 'Continue',
    skipForNow: 'Skip for now',
    back: 'Back',

    // Step 2 — Feature discovery
    discoverTitle: "Here's what awaits you",
    discoverSubtitle: "Embr is more than a social feed — it's a full platform for creative life.",
    features: {
      feed: {
        title: 'Feed',
        description: 'Follow creators and see what they are working on in real time.',
      },
      gigs: {
        title: 'Gigs',
        description: 'Post or apply to paid creative work — no hidden commissions.',
      },
      music: {
        title: 'Music',
        description: 'Discover, share, and license music from independent artists.',
      },
      groups: {
        title: 'Groups',
        description: 'Connect around shared interests with focused community spaces.',
      },
      events: {
        title: 'Events',
        description: 'Host and attend in-person and virtual community events.',
      },
      mutualAid: {
        title: 'Mutual Aid',
        description: 'Give and receive support from people in your community.',
      },
    },
    almostThere: 'Almost there →',

    // Step 3 — Finish
    finishTitle: "You're all set!",
    finishSubtitle:
      'Start by completing your profile — it helps the community find and connect with you.',
    firstStepsLabel: 'First steps ✅',
    firstSteps: [
      { label: 'Complete your profile', href: '/profile/edit' },
      { label: 'Make your first post', href: '/create' },
      { label: 'Explore the feed', href: '/feed' },
    ] as Array<{ label: string; href: string }>,
    goToFeed: 'Go to feed',
    completeProfile: 'Complete profile →',
  },

  onboardingChecklist: {
    title: 'Get Started Earning',
    subtitle: 'Complete these 3 steps to earn your first tip',
    progressLabel: (completed: number, total: number) => `${completed} of ${total} complete`,
    stepCompleteLabel: '✓ Complete',
    celebration: {
      title: 'Welcome to Embr!',
      subtitle: "You're all set. Time to start earning.",
    },
    readyTitle: '🚀 Ready to earn',
    readySubtitle: 'Start applying to gigs and grow your audience',
    browseGigs: 'Browse Gigs',
    viewFeed: 'View Feed',
    steps: {
      profile: {
        title: 'Complete Your Profile',
        description: 'Add a photo and bio so clients know who you are.',
        cta: 'Set Up Profile',
        icon: '👤',
      },
      post: {
        title: 'Post Your First Content',
        description: 'Share your work to start building your audience.',
        cta: 'Create First Post',
        icon: '✨',
      },
      earning: {
        title: 'Get Your First Tip',
        description: 'Browse opportunities and earn money for your work.',
        cta: 'Find Work',
        icon: '💰',
      },
    },
  },

  onboardingBanner: {
    regionLabel: 'Getting started checklist',
    dismissLabel: 'Dismiss getting started checklist',
    title: 'Get started on Embr',
    subtitleEmpty: 'Complete these steps to get the most out of Embr.',
    subtitleProgress: (completed: number, total: number) =>
      `${completed} of ${total} steps complete — keep going!`,
    startLabel: 'Start →',
    checklist: [
      { id: 'profile' as const, label: 'Complete your profile', href: '/profile/edit', icon: '👤' },
      { id: 'first_post' as const, label: 'Make your first post', href: '/create', icon: '✍️' },
      { id: 'follow_creator' as const, label: 'Follow a creator', href: '/discover', icon: '🔍' },
      { id: 'explore_gigs' as const, label: 'Explore gigs', href: '/gigs', icon: '💼' },
    ],
  },

  gettingStartedPage: {
    title: 'Getting Started',
    subtitle: 'Complete these steps to get the most out of Embr.',
    resetPrompt: 'Want to restart the getting-started checklist?',
    resetButton: 'Reset onboarding progress',
  },

  dashboard: {
    feed: {
      title: 'Feed',
      subtitle: "Stay up to date with what's new from creators.",
    },
    discover: {
      title: 'Discover',
      subtitle: 'Find amazing creators and connect with the community',
    },
    messages: {
      title: 'Messages',
      subtitle: 'Connect and chat with other creators.',
    },
    notifications: {
      title: 'Notifications',
      unread: (count: number) =>
        `${count} unread notification${count === 1 ? '' : 's'}`,
      allCaughtUp: 'You are all caught up.',
      markAllRead: 'Mark all read',
      deleteRead: 'Delete read',
      loadMore: 'Load more',
    },
    earnings: {
      title: 'Earnings',
      subtitle:
        'See where your money comes from. Transparent breakdown, zero hidden fees.',
      summary: 'Summary',
      transactions: 'Transactions',
      requestPayout: 'Request Payout',
    },
    create: {
      title: 'Create',
      subtitle: 'Share something with your community.',
    },
    groups: {
      title: 'Groups',
      subtitle: 'Organize and connect with focused communities.',
    },
    events: {
      title: 'Events',
      subtitle: 'Find and host events in your community.',
      upcoming: 'Upcoming',
      past: 'Past',
      allTypes: 'All Types',
    },
    marketplace: {
      title: 'Marketplace',
      subtitle: 'Buy, sell, and trade with your community. 2% platform fee — nothing hidden.',
    },
    mutualAid: {
      title: 'Mutual Aid',
      subtitle: 'Give and receive support within your community.',
    },
    music: {
      title: 'Music',
      subtitle: 'Discover, share, and license music from independent artists.',
    },
    safety: {
      title: 'Safety',
      subtitle: 'Keep Embr a safe and welcoming space.',
    },
  },

  jobs: {
    findWork: {
      title: 'Find Work',
      subtitle: 'Browse opportunities to earn. Filter by what matters to you.',
    },
    myGigs: 'My Gigs',
    postGig: '+ Post a Gig',
    manageGigs: 'Manage gigs',
    gigDetail: 'Gig details',
    bookGig: 'Book this gig',
  },

  applications: {
    apply: 'Apply',
    applyNow: 'Apply now',
    applied: 'Applied',
    application: 'Application',
    applications: 'Applications',
    viewApplications: 'View applications',
    applicationSubmitted: 'Application submitted',
    withdrawApplication: 'Withdraw application',
  },

  resumes: {
    resume: 'Resume',
    uploadResume: 'Upload resume',
    viewResume: 'View resume',
    noResume: 'No resume uploaded yet.',
    resumeOptional: 'Resume (optional)',
  },

  voice: {
    persona: 'Persona',
    voiceProfile: 'Voice profile',
    tone: 'Tone',
    style: 'Style',
    voiceSettings: 'Voice settings',
    configureVoice: 'Configure your voice persona',
  },

  personas: {
    creator: 'Creator',
    user: 'User',
    admin: 'Admin',
    creatorMode: 'Creator mode',
    creatorModeDesc: 'Unlocks gig posting, music upload, and creator tools',
    switchToCreator: 'Switch to creator mode',
  },

  profile: {
    loading: 'Loading profile',
    loadingDesc: 'Please wait while we load your profile.',
    followers: 'Followers',
    following: 'Following',
    posts: 'Posts',
    editProfile: 'Edit profile',
    changePhoto: 'Change profile photo',
    bio: 'Bio',
    location: 'Location',
    website: 'Website',
    save: 'Save',
    saving: 'Saving...',
    follow: 'Follow',
    unfollow: 'Unfollow',
    message: 'Message',
    tip: 'Tip',
    noPostsYet: 'No posts yet.',
    failedToLoadPosts: 'Failed to load posts',
  },

  settings: {
    title: 'Settings',
    account: 'Account',
    privacyMonetization: 'Privacy & Monetization',
    notifications: 'Notifications',
    dangerZone: 'Danger Zone',
    privateAccount: 'Private account',
    privateAccountDesc: 'Only approved followers can see your posts',
    allowTips: 'Allow tips',
    allowTipsDesc: 'Let others send you tips on your posts',
    emailNotifications: 'Email notifications',
    emailNotificationsDesc: 'Receive activity updates via email',
    pushNotifications: 'Push notifications',
    pushNotificationsDesc: 'In-app alerts for messages and activity',
    notificationLevel: {
      all: { label: 'All activity', desc: 'Likes, comments, follows, messages' },
      mentions: {
        label: 'Mentions only',
        desc: 'Only when someone tags or replies to you',
      },
      none: { label: 'None', desc: 'Turn off all notifications' },
    },
    deleteAccount: 'Delete account',
    deleteAccountDesc: 'Permanently delete your account and all data',
    deleteConfirm: 'Are you sure? This cannot be undone.',
    deleting: 'Deleting…',
    deletePermanently: 'Delete permanently',
    saved: 'Saved',
    couldNotSave: 'Could not save',
    couldNotSaveDesc: 'Please try again.',
    uploadFailed: 'Upload failed',
    uploadFailedDesc: 'Please try a smaller image.',
    deletionFailed: 'Deletion failed',
    deletionFailedDesc: 'Contact support if this continues.',
  },

  learn: {
    learnMore: 'Learn more',
    documentation: 'Documentation',
    guide: 'Guide',
    tutorial: 'Tutorial',
    howItWorks: 'How it works',
    resources: 'Resources',
    faq: 'FAQ',
  },

  transparency: {
    platformFee: '2% platform fee — nothing hidden.',
    creatorRevenue: '85–90% goes to you',
    openSource: 'Open source',
    noHiddenFees: 'No hidden fees',
    earningsBreakdown: 'Full earnings breakdown',
    feeStructure: 'Fee structure',
  },

  upgrade: {
    upgrade: 'Upgrade',
    upgradeNow: 'Upgrade now',
    unlockFeatures: 'Unlock features',
    viewPlans: 'View plans',
    currentPlan: 'Current plan',
    freePlan: 'Free plan',
  },

  errors: {
    generic: 'Something went wrong. Please try again.',
    networkError:
      'Unable to connect. Please check your connection and try again.',
    invalidCredentials: 'Invalid credentials.',
    signupFailed: 'Account creation failed.',
    failedToLoad: 'Failed to load.',
    failedToSave: 'Could not save',
    failedToSaveDesc: 'Please try again.',
    uploadFailed: 'Upload failed',
    uploadFailedDesc: 'Please try a smaller file or check your connection.',
    deletionFailed: 'Could not delete',
    deletionFailedDesc: 'Please try again or contact support if the issue continues.',
    resetEmailFailed:
      'Could not send the reset email. Please check the address and try again.',
    failedToLoadPosts: 'Could not load posts. Please refresh.',
    validationFailed: 'Please correct the highlighted fields and try again.',
    passwordTooShort: 'Password must be at least 8 characters.',
    passwordMismatch: 'Passwords do not match.',
    usernameTooShort: 'Username must be at least 3 characters.',
    unauthorized: "You don't have permission to do this.",
    notFound: "We couldn't find what you were looking for.",
    sessionExpired: 'Your session has expired. Please sign in again.',
    tooManyAttempts: 'Too many attempts. Please wait a moment and try again.',
    serverError: 'A server error occurred. Please try again in a moment.',
    conflictError: 'A conflict occurred. Please refresh and try again.',
    // Group errors
    failedToCreateGroup: 'Could not create the group. Please try again.',
    failedToLoadGroup: 'Could not load the group. Please refresh.',
    failedToUpdateGroup: 'Could not save group changes. Please try again.',
    failedToDeleteGroup:
      'Could not delete the group. Please try again or contact support.',
    failedToJoinGroup: 'Could not join the group. Please try again.',
    failedToLeaveGroup: 'Could not leave the group. Please try again.',
    // Marketplace / listing errors
    failedToCreateListing:
      'Could not create the listing. Please check your input and try again.',
    failedToLoadListing: 'Could not load this listing. Please refresh.',
    failedToPlaceOrder:
      'Could not place the order. Please try again or contact support.',
    // Mutual aid errors
    failedToCreateMutualAidPost:
      'Could not post your request. Please try again.',
    // Event errors
    failedToLoadEvents: 'Could not load events. Please refresh.',
    failedToCreateEvent: 'Could not create the event. Please try again.',
    failedToUpdateEvent: 'Could not update the event. Please try again.',
    failedToCancelEvent: 'Could not cancel the event. Please try again.',
    failedToDeleteEvent: 'Could not delete the event. Please try again.',
    failedToRsvp: 'Could not save your RSVP. Please try again.',
    failedToCancelRsvp: 'Could not cancel your RSVP. Please try again.',
    // Organizing errors
    failedToCreateAlert: 'Could not create the alert. Please try again.',
    failedToCreatePoll: 'Could not create the poll. Please try again.',
    failedToVote: 'Could not submit your vote. Please try again.',
    failedToLoadTreasury: 'Could not load treasury info. Please refresh.',
    failedToContribute: 'Could not process the contribution. Please try again.',
    // Safety errors
    failedToSubmitReport:
      'Could not submit your report. Please try again.',
    failedToBlockUser: 'Could not block this user. Please try again.',
    failedToUnblockUser: 'Could not unblock this user. Please try again.',
    failedToMuteUser: 'Could not mute this user. Please try again.',
    failedToUnmuteUser: 'Could not unmute this user. Please try again.',
    failedToLoadSafetySettings:
      'Could not load your safety settings. Please refresh.',
  },

  success: {
    saved: 'Saved',
    profilePhotoUpdated: 'Profile photo updated',
    sent: 'Sent',
    submitted: 'Submitted',
    created: 'Created',
    updated: 'Updated',
    deleted: 'Deleted',
    resetEmailSent: 'Reset email sent',
    passwordChanged: 'Password changed',
    settingsSaved: 'Settings saved',
  },

  confirmations: {
    deleteAccount:
      'Are you sure you want to delete your account? This cannot be undone.',
    deletePost: 'Are you sure you want to delete this post?',
    confirmDelete: 'Confirm deletion',
    cancel: 'Cancel',
    confirm: 'Confirm',
    yes: 'Yes',
    no: 'No',
  },

  actions: {
    save: 'Save',
    saving: 'Saving...',
    cancel: 'Cancel',
    delete: 'Delete',
    edit: 'Edit',
    submit: 'Submit',
    send: 'Send',
    loading: 'Loading',
    loadMore: 'Load more',
    viewAll: 'View all',
    close: 'Close',
    back: 'Back',
    next: 'Next',
    done: 'Done',
    markAllRead: 'Mark all read',
    deleteAllRead: 'Delete read',
    refresh: 'Refresh',
    share: 'Share',
    report: 'Report',
    block: 'Block',
    mute: 'Mute',
    like: 'Like',
    comment: 'Comment',
    reply: 'Reply',
    follow: 'Follow',
    unfollow: 'Unfollow',
    search: 'Search',
    filter: 'Filter',
    apply: 'Apply filters',
    clear: 'Clear filters',
    upload: 'Upload',
    download: 'Download',
    preview: 'Preview',
    post: 'Post',
  },

  emptyStates: {
    noJobs: 'No gigs available right now.',
    noJobsDesc: 'Check back soon or post your own gig.',
    noPosts: 'No posts yet.',
    noPostsDesc: 'Be the first to post something.',
    noNotifications: 'You are all caught up.',
    noMessages: 'No messages yet.',
    noMessagesDesc: 'Start a conversation with a creator.',
    noEvents: 'No events found.',
    noEventsDesc: 'Try adjusting your filters or check back later.',
    noListings: 'No listings available.',
    noListingsDesc: 'Try adjusting your search or filters.',
    noResults: 'No results found.',
    noResultsDesc: 'Try adjusting your search or filters.',
    noFollowers: 'No followers yet.',
    noFollowing: 'Not following anyone yet.',
    noTransactions: 'No transactions yet.',
    noEarnings: 'No earnings yet.',
    noEarningsDesc: 'Start creating and earning today.',
    noGroups: 'No groups yet.',
    noGroupsDesc: 'Join or create a group to get started.',
  },

  pricing: {
    free: 'Free',
    pro: 'Pro',
    perMonth: '/month',
    getStarted: 'Get started',
    platformFee: '2%',
    noHiddenFees: 'No hidden fees',
    creatorKeeps: '85–90% creator revenue share',
    viewPricing: 'View pricing',
  },

  ethics: {
    creatorFirst: 'Creator-first',
    transparentFees: 'Transparent fees',
    communityOwned: 'Community owned',
    openSource: 'Open source',
    privacyFirst: 'Privacy first',
    noAds: 'No ads',
    noAlgorithmicManipulation: 'No algorithmic manipulation',
    dataPortability: 'Your data, your terms',
    moderation: 'Community-led moderation',
  },

  // Keys migrated from i18n.config.ts (eduPromo, marketing, trust)
  eduPromo: {
    title: 'Learn and grow',
    subtitle: 'Access tutorials, guides, and community resources.',
    cta: 'Explore resources',
    badge: 'Education',
    featuredGuide: 'Getting started guide',
    communityTips: 'Community tips',
    creatorPlaybook: 'Creator playbook',
  },

  marketing: {
    heroTitle: 'Build your creator space',
    heroSubtitle: 'A platform built by creators, for creators.',
    ctaPrimary: 'Get started free',
    ctaSecondary: 'Learn more',
    featureTitle: 'Everything you need to create',
    testimonialLabel: 'What creators say',
    socialProof: 'Trusted by creators',
    valueProps: {
      ownership: 'Own your audience',
      revenue: 'Keep 85–90% of revenue',
      tools: 'Professional creator tools',
      community: 'Built-in community features',
    },
  },

  trust: {
    securePayments: 'Secure payments',
    verifiedCreators: 'Verified creators',
    communityModerated: 'Community moderated',
    dataPrivacy: 'Your data stays yours',
    supportAvailable: 'Support available',
    encryptedData: 'End-to-end encrypted messages',
    gdprCompliant: 'GDPR compliant',
    noDataSelling: 'We never sell your data',
  },
} as const;

export type Copy = typeof copy;
