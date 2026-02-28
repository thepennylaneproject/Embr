# Module Manifest

## 1. File Inventory

| Path | Domain | Type | Description | Complexity |
|---|---|---|---|---|
| `apps/api/src/core/auth/auth.controller.ts` | Auth | route/controller | Handles HTTP requests for auth domain | Medium |
| `apps/api/src/core/auth/auth.module.ts` | Auth | module | NestJS module definition for auth | Low |
| `apps/api/src/core/auth/auth.service.ts` | Auth | service | Business logic for auth operations | High |
| `apps/api/src/core/auth/decorators/current-user.decorator.ts` | Auth | security | Security/authentication mechanisms for auth | Low |
| `apps/api/src/core/auth/decorators/get-user.decorator.ts` | Auth | security | Security/authentication mechanisms for auth | Low |
| `apps/api/src/core/auth/decorators/public.decorator.ts` | Auth | security | Security/authentication mechanisms for auth | Low |
| `apps/api/src/core/auth/decorators/roles.decorator.ts` | Auth | security | Security/authentication mechanisms for auth | Low |
| `apps/api/src/core/auth/dto/change-password.dto.ts` | Auth | schema/dto | Data transfer objects for auth | Low |
| `apps/api/src/core/auth/dto/forgot-password.dto.ts` | Auth | schema/dto | Data transfer objects for auth | Low |
| `apps/api/src/core/auth/dto/index.ts` | Auth | api-client | API client/bindings for auth | Low |
| `apps/api/src/core/auth/dto/login.dto.ts` | Auth | schema/dto | Data transfer objects for auth | Low |
| `apps/api/src/core/auth/dto/refresh-token.dto.ts` | Auth | schema/dto | Data transfer objects for auth | Low |
| `apps/api/src/core/auth/dto/resend-verification.dto.ts` | Auth | schema/dto | Data transfer objects for auth | Low |
| `apps/api/src/core/auth/dto/reset-password.dto.ts` | Auth | schema/dto | Data transfer objects for auth | Low |
| `apps/api/src/core/auth/dto/signup.dto.ts` | Auth | schema/dto | Data transfer objects for auth | Low |
| `apps/api/src/core/auth/dto/verify-email.dto.ts` | Auth | schema/dto | Data transfer objects for auth | Low |
| `apps/api/src/core/auth/guards/jwt-auth.guard.ts` | Auth | security | Security/authentication mechanisms for auth | Low |
| `apps/api/src/core/auth/guards/jwt-refresh.guard.ts` | Auth | security | Security/authentication mechanisms for auth | Low |
| `apps/api/src/core/auth/guards/optional-jwt-auth.guard.ts` | Auth | security | Security/authentication mechanisms for auth | Low |
| `apps/api/src/core/auth/guards/roles.guard.ts` | Auth | security | Security/authentication mechanisms for auth | Low |
| `apps/api/src/core/auth/strategies/google.strategy.ts` | Auth | security | Security/authentication mechanisms for auth | Low |
| `apps/api/src/core/auth/strategies/jwt-refresh.strategy.ts` | Auth | security | Security/authentication mechanisms for auth | Low |
| `apps/api/src/core/auth/strategies/jwt.strategy.ts` | Auth | security | Security/authentication mechanisms for auth | Low |
| `apps/api/src/middleware/auth.ts` | Auth | api-client | API client/bindings for auth | Low |
| `apps/web/src/components/auth/auth/ProtectedRoute.tsx` | Auth | component | UI component for ProtectedRoute | Low |
| `apps/web/src/lib/api/auth.ts` | Auth | util | Utility functions for auth | Low |
| `apps/web/src/pages/auth/forgot-password.tsx` | Auth | route/page | Next.js page for forgot-password | Low |
| `apps/web/src/pages/auth/login.tsx` | Auth | route/page | Next.js page for login | Medium |
| `apps/web/src/pages/auth/reset-password.tsx` | Auth | route/page | Next.js page for reset-password | Medium |
| `apps/web/src/pages/auth/signup.tsx` | Auth | route/page | Next.js page for signup | Medium |
| `apps/web/src/types/auth.ts` | Auth | types | TypeScript interfaces for auth | Low |
| `packages/auth/package.json` | Auth | config | Configuration file for package.json | Low |
| `packages/auth/src/index.ts` | Auth | script/other | Core script or resource for auth | Low |
| `packages/auth/src/jwt.utils.ts` | Auth | util | Utility functions for auth | Medium |
| `packages/auth/src/password.utils.ts` | Auth | util | Utility functions for auth | Medium |
| `packages/auth/src/token.utils.ts` | Auth | util | Utility functions for auth | Medium |
| `packages/auth/src/types.ts` | Auth | script/other | Core script or resource for auth | Low |
| `apps/api/.env.example` | Config | script/other | Core script or resource for config | Low |
| `apps/api/Dockerfile` | Config | script/other | Core script or resource for config | Low |
| `apps/api/package.json` | Config | config | Configuration file for package.json | Low |
| `apps/api/tsconfig.json` | Config | config | Configuration file for tsconfig.json | Low |
| `apps/mobile/.env.example` | Config | script/other | Core script or resource for config | Low |
| `apps/mobile/babel.config.js` | Config | config | Configuration file for babel.config.js | Low |
| `apps/mobile/package.json` | Config | config | Configuration file for package.json | Low |
| `apps/mobile/tsconfig.json` | Config | config | Configuration file for tsconfig.json | Low |
| `apps/web/.env.example` | Config | script/other | Core script or resource for config | Low |
| `apps/web/next.config.js` | Config | config | Configuration file for next.config.js | Low |
| `apps/web/package.json` | Config | config | Configuration file for package.json | Low |
| `apps/web/tailwind.config.js` | Config | config | Configuration file for tailwind.config.js | Low |
| `apps/web/tsconfig.json` | Config | config | Configuration file for tsconfig.json | Low |
| `packages/config/package.json` | Config | config | Configuration file for package.json | Low |
| `packages/config/src/eslint/index.js` | Config | config | Configuration file for index.js | Low |
| `packages/config/src/tailwind/index.js` | Config | config | Configuration file for index.js | Low |
| `packages/config/src/typescript/base.json` | Config | config | Configuration file for base.json | Low |
| `packages/creator-tools/package.json` | Config | config | Configuration file for package.json | Low |
| `packages/types/package.json` | Config | config | Configuration file for package.json | Low |
| `packages/types/tsconfig.json` | Config | config | Configuration file for tsconfig.json | Low |
| `packages/utils/package.json` | Config | config | Configuration file for package.json | Low |
| `packages/utils/tsconfig.json` | Config | config | Configuration file for tsconfig.json | Low |
| `apps/api/src/verticals/feeds/content/content.module.ts` | Content | module | NestJS module definition for content | Low |
| `apps/api/src/verticals/feeds/content/controllers/comments.controller.ts` | Content | route/controller | Handles HTTP requests for content domain | Medium |
| `apps/api/src/verticals/feeds/content/controllers/posts.controller.ts` | Content | route/controller | Handles HTTP requests for content domain | High |
| `apps/api/src/verticals/feeds/content/dto/comments.dto.ts` | Content | schema/dto | Data transfer objects for content | Low |
| `apps/api/src/verticals/feeds/content/dto/create-post.dto.ts` | Content | schema/dto | Data transfer objects for content | Low |
| `apps/api/src/verticals/feeds/content/dto/index.ts` | Content | api-client | API client/bindings for content | Low |
| `apps/api/src/verticals/feeds/content/dto/update-post.dto.ts` | Content | schema/dto | Data transfer objects for content | Low |
| `apps/api/src/verticals/feeds/content/services/comments.service.ts` | Content | service | Business logic for content operations | High |
| `apps/api/src/verticals/feeds/content/services/likes.service.ts` | Content | service | Business logic for content operations | High |
| `apps/api/src/verticals/feeds/content/services/posts.service.ts` | Content | service | Business logic for content operations | High |
| `apps/api/src/verticals/feeds/social-graph/controllers/follows.controller.ts` | Content | route/controller | Handles HTTP requests for content domain | Medium |
| `apps/api/src/verticals/feeds/social-graph/dto/discovery.dto.ts` | Content | schema/dto | Data transfer objects for content | Medium |
| `apps/api/src/verticals/feeds/social-graph/dto/follow.dto.ts` | Content | schema/dto | Data transfer objects for content | Low |
| `apps/api/src/verticals/feeds/social-graph/services/follows.service.ts` | Content | service | Business logic for content operations | High |
| `apps/api/src/verticals/feeds/social-graph/social-graph.module.ts` | Content | module | NestJS module definition for content | Low |
| `apps/web/postcss.config.js` | Content | config | Configuration file for postcss.config.js | Low |
| `apps/web/src/components/content/CommentSection.tsx` | Content | component | UI component for CommentSection | High |
| `apps/web/src/components/content/Feed.tsx` | Content | component | UI component for Feed | Medium |
| `apps/web/src/components/content/FeedTabs.tsx` | Content | component | UI component for FeedTabs | Medium |
| `apps/web/src/components/content/PostCard.tsx` | Content | component | UI component for PostCard | Medium |
| `apps/web/src/components/content/PostCreator.tsx` | Content | component | UI component for PostCreator | High |
| `apps/web/src/components/content/PostDetailPage.tsx` | Content | component | UI component for PostDetailPage | Medium |
| `apps/web/src/components/content/index.ts` | Content | script/other | Core script or resource for content | Low |
| `apps/web/src/pages/feed.tsx` | Content | route/page | Next.js page for feed | Low |
| `apps/web/src/pages/post/[id].tsx` | Content | route/page | Next.js page for [id] | Low |
| `apps/web/src/shared/api/content.api.ts` | Content | api-client | API client/bindings for content | High |
| `apps/web/src/shared/types/content.types.ts` | Content | types | TypeScript interfaces for content | Medium |
| `packages/types/src/api/content.api.ts` | Content | api-client | API client/bindings for content | High |
| `packages/types/src/content.types.ts` | Content | types | TypeScript interfaces for content | Medium |
| `apps/api/nest-cli.json` | Core/App | config | Configuration file for nest-cli.json | Low |
| `apps/api/src/app.module.ts` | Core/App | module | NestJS module definition for core/app | Low |
| `apps/api/src/core/email/email.module.ts` | Core/App | module | NestJS module definition for core/app | Low |
| `apps/api/src/core/email/email.service.ts` | Core/App | service | Business logic for core/app operations | High |
| `apps/api/src/main.ts` | Core/App | api-client | API client/bindings for core/app | Low |
| `apps/mobile/app.json` | Core/App | config | Configuration file for app.json | Low |
| `apps/mobile/assets/README.md` | Core/App | doc | Documentation for README.md | Low |
| `apps/web/next-env.d.ts` | Core/App | script/other | Core script or resource for core/app | Low |
| `apps/web/public/README.md` | Core/App | doc | Documentation for README.md | Low |
| `apps/web/src/contexts/AuthContext.tsx` | Core/App | script/other | Core script or resource for core/app | Medium |
| `apps/web/src/hooks/useComments.ts` | Core/App | hook | React hook for useComments | High |
| `apps/web/src/hooks/useDebounce.ts` | Core/App | hook | React hook for useDebounce | Low |
| `apps/web/src/hooks/useFeed.ts` | Core/App | hook | React hook for useFeed | High |
| `apps/web/src/hooks/useFollow.ts` | Core/App | hook | React hook for useFollow | Medium |
| `apps/web/src/hooks/useGig.ts` | Core/App | hook | React hook for useGig | High |
| `apps/web/src/hooks/useMediaUpload.ts` | Core/App | hook | React hook for useMediaUpload | High |
| `apps/web/src/hooks/useMessaging.ts` | Core/App | hook | React hook for useMessaging | High |
| `apps/web/src/hooks/useNotifications.ts` | Core/App | hook | React hook for useNotifications | Medium |
| `apps/web/src/hooks/usePayouts.ts` | Core/App | hook | React hook for usePayouts | Low |
| `apps/web/src/hooks/usePost.ts` | Core/App | hook | React hook for usePost | Medium |
| `apps/web/src/hooks/useSafety.ts` | Core/App | hook | React hook for useSafety | High |
| `apps/web/src/hooks/useStripeConnect.ts` | Core/App | hook | React hook for useStripeConnect | Medium |
| `apps/web/src/hooks/useTips.ts` | Core/App | hook | React hook for useTips | Low |
| `apps/web/src/hooks/useUserSearch.ts` | Core/App | hook | React hook for useUserSearch | Medium |
| `apps/web/src/hooks/useWallet.ts` | Core/App | hook | React hook for useWallet | Medium |
| `apps/web/src/pages/DiscoveryPage.tsx` | Core/App | route/page | Next.js page for DiscoveryPage | High |
| `apps/web/src/pages/_app.tsx` | Core/App | route/page | Next.js page for _app | Low |
| `apps/web/src/pages/_document.tsx` | Core/App | route/page | Next.js page for _document | Low |
| `apps/web/src/pages/about.tsx` | Core/App | route/page | Next.js page for about | High |
| `apps/web/src/pages/create.tsx` | Core/App | route/page | Next.js page for create | Low |
| `apps/web/src/pages/index.tsx` | Core/App | route/page | Next.js page for index | Low |
| `apps/web/src/pages/marketplace.tsx` | Core/App | route/page | Next.js page for marketplace | Low |
| `packages/creator-tools/src/index.ts` | Creator Tools | script/other | Core script or resource for creator tools | Low |
| `apps/api/prisma/migrations/20260205071952_init/migration.sql` | Database | migration | Database migration script | High |
| `apps/api/prisma/migrations/20260207042211_init/migration.sql` | Database | migration | Database migration script | High |
| `apps/api/prisma/migrations/migration_lock.toml` | Database | config | Configuration file for migration_lock.toml | Low |
| `apps/api/prisma/schema.prisma` | Database | schema | Database schema definitions | High |
| `apps/api/src/core/database/prisma.module.ts` | Database | module | NestJS module definition for database | Low |
| `apps/api/src/core/database/prisma.service.ts` | Database | service | Business logic for database operations | Low |
| `apps/api/src/verticals/gigs/controllers/applications.controller.ts` | Gigs | route/controller | Handles HTTP requests for gigs domain | Medium |
| `apps/api/src/verticals/gigs/controllers/escrow.controller.ts` | Gigs | route/controller | Handles HTTP requests for gigs domain | Medium |
| `apps/api/src/verticals/gigs/controllers/gigs.controller.ts` | Gigs | route/controller | Handles HTTP requests for gigs domain | Medium |
| `apps/api/src/verticals/gigs/dto/gig.dto.ts` | Gigs | schema/dto | Data transfer objects for gigs | High |
| `apps/api/src/verticals/gigs/gigs.module.ts` | Gigs | module | NestJS module definition for gigs | Low |
| `apps/api/src/verticals/gigs/services/applications.service.ts` | Gigs | service | Business logic for gigs operations | High |
| `apps/api/src/verticals/gigs/services/escrow.service.ts` | Gigs | service | Business logic for gigs operations | High |
| `apps/api/src/verticals/gigs/services/gigs.service.ts` | Gigs | service | Business logic for gigs operations | High |
| `apps/web/src/components/gigs/ApplicationForm.tsx` | Gigs | component | UI component for ApplicationForm | High |
| `apps/web/src/components/gigs/GigCard.tsx` | Gigs | component | UI component for GigCard | Medium |
| `apps/web/src/components/gigs/GigDiscovery.tsx` | Gigs | component | UI component for GigDiscovery | High |
| `apps/web/src/components/gigs/GigManagementDashboard.tsx` | Gigs | component | UI component for GigManagementDashboard | High |
| `apps/web/src/components/gigs/GigPostForm.tsx` | Gigs | component | UI component for GigPostForm | High |
| `apps/web/src/components/gigs/index.ts` | Gigs | script/other | Core script or resource for gigs | Low |
| `apps/web/src/pages/gigs/[id].tsx` | Gigs | route/page | Next.js page for [id] | Medium |
| `apps/web/src/pages/gigs/booking/[gigId].tsx` | Gigs | route/page | Next.js page for [gigId] | High |
| `apps/web/src/pages/gigs/index.tsx` | Gigs | route/page | Next.js page for index | Low |
| `apps/web/src/shared/api/gigs.api.ts` | Gigs | api-client | API client/bindings for gigs | High |
| `packages/types/src/api/gigs.api.ts` | Gigs | api-client | API client/bindings for gigs | High |
| `apps/api/src/core/media/controllers/media-upload.controller.ts` | Media | route/controller | Handles HTTP requests for media domain | High |
| `apps/api/src/core/media/controllers/mux-webhook.controller.ts` | Media | route/controller | Handles HTTP requests for media domain | High |
| `apps/api/src/core/media/dto/media-upload.dto.ts` | Media | schema/dto | Data transfer objects for media | High |
| `apps/api/src/core/media/media.module.ts` | Media | module | NestJS module definition for media | Low |
| `apps/api/src/core/media/services/media.service.ts` | Media | service | Business logic for media operations | High |
| `apps/api/src/core/media/services/mux-video.service.ts` | Media | service | Business logic for media operations | High |
| `apps/api/src/core/media/services/s3-multipart.service.ts` | Media | service | Business logic for media operations | High |
| `apps/api/src/core/media/services/thumbnail.service.ts` | Media | service | Business logic for media operations | High |
| `apps/api/src/core/upload/upload.module.ts` | Media | module | NestJS module definition for media | Low |
| `apps/api/src/core/upload/upload.service.ts` | Media | service | Business logic for media operations | Low |
| `apps/web/src/components/media/MediaUploader.tsx` | Media | component | UI component for MediaUploader | High |
| `apps/web/src/components/media/UploadProgress.tsx` | Media | component | UI component for UploadProgress | High |
| `apps/web/src/shared/api/media-api.client.ts` | Media | api-client | API client/bindings for media | Medium |
| `apps/web/src/shared/types/media.types.ts` | Media | types | TypeScript interfaces for media | Medium |
| `packages/types/src/api/media-api.client.ts` | Media | api-client | API client/bindings for media | Medium |
| `packages/types/src/media.types.ts` | Media | types | TypeScript interfaces for media | Medium |
| `apps/api/src/shared/types/messaging.types.ts` | Messaging | api-client | API client/bindings for messaging | High |
| `apps/api/src/verticals/messaging/messaging/controllers/messaging.controller.ts` | Messaging | route/controller | Handles HTTP requests for messaging domain | Medium |
| `apps/api/src/verticals/messaging/messaging/dto/messaging.dto.ts` | Messaging | schema/dto | Data transfer objects for messaging | High |
| `apps/api/src/verticals/messaging/messaging/gateways/messaging.gateway.ts` | Messaging | api-client | API client/bindings for messaging | High |
| `apps/api/src/verticals/messaging/messaging/messaging.module.ts` | Messaging | module | NestJS module definition for messaging | Low |
| `apps/api/src/verticals/messaging/messaging/services/messaging.service.ts` | Messaging | service | Business logic for messaging operations | High |
| `apps/web/.archive/duplicates/messages.tsx` | Messaging | script/other | Core script or resource for messaging | Low |
| `apps/web/src/components/messaging/ConversationList.tsx` | Messaging | component | UI component for ConversationList | Medium |
| `apps/web/src/components/messaging/DMInbox.tsx` | Messaging | component | UI component for DMInbox | Medium |
| `apps/web/src/components/messaging/MessageInput.tsx` | Messaging | component | UI component for MessageInput | High |
| `apps/web/src/components/messaging/MessageThread.tsx` | Messaging | component | UI component for MessageThread | High |
| `apps/web/src/pages/messages/[id].tsx` | Messaging | route/page | Next.js page for [id] | Low |
| `apps/web/src/pages/messages/index.tsx` | Messaging | route/page | Next.js page for index | Low |
| `apps/web/src/shared/api/messaging.api.ts` | Messaging | api-client | API client/bindings for messaging | Medium |
| `apps/web/src/shared/types/messaging.types.ts` | Messaging | types | TypeScript interfaces for messaging | High |
| `packages/types/src/api/messaging.api.ts` | Messaging | api-client | API client/bindings for messaging | Medium |
| `packages/types/src/messaging.types.ts` | Messaging | types | TypeScript interfaces for messaging | High |
| `apps/api/src/core/monetization/controllers/gigs-payment.controller.ts.bak` | Monetization | script/other | Core script or resource for monetization | Medium |
| `apps/api/src/core/monetization/controllers/licensing-payment.controller.ts.bak` | Monetization | script/other | Core script or resource for monetization | Medium |
| `apps/api/src/core/monetization/controllers/marketplace-payment.controller.ts.bak` | Monetization | script/other | Core script or resource for monetization | Medium |
| `apps/api/src/core/monetization/controllers/payout.controller.ts` | Monetization | route/controller | Handles HTTP requests for monetization domain | Medium |
| `apps/api/src/core/monetization/controllers/stripe-connect.controller.ts` | Monetization | route/controller | Handles HTTP requests for monetization domain | Medium |
| `apps/api/src/core/monetization/controllers/tip.controller.ts` | Monetization | route/controller | Handles HTTP requests for monetization domain | Medium |
| `apps/api/src/core/monetization/controllers/wallet.controller.ts` | Monetization | route/controller | Handles HTTP requests for monetization domain | Medium |
| `apps/api/src/core/monetization/dto/payout.dto.ts` | Monetization | schema/dto | Data transfer objects for monetization | Low |
| `apps/api/src/core/monetization/dto/tip.dto.ts` | Monetization | schema/dto | Data transfer objects for monetization | Medium |
| `apps/api/src/core/monetization/dto/wallet.dto.ts` | Monetization | schema/dto | Data transfer objects for monetization | Medium |
| `apps/api/src/core/monetization/monetization.module.ts` | Monetization | module | NestJS module definition for monetization | Low |
| `apps/api/src/core/monetization/services/gigs-payment.service.ts.bak` | Monetization | script/other | Core script or resource for monetization | High |
| `apps/api/src/core/monetization/services/licensing-payment.service.ts.bak` | Monetization | script/other | Core script or resource for monetization | High |
| `apps/api/src/core/monetization/services/marketplace-payment.service.ts.bak` | Monetization | script/other | Core script or resource for monetization | High |
| `apps/api/src/core/monetization/services/payout.service.ts` | Monetization | service | Business logic for monetization operations | High |
| `apps/api/src/core/monetization/services/stripe-connect.service.ts` | Monetization | service | Business logic for monetization operations | High |
| `apps/api/src/core/monetization/services/tip.service.ts` | Monetization | service | Business logic for monetization operations | High |
| `apps/api/src/core/monetization/services/transaction.service.ts` | Monetization | service | Business logic for monetization operations | Medium |
| `apps/api/src/core/monetization/services/wallet.service.ts` | Monetization | service | Business logic for monetization operations | High |
| `apps/api/src/core/monetization/webhooks/stripe-webhook.controller.ts` | Monetization | route/controller | Handles HTTP requests for monetization domain | Medium |
| `apps/web/.archive/duplicates/wallet.tsx` | Monetization | script/other | Core script or resource for monetization | Low |
| `apps/web/src/components/monetization/EarningsOverview.tsx` | Monetization | component | UI component for EarningsOverview | High |
| `apps/web/src/components/monetization/PayoutRequest.tsx` | Monetization | component | UI component for PayoutRequest | High |
| `apps/web/src/components/monetization/StripeConnectOnboarding.tsx` | Monetization | component | UI component for StripeConnectOnboarding | High |
| `apps/web/src/components/monetization/TipButton.tsx` | Monetization | component | UI component for TipButton | High |
| `apps/web/src/components/monetization/TransactionHistory.tsx` | Monetization | component | UI component for TransactionHistory | Medium |
| `apps/web/src/components/monetization/WalletOverview.tsx` | Monetization | component | UI component for WalletOverview | Medium |
| `apps/web/src/pages/earnings/index.tsx` | Monetization | route/page | Next.js page for index | Low |
| `apps/web/src/pages/marketplace/checkout/index.tsx` | Monetization | route/page | Next.js page for index | High |
| `apps/web/src/shared/api/monetization.api.ts` | Monetization | api-client | API client/bindings for monetization | Medium |
| `apps/web/src/shared/types/monetization.types.ts` | Monetization | types | TypeScript interfaces for monetization | Medium |
| `packages/monetization/package.json` | Monetization | config | Configuration file for package.json | Low |
| `packages/monetization/src/index.ts` | Monetization | script/other | Core script or resource for monetization | Low |
| `packages/monetization/src/payout.utils.ts` | Monetization | util | Utility functions for monetization | Medium |
| `packages/monetization/src/revenue.utils.ts` | Monetization | util | Utility functions for monetization | Medium |
| `packages/monetization/src/transaction.utils.ts` | Monetization | util | Utility functions for monetization | Medium |
| `packages/monetization/src/types.ts` | Monetization | script/other | Core script or resource for monetization | Low |
| `packages/monetization/src/wallet.utils.ts` | Monetization | util | Utility functions for monetization | Medium |
| `packages/types/src/api/monetization.api.ts` | Monetization | api-client | API client/bindings for monetization | Medium |
| `packages/types/src/monetization.types.ts` | Monetization | types | TypeScript interfaces for monetization | Medium |
| `apps/api/src/music/MUSIC_API.md` | Music | doc | Documentation for MUSIC_API.md | High |
| `apps/api/src/music/controllers/musicController.ts` | Music | api-client | API client/bindings for music | High |
| `apps/api/src/music/index.ts` | Music | api-client | API client/bindings for music | Low |
| `apps/api/src/music/music.module.ts` | Music | module | NestJS module definition for music | Low |
| `apps/api/src/music/routes/index.ts` | Music | api-client | API client/bindings for music | Medium |
| `apps/api/src/music/services/musicService.ts` | Music | api-client | API client/bindings for music | High |
| `apps/api/src/music/types/index.ts` | Music | api-client | API client/bindings for music | Medium |
| `apps/web/src/components/music/MUSIC_FRONTEND.md` | Music | doc | Documentation for MUSIC_FRONTEND.md | High |
| `apps/web/src/components/music/MusicSelectorModal.tsx` | Music | component | UI component for MusicSelectorModal | Medium |
| `apps/web/src/components/music/artist/ArtistDashboard.tsx` | Music | component | UI component for ArtistDashboard | High |
| `apps/web/src/components/music/dashboard/CreatorRevenueDashboard.tsx` | Music | component | UI component for CreatorRevenueDashboard | High |
| `apps/web/src/components/music/discovery/TrackDiscovery.tsx` | Music | component | UI component for TrackDiscovery | Medium |
| `apps/web/src/components/music/hooks/useMusic.ts` | Music | hook | React hook for useMusic | High |
| `apps/web/src/components/music/index.ts` | Music | script/other | Core script or resource for music | Low |
| `apps/web/src/components/music/licensing/MusicLicensingFlow.tsx` | Music | component | UI component for MusicLicensingFlow | High |
| `apps/web/src/components/music/player/MusicPlayer.tsx` | Music | component | UI component for MusicPlayer | Medium |
| `apps/web/src/pages/music/artist/[id].tsx` | Music | route/page | Next.js page for [id] | Low |
| `apps/web/src/pages/music/artist/create.tsx` | Music | route/page | Next.js page for create | High |
| `apps/web/src/pages/music/dashboard.tsx` | Music | route/page | Next.js page for dashboard | Low |
| `apps/web/src/pages/music/index.tsx` | Music | route/page | Next.js page for index | Low |
| `apps/web/src/pages/music/licensing/[trackId].tsx` | Music | route/page | Next.js page for [trackId] | High |
| `packages/music-sdk/README.md` | Music | doc | Documentation for README.md | High |
| `packages/music-sdk/package.json` | Music | config | Configuration file for package.json | Low |
| `packages/music-sdk/src/client.ts` | Music | script/other | Core script or resource for music | High |
| `packages/music-sdk/src/index.ts` | Music | script/other | Core script or resource for music | Low |
| `packages/music-sdk/tsconfig.json` | Music | config | Configuration file for tsconfig.json | Low |
| `apps/api/src/core/notifications/notifications.controller.ts` | Notifications | route/controller | Handles HTTP requests for notifications domain | Medium |
| `apps/api/src/core/notifications/notifications.module.ts` | Notifications | module | NestJS module definition for notifications | Low |
| `apps/api/src/core/notifications/notifications.service.ts` | Notifications | service | Business logic for notifications operations | Medium |
| `apps/web/.archive/duplicates/notifications.tsx` | Notifications | script/other | Core script or resource for notifications | Low |
| `apps/web/src/pages/notifications/index.tsx` | Notifications | route/page | Next.js page for index | Medium |
| `apps/web/src/shared/api/notifications.api.ts` | Notifications | api-client | API client/bindings for notifications | Low |
| `apps/web/src/shared/types/notifications.types.ts` | Notifications | types | TypeScript interfaces for notifications | Low |
| `apps/api/src/core/safety/controllers/safety.controller.ts` | Safety | route/controller | Handles HTTP requests for safety domain | High |
| `apps/api/src/core/safety/dto/safety.dto.ts` | Safety | schema/dto | Data transfer objects for safety | High |
| `apps/api/src/core/safety/guards/roles.guard.ts` | Safety | security | Security/authentication mechanisms for safety | Low |
| `apps/api/src/core/safety/safety.module.ts` | Safety | module | NestJS module definition for safety | Low |
| `apps/api/src/core/safety/services/appeals.service.ts` | Safety | service | Business logic for safety operations | High |
| `apps/api/src/core/safety/services/blocking.service.ts` | Safety | service | Business logic for safety operations | High |
| `apps/api/src/core/safety/services/content-filter.service.ts` | Safety | service | Business logic for safety operations | High |
| `apps/api/src/core/safety/services/moderation-actions.service.ts` | Safety | service | Business logic for safety operations | High |
| `apps/api/src/core/safety/services/reports.service.ts` | Safety | service | Business logic for safety operations | High |
| `apps/web/src/components/safety/blocking/BlockedMutedList.tsx` | Safety | component | UI component for BlockedMutedList | Medium |
| `apps/web/src/components/safety/moderation/ModerationDashboard.tsx` | Safety | component | UI component for ModerationDashboard | Medium |
| `apps/web/src/components/safety/reporting/ReportModal.tsx` | Safety | component | UI component for ReportModal | Medium |
| `apps/web/src/pages/safety/index.tsx` | Safety | route/page | Next.js page for index | Medium |
| `apps/web/src/shared/api/safety.api.ts` | Safety | api-client | API client/bindings for safety | Medium |
| `apps/web/src/shared/types/safety.types.ts` | Safety | types | TypeScript interfaces for safety | High |
| `packages/types/src/api/safety.api.ts` | Safety | api-client | API client/bindings for safety | Medium |
| `packages/types/src/safety.types.ts` | Safety | types | TypeScript interfaces for safety | High |
| `apps/web/src/components/social/FollowButton.tsx` | Social Graph | component | UI component for FollowButton | Medium |
| `apps/web/src/components/social/MutualConnections.tsx` | Social Graph | component | UI component for MutualConnections | Medium |
| `apps/web/src/components/social/SuggestedUsers.tsx` | Social Graph | component | UI component for SuggestedUsers | Medium |
| `apps/web/src/components/social/TrendingCreators.tsx` | Social Graph | component | UI component for TrendingCreators | Medium |
| `apps/web/src/components/social/UserSearchBar.tsx` | Social Graph | component | UI component for UserSearchBar | Medium |
| `apps/web/src/components/social/index.ts` | Social Graph | script/other | Core script or resource for social graph | Low |
| `apps/web/src/shared/api/social.api.ts` | Social Graph | api-client | API client/bindings for social graph | Medium |
| `apps/web/src/shared/types/social.types.ts` | Social Graph | types | TypeScript interfaces for social graph | Medium |
| `packages/types/src/api/social.api.ts` | Social Graph | api-client | API client/bindings for social graph | Medium |
| `packages/types/src/social.types.ts` | Social Graph | types | TypeScript interfaces for social graph | Medium |
| `apps/api/src/shared/types/gig.types.ts` | Types | api-client | API client/bindings for types | High |
| `apps/web/src/shared/types/gig.types.ts` | Types | types | TypeScript interfaces for types | High |
| `packages/creator-tools/src/types.ts` | Types | script/other | Core script or resource for types | Low |
| `packages/types/src/gig.types.ts` | Types | types | TypeScript interfaces for types | High |
| `packages/types/src/index.ts` | Types | types | TypeScript interfaces for types | Low |
| `apps/api/tsconfig.build.json` | UI/Layout | config | Configuration file for tsconfig.build.json | Low |
| `apps/web/src/components/layout/AppShell.tsx` | UI/Layout | component | UI component for AppShell | Medium |
| `apps/web/src/components/layout/FeaturePlaceholder.tsx` | UI/Layout | component | UI component for FeaturePlaceholder | Low |
| `apps/web/src/components/layout/ProtectedPageShell.tsx` | UI/Layout | component | UI component for ProtectedPageShell | Medium |
| `apps/web/src/components/layout/index.ts` | UI/Layout | script/other | Core script or resource for ui/layout | Low |
| `apps/web/src/components/ui/Avatar.tsx` | UI/Layout | component | UI component for Avatar | Low |
| `apps/web/src/components/ui/Button.tsx` | UI/Layout | component | UI component for Button | Low |
| `apps/web/src/components/ui/Card.tsx` | UI/Layout | component | UI component for Card | Low |
| `apps/web/src/components/ui/Input.tsx` | UI/Layout | component | UI component for Input | Low |
| `apps/web/src/components/ui/Modal.tsx` | UI/Layout | component | UI component for Modal | Low |
| `apps/web/src/components/ui/PageState.tsx` | UI/Layout | component | UI component for PageState | Low |
| `apps/web/src/components/ui/TextArea.tsx` | UI/Layout | component | UI component for TextArea | Low |
| `apps/web/src/components/ui/Toast.tsx` | UI/Layout | component | UI component for Toast | Low |
| `apps/web/src/components/ui/index.ts` | UI/Layout | script/other | Core script or resource for ui/layout | Low |
| `apps/web/src/styles/design-system.css` | UI/Layout | config | Configuration file for design-system.css | High |
| `apps/web/src/styles/embr-design-system.css` | UI/Layout | config | Configuration file for embr-design-system.css | High |
| `apps/web/src/styles/globals.css` | UI/Layout | config | Configuration file for globals.css | Low |
| `apps/web/src/theme/DESIGN_SYSTEM.md` | UI/Layout | doc | Documentation for DESIGN_SYSTEM.md | High |
| `apps/web/src/theme/colorPalette.ts` | UI/Layout | script/other | Core script or resource for ui/layout | Medium |
| `apps/web/tsconfig.tsbuildinfo` | UI/Layout | script/other | Core script or resource for ui/layout | Low |
| `packages/ui/package.json` | UI/Layout | config | Configuration file for package.json | Low |
| `packages/ui/src/index.ts` | UI/Layout | script/other | Core script or resource for ui/layout | Low |
| `packages/ui/tsconfig.json` | UI/Layout | config | Configuration file for tsconfig.json | Low |
| `apps/api/src/core/users/dto/index.ts` | Users | hook | React hook for index | Low |
| `apps/api/src/core/users/dto/update-profile.dto.ts` | Users | schema/dto | Data transfer objects for users | Low |
| `apps/api/src/core/users/dto/update-user-settings.dto.ts` | Users | schema/dto | Data transfer objects for users | Low |
| `apps/api/src/core/users/users.controller.ts` | Users | route/controller | Handles HTTP requests for users domain | Low |
| `apps/api/src/core/users/users.module.ts` | Users | module | NestJS module definition for users | Low |
| `apps/api/src/core/users/users.service.ts` | Users | service | Business logic for users operations | Medium |
| `apps/api/src/verticals/feeds/social-graph/controllers/user-discovery.controller.ts` | Users | route/controller | Handles HTTP requests for users domain | Low |
| `apps/api/src/verticals/feeds/social-graph/services/user-discovery.service.ts` | Users | service | Business logic for users operations | High |
| `apps/web/src/lib/api/users.ts` | Users | hook | React hook for users | Low |
| `apps/web/src/pages/[username].tsx` | Users | route/page | Next.js page for [username] | Medium |
| `apps/web/src/pages/profile/edit.tsx` | Users | route/page | Next.js page for edit | Medium |
| `apps/web/src/pages/profile/index.tsx` | Users | route/page | Next.js page for index | Medium |
| `apps/api/src/shared/filters/http-exception.filter.ts` | Utils/Core | api-client | API client/bindings for utils/core | Low |
| `apps/web/src/lib/api/client.ts` | Utils/Core | util | Utility functions for utils/core | Medium |
| `apps/web/src/lib/api/error.ts` | Utils/Core | util | Utility functions for utils/core | Low |
| `apps/web/src/lib/cn.ts` | Utils/Core | util | Utility functions for utils/core | Low |
| `packages/creator-tools/src/analytics.utils.ts` | Utils/Core | util | Utility functions for utils/core | Medium |
| `packages/creator-tools/src/engagement.utils.ts` | Utils/Core | util | Utility functions for utils/core | Medium |
| `packages/creator-tools/src/insights.utils.ts` | Utils/Core | util | Utility functions for utils/core | Medium |
| `packages/utils/src/index.ts` | Utils/Core | script/other | Core script or resource for utils/core | Low |

