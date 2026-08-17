/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: [
    './index.html',
    './src/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          primary: '#0066FF',     // Bright Electric Blue
          secondary: '#9933FF',   // Vivid Purple
          success: '#00D084',     // Mint Green
          error: '#FF3333',       // Crisp Red
          background: '#F5F7FF',  // Light Blue-tinted Background
          dark: '#1A1A1A',        // Deep Charcoal
          light: '#FFFFFF',       // Pure White
        },
        glass: {
          light: 'rgba(255, 255, 255, 0.75)',
          dark: 'rgba(23, 33, 43, 0.8)',
          border: 'rgba(255, 255, 255, 0.25)',
          borderDark: 'rgba(255, 255, 255, 0.12)',
        }
      },
      fontFamily: {
        heading: ['Montserrat', 'Inter', 'sans-serif'],
        sans: ['Inter', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      borderRadius: {
        'btn': '12px',
        'card': '24px',
        'input': '12px',
      },
      boxShadow: {
        'glass': '0 8px 32px 0 rgba(0, 102, 255, 0.15)',
        'glass-hover': '0 12px 40px 0 rgba(153, 51, 255, 0.22)',
        'glass-dark': '0 8px 32px 0 rgba(0, 0, 0, 0.45)',
        'glow-primary': '0 0 20px rgba(0, 102, 255, 0.4)',
        'glow-secondary': '0 0 20px rgba(153, 51, 255, 0.4)',
      },
      backgroundImage: {
        'auth-gradient': 'linear-gradient(135deg, #0066FF 0%, #9933FF 100%)',
        'auth-radial': 'radial-gradient(circle at 10% 20%, rgba(0, 102, 255, 0.8) 0%, rgba(153, 51, 255, 0.7) 90%)',
        'glass-gradient': 'linear-gradient(135deg, rgba(255, 255, 255, 0.2) 0%, rgba(255, 255, 255, 0.05) 100%)',
        'btn-gradient': 'linear-gradient(135deg, #0066FF 0%, #9933FF 100%)',
        'btn-gradient-hover': 'linear-gradient(135deg, #0052cc 0%, #8020e6 100%)',
      },
      backdropBlur: {
        'glass': '16px',
        'card': '20px',
      }
    },
  },
  plugins: [],
};
