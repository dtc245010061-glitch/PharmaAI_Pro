/** @type {import('tailwindcss').Config} */
export default {
  // Chỉ định các file Tailwind cần quét để biên dịch class CSS
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      // Tích hợp font chữ 'Inter' (Đã import trong index.css) làm font mặc định (sans)
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
      },
      // Có thể mở rộng thêm mã màu thương hiệu ở đây nếu cần
      colors: {
        emerald: {
          50: '#ecfdf5',
          100: '#d1fae5',
          200: '#a7f3d0',
          300: '#6ee7b7',
          400: '#34d399',
          500: '#10b981', // Màu chủ đạo của PharmaAI
          600: '#059669',
          700: '#047857',
          800: '#065f46',
          900: '#064e3b',
        }
      }
    },
  },
  plugins: [],
}