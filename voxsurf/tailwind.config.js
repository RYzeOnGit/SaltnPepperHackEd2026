/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        apple: {
          blue: '#007AFF',
          green: '#34C759',
          red: '#FF3B30',
          orange: '#FF9500',
          yellow: '#FFCC00',
          purple: '#AF52DE',
          pink: '#FF2D55',
          teal: '#5AC8FA',
          gray: {
            1: '#8E8E93',
            2: '#636366',
            3: '#48484A',
            4: '#3A3A3C',
            5: '#2C2C2E',
            6: '#1C1C1E',
          },
        },
        glass: {
          white: 'rgba(255, 255, 255, 0.06)',
          border: 'rgba(255, 255, 255, 0.1)',
          hover: 'rgba(255, 255, 255, 0.1)',
          active: 'rgba(255, 255, 255, 0.14)',
          divider: 'rgba(255, 255, 255, 0.06)',
        },
      },
      borderRadius: {
        'apple': '12px',
        'apple-lg': '16px',
        'apple-xl': '20px',
        'capsule': '999px',
      },
      backdropBlur: {
        'glass': '20px',
        'glass-lg': '40px',
      },
      boxShadow: {
        'glass': '0 8px 32px rgba(0, 0, 0, 0.3)',
        'glass-lg': '0 12px 48px rgba(0, 0, 0, 0.4)',
        'glass-glow': '0 0 20px rgba(0, 122, 255, 0.15)',
        'glass-inset': 'inset 0 1px 0 rgba(255, 255, 255, 0.05)',
      },
      fontFamily: {
        'sf': ['-apple-system', 'BlinkMacSystemFont', 'SF Pro Display', 'SF Pro Text', 'Helvetica Neue', 'Helvetica', 'Arial', 'sans-serif'],
      },
      animation: {
        'fade-in': 'fadeIn 0.3s cubic-bezier(0.25, 0.46, 0.45, 0.94)',
        'slide-up': 'slideUp 0.35s cubic-bezier(0.25, 0.46, 0.45, 0.94)',
        'pulse-glow': 'pulseGlow 2s ease-in-out infinite',
        'shimmer': 'shimmer 2s linear infinite',
        'status-pulse': 'statusPulse 2s ease-in-out infinite',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0', transform: 'translateY(4px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        slideUp: {
          '0%': { opacity: '0', transform: 'translateY(10px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        pulseGlow: {
          '0%, 100%': { opacity: '0.7', boxShadow: '0 0 12px rgba(0, 122, 255, 0.2)' },
          '50%': { opacity: '1', boxShadow: '0 0 24px rgba(0, 122, 255, 0.4)' },
        },
        shimmer: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
        statusPulse: {
          '0%, 100%': { opacity: '1', transform: 'scale(1)' },
          '50%': { opacity: '0.6', transform: 'scale(0.85)' },
        },
      },
    },
  },
  plugins: [],
}
