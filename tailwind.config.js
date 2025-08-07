/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/app/**/*.{js,ts,jsx,tsx}",        // App Router 경로
    "./src/components/**/*.{js,ts,jsx,tsx}", // 컴포넌트 경로
  ],
  theme: {
    extend: {
      colors: {
        primary: "#43B0FF",   // 로고 · 호버 색상
      },
      fontFamily: {
        junggo: ["'JunggoDotum', sans-serif"], // 중고딕
      },
    },
  },
  plugins: [],
};
