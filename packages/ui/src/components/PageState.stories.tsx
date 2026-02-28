import type { Meta, StoryObj } from '@storybook/react';
import { PageState } from './PageState';
import '../styles/design-system.css';

const meta = {
  title: 'Components/PageState',
  component: PageState,
  parameters: {
    layout: 'padded',
  },
  tags: ['autodocs'],
} satisfies Meta<typeof PageState>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Empty: Story = {
  args: {
    type: 'empty',
    title: 'No items found',
    subtitle: 'Try adjusting your search or filters',
  },
};

export const Error: Story = {
  args: {
    type: 'error',
    title: 'Something went wrong',
    subtitle: 'Please try again later',
  },
};

export const Loading: Story = {
  args: {
    type: 'loading',
    title: 'Loading...',
    subtitle: 'Please wait while we fetch your data',
  },
};

export const Success: Story = {
  args: {
    type: 'success',
    title: 'Success!',
    subtitle: 'Your action completed successfully',
  },
};
