import type { Meta, StoryObj } from '@storybook/react';
import { Card } from './Card';
import '../styles/design-system.css';

const meta = {
  title: 'Components/Card',
  component: Card,
  parameters: {
    layout: 'padded',
  },
  tags: ['autodocs'],
  argTypes: {
    padding: {
      control: 'select',
      options: ['none', 'sm', 'md', 'lg'],
    },
  },
} satisfies Meta<typeof Card>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    children: (
      <div>
        <h3 style={{ margin: '0 0 0.5rem' }}>Card Title</h3>
        <p style={{ margin: 0, color: 'var(--embr-muted-text)' }}>
          This is a default card with standard padding.
        </p>
      </div>
    ),
    padding: 'md',
  },
};

export const WithSmallPadding: Story = {
  args: {
    children: (
      <div>
        <p style={{ margin: 0 }}>Small padding card</p>
      </div>
    ),
    padding: 'sm',
  },
};

export const WithLargePadding: Story = {
  args: {
    children: (
      <div>
        <h2 style={{ margin: '0 0 1rem' }}>Large Padding Card</h2>
        <p style={{ margin: 0, color: 'var(--embr-muted-text)' }}>
          This card has larger padding for more spacious layouts.
        </p>
      </div>
    ),
    padding: 'lg',
  },
};

export const NoPadding: Story = {
  args: {
    children: (
      <div style={{ height: '100px', background: 'var(--embr-primary-100)' }}>
        Content with no padding
      </div>
    ),
    padding: 'none',
  },
};
