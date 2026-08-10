/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        dientify: {
          bg: '#0F1720',         // Fondo oscuro principal
          surface: '#16222F',    // Paneles y tarjetas
          sidebar: '#0B1117',    // Barra lateral
          card: '#1B2A38',       // Sub-contenedores / Hover
          border: '#243647',     // Bordes
          mint: '#10B981',       // Verde menta acento
          'mint-dark': '#047857',
          accent: '#2DD4BF',     // Cian / Verde brillante
          warning: '#F59E0B',
          danger: '#EF4444',
        }
      }
    },
  },
  plugins: [],
}