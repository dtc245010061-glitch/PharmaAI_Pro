import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  // Kích hoạt plugin React cho Vite
  plugins: [react()],
  
  // Cấu hình máy chủ phát triển (Dev Server)
  server: {
    port: 3000, // Cố định cổng chạy Frontend là 3000 (chuẩn truyền thống của React)
    open: true, // Tự động mở trình duyệt ngay khi gõ lệnh npm run dev
    
    // CẤU HÌNH PROXY: Cực kỳ quan trọng để kết nối với FastAPI Backend
    // Mọi request từ React gọi tới '/api/...' sẽ được Vite ngầm chuyển tới 'http://127.0.0.1:8000'
    // Giúp bỏ qua hoàn toàn lỗi CORS policy phiền toái.
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:8000', // Địa chỉ Backend FastAPI của bạn
        changeOrigin: true,
        secure: false,
        // Nếu Backend của bạn không có tiền tố /api, hãy bật dòng rewrite dưới đây:
        // rewrite: (path) => path.replace(/^\/api/, '')
      }
    }
  },

  // Cấu hình khi đóng gói (Build) dự án mang lên Server Production
  build: {
    outDir: 'dist', // Thư mục chứa code sau khi build
    chunkSizeWarningLimit: 1000, // Tăng giới hạn cảnh báo file lớn (chuẩn cho dự án nhiều UI Component)
    rollupOptions: {
      output: {
        // Tối ưu hóa: Tách các thư viện lớn (như React, Router) ra file riêng để trình duyệt load nhanh hơn
        manualChunks: {
          vendor: ['react', 'react-dom', 'react-router-dom', 'axios', 'lucide-react'],
        }
      }
    }
  }
});