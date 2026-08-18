import type { Meta, StoryObj } from '@storybook/react';
import { Input } from '../components/ui/Input';
import { Mail, KeyRound, User } from 'lucide-react';

const meta: Meta<typeof Input> = {
  title: 'Design System/Input',
  component: Input,
  tags: ['autodocs'],
  argTypes: {
    label: { control: 'text' },
    placeholder: { control: 'text' },
    error: { control: 'text' },
    helperText: { control: 'text' },
    showClearButton: { control: 'boolean' },
    showCount: { control: 'boolean' },
    disabled: { control: 'boolean' },
  },
};

export default meta;
type Story = StoryObj<typeof Input>;

export const Default: Story = {
  args: {
    label: 'Логин или Email',
    placeholder: 'Email, @username или ключ...',
    leftIcon: <Mail className="w-4 h-4" />,
    showClearButton: true,
  },
};

export const PasswordField: Story = {
  args: {
    label: 'Пароль',
    placeholder: 'Ваш надежный пароль...',
    type: 'password',
    leftIcon: <KeyRound className="w-4 h-4" />,
  },
};

export const WithCharacterCounter: Story = {
  args: {
    label: 'Имя пользователя',
    placeholder: 'уникальный_ник',
    value: 'voltikalk',
    maxLength: 30,
    showCount: true,
    leftIcon: <User className="w-4 h-4" />,
  },
};

export const ErrorState: Story = {
  args: {
    label: 'Электронная почта',
    placeholder: 'name@example.com',
    value: 'invalid-email',
    error: 'Введите корректный адрес электронной почты',
    leftIcon: <Mail className="w-4 h-4" />,
  },
};
