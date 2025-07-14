// tailwind.config.js
import postcss from 'postcss';

/** @type {import('tailwindcss').Config} */
export default {
  content: ["./src/**/*.{html,ts,js}"],
  theme: {
    extend: {
      colors: {
        editor: {
          background: 'var(--editor-background)',
          text: 'var(--editor-text)',
          textAgainst: 'var(--editor-text-against-color)',
          border: 'var(--editor-border)',
          primary: 'var(--editor-primary)',
          primaryHover: 'var(--editor-primary-hover)',
          secondary: 'var(--editor-secondary)',
          secondaryHover: 'var(--editor-secondary-hover)',
          componentBackground: 'var(--editor-component-background)',
          inputBackground: 'var(--editor-input-background)',
          inputText: 'var(--editor-input-text)',
          buttonActiveBackground: 'var(--editor-button-active-background)',
          buttonActiveText: 'var(--editor-button-active-text)',
          errorBackground: 'var(--editor-error-background)',
          errorText: 'var(--editor-error-text)',
          errorBackgroundHover: 'var(--editor-error-background-hover)',
        },
      },
    },
  },
  plugins: [postcss],
  darkMode: "class",
};