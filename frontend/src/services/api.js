import axios from 'axios';

// ==========================================
// 1. CẤU HÌNH BASE URL CHO AXIOS
// ==========================================
// Lấy đường dẫn từ biến môi trường của Vite hoặc mặc định về localhost:8000
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8000/api/v1';

const apiClient = axios.create({
    baseURL: API_BASE_URL,
    headers: {
        'Content-Type': 'application/json',
    },
    timeout: 15000, // Quá hạn sau 15 giây nếu server không phản hồi
});

// ==========================================
// 2. REQUEST INTERCEPTOR (TỰ ĐỘNG ĐÍNH KÈM TOKEN)
// ==========================================
// Trước khi bất kỳ request nào được gửi đi, hàm này sẽ chặn lại, 
// đọc Token từ localStorage và nhét vào Header Authorization.
apiClient.interceptors.request.use(
    (config) => {
        const token = localStorage.getItem('access_token');
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
    },
    (error) => {
        return Promise.reject(error);
    }
);

// ==========================================
// 3. RESPONSE INTERCEPTOR (XỬ LÝ LỖI TOÀN CỤC)
// ==========================================
// Bắt lỗi trả về từ Backend (Ví dụ: Hết hạn token, lỗi server...)
apiClient.interceptors.response.use(
    (response) => {
        return response.data; // Trả thẳng dữ liệu data cho Component gọi, đỡ phải .data lặp lại
    },
    (error) => {
        const status = error.response ? error.response.status : null;
        
        if (status === 401) {
            // Token hết hạn hoặc không hợp lệ -> Xóa localStorage và đá về trang Login
            console.warn("Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.");
            localStorage.removeItem('access_token');
            localStorage.removeItem('user_role');
            localStorage.removeItem('username');
            
            // Chỉ chuyển hướng nếu không đang đứng ở trang login
            if (!window.location.pathname.includes('/login')) {
                window.location.href = '/login';
            }
        } else if (status === 403) {
            console.error("Truy cập bị từ chối: Bạn không có quyền thực hiện hành động này.");
        } else if (status >= 500) {
            console.error("Lỗi máy chủ nội bộ. Vui lòng thử lại sau.");
        }
        
        return Promise.reject(error.response ? error.response.data : error.message);
    }
);

// ==========================================
// 4. ĐÓNG GÓI CÁC HÀM GỌI API NGHIỆP VỤ
// ==========================================
export const authApi = {
    login: async (username, password) => {
        // FastAPI OAuth2 yêu cầu dữ liệu gửi dạng x-www-form-urlencoded
        const params = new URLSearchParams();
        params.append('username', username);
        params.append('password', password);
        
        return await axios.post(`${API_BASE_URL}/auth/login`, params, {
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
        });
    },
    getMe: async () => await apiClient.get('/users/me'),
};

export const medicineApi = {
    getAll: async (search = '', group = '') => {
        let url = '/medicines/?';
        if (search) url += `q=${encodeURIComponent(search)}&`;
        if (group) url += `group=${encodeURIComponent(group)}`;
        return await apiClient.get(url);
    },
    create: async (data) => await apiClient.post('/medicines/', data),
    update: async (id, data) => await apiClient.put(`/medicines/${id}`, data),
    delete: async (id) => await apiClient.delete(`/medicines/${id}`),
};

export const inventoryApi = {
    getBatches: async (medId = '') => {
        const url = medId ? `/inventory/?med_id=${medId}` : '/inventory/';
        return await apiClient.get(url);
    },
    importBatch: async (data) => await apiClient.post('/inventory/', data),
    getExpiryAlerts: async (days = 30) => await apiClient.get(`/inventory/alerts/expiry?days_threshold=${days}`),
};

export const posApi = {
    checkout: async (checkoutData) => await apiClient.post('/pos/checkout', checkoutData),
    getHistory: async () => await apiClient.get('/pos/history'),
};

export const aiApi = {
    chat: async (question, contextType, medId = null) => {
        return await apiClient.post('/ai/chat', {
            question,
            context_type: contextType,
            med_id: medId
        });
    }
};

export default apiClient;