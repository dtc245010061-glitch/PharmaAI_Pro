/**
 * Định dạng một số thành chuỗi tiền tệ Việt Nam Đồng (VNĐ) chuẩn xác.
 * 
 * @param {number|string} amount - Giá trị số tiền cần định dạng (VD: 150000, "250000.5")
 * @returns {string} Chuỗi tiền tệ đã định dạng kèm đơn vị (VD: "150.000 đ")
 */
export function formatCurrency(amount) {
    if (amount === null || amount === undefined || isNaN(amount)) {
        return '0 đ';
    }

    // Ép kiểu về số nguyên hoặc số thực an toàn
    const numericValue = Number(amount);

    // Sử dụng hàm chuẩn phân tách hàng nghìn theo locale tiếng Việt ('vi-VN')
    return `${numericValue.toLocaleString('vi-VN')} đ`;
}

/**
 * Định dạng số tiền rút gọn dùng cho biểu thị trên các thẻ KPI Dashboard (nếu số lượng quá lớn).
 * Ví dụ: 1500000 -> "1.5 Tr đ"
 */
export function formatCurrencyCompact(amount) {
    if (amount === null || amount === undefined || isNaN(amount)) {
        return '0 đ';
    }

    const numericValue = Number(amount);

    if (numericValue >= 1e9) {
        return `${(numericValue / 1e9).toFixed(1)} Tỷ đ`;
    }
    if (numericValue >= 1e6) {
        return `${(numericValue / 1e6).toFixed(1)} Tr đ`;
    }
    if (numericValue >= 1e3) {
        return `${(numericValue / 1e3).toFixed(1)} k đ`;
    }

    return `${numericValue.toLocaleString('vi-VN')} đ`;
}