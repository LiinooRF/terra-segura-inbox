import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        "wa-dark": "#111B21",
        "wa-darker": "#0B141A",
        "wa-header": "#202C33",
        "wa-input": "#2A3942",
        "wa-green": "#005C4B",
        "wa-green-light": "#25D366",
        "wa-outgoing": "#D9FDD3",
        "wa-outgoing-dark": "#005C4B",
        "wa-incoming": "#202C33",
        "wa-border": "#313D45",
      },
    },
  },
  plugins: [],
};
export default config;