## 2. Domain Map

### Auth
- `apps/api/src/core/auth/auth.controller.ts`
- `apps/api/src/core/auth/auth.module.ts`
- `apps/api/src/core/auth/auth.service.ts`
- `apps/api/src/core/auth/decorators/current-user.decorator.ts`
- `apps/api/src/core/auth/decorators/get-user.decorator.ts`
- `apps/api/src/core/auth/decorators/public.decorator.ts`
- `apps/api/src/core/auth/decorators/roles.decorator.ts`
- `apps/api/src/core/auth/dto/change-password.dto.ts`
- `apps/api/src/core/auth/dto/forgot-password.dto.ts`
- `apps/api/src/core/auth/dto/index.ts`
- `apps/api/src/core/auth/dto/login.dto.ts`
- `apps/api/src/core/auth/dto/refresh-token.dto.ts`
- `apps/api/src/core/auth/dto/resend-verification.dto.ts`
- `apps/api/src/core/auth/dto/reset-password.dto.ts`
- `apps/api/src/core/auth/dto/signup.dto.ts`
- `apps/api/src/core/auth/dto/verify-email.dto.ts`
- `apps/api/src/core/auth/guards/jwt-auth.guard.ts`
- `apps/api/src/core/auth/guards/jwt-refresh.guard.ts`
- `apps/api/src/core/auth/guards/optional-jwt-auth.guard.ts`
- `apps/api/src/core/auth/guards/roles.guard.ts`
- `apps/api/src/core/auth/strategies/google.strategy.ts`
- `apps/api/src/core/auth/strategies/jwt-refresh.strategy.ts`
- `apps/api/src/core/auth/strategies/jwt.strategy.ts`
- `apps/api/src/middleware/auth.ts`
- `apps/web/src/components/auth/auth/ProtectedRoute.tsx`
- `apps/web/src/lib/api/auth.ts`
- `apps/web/src/pages/auth/forgot-password.tsx`
- `apps/web/src/pages/auth/login.tsx`
- `apps/web/src/pages/auth/reset-password.tsx`
- `apps/web/src/pages/auth/signup.tsx`
- `apps/web/src/types/auth.ts`
- `packages/auth/package.json`
- `packages/auth/src/index.ts`
- `packages/auth/src/jwt.utils.ts`
- `packages/auth/src/password.utils.ts`
- `packages/auth/src/token.utils.ts`
- `packages/auth/src/types.ts`

