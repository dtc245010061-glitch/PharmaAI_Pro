import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';

// Import các trang giao diện (Giả định bạn sẽ tạo các file tương ứng trong thư mục pages)
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import POS from './pages/POS';
import Inventory from './pages/Inventory';
import Medicines from './pages/Medicines';
import Users from './pages/Users';
import AIChat from './pages/AIChat';
import NotFound from './pages/NotFound';

// ==========================================
// 1. COMPONENT BẢO VỆ ĐƯỜNG DẪN (PROTECTED ROUTE)
// ==========================================
// Nếu chưa đăng nhập, tự động đá về trang /login
const ProtectedRoute = ({ children, allowedRoles }) => {
    const { user, isAuthenticated } = useAuth();

    if (!isAuthenticated) {
        return <Navigate to="/login" replace />;
    }

    // Nếu tuyến đường yêu cầu phân quyền cụ thể mà user không có quyền -> Báo lỗi hoặc về Dashboard
    if (allowedRoles && !allowedRoles.includes(user.role)) {
        return (
            <div className="flex h-screen items-center justify-center bg-gray-100">
                <div className="text-center p-8 bg-white rounded-lg shadow-md">
                    <h2 className="text-2xl font-bold text-red-600 mb-2">403 - Truy cập bị từ chối</h2>
                    <p className="text-gray-600 mb-4">Bạn không có đặc quyền để truy cập phân hệ này.</p>
                    <a href="/" className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">Quay về Trang chủ</a>
                </div>
            </div>
        );
    }

    return children;
};

// ==========================================
// 2. KHUNG ĐIỀU HƯỚNG CHÍNH (MAIN APP)
// ==========================================
function AppRoutes() {
    return (
        <Routes>
            {/* Trang công khai */}
            <Route path="/login" element={<Login />} />

            {/* Các trang yêu cầu phải đăng nhập */}
            <Route 
                path="/" 
                element={
                    <ProtectedRoute>
                        <Dashboard />
                    </ProtectedRoute>
                } 
            />
            
            {/* Phân hệ Bán hàng POS (Dành cho Thu ngân, Dược sĩ, Admin) */}
            <Route 
                path="/pos" 
                element={
                    <ProtectedRoute allowedRoles={['admin', 'pharmacist', 'cashier']}>
                        <POS />
                    </ProtectedRoute>
                } 
            />

            {/* Quản lý Kho & FEFO (Chỉ Dược sĩ và Admin) */}
            <Route 
                path="/inventory" 
                element={
                    <ProtectedRoute allowedRoles={['admin', 'pharmacist']}>
                        <Inventory />
                    </ProtectedRoute>
                } 
            />

            {/* Danh mục Thuốc (Chỉ Dược sĩ và Admin) */}
            <Route 
                path="/medicines" 
                element={
                    <ProtectedRoute allowedRoles={['admin', 'pharmacist']}>
                        <Medicines />
                    </ProtectedRoute>
                } 
            />

            {/* Quản lý Nhân sự / Tài khoản (Chỉ Admin) */}
            <Route 
                path="/users" 
                element={
                    <ProtectedRoute allowedRoles={['admin']}>
                        <Users />
                    </ProtectedRoute>
                } 
            />

            {/* Trợ lý AI Thông minh */}
            <Route 
                path="/ai-chat" 
                element={
                    <ProtectedRoute allowedRoles={['admin', 'pharmacist', 'cashier']}>
                        <AIChat />
                    </ProtectedRoute>
                } 
            />

            {/* Trang 404 cho các đường dẫn lạc */}
            <Route path="*" element={<NotFound />} />
        </Routes>
    );
}

// ==========================================
// 3. ROOT COMPONENT
// ==========================================
export default function App() {
    return (
        <Router>
            <AuthProvider>
                <AppRoutes />
            </AuthProvider>
        </Router>
    );
}