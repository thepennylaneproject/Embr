import { PrismaClient, UserRole, PostType, PostVisibility, GigCategory, GigStatus, GigBudgetType, GigExperienceLevel, JobStatus, TransactionType, TransactionStatus } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

const random = (min: number, max: number) => Math.floor(Math.random() * (max - min + 1)) + min;

const pickRandom = <T>(arr: T[], count: number = 1): T[] => {
  const shuffled = [...arr].sort(() => 0.5 - Math.random());
  return shuffled.slice(0, count);
};

const firstNames = ['Alex', 'Sarah', 'Mike', 'Emma', 'Jake', 'Lisa', 'David', 'Rachel', 'Kevin', 'Nina', 'Tom', 'Maria', 'John', 'Sophie', 'Olivia'];
const lastNames = ['Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller', 'Davis', 'Rodriguez', 'Martinez'];

const skills = ['Video Editing', 'Graphic Design', 'Content Writing', 'Social Media', 'Photography', 'Animation', 'Music Production', 'Voice Acting', '3D Modeling', 'UI/UX Design'];
const categories = ['Technology', 'Entertainment', 'Education', 'Lifestyle', 'Business', 'Art', 'Music', 'Gaming', 'Fitness', 'Travel'];

const postContents = [
  'Just launched my new project!',
  'Behind the scenes of my creative process',
  'Tips and tricks you need to know',
  'This changed everything for me',
  'Quick tutorial on my workflow',
  'Day in the life of a creator',
  'My favorite tools and resources',
  'Here\'s what I learned today',
  'Excited to share this with you all!',
  'New content dropping soon'
];

const gigTitles = [
  'Professional Video Editing',
  'Custom Logo Design',
  'SEO Blog Post Writing',
  'Social Media Management',
  'Product Photography',
  '2D Character Animation',
  'Original Music Composition',
  'Professional Voice Over',
  '3D Product Modeling',
  'UI/UX Design Services'
];

const gigDescriptions = [
  'I will deliver professional quality work with unlimited revisions until you\'re satisfied.',
  'High-quality deliverables with fast turnaround time and excellent communication.',
  'Experienced creator with 5+ years in the industry. Portfolio available upon request.',
  'Let\'s bring your vision to life! I specialize in creating content that converts.',
  'Professional service with attention to detail. 100% satisfaction guaranteed.'
];

