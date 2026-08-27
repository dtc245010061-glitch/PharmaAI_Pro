import apiClient from './api';

/**
 * Service chuyên trách quản lý Xác thực và Phân quyền (Authentication & Authorization)
 */
export const authService = {
    /**
     * Gửi yêu cầu đăng nhập tài khoản lên Backend FastAPI
     * 
     * @param {string} username - Tên đăng nhập
     * @param {string} password - Mật khẩu
     * @returns {Promise<Object>} Trả về thông tin token, role và username nếu thành công
     */
    login: async (username, password) => {
        // FastAPI OAuth2PasswordRequestForm yêu cầu định dạng x-www-form-urlencoded
        const params = new URLSearchParams();
        params.append('username', username.trim());
        params.append('password', password);

        try {
            // Sử dụng apiClient gốc hoặc axios trực tiếp để gửi form-urlencoded
            const response = await apiClient.post('/auth/login', params, {
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded'
                }
            });

            // Nếu Backend trả về thành công, lưu trữ thông tin vào localStorage
            if (response && response.access_token) {
                localStorage.setItem('access_token', response.access_token);
                if (response.role) localStorage.setItem('user_role', response.role);
                if (response.username) localStorage.setItem('username', response.username);
            }

            return response;
        } catch (error) {
            console.error("Lỗi đăng nhập:", error);
            throw error;
        }
    },

    /**
     * Lấy thông tin chi tiết của người dùng đang đăng nhập hiện tại thông qua Token
     * 
     * @returns {Promise<Object>} Thông tin user (username, role, email,...)
     */
    getCurrentUser: async () => {
        try {
            const response = await apiClient.get('/users/me');
            return response;
        } catch (error) {
            console.error("Không thể lấy thông tin người dùng hiện tại:", error);
            throw error;
        }
    },

    /**
     * Xóa toàn bộ phiên đăng nhập và dọn dẹp localStorage
     */
    logout: () => {
        localStorage.removeItem('access_token');
        localStorage.removeItem('user_role');
        localStorage.removeItem('username');
        
        // Điều hướng về trang đăng nhập nếu đang ở phía trình duyệt
        if (typeof window !== 'undefined') {
            window.location.href = '/login';
        }
    },

    /**
     * Kiểm tra xem người dùng đã có token hợp lệ cục bộ hay chưa
     * 
     * @returns {boolean} True nếu tồn tại token
     */
    isAuthenticated: () => {
        return !!localStorage.getItem('access_token');
    },

    /**
     * Lấy vai trò (Role) hiện tại của người dùng từ localStorage
     * 
     * @returns {string|null} 'admin', 'pharmacist', 'cashier' hoặc null
     */
    getCurrentRole: () => {
        return localStorage.getItem('user_role');
    }
};

export default authService;