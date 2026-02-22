/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'gaze-blue': '#3B82F6',
        'gaze-green': '#10B981',
        'gaze-yellow': '#F59E0B',
        'gaze-purple': '#8B5CF6',
      },
    },
  },
  plugins: [],
}
