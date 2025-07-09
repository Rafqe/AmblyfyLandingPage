/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{js,jsx,ts,tsx}"],
  theme: {
    extend: {
      colors: {
        "brand-dark-blue": "#144475",
        "brand-cyan": "#00AEC2",
        "brand-dark-green": "#007262",
        "brand-light-green": "#75BC7E",
        "brand-yellow": "#E1DB1D",
        "brand-pale-green": "#CAD76A",
      },
    },
  },
  plugins: [],
};