### Config
- `apps/api/.env.example`
- `apps/api/Dockerfile`
- `apps/api/package.json`
- `apps/api/tsconfig.json`
- `apps/mobile/.env.example`
- `apps/mobile/babel.config.js`
- `apps/mobile/package.json`
- `apps/mobile/tsconfig.json`
- `apps/web/.env.example`
- `apps/web/next.config.js`
- `apps/web/package.json`
- `apps/web/tailwind.config.js`
- `apps/web/tsconfig.json`
- `packages/config/package.json`
- `packages/config/src/eslint/index.js`
- `packages/config/src/tailwind/index.js`
- `packages/config/src/typescript/base.json`
- `packages/creator-tools/package.json`
- `packages/types/package.json`
- `packages/types/tsconfig.json`
- `packages/utils/package.json`
- `packages/utils/tsconfig.json`

### Content
- `apps/api/src/verticals/feeds/content/content.module.ts`
- `apps/api/src/verticals/feeds/content/controllers/comments.controller.ts`
- `apps/api/src/verticals/feeds/content/controllers/posts.controller.ts`
- `apps/api/src/verticals/feeds/content/dto/comments.dto.ts`
- `apps/api/src/verticals/feeds/content/dto/create-post.dto.ts`
- `apps/api/src/verticals/feeds/content/dto/index.ts`
- `apps/api/src/verticals/feeds/content/dto/update-post.dto.ts`
- `apps/api/src/verticals/feeds/content/services/comments.service.ts`
- `apps/api/src/verticals/feeds/content/services/likes.service.ts`
- `apps/api/src/verticals/feeds/content/services/posts.service.ts`
- `apps/api/src/verticals/feeds/social-graph/controllers/follows.controller.ts`
- `apps/api/src/verticals/feeds/social-graph/dto/discovery.dto.ts`
- `apps/api/src/verticals/feeds/social-graph/dto/follow.dto.ts`
- `apps/api/src/verticals/feeds/social-graph/services/follows.service.ts`
- `apps/api/src/verticals/feeds/social-graph/social-graph.module.ts`
- `apps/web/postcss.config.js`
- `apps/web/src/components/content/CommentSection.tsx`
- `apps/web/src/components/content/Feed.tsx`
- `apps/web/src/components/content/FeedTabs.tsx`
- `apps/web/src/components/content/PostCard.tsx`
- `apps/web/src/components/content/PostCreator.tsx`
- `apps/web/src/components/content/PostDetailPage.tsx`
- `apps/web/src/components/content/index.ts`
- `apps/web/src/pages/feed.tsx`
- `apps/web/src/pages/post/[id].tsx`
- `apps/web/src/shared/api/content.api.ts`
- `apps/web/src/shared/types/content.types.ts`
- `packages/types/src/api/content.api.ts`
- `packages/types/src/content.types.ts`

