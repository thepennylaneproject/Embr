const fs = require('fs');
const path = require('path');

const coreFiles = [
  'src/core/safety/services/blocking.service.ts',
  'src/core/safety/services/content-filter.service.ts',
  'src/core/safety/services/moderation-actions.service.ts',
  'src/core/safety/services/reports.service.ts',
  'src/core/users/users.service.ts'
].map(f => path.join('/Users/sarahsahl/Desktop/embr/apps/api', f));

for (const file of coreFiles) {
  if (fs.existsSync(file)) {
    let content = fs.readFileSync(file, 'utf8');
    const newContent = content.replace(/['"](.*)\/prisma\/prisma.service['"]/g, "'$1/database/prisma.service'");
    if (content !== newContent) {
      fs.writeFileSync(file, newContent);
      console.log('Fixed Prisma import:', file);
    }
  }
}

// Create dummy auth middleware for music routes if it doesn't exist
const middlewareDir = '/Users/sarahsahl/Desktop/embr/apps/api/src/middleware';
if (!fs.existsSync(middlewareDir)) {
  fs.mkdirSync(middlewareDir, { recursive: true });
}
const authFile = path.join(middlewareDir, 'auth.ts');
if (!fs.existsSync(authFile)) {
  fs.writeFileSync(authFile, 'export const requireAuth = (req: any, res: any, next: any) => next();\n');
  console.log('Created dummy auth middleware:', authFile);
}
