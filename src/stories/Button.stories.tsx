import type { Meta, StoryObj } from '@storybook/react';
import { Button } from '../components/ui/Button';
import { ArrowRight, Sparkles, Mail } from 'lucide-react';

const meta: Meta<typeof Button> = {
  title: 'Design System/Button',
  component: Button,
  tags: ['autodocs'],
  argTypes: {
    variant: {
      control: 'select',
      options: ['primary', 'secondary', 'outline', 'danger', 'ghost'],
    },
    size: {
      control: 'radio',
      options: ['sm', 'md', 'lg'],
    },
    isLoading: { control: 'boolean' },
    isSuccess: { control: 'boolean' },
    disabled: { control: 'boolean' },
    fullWidth: { control: 'boolean' },
  },
};

export default meta;
type Story = StoryObj<typeof Button>;

export const PrimaryGradient: Story = {
  args: {
    children: 'Войти в Comms',
    variant: 'primary',
    size: 'lg',
    rightIcon: <ArrowRight className="w-4 h-4" />,
  },
};

export const SecondaryGlass: Story = {
  args: {
    children: 'Вторичное действие',
    variant: 'secondary',
    size: 'md',
    leftIcon: <Mail className="w-4 h-4" />,
  },
};

export const LoadingState: Story = {
  args: {
    children: 'Создание аккаунта',
    variant: 'primary',
    size: 'lg',
    isLoading: true,
  },
};

export const SuccessState: Story = {
  args: {
    children: 'Подтверждено',
    variant: 'primary',
    size: 'lg',
    isSuccess: true,
  },
};

export const WithIcons: Story = {
  args: {
    children: 'Зарегистрироваться',
    variant: 'primary',
    size: 'md',
    leftIcon: <Sparkles className="w-4 h-4" />,
    rightIcon: <ArrowRight className="w-4 h-4" />,
  },
};
