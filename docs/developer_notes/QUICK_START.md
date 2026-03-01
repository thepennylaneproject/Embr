# Content Core Module - Quick Start

Get up and running in 5 minutes!

## ⚡ Quick Setup

### 1. Extract Files

```bash
unzip embr-content-core.zip
cd embr-content-core
```

### 2. Copy to Your Project

```bash
# Frontend
cp -r frontend/components/* ../apps/web/components/content/
cp -r frontend/hooks/* ../apps/web/hooks/
cp -r shared/* ../packages/shared/

# Backend
cp -r backend/* ../apps/api/src/comments/
```

### 3. Install Dependencies

```bash
# Frontend
cd ../apps/web
npm install axios date-fns lucide-react

# Backend
cd ../apps/api
npm install @nestjs/swagger class-validator class-transformer
```

### 4. Add to Your App

```tsx
// pages/index.tsx
import { FeedTabs, PostCreator } from "@/components/content";

export default function HomePage() {
  return (
    <div className="max-w-3xl mx-auto p-4">
      <PostCreator className="mb-6" />
      <FeedTabs />
    </div>
  );
}
```

### 5. Start Development

```bash
npm run dev
```

## 📖 Full Documentation

For complete setup instructions, see:

- **README.md** - Feature overview and API reference
- **IMPLEMENTATION_GUIDE.md** - Step-by-step integration
- **ACCEPTANCE_CRITERIA.md** - Testing checklist
- **MODULE_SUMMARY.md** - Complete file inventory

## 🆘 Quick Troubleshooting

### Components not found?

Add path aliases to `tsconfig.json`:

```json
{
  "paths": {
    "@/components/*": ["./components/*"],
    "@/hooks/*": ["./hooks/*"]
  }
}
```

### API not connecting?

Set environment variable:

```bash
NEXT_PUBLIC_API_URL=http://localhost:3003
```

### Types not working?

Install TypeScript:

```bash
npm install -D typescript @types/react @types/node
```

## ✅ Verify Installation

Test that everything works:

1. Navigate to `http://localhost:3004`
2. Click "What's on your mind?"
3. Create a test post
4. See it appear in the feed
5. Like and comment on the post

## 🎯 What's Included

- ✅ 7 React components
- ✅ 3 custom hooks
- ✅ Complete TypeScript types
- ✅ API client with auth
- ✅ Backend controllers & services
- ✅ Comprehensive documentation
- ✅ Production-ready code

## 🚀 Next Steps

After setup, explore:

1. Feed personalization algorithm
2. Media upload optimization
3. Comment threading
4. Engagement tracking
5. Mobile responsiveness

---

**Need detailed help?** Read the IMPLEMENTATION_GUIDE.md

**Ready to test?** Use the ACCEPTANCE_CRITERIA.md checklist

**Want to understand the code?** Check README.md for API docs
