/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        display: ['"Plus Jakarta Sans"', 'Inter', 'sans-serif'],
      },
      colors: {
        marca: {
          50: '#FFF4ED',
          100: '#FFE6D5',
          200: '#FFC9A8',
          300: '#FFA672',
          400: '#FB7A3C',
          500: '#E8590C',
          600: '#C4460A',
          700: '#9A3609',
          800: '#7A2D0B',
          900: '#65280E',
        },
        grafite: {
          800: '#2A2825',
          900: '#1C1B1A',
          950: '#141312',
        },
        base: {
          50: '#FBFAF8',
          100: '#F7F5F2',
          200: '#EFEBE5',
          300: '#E2DCD3',
        },
      },
      boxShadow: {
        suave: '0 1px 2px rgba(28,27,26,0.04), 0 1px 3px rgba(28,27,26,0.06)',
        cartao: '0 1px 3px rgba(28,27,26,0.05), 0 4px 12px rgba(28,27,26,0.04)',
      },
    },
  },
  plugins: [],
};
