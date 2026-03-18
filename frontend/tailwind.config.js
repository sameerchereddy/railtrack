/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        bg: '#080c14',
        surface: '#0f1623',
        surface2: '#161e2e',
        surface3: '#1c2740',
        border: '#1e2d45',
        border2: '#253550',
        blue: { DEFAULT: '#3b82f6', dim: 'rgba(59,130,246,0.15)', glow: 'rgba(59,130,246,0.4)' },
        cyan: '#06b6d4',
        green: '#22c55e',
        yellow: '#eab308',
        red: '#ef4444',
        orange: '#f97316',
        purple: '#a855f7',
        'text-base': '#e2e8f0',
        'text-dim': '#94a3b8',
        'text-muted': '#475569',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'Cascadia Code', 'ui-monospace', 'monospace'],
      },
    },
  },
  plugins: [],
}
