/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        bg: '#0a0a0f',
        surface: '#12121a',
        surface2: '#1a1a26',
        border: 'rgba(255,255,255,0.08)',
        'text-muted': 'rgba(255,255,255,0.5)',
        blue: '#3b82f6',
        purple: '#8b5cf6',
        green: '#22c55e',
        yellow: '#eab308',
        red: '#ef4444',
        orange: '#f97316',
      },
      fontFamily: {
        body: ['Rajdhani', 'sans-serif'],
        heading: ['Orbitron', 'sans-serif'],
        ui: ['Rajdhani', 'sans-serif'],
      },
      backgroundImage: {
        'gradient-blue-purple': 'linear-gradient(135deg, #3b82f6, #8b5cf6)',
      },
    },
  },
  plugins: [],
};
