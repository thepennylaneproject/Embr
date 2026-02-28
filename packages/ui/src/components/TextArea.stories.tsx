import type { Meta, StoryObj } from '@storybook/react';
import { TextArea } from './TextArea';
import '../styles/design-system.css';

const meta = {
  title: 'Components/TextArea',
  component: TextArea,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
  argTypes: {
    disabled: { control: 'boolean' },
    rows: { control: 'number' },
  },
} satisfies Meta<typeof TextArea>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    placeholder: 'Enter your message...',
    rows: 4,
  },
};

export const WithValue: Story = {
  args: {
    value: 'This is a sample textarea with some content.',
    rows: 4,
    readOnly: true,
  },
};

export const Disabled: Story = {
  args: {
    placeholder: 'Disabled textarea',
    disabled: true,
    rows: 4,
  },
};

export const LargeTextArea: Story = {
  args: {
    placeholder: 'Enter a long message here...',
    rows: 8,
  },
};
