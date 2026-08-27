import React, { createContext, useContext, useState, useEffect } from 'react';
import { authApi } from '../services/api';

// 1. Khởi tạo Context
const AuthContext = createContext(null);

// 2. Định nghĩa Provider quản lý State toàn cục
export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    // Kiểm tra trạng thái đăng nhập khi ứng dụng vừa khởi động (F5 trang)
    useEffect(() => {
        const initAuth = async () => {
            const token = localStorage.getItem('access_token');
            if (token) {
                try {
                    // Gọi API lấy thông tin cá nhân /users/me để xác thực token còn sống không
                    const userData = await authApi.getMe();
                    setUser(userData);
                } catch (error) {
                    console.error("Token không hợp lệ hoặc đã hết hạn:", error);
                    logout(); // Nếu token chết, tự động dọn dẹp sạch sẽ
                }
            }
            setLoading(false);
        };

        initAuth();
    }, []);

    // Hàm xử lý Đăng nhập
    const login = async (username, password) => {
        try {
            // Gọi API đăng nhập lấy Token và Role
            const response = await authApi.login(username, password);
            const { access_token, role, username: uname } = response;

            // Lưu vào localStorage để duy trì phiên làm việc
            localStorage.setItem('access_token', access_token);
            localStorage.setItem('user_role', role);
            localStorage.setItem('username', uname);

            // Cập nhật State user ngay lập tức
            setUser({ username: uname, role: role });
            return { success: true };
        } catch (error) {
            console.error("Lỗi đăng nhập:", error);
            return { 
                success: false, 
                message: error.detail || "Đăng nhập thất bại. Vui lòng kiểm tra lại tài khoản." 
            };
        }
    };

    // Hàm xử lý Đăng xuất
    const logout = () => {
        localStorage.removeItem('access_token');
        localStorage.removeItem('user_role');
        localStorage.removeItem('username');
        setUser(null);
        window.location.href = '/login';
    };

    const value = {
        user,
        login,
        logout,
        isAuthenticated: !!user,
        isAdmin: user?.role === 'admin',
        isPharmacist: user?.role === 'pharmacist' || user?.role === 'admin',
        isCashier: user?.role === 'cashier',
    };

    return (
        <AuthContext.Provider value={value}>
            {!loading && children}
        </AuthContext.Provider>
    );
};

// 3. Custom Hook tiện ích để gọi nhanh Auth ở bất kỳ Component nào
export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth phải được sử dụng bên trong một AuthProvider');
    }
    return context;
};