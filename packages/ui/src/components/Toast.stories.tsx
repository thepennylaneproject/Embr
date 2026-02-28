import type { Meta, StoryObj } from '@storybook/react';
import { Toast } from './Toast';
import '../styles/design-system.css';

const meta = {
  title: 'Components/Toast',
  component: Toast,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
  argTypes: {
    kind: {
      control: 'select',
      options: ['default', 'error'],
    },
  },
} satisfies Meta<typeof Toast>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    message: 'This is a notification message',
    kind: 'default',
  },
};

export const Error: Story = {
  args: {
    message: 'Something went wrong!',
    kind: 'error',
  },
};

export const WithDismiss: Story = {
  args: {
    message: 'This message can be dismissed',
    kind: 'default',
    onDismiss: () => {},
  },
};