### Core/App
- `apps/api/nest-cli.json`
- `apps/api/src/app.module.ts`
- `apps/api/src/core/email/email.module.ts`
- `apps/api/src/core/email/email.service.ts`
- `apps/api/src/main.ts`
- `apps/mobile/app.json`
- `apps/mobile/assets/README.md`
- `apps/web/next-env.d.ts`
- `apps/web/public/README.md`
- `apps/web/src/contexts/AuthContext.tsx`
- `apps/web/src/hooks/useComments.ts`
- `apps/web/src/hooks/useDebounce.ts`
- `apps/web/src/hooks/useFeed.ts`
- `apps/web/src/hooks/useFollow.ts`
- `apps/web/src/hooks/useGig.ts`
- `apps/web/src/hooks/useMediaUpload.ts`
- `apps/web/src/hooks/useMessaging.ts`
- `apps/web/src/hooks/useNotifications.ts`
- `apps/web/src/hooks/usePayouts.ts`
- `apps/web/src/hooks/usePost.ts`
- `apps/web/src/hooks/useSafety.ts`
- `apps/web/src/hooks/useStripeConnect.ts`
- `apps/web/src/hooks/useTips.ts`
- `apps/web/src/hooks/useUserSearch.ts`
- `apps/web/src/hooks/useWallet.ts`
- `apps/web/src/pages/DiscoveryPage.tsx`
- `apps/web/src/pages/_app.tsx`
- `apps/web/src/pages/_document.tsx`
- `apps/web/src/pages/about.tsx`
- `apps/web/src/pages/create.tsx`
- `apps/web/src/pages/index.tsx`
- `apps/web/src/pages/marketplace.tsx`

