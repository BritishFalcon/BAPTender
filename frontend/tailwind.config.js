/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  darkMode: 'class', // Optional: if you want to use Tailwind's dark mode variants based on a class
  theme: {
    extend: {
      fontFamily: {
        orbitron: ['Orbitron', 'sans-serif'],
        vt323: ['VT323', 'monospace'],
        sharetech: ['"Share Tech Mono"', 'monospace'], // Ensure quotes if font name has spaces
      },
      colors: {
        // OG Theme (Defaults, can be overridden by CSS vars)
        'primary-og': '#007bff',
        'accent-og': '#6c757d',
        'bg-og': '#f8f9fa',
        'text-og': '#212529',
        'card-bg-og': '#ffffff',

        // Dark Theme
        'primary-dark': '#90baf9',
        'accent-dark': '#6effd5',
        'bg-dark': '#141414',
        'text-dark': '#fafafa',
        'card-bg-dark': 'rgba(30, 30, 30, 0.7)', // Darker, more opaque cards

        // Cyber Theme
        'primary-cyber': '#00b3ff',
        'accent-cyber': '#ff00e0',
        'bg-cyber': '#000000',
        'text-cyber': '#00ff9c',
        'card-bg-cyber': 'rgba(0, 20, 0, 0.6)', // Dark green tint

        // Neon Theme
        'primary-neon': '#ff00e6',
        'accent-neon': '#00ffd2',
        'bg-neon': '#0f0f0f',
        'text-neon': '#ffff00',
        'card-bg-neon': 'rgba(20, 0, 20, 0.5)', // Dark magenta tint
      },
      backgroundImage: {
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
        'gradient-conic':
          'conic-gradient(from 180deg at 50% 50%, var(--tw-gradient-stops))',
      },
      keyframes: {
        // Glitch animations from OG code
        'glitch-skew': {
          '0%': { transform: 'skew(0deg)' },
          '100%': { transform: 'skew(10deg)' },
        },
        'glitch-anim': {
          '0%': { clip: 'rect(44px, 9999px, 67px, 0)' },
          '5%': { clip: 'rect(59px, 9999px, 91px, 0)' },
          '10%': { clip: 'rect(34px, 9999px, 98px, 0)' },
          '100%': { clip: 'rect(12px, 9999px, 33px, 0)' },
        },
        'glitch-anim2': {
          '0%': { clip: 'rect(51px, 9999px, 110px, 0)' },
          '5%': { clip: 'rect(80px, 9999px, 75px, 0)' },
          '10%': { clip: 'rect(95px, 9999px, 28px, 0)' },
          '100%': { clip: 'rect(10px, 9999px, 44px, 0)' },
        },
        // Feedback animations from OG (Animate.css inspired)
        'fadeInRight': {
          'from': { opacity: '0', transform: 'translate3d(100%, 0, 0)' },
          'to': { opacity: '1', transform: 'translate3d(0, 0, 0)' },
        },
        'fadeOutRight': {
          'from': { opacity: '1', transform: 'translate3d(0, 0, 0)' },
          'to': { opacity: '0', transform: 'translate3d(100%, 0, 0)' },
        },
      },
      animation: {
        'glitch-skew': 'glitch-skew 1.5s infinite linear alternate-reverse',
        'glitch-anim': 'glitch-anim 3s infinite linear alternate-reverse',
        'glitch-anim2': 'glitch-anim2 2.5s infinite linear alternate-reverse',
        'fadeInRight': 'fadeInRight 0.5s ease-out',
        'fadeOutRight': 'fadeOutRight 0.5s ease-in',
      },
    },
  },
  plugins: [],
};