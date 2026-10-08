/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        navy: {
          950: '#070C1A',
          900: '#0B132B',
          800: '#111E3F',
          700: '#1C2E5A',
          600: '#28417E',
        },
        brand: {
          cyan: '#06B6D4',
          blue: '#2563EB',
          indigo: '#4F46E5',
          accent: '#0EA5E9',
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
      },
      boxShadow: {
        'card': '0 4px 20px -2px rgba(11, 19, 43, 0.06), 0 2px 6px -1px rgba(11, 19, 43, 0.04)',
        'elevated': '0 10px 30px -5px rgba(11, 19, 43, 0.12), 0 4px 10px -2px rgba(11, 19, 43, 0.06)',
      }
    },
  },
  plugins: [],
}