### Creator Tools
- `packages/creator-tools/src/index.ts`

### Database
- `apps/api/prisma/migrations/20260205071952_init/migration.sql`
- `apps/api/prisma/migrations/20260207042211_init/migration.sql`
- `apps/api/prisma/migrations/migration_lock.toml`
- `apps/api/prisma/schema.prisma`
- `apps/api/src/core/database/prisma.module.ts`
- `apps/api/src/core/database/prisma.service.ts`

### Gigs
- `apps/api/src/verticals/gigs/controllers/applications.controller.ts`
- `apps/api/src/verticals/gigs/controllers/escrow.controller.ts`
- `apps/api/src/verticals/gigs/controllers/gigs.controller.ts`
- `apps/api/src/verticals/gigs/dto/gig.dto.ts`
- `apps/api/src/verticals/gigs/gigs.module.ts`
- `apps/api/src/verticals/gigs/services/applications.service.ts`
- `apps/api/src/verticals/gigs/services/escrow.service.ts`
- `apps/api/src/verticals/gigs/services/gigs.service.ts`
- `apps/web/src/components/gigs/ApplicationForm.tsx`
- `apps/web/src/components/gigs/GigCard.tsx`
- `apps/web/src/components/gigs/GigDiscovery.tsx`
- `apps/web/src/components/gigs/GigManagementDashboard.tsx`
- `apps/web/src/components/gigs/GigPostForm.tsx`
- `apps/web/src/components/gigs/index.ts`
- `apps/web/src/pages/gigs/[id].tsx`
- `apps/web/src/pages/gigs/booking/[gigId].tsx`
- `apps/web/src/pages/gigs/index.tsx`
- `apps/web/src/shared/api/gigs.api.ts`
- `packages/types/src/api/gigs.api.ts`

