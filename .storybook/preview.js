import '../src/index.css';

/** @type { import('@storybook/react').Preview } */
const preview = {
  parameters: {
    actions: { argTypesRegex: '^on[A-Z].*' },
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/i,
      },
    },
    backgrounds: {
      default: 'dark',
      values: [
        { name: 'light', value: '#F5F7FF' },
        { name: 'dark', value: '#0E1621' },
        { name: 'glass', value: '#17212B' },
      ],
    },
  },
};

export default preview;
