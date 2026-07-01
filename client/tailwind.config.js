/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#eef4ff',
          100: '#d9e6ff',
          500: '#3763e0',
          600: '#2d4fc2',
          700: '#243d99',
        },
      },
    },
  },
  plugins: [],
};
