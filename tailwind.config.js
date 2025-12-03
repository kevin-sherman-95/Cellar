/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        wine: {
          50: '#fdf2f3',
          100: '#fce7e9',
          200: '#f9d3d7',
          300: '#f4b0b8',
          400: '#ec8593',
          500: '#e15b70',
          600: '#cc3851',
          700: '#ac2a43',
          800: '#912540',
          900: '#7c243e',
          950: '#44101c',
        },
        cellar: {
          50: '#faf7f2',
          100: '#f4ede1',
          200: '#e8dac2',
          300: '#d9c19c',
          400: '#c8a474',
          500: '#bc8f58',
          600: '#ae7d4c',
          700: '#916640',
          800: '#755438',
          900: '#5e452f',
          950: '#322318',
        }
      },
      fontFamily: {
        serif: ['Playfair Display', 'serif'],
        sans: ['Inter', 'sans-serif'],
      },
      animation: {
        'fade-in': 'fadeIn 0.5s ease-in-out',
        'slide-up': 'slideUp 0.3s ease-out',
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { transform: 'translateY(10px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
      }
    },
  },
  plugins: [],
}
