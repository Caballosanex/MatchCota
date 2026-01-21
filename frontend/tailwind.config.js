/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,jsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#4A90A4',
          dark: '#3a7a8a',
          light: '#6aa8b8',
        }
      }
    },
  },
  plugins: [],
}