async function main() {
  console.log('Starting database seed...\n');

  console.log('Clearing existing data...');
  await prisma.analyticsEvent.deleteMany();
  await prisma.notification.deleteMany();
  await prisma.message.deleteMany();
  await prisma.conversation.deleteMany();
  await prisma.jobApplication.deleteMany();
  await prisma.job.deleteMany();
  await prisma.gigReview.deleteMany();
  await prisma.dispute.deleteMany();
  await prisma.escrow.deleteMany();
  await prisma.gigMilestone.deleteMany();
  await prisma.application.deleteMany();
  await prisma.gig.deleteMany();
  await prisma.tip.deleteMany();
  await prisma.payout.deleteMany();
  await prisma.transaction.deleteMany();
  await prisma.wallet.deleteMany();
  await prisma.like.deleteMany();
  await prisma.comment.deleteMany();
  await prisma.post.deleteMany();
  await prisma.follow.deleteMany();
  await prisma.profile.deleteMany();
  await prisma.refreshToken.deleteMany();
  await prisma.user.deleteMany();

  console.log('Creating users and profiles...');
  const users: any[] = [];
  const hashedPassword = await bcrypt.hash('test1234', 10);

  const admin = await prisma.user.create({
    data: {
      email: 'admin@embr.app',
      username: 'admin',
      passwordHash: hashedPassword,
      fullName: 'Embr Admin',
      role: UserRole.ADMIN,
      isVerified: true,
      profile: {
        create: {
          username: 'admin',
          displayName: 'Embr Admin',
          bio: 'Official Embr platform administrator',
          avatarUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=admin',
          location: 'San Francisco, CA',
        }
      },
      wallet: {
        create: {
          balance: 0,
        }
      }
    },
    include: { profile: true, wallet: true }
  });
  users.push(admin);

  const creator = await prisma.user.create({
    data: {
      email: 'creator@embr.app',
      username: 'test_creator',
      passwordHash: hashedPassword,
      fullName: 'Test Creator',
      role: UserRole.CREATOR,
      isVerified: true,
      profile: {
        create: {
          username: 'test_creator',
          displayName: 'Test Creator',
          bio: 'Professional content creator | Available for collaborations',
          avatarUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=creator',
          location: 'Los Angeles, CA',
          website: 'https://testcreator.com',
          skills: ['Video Editing', 'Photography', 'Content Creation'],
          categories: ['Entertainment', 'Lifestyle'],
        }
      },
      wallet: {
        create: {
          balance: 50000,
          totalEarned: 100000,
        }
      }
    },
    include: { profile: true, wallet: true }
  });
  users.push(creator);

  const regularUser = await prisma.user.create({
    data: {
      email: 'user@embr.app',
      username: 'test_user',
      passwordHash: hashedPassword,
      fullName: 'Test User',
      role: UserRole.USER,
      isVerified: true,
      profile: {
        create: {
          username: 'test_user',
          displayName: 'Test User',
          bio: 'Just enjoying great content!',
          avatarUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=user',
          location: 'New York, NY',
        }
      },
      wallet: {
        create: {
          balance: 10000,
        }
      }
    },
    include: { profile: true, wallet: true }
  });
  users.push(regularUser);

  const usernames = [
    'creator_alex', 'video_sarah', 'designer_mike', 'writer_emma', 'musician_jake',
    'photographer_lisa', 'animator_david', 'editor_rachel', 'artist_kevin', 'developer_nina',
    'marketer_tom', 'chef_maria', 'fitness_john', 'travel_sophie', 'fashion_olivia'
  ];

  for (let i = 0; i < 12; i++) {
    const firstName = pickRandom(firstNames)[0];
    const lastName = pickRandom(lastNames)[0];
    const username = usernames[i % usernames.length] + random(100, 999);
    const role = i < 8 ? UserRole.CREATOR : UserRole.USER;

    const user = await prisma.user.create({
      data: {
        email: `${username}@example.com`,
        username: username,
        passwordHash: hashedPassword,
        fullName: `${firstName} ${lastName}`,
        role: role,
        isVerified: random(0, 10) > 2,
        profile: {
          create: {
            username: username,
            displayName: `${firstName} ${lastName}`,
            bio: `${role === UserRole.CREATOR ? 'Creator' : 'Enthusiast'} | ${pickRandom(categories, 2).join(' & ')}`,
            avatarUrl: `https://api.dicebear.com/7.x/avataaars/svg?seed=${username}`,
            location: pickRandom(['New York, NY', 'Los Angeles, CA', 'Chicago, IL', 'Remote'])[0],
            website: role === UserRole.CREATOR ? `https://${username}.com` : null,
            skills: role === UserRole.CREATOR ? pickRandom(skills, random(2, 4)) : [],
            categories: pickRandom(categories, random(1, 3)),
          }
        },
        wallet: {
          create: {
            balance: random(0, 50000),
            totalEarned: random(0, 200000),
          }
        }
      },
      include: { profile: true, wallet: true }
    });
    users.push(user);
  }

  console.log(`Created ${users.length} users\n`);

  console.log('Creating social connections...');
  let followCount = 0;
  for (const user of users) {
    const followTargets = pickRandom(users.filter(u => u.id !== user.id), random(2, 5));
    for (const target of followTargets) {
      try {
        await prisma.follow.create({
          data: {
            followerId: user.id,
            followingId: target.id,
          }
        });
        await prisma.profile.update({
          where: { userId: user.id },
          data: { followingCount: { increment: 1 } }
        });
        await prisma.profile.update({
          where: { userId: target.id },
          data: { followerCount: { increment: 1 } }
        });
        followCount++;
      } catch (error) {
        // Skip duplicates
      }
    }
  }
  console.log(`Created ${followCount} follow relationships\n`);

  console.log('Creating posts...');
  const posts: any[] = [];
  const creatorUsers = users.filter(u => u.role === UserRole.CREATOR || u.role === UserRole.ADMIN);

  for (let i = 0; i < 30; i++) {
    const author = pickRandom(creatorUsers)[0];
    const postType = pickRandom([PostType.TEXT, PostType.VIDEO, PostType.IMAGE])[0];
    const hashtags = pickRandom(['fyp', 'viral', 'trending', 'creator', 'content', 'inspiration', 'tutorial'], random(2, 4));

    const post = await prisma.post.create({
      data: {
        authorId: author.id,
        type: postType,
        content: pickRandom(postContents)[0],
        mediaUrl: postType !== PostType.TEXT ? `https://placehold.co/1080x1920/coral/white?text=Media+${i+1}` : null,
        thumbnailUrl: postType === PostType.VIDEO ? `https://placehold.co/1080x1920/coral/white?text=Thumb+${i+1}` : null,
        visibility: random(0, 10) > 1 ? PostVisibility.PUBLIC : PostVisibility.FOLLOWERS,
        hashtags: hashtags,
        mentions: pickRandom(users, random(0, 2)).map((u: any) => u.id),
        viewCount: random(100, 10000),
        likeCount: 0,
        commentCount: 0,
        shareCount: random(0, 100),
        duration: postType === PostType.VIDEO ? random(15, 180) : null,
        createdAt: new Date(Date.now() - random(0, 30) * 24 * 60 * 60 * 1000),
      }
    });
    posts.push(post);
  }
  console.log(`Created ${posts.length} posts\n`);

  console.log('Creating likes...');
  let likeCount = 0;
  for (const post of posts) {
    const likers = pickRandom(users, random(3, 10));
    for (const liker of likers) {
      try {
        await prisma.like.create({
          data: {
            userId: liker.id,
            postId: post.id,
          }
        });
        likeCount++;
      } catch (error) {
        // Skip duplicates
      }
    }
    await prisma.post.update({
      where: { id: post.id },
      data: { likeCount: likeCount }
    });
  }
  console.log(`Created ${likeCount} likes\n`);

  console.log('Creating comments...');
  let commentCount = 0;
  for (const post of posts) {
    const numComments = random(1, 5);
    for (let i = 0; i < numComments; i++) {
      const commenter = pickRandom(users)[0];
      await prisma.comment.create({
        data: {
          postId: post.id,
          authorId: commenter.id,
          content: pickRandom(['Great content!', 'Love this!', 'Amazing work', 'Very helpful', 'Thanks for sharing'])[0],
          likeCount: random(0, 20),
        }
      });
      commentCount++;
    }
    await prisma.post.update({
      where: { id: post.id },
      data: { commentCount: numComments }
    });
  }
  console.log(`Created ${commentCount} comments\n`);

  for (const user of creatorUsers) {
    const postCount = await prisma.post.count({ where: { authorId: user.id } });
    await prisma.profile.update({
      where: { userId: user.id },
      data: { postCount }
    });
  }

  console.log('Creating gigs...');
  const gigs: any[] = [];
  const gigCategories = Object.values(GigCategory);
  for (let i = 0; i < 10; i++) {
    const cr = pickRandom(creatorUsers)[0];
    const category = pickRandom(gigCategories)[0];
    const budgetMin = random(2500, 20000);

    const gig = await prisma.gig.create({
      data: {
        creatorId: cr.id,
        title: pickRandom(gigTitles)[0],
        description: pickRandom(gigDescriptions)[0],
        category: category,
        budgetType: pickRandom([GigBudgetType.FIXED, GigBudgetType.HOURLY])[0],
        budgetMin: budgetMin,
        budgetMax: budgetMin + random(5000, 30000),
        experienceLevel: pickRandom([GigExperienceLevel.BEGINNER, GigExperienceLevel.INTERMEDIATE, GigExperienceLevel.EXPERT])[0],
        estimatedDuration: pickRandom([1, 3, 5, 7, 14])[0],
        skills: pickRandom(skills, random(2, 4)),
        deliverables: ['Final deliverable', 'Source files', 'Revisions'],
        status: pickRandom([GigStatus.DRAFT, GigStatus.OPEN])[0],
      }
    });
    gigs.push(gig);
  }
  console.log(`Created ${gigs.length} gigs\n`);

  console.log('Creating jobs...');
  const jobCompanies = ['TechCorp', 'Creative Agency', 'StartupXYZ', 'Media Group', 'Design Studio'];
  const jobTitles = [
    'Senior Frontend Developer', 'Content Creator', 'Video Editor',
    'Social Media Manager', 'Graphic Designer', 'Marketing Specialist',
    'Product Manager', 'UX Designer'
  ];

  for (let i = 0; i < 10; i++) {
    await prisma.job.create({
      data: {
        relevntId: `RELEVNT-${random(10000, 99999)}`,
        title: pickRandom(jobTitles)[0],
        company: pickRandom(jobCompanies)[0],
        location: pickRandom(['New York, NY', 'San Francisco, CA', 'Remote', 'Los Angeles, CA'])[0],
        salaryMin: random(60000, 100000),
        salaryMax: random(100000, 150000),
        remote: random(0, 10) > 5,
        description: 'We are looking for a talented professional to join our team.',
        requirements: ['3+ years experience', 'Strong portfolio', 'Excellent communication skills'],
        benefits: ['Health insurance', '401k', 'Remote work options', 'Flexible hours'],
        applyUrl: `https://relevnt.com/jobs/apply/${random(10000, 99999)}`,
        tags: pickRandom(['javascript', 'react', 'design', 'video', 'marketing', 'remote'], random(2, 4)),
        postedAt: new Date(Date.now() - random(1, 30) * 24 * 60 * 60 * 1000),
        expiresAt: new Date(Date.now() + random(30, 90) * 24 * 60 * 60 * 1000),
        status: JobStatus.ACTIVE,
      }
    });
  }
  console.log(`Created 10 jobs\n`);

  console.log('Creating notifications...');
  for (let i = 0; i < 20; i++) {
    const user = pickRandom(users)[0];
    const types = ['like', 'comment', 'follow', 'tip', 'message'];
    const type = pickRandom(types)[0];

    await prisma.notification.create({
      data: {
        userId: user.id,
        type: type,
        title: `New ${type}!`,
        message: `Someone ${type}d your content`,
        isRead: random(0, 10) > 6,
        createdAt: new Date(Date.now() - random(0, 7) * 24 * 60 * 60 * 1000),
      }
    });
  }
  console.log(`Created 20 notifications\n`);

  console.log('Creating conversations...');
  for (let i = 0; i < 5; i++) {
    const user1 = pickRandom(users)[0];
    const user2 = pickRandom(users.filter((u: any) => u.id !== user1.id))[0];
    try {
      const conversation = await prisma.conversation.create({
        data: {
          participant1Id: user1.id,
          participant2Id: user2.id,
          lastMessageAt: new Date(),
        }
      });
      for (let j = 0; j < random(3, 6); j++) {
        const sender = random(0, 1) === 0 ? user1 : user2;
        await prisma.message.create({
          data: {
            conversationId: conversation.id,
            senderId: sender.id,
            content: pickRandom(['Hey!', 'Thanks for reaching out', 'Sounds good', 'Let me know when you\'re available', 'Great working with you!'])[0],
          }
        });
      }
    } catch (error) {
      // Skip duplicates
    }
  }
  console.log(`Created conversations and messages\n`);

  console.log('Creating analytics events...');
  const eventTypes: any[] = ['VIEW', 'LIKE', 'COMMENT', 'SHARE', 'PROFILE_VIEW'];
  for (let i = 0; i < 50; i++) {
    const user = random(0, 10) > 2 ? pickRandom(users)[0] : null;
    const post = pickRandom(posts)[0];

    await prisma.analyticsEvent.create({
      data: {
        userId: user?.id,
        type: pickRandom(eventTypes)[0],
        entityType: 'post',
        entityId: post.id,
        metadata: {},
        createdAt: new Date(Date.now() - random(0, 30) * 24 * 60 * 60 * 1000),
      }
    });
  }
  console.log(`Created 50 analytics events\n`);

  console.log('Database seeding completed successfully!\n');
  console.log('Test Account Credentials:');
  console.log('  Admin: admin@embr.app / test1234');
  console.log('  Creator: creator@embr.app / test1234');
  console.log('  User: user@embr.app / test1234\n');
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error('Error seeding database:', e);
    await prisma.$disconnect();
    process.exit(1);
  });
