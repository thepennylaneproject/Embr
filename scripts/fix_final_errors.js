const fs = require('fs');
const path = require('path');

const projectRoot = '/Users/sarahsahl/Desktop/embr/apps/api';

// 1. Fix app.module.ts
const appModulePath = path.join(projectRoot, 'src/app.module.ts');
if (fs.existsSync(appModulePath)) {
  let content = fs.readFileSync(appModulePath, 'utf8');
  content = content
    .replace('./verticals/feeds/content.module', './verticals/feeds/content/content.module')
    .replace('./verticals/feeds/social-graph.module', './verticals/feeds/social-graph/social-graph.module')
    .replace('./verticals/messaging/messaging.module', './verticals/messaging/messaging/messaging.module');
  fs.writeFileSync(appModulePath, content);
  console.log('Fixed app.module.ts');
}

// 2. Fix remaining prisma imports in core
const coreFiles = [
  'src/core/auth/auth.service.ts',
  'src/core/media/media.module.ts',
  'src/core/media/services/media.service.ts',
  'src/core/monetization/services/payout.service.ts',
  'src/core/monetization/services/stripe-connect.service.ts',
  'src/core/monetization/services/tip.service.ts',
  'src/core/monetization/services/transaction.service.ts',
  'src/core/monetization/services/wallet.service.ts',
  'src/core/notifications/notifications.service.ts',
  'src/core/safety/services/appeals.service.ts'
].map(f => path.join(projectRoot, f));

for (const file of coreFiles) {
  if (fs.existsSync(file)) {
    let content = fs.readFileSync(file, 'utf8');
    const newContent = content.replace(/['"](.*)\/prisma\/prisma\.(service|module)['"]/g, "'$1/database/prisma.$2'");
    if (content !== newContent) {
      fs.writeFileSync(file, newContent);
      console.log('Fixed Prisma import:', file);
    }
  }
}

// 3. Fix musicService.ts
const musicServicePath = path.join(projectRoot, 'src/music/services/musicService.ts');
if (fs.existsSync(musicServicePath)) {
  let content = fs.readFileSync(musicServicePath, 'utf8');
  
  content = content.replace(/profileImage/g, 'avatarUrl');
  content = content.replace(/verificationDate:[^,]+,/g, 'isVerified: true,');
  content = content.replace(
    /return \{ allowed: false, reason: 'Track not found or not published', licensingModel: LicensingModel\.RESTRICTED \};/g,
    "return { allowed: false, reason: 'Track not found or not published', licensingModel: LicensingModel.RESTRICTED, allowRemix: false, allowMonetize: false, attributionRequired: true };"
  );
  content = content.replace(/licensingModel: track.licensingModel,/g, 'licensingModel: track.licensingModel as LicensingModel,');
  
  fs.writeFileSync(musicServicePath, content);
  console.log('Fixed musicService.ts');
}
