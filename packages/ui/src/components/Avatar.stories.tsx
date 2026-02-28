import type { Meta, StoryObj } from '@storybook/react';
import { Avatar } from './Avatar';
import '../styles/design-system.css';

const meta = {
  title: 'Components/Avatar',
  component: Avatar,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
} satisfies Meta<typeof Avatar>;

export default meta;
type Story = StoryObj<typeof meta>;

export const WithInitials: Story = {
  args: {
    name: 'John Doe',
    size: 'md',
  },
};

export const Small: Story = {
  args: {
    name: 'Jane Smith',
    size: 'sm',
  },
};

export const Large: Story = {
  args: {
    name: 'Alex Johnson',
    size: 'lg',
  },
};

export const WithImage: Story = {
  args: {
    name: 'Profile User',
    imageUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=ProfileUser',
    size: 'md',
  },
};

export const MultipleAvatars: Story = {
  render: () => (
    <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
      <Avatar name="Alice Brown" size="sm" />
      <Avatar name="Bob White" size="md" />
      <Avatar name="Charlie Black" size="lg" />
    </div>
  ),
};
