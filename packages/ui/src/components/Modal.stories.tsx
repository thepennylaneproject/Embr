import type { Meta, StoryObj } from '@storybook/react';
import { Modal } from './Modal';
import { Button } from './Button';
import '../styles/design-system.css';

const meta = {
  title: 'Components/Modal',
  component: Modal,
  tags: ['autodocs'],
  argTypes: {
    isOpen: { control: 'boolean' },
    title: { control: 'text' },
  },
} satisfies Meta<typeof Modal>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    isOpen: true,
    title: 'Modal Title',
    onClose: () => {},
    children: (
      <div>
        <p>This is the modal content.</p>
        <p>Add any content you need here.</p>
      </div>
    ),
  },
};

export const WithActions: Story = {
  args: {
    isOpen: true,
    title: 'Confirm Action',
    onClose: () => {},
    children: (
      <div>
        <p>Are you sure you want to proceed?</p>
        <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1.5rem' }}>
          <Button variant="secondary" onClick={() => {}}>
            Cancel
          </Button>
          <Button variant="primary" onClick={() => {}}>
            Confirm
          </Button>
        </div>
      </div>
    ),
  },
};

export const Closed: Story = {
  args: {
    isOpen: false,
    title: 'Closed Modal',
    onClose: () => {},
    children: <p>This modal is closed and not visible.</p>,
  },
};
