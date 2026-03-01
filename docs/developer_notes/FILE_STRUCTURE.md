# Embr Infrastructure - File Structure

Complete overview of all infrastructure files and their purposes.

## Directory Structure

```
embr-infrastructure/
├── README.md                           # Main documentation
├── QUICKSTART.md                       # Quick start guide
├── package.json                        # NPM scripts and dependencies
├── .gitignore                         # Git ignore rules
│
├── prisma/
│   └── schema.prisma                  # Complete database schema (33+ models)
│
├── docker/
│   ├── docker-compose.yml             # Development environment
│   ├── docker-compose.prod.yml        # Production environment
│   └── postgres/
│       └── init.sql                   # PostgreSQL initialization script
│
├── env/
│   ├── .env.development.template      # Development environment variables
│   ├── .env.staging.template          # Staging environment variables
│   └── .env.production.template       # Production environment variables
│
├── .github/
│   └── workflows/
│       ├── api-deploy.yml             # API CI/CD (Railway)
│       ├── web-deploy.yml             # Web CI/CD (Vercel)
│       └── mobile-deploy.yml          # Mobile CI/CD (EAS)
│
└── scripts/
    ├── seed.ts                        # Database seeding script
    └── migrate.sh                     # Migration helper script
```

## File Descriptions

### Root Files

**README.md**
- Complete infrastructure documentation
- Setup instructions
- Deployment guides
- Troubleshooting tips

**QUICKSTART.md**
- 5-minute setup guide
- Step-by-step instructions
- Common commands
- Troubleshooting checklist

**package.json**
- NPM dependencies (Prisma, bcrypt, TypeScript)
- Convenient npm scripts for all operations
- Project metadata

**.gitignore**
- Excludes sensitive files (environment variables, secrets)
- Prevents committing build artifacts and dependencies
- Protects database files and backups

### Prisma Directory

**prisma/schema.prisma**
- Complete database schema with 30+ models
- All enums and relations defined
- Indexes for performance optimization
- Comments for documentation

Models include:
- Authentication: User, Profile, Follow
- Content: Post, Comment, Like
- Monetization: Wallet, Transaction, Tip
- Marketplace: Gig, Booking, Escrow, Review
- Jobs: Job, Application
- Messaging: Conversation, Message
- Notifications: Notification
- Moderation: Report, ModerationAction, Appeal
- Analytics: AnalyticsEvent

### Docker Directory

**docker-compose.yml** (Development)
- PostgreSQL 16 database
- Redis 7 for caching and queues
- Adminer (database GUI)
- Redis Commander (Redis GUI)
- MailHog (email testing)
- LocalStack (AWS emulation)

**docker-compose.prod.yml** (Production)
- Production-optimized configurations
- Nginx reverse proxy
- Health checks
- Logging configuration
- Security hardening

**postgres/init.sql**
- Database initialization script
- PostgreSQL extensions (uuid-ossp, pg_trgm, btree_gin)
- Custom functions for common operations
- Additional indexes for performance
- Full-text search setup

### Environment Templates

**\.env.development.template**
- Local development configuration
- Uses Docker services (localhost)
- Test API keys and credentials
- Detailed comments for each variable
- MailHog for email testing

**\.env.staging.template**
- Staging environment configuration
- Railway/Vercel integration
- Separate credentials from production
- Sentry for error tracking
- Similar to production but with test mode for payments

**\.env.production.template**
- Production configuration
- Security best practices
- Performance optimizations
- Monitoring and logging
- Comprehensive security checklist

### GitHub Workflows

**api-deploy.yml**
- Tests: Linting, type checking, unit tests, E2E tests
- Build: Compiles TypeScript API
- Deploy: Railway deployment for staging and production
- Migrations: Automatic database migrations
- Health checks and smoke tests
- Rollback on failure

**web-deploy.yml**
- Tests: Linting, type checking, accessibility tests
- Build: Next.js build with bundle analysis
- Deploy: Vercel deployment
- Preview deployments for PRs
- Lighthouse CI for performance
- Sentry release tracking

**mobile-deploy.yml**
- Tests: Linting, type checking, E2E tests
- Build: EAS builds for iOS and Android
- Submit: Automatic submission to app stores
- OTA Updates: Over-the-air updates for JS changes
- Device farm testing (optional)

### Scripts

**seed.ts**
- Comprehensive database seeding
- Creates 50 users (admin, creators, regular users)
- 200 posts with realistic engagement
- Social graph (follows, likes, comments)
- 30 gigs across all categories
- 20 jobs from simulated Relevnt API
- Bookings with escrow
- Tips and transactions
- Conversations and messages
- 500 analytics events
- Test account credentials

**migrate.sh**
- Bash script for database operations
- Commands: init, create, deploy, status, reset, seed
- Database backup and restore
- Validation and formatting
- Prisma Studio launcher
- Color-coded output
- Safety confirmations for destructive operations

## Usage Patterns

### Initial Setup
1. Copy environment template
2. Start Docker services
3. Run migrations
4. Seed database
5. Start development servers

### Development Workflow
1. Create feature branch
2. Make changes to schema if needed
3. Generate migration
4. Test locally
5. Commit and push
6. CI/CD runs automatically

### Deployment
1. Merge to staging branch → Auto-deploy to staging
2. Test in staging environment
3. Merge to main → Auto-deploy to production
4. Monitor with Sentry and logs

### Database Management
- Use `migrate.sh` for all database operations
- Regular backups before major changes
- Prisma Studio for visual inspection
- Migration status checks before deployment

## Integration Points

### Monorepo Integration
Place this infrastructure folder in your monorepo root:
```
embr/
├── apps/
│   ├── api/
│   ├── web/
│   └── mobile/
├── packages/
│   ├── ui/
│   ├── types/
│   └── utils/
└── embr-infrastructure/  ← This folder
```

### API Integration
- API uses Prisma client generated from schema
- Environment variables loaded from .env
- Database connection handled by Prisma

### Frontend Integration
- Web and mobile apps connect to API
- Environment variables set in Vercel/Expo
- CORS configured for allowed origins

## Best Practices

1. **Never commit .env files** - Use templates only
2. **Run migrations in order** - Never skip migrations
3. **Test migrations locally** - Before deploying
4. **Backup before major changes** - Use backup script
5. **Use migration helper** - Don't run Prisma commands directly
6. **Monitor deployments** - Check health checks
7. **Keep secrets secure** - Use secret managers in production
8. **Document schema changes** - In migration names

## Support

For questions or issues:
1. Check QUICKSTART.md for common problems
2. Review README.md for detailed documentation
3. Check Docker logs: `npm run docker:logs`
4. Inspect database: `npm run db:studio`
5. Validate schema: `npm run db:validate`