### Media
- `apps/api/src/core/media/controllers/media-upload.controller.ts`
- `apps/api/src/core/media/controllers/mux-webhook.controller.ts`
- `apps/api/src/core/media/dto/media-upload.dto.ts`
- `apps/api/src/core/media/media.module.ts`
- `apps/api/src/core/media/services/media.service.ts`
- `apps/api/src/core/media/services/mux-video.service.ts`
- `apps/api/src/core/media/services/s3-multipart.service.ts`
- `apps/api/src/core/media/services/thumbnail.service.ts`
- `apps/api/src/core/upload/upload.module.ts`
- `apps/api/src/core/upload/upload.service.ts`
- `apps/web/src/components/media/MediaUploader.tsx`
- `apps/web/src/components/media/UploadProgress.tsx`
- `apps/web/src/shared/api/media-api.client.ts`
- `apps/web/src/shared/types/media.types.ts`
- `packages/types/src/api/media-api.client.ts`
- `packages/types/src/media.types.ts`

### Messaging
- `apps/api/src/shared/types/messaging.types.ts`
- `apps/api/src/verticals/messaging/messaging/controllers/messaging.controller.ts`
- `apps/api/src/verticals/messaging/messaging/dto/messaging.dto.ts`
- `apps/api/src/verticals/messaging/messaging/gateways/messaging.gateway.ts`
- `apps/api/src/verticals/messaging/messaging/messaging.module.ts`
- `apps/api/src/verticals/messaging/messaging/services/messaging.service.ts`
- `apps/web/.archive/duplicates/messages.tsx`
- `apps/web/src/components/messaging/ConversationList.tsx`
- `apps/web/src/components/messaging/DMInbox.tsx`
- `apps/web/src/components/messaging/MessageInput.tsx`
- `apps/web/src/components/messaging/MessageThread.tsx`
- `apps/web/src/pages/messages/[id].tsx`
- `apps/web/src/pages/messages/index.tsx`
- `apps/web/src/shared/api/messaging.api.ts`
- `apps/web/src/shared/types/messaging.types.ts`
- `packages/types/src/api/messaging.api.ts`
- `packages/types/src/messaging.types.ts`

