# Storybook Setup

This document describes the Storybook setup for the Embr UI component library.

## Overview

Storybook is configured to showcase all UI components with their various states and variants. The design system CSS is integrated to display components with proper styling.

## Getting Started

### Installation

Install dependencies in the UI package:

```bash
cd packages/ui
npm install
```

### Running Storybook

Start the Storybook development server:

```bash
npm run storybook
```

Storybook will be available at `http://localhost:6006`

### Building Storybook

To generate a static build:

```bash
npm run storybook:build
```

This creates an optimized static site in the `storybook-static` directory.

## Components

The following components are documented in Storybook:

- **Button** - Primary, secondary, and ghost variants with loading and disabled states
- **Input** - Text input with support for different input types
- **TextArea** - Multi-line text input
- **Card** - Container component with configurable padding options
- **Avatar** - User avatar with initials or image support
- **Modal** - Modal dialog component
- **Toast** - Notification messages
- **PageState** - Empty, error, loading, and success page states

## Creating New Stories

To create a story for a new component:

1. Create a file named `ComponentName.stories.tsx` in the `src/components/` directory
2. Import the component and the design system CSS
3. Define a meta object with component metadata
4. Export story objects for different states

Example:

```tsx
import type { Meta, StoryObj } from '@storybook/react';
import { MyComponent } from './MyComponent';
import '../styles/design-system.css';

const meta = {
  title: 'Components/MyComponent',
  component: MyComponent,
  tags: ['autodocs'],
} satisfies Meta<typeof MyComponent>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    // Component props
  },
};
```

## Design System Integration

All stories import the `design-system.css` file to ensure consistent styling. The design system provides:

- Color variables for primary, secondary, accent, and neutral colors
- Border radius and shadow variables
- Typography and layout utilities
- Component base styles (buttons, inputs, cards, etc.)

## Customization

Edit `.storybook/main.ts` to modify the Storybook configuration, such as:
- Adding new addons
- Changing the story path pattern
- Configuring webpack loaders

Edit `.storybook/preview.ts` to customize:
- Global decorators
- Preview parameters
- Global styles
