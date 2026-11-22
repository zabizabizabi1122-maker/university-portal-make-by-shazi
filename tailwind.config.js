/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/lib/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "var(--background)",
        foreground: "var(--foreground)",

        // Warm paper, ink and line tokens used for text on solid accent surfaces.
        paper: "#FFFEFA",
        ink: "#1F241D",

        // Warm neutral scale. Shade numbers are kept from the previous dark
        // theme so existing utilities keep their role (950 = page, 900 = card,
        // 800 = border, 400/300 = secondary/body text, 100 = heading ink).
        slate: {
          50: "#FBF8F1",
          100: "#1F241D",
          200: "#333027",
          300: "#4A4439",
          400: "#6B6152",
          500: "#8B7F6A",
          600: "#B9AC94",
          700: "#D8CFBC",
          800: "#E7E0D2",
          900: "#FFFEFA",
          950: "#F7F4EC",
        },

        // Deep green / teal — primary brand accent.
        emerald: {
          100: "#07231D",
          200: "#0A3028",
          300: "#0E4035",
          400: "#145444",
          500: "#1F6B57",
          600: "#2F7F68",
          700: "#6BA98E",
          800: "#A9CFBB",
          900: "#D5E8DD",
          950: "#E9F2EC",
        },

        // Secondary teal-blue (student/info accents).
        blue: {
          300: "#17494B",
          400: "#1F5F60",
          500: "#3E8582",
          600: "#2E6E6E",
          900: "#E7F0F0",
          950: "#EDF5F3",
        },

        // Muted plum for faculty accents.
        purple: {
          300: "#472D3E",
          400: "#5E3D52",
          500: "#845D77",
          600: "#6D4A61",
          950: "#F5EEF1",
        },

        // Warm ochre for notices and warnings.
        amber: {
          300: "#5C4013",
          400: "#76531A",
          500: "#A37C33",
          600: "#8C6724",
        },

        // Brick red for destructive / error states.
        rose: {
          300: "#6E2A23",
          400: "#8A352C",
          500: "#A3453A",
          950: "#FBEFEC",
        },

        // Muted teal for informational chips.
        cyan: {
          400: "#1C5F5B",
          500: "#2F7F7A",
        },

        // Login/brand gradient: light tint -> deep green.
        indigo: {
          500: "#3E9379",
          600: "#2F7F68",
          900: "#D8E9DD",
          950: "#EDF4EE",
        },

        // Soft blue-grey for excused attendance.
        sky: {
          300: "#2C5869",
          500: "#3F7185",
        },
      },
      fontFamily: {
        sans: ["var(--font-geist-sans)", "Georgia", "serif"],
        serif: ["Georgia", "Cambria", "Times New Roman", "serif"],
      },
    },
  },
  plugins: [],
}