### Monetization
- `apps/api/src/core/monetization/controllers/gigs-payment.controller.ts.bak`
- `apps/api/src/core/monetization/controllers/licensing-payment.controller.ts.bak`
- `apps/api/src/core/monetization/controllers/marketplace-payment.controller.ts.bak`
- `apps/api/src/core/monetization/controllers/payout.controller.ts`
- `apps/api/src/core/monetization/controllers/stripe-connect.controller.ts`
- `apps/api/src/core/monetization/controllers/tip.controller.ts`
- `apps/api/src/core/monetization/controllers/wallet.controller.ts`
- `apps/api/src/core/monetization/dto/payout.dto.ts`
- `apps/api/src/core/monetization/dto/tip.dto.ts`
- `apps/api/src/core/monetization/dto/wallet.dto.ts`
- `apps/api/src/core/monetization/monetization.module.ts`
- `apps/api/src/core/monetization/services/gigs-payment.service.ts.bak`
- `apps/api/src/core/monetization/services/licensing-payment.service.ts.bak`
- `apps/api/src/core/monetization/services/marketplace-payment.service.ts.bak`
- `apps/api/src/core/monetization/services/payout.service.ts`
- `apps/api/src/core/monetization/services/stripe-connect.service.ts`
- `apps/api/src/core/monetization/services/tip.service.ts`
- `apps/api/src/core/monetization/services/transaction.service.ts`
- `apps/api/src/core/monetization/services/wallet.service.ts`
- `apps/api/src/core/monetization/webhooks/stripe-webhook.controller.ts`
- `apps/web/.archive/duplicates/wallet.tsx`
- `apps/web/src/components/monetization/EarningsOverview.tsx`
- `apps/web/src/components/monetization/PayoutRequest.tsx`
- `apps/web/src/components/monetization/StripeConnectOnboarding.tsx`
- `apps/web/src/components/monetization/TipButton.tsx`
- `apps/web/src/components/monetization/TransactionHistory.tsx`
- `apps/web/src/components/monetization/WalletOverview.tsx`
- `apps/web/src/pages/earnings/index.tsx`
- `apps/web/src/pages/marketplace/checkout/index.tsx`
- `apps/web/src/shared/api/monetization.api.ts`
- `apps/web/src/shared/types/monetization.types.ts`
- `packages/monetization/package.json`
- `packages/monetization/src/index.ts`
- `packages/monetization/src/payout.utils.ts`
- `packages/monetization/src/revenue.utils.ts`
- `packages/monetization/src/transaction.utils.ts`
- `packages/monetization/src/types.ts`
- `packages/monetization/src/wallet.utils.ts`
- `packages/types/src/api/monetization.api.ts`
- `packages/types/src/monetization.types.ts`

