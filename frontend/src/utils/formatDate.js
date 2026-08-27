/**
 * Định dạng chuỗi ngày tháng sang chuẩn hiển thị tiếng Việt (DD/MM/YYYY)
 * 
 * @param {string|Date} dateString - Chuỗi ngày hoặc đối tượng Date cần format (VD: "2026-08-27")
 * @returns {string} Chuỗi ngày đã định dạng (VD: "27/08/2026") hoặc "N/A" nếu không hợp lệ
 */
export function formatDate(dateString) {
    if (!dateString) return 'N/A';
    
    try {
        const date = new Date(dateString);
        if (isNaN(date.getTime())) {
            return dateString; // Trả về nguyên bản nếu không thể parse được
        }
        
        return date.toLocaleDateString('vi-VN', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric'
        });
    } catch (error) {
        console.error("Lỗi format ngày tháng:", error);
        return dateString;
    }
}

/**
 * Định dạng kèm cả giờ phút (DD/MM/YYYY HH:mm) dùng cho Hóa đơn / Lịch sử giao dịch
 * 
 * @param {string|Date} datetimeString - Chuỗi thời gian đầy đủ từ Database
 * @returns {string} Chuỗi định dạng (VD: "27/08/2026 19:30")
 */
export function formatDateTime(datetimeString) {
    if (!datetimeString) return 'N/A';
    
    try {
        const date = new Date(datetimeString);
        if (isNaN(date.getTime())) {
            return datetimeString;
        }
        
        const datePart = date.toLocaleDateString('vi-VN', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric'
        });
        
        const timePart = date.toLocaleTimeString('vi-VN', {
            hour: '2-digit',
            minute: '2-digit',
            hour12: false
        });
        
        return `${datePart} ${timePart}`;
    } catch (error) {
        console.error("Lỗi format thời gian:", error);
        return datetimeString;
    }
}

/**
 * Kiểm tra xem một mốc Hạn sử dụng (Exp Date) có sắp hết hạn trong khoảng số ngày cho trước không (Phục vụ FEFO Alerts)
 * 
 * @param {string|Date} expDateString - Ngày hết hạn của lô thuốc
 * @param {number} thresholdDays - Ngưỡng số ngày cảnh báo (Mặc định 60 ngày)
 * @returns {boolean} True nếu nằm trong khoảng cảnh báo, False nếu an toàn hoặc đã hết hạn
 */
export function isExpiringSoon(expDateString, thresholdDays = 60) {
    if (!expDateString) return false;
    
    try {
        const expDate = new Date(expDateString);
        const today = new Date();
        
        // Reset giờ về 0 để tính chính xác theo ngày
        expDate.setHours(0, 0, 0, 0);
        today.setHours(0, 0, 0, 0);
        
        const diffTime = expDate - today;
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        
        // Cảnh báo nếu số ngày còn lại lớn hơn hoặc bằng 0 (chưa quá hạn) và nhỏ hơn hoặc bằng ngưỡng
        return diffDays >= 0 && diffDays <= thresholdDays;
    } catch (error) {
        return false;
    }
}

/**
 * Kiểm tra xem lô thuốc đã chính thức hết hạn (Quá date) hay chưa
 * 
 * @param {string|Date} expDateString - Ngày hết hạn của lô thuốc
 * @returns {boolean} True nếu đã quá hạn so với ngày hôm nay
 */
export function isExpired(expDateString) {
    if (!expDateString) return false;
    
    try {
        const expDate = new Date(expDateString);
        const today = new Date();
        
        expDate.setHours(0, 0, 0, 0);
        today.setHours(0, 0, 0, 0);
        
        return expDate < today;
    } catch (error) {
        return false;
    }
}