/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        paper: "#EEF1EC",
        card: "#F8F9F6",
        ink: "#1D2A44",
        "ink-muted": "#5B6472",
        brass: "#B8862B",
        "brass-light": "#E8D8AE",
        present: "#2E6B4F",
        "present-light": "#E1EEE6",
        absent: "#A94430",
        "absent-light": "#F5E3DE",
        line: "#D7DBD1",
      },
      fontFamily: {
        display: ["'Fraunces'", "serif"],
        body: ["'Inter'", "sans-serif"],
        mono: ["'IBM Plex Mono'", "monospace"],
      },
      borderRadius: {
        card: "10px",
      },
    },
  },
  plugins: [],
};