### Music
- `apps/api/src/music/MUSIC_API.md`
- `apps/api/src/music/controllers/musicController.ts`
- `apps/api/src/music/index.ts`
- `apps/api/src/music/music.module.ts`
- `apps/api/src/music/routes/index.ts`
- `apps/api/src/music/services/musicService.ts`
- `apps/api/src/music/types/index.ts`
- `apps/web/src/components/music/MUSIC_FRONTEND.md`
- `apps/web/src/components/music/MusicSelectorModal.tsx`
- `apps/web/src/components/music/artist/ArtistDashboard.tsx`
- `apps/web/src/components/music/dashboard/CreatorRevenueDashboard.tsx`
- `apps/web/src/components/music/discovery/TrackDiscovery.tsx`
- `apps/web/src/components/music/hooks/useMusic.ts`
- `apps/web/src/components/music/index.ts`
- `apps/web/src/components/music/licensing/MusicLicensingFlow.tsx`
- `apps/web/src/components/music/player/MusicPlayer.tsx`
- `apps/web/src/pages/music/artist/[id].tsx`
- `apps/web/src/pages/music/artist/create.tsx`
- `apps/web/src/pages/music/dashboard.tsx`
- `apps/web/src/pages/music/index.tsx`
- `apps/web/src/pages/music/licensing/[trackId].tsx`
- `packages/music-sdk/README.md`
- `packages/music-sdk/package.json`
- `packages/music-sdk/src/client.ts`
- `packages/music-sdk/src/index.ts`
- `packages/music-sdk/tsconfig.json`

### Notifications
- `apps/api/src/core/notifications/notifications.controller.ts`
- `apps/api/src/core/notifications/notifications.module.ts`
- `apps/api/src/core/notifications/notifications.service.ts`
- `apps/web/.archive/duplicates/notifications.tsx`
- `apps/web/src/pages/notifications/index.tsx`
- `apps/web/src/shared/api/notifications.api.ts`
- `apps/web/src/shared/types/notifications.types.ts`

### Safety
- `apps/api/src/core/safety/controllers/safety.controller.ts`
- `apps/api/src/core/safety/dto/safety.dto.ts`
- `apps/api/src/core/safety/guards/roles.guard.ts`
- `apps/api/src/core/safety/safety.module.ts`
- `apps/api/src/core/safety/services/appeals.service.ts`
- `apps/api/src/core/safety/services/blocking.service.ts`
- `apps/api/src/core/safety/services/content-filter.service.ts`
- `apps/api/src/core/safety/services/moderation-actions.service.ts`
- `apps/api/src/core/safety/services/reports.service.ts`
- `apps/web/src/components/safety/blocking/BlockedMutedList.tsx`
- `apps/web/src/components/safety/moderation/ModerationDashboard.tsx`
- `apps/web/src/components/safety/reporting/ReportModal.tsx`
- `apps/web/src/pages/safety/index.tsx`
- `apps/web/src/shared/api/safety.api.ts`
- `apps/web/src/shared/types/safety.types.ts`
- `packages/types/src/api/safety.api.ts`
- `packages/types/src/safety.types.ts`

### Social Graph
- `apps/web/src/components/social/FollowButton.tsx`
- `apps/web/src/components/social/MutualConnections.tsx`
- `apps/web/src/components/social/SuggestedUsers.tsx`
- `apps/web/src/components/social/TrendingCreators.tsx`
- `apps/web/src/components/social/UserSearchBar.tsx`
- `apps/web/src/components/social/index.ts`
- `apps/web/src/shared/api/social.api.ts`
- `apps/web/src/shared/types/social.types.ts`
- `packages/types/src/api/social.api.ts`
- `packages/types/src/social.types.ts`

### Types
- `apps/api/src/shared/types/gig.types.ts`
- `apps/web/src/shared/types/gig.types.ts`
- `packages/creator-tools/src/types.ts`
- `packages/types/src/gig.types.ts`
- `packages/types/src/index.ts`

### UI/Layout
- `apps/api/tsconfig.build.json`
- `apps/web/src/components/layout/AppShell.tsx`
- `apps/web/src/components/layout/FeaturePlaceholder.tsx`
- `apps/web/src/components/layout/ProtectedPageShell.tsx`
- `apps/web/src/components/layout/index.ts`
- `apps/web/src/components/ui/Avatar.tsx`
- `apps/web/src/components/ui/Button.tsx`
- `apps/web/src/components/ui/Card.tsx`
- `apps/web/src/components/ui/Input.tsx`
- `apps/web/src/components/ui/Modal.tsx`
- `apps/web/src/components/ui/PageState.tsx`
- `apps/web/src/components/ui/TextArea.tsx`
- `apps/web/src/components/ui/Toast.tsx`
- `apps/web/src/components/ui/index.ts`
- `apps/web/src/styles/design-system.css`
- `apps/web/src/styles/embr-design-system.css`
- `apps/web/src/styles/globals.css`
- `apps/web/src/theme/DESIGN_SYSTEM.md`
- `apps/web/src/theme/colorPalette.ts`
- `apps/web/tsconfig.tsbuildinfo`
- `packages/ui/package.json`
- `packages/ui/src/index.ts`
- `packages/ui/tsconfig.json`

### Users
- `apps/api/src/core/users/dto/index.ts`
- `apps/api/src/core/users/dto/update-profile.dto.ts`
- `apps/api/src/core/users/dto/update-user-settings.dto.ts`
- `apps/api/src/core/users/users.controller.ts`
- `apps/api/src/core/users/users.module.ts`
- `apps/api/src/core/users/users.service.ts`
- `apps/api/src/verticals/feeds/social-graph/controllers/user-discovery.controller.ts`
- `apps/api/src/verticals/feeds/social-graph/services/user-discovery.service.ts`
- `apps/web/src/lib/api/users.ts`
- `apps/web/src/pages/[username].tsx`
- `apps/web/src/pages/profile/edit.tsx`
- `apps/web/src/pages/profile/index.tsx`

### Utils/Core
- `apps/api/src/shared/filters/http-exception.filter.ts`
- `apps/web/src/lib/api/client.ts`
- `apps/web/src/lib/api/error.ts`
- `apps/web/src/lib/cn.ts`
- `packages/creator-tools/src/analytics.utils.ts`
- `packages/creator-tools/src/engagement.utils.ts`
- `packages/creator-tools/src/insights.utils.ts`
- `packages/utils/src/index.ts`

## 3. Recommended Audit Order

Based on complexity and system impact, the following audit order is recommended:

**1. Auth**
- *Reasoning:* Critical path for all user access. High security risk if flawed.
**2. Monetization**
- *Reasoning:* Handles payments, payouts, and Stripe integrations. High financial risk.
**3. Safety**
- *Reasoning:* Moderation, blocking, and reporting. Required for platform compliance and user trust.
**4. Database**
- *Reasoning:* Core schema and migrations. Impacts all domains.
**5. Gigs**
- *Reasoning:* Core vertical involving escrow and applications. High business value and complexity.
**6. Music**
- *Reasoning:* Complex SDKs, licencing, and real-time playback.
**7. Content**
- *Reasoning:* Feeds and posts. High traffic, needs performance audit.
**8. Messaging**
- *Reasoning:* Real-time communication, WebSockets. Can have scaling/sync issues.
**9. Social Graph**
- *Reasoning:* Follows, connections, discovery. Performance critical for large graphs.
**10. Media**
- *Reasoning:* Uploads, Mux streaming, and S3. Cost and security implications.
**11. Users**
- *Reasoning:* Profiles and settings.
**12. Creator Tools**
- *Reasoning:* Analytics and insights.
**13. UI/Layout**
- *Reasoning:* Design system, standard components. Low risk of systemic failure.
**14. Config**
- *Reasoning:* Build, environment, and tooling configurations.
**15. Utils/Core**
- *Reasoning:* Shared helpers and abstractions.
**16. Types**
- *Reasoning:* Static definitions. Zero runtime risk.
