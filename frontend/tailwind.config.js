/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        // Massure brand palette
        massure: {
          green:   '#5EB461',
          teal:    '#42B29C',
          dark:    '#2B4141',
          darkest: '#092327',
          mint:    '#F1FEFB',
          gray:    '#edeff2',
          lightgray: '#f8f9fb',
        },
      },
      fontFamily: {
        sans: ['"Nunito Sans"', 'sans-serif'],
      },
      borderRadius: {
        '2xl': '20px',
      },
    },
  },
  plugins: [],
};
