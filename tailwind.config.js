/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/**/*.{html,ts,css,scss}',
  ],
  theme: {
    extend: {
      colors: {
        primary: '#1A3C6E',
        secondary: '#FF6B2C',
        background: '#F5F7FA',
        surface: '#FFFFFF',
        success: '#22C55E',
        warning: '#F59E0B',
        error: '#EF4444',
        'text-1': '#1E293B',
        'text-2': '#64748B',
      },
      borderRadius: {
        'card': '12px',
        'btn': '8px',
        'pill': '24px',
      },
      boxShadow: {
        'default': '0 2px 8px rgba(0,0,0,0.08)',
      },
      fontFamily: {
        sans: ['Inter', 'Plus Jakarta Sans', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
