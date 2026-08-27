import apiClient from './api';

/**
 * Service chuyên trách quản lý nghiệp vụ Bán hàng (Point of Sale / POS)
 */
export const posService = {
    /**
     * Gửi yêu cầu thanh toán giỏ hàng lên hệ thống Backend.
     * Backend sẽ tự động áp dụng thuật toán FEFO trừ kho, tính toán thuế, chiết khấu và tạo hóa đơn.
     * 
     * @param {Object} checkoutData - Dữ liệu thanh toán
     * @param {Array<{batch_id: string, quantity: number}>} checkoutData.items - Danh sách sản phẩm mua
     * @param {string} [checkoutData.customer_name] - Tên khách hàng (Tùy chọn)
     * @param {string} [checkoutData.customer_phone] - Số điện thoại khách hàng (Tùy chọn)
     * @param {number} [checkoutData.discount] - Số tiền chiết khấu (Mặc định 0)
     * @param {number} [checkoutData.tax_rate] - Tỷ lệ thuế VAT (Mặc định 0.08)
     * @returns {Promise<Object>} Kết quả hóa đơn đã tạo (bao gồm invoice_code, final_amount,...)
     */
    checkout: async (checkoutData) => {
        try {
            const payload = {
                items: checkoutData.items.map(item => ({
                    batch_id: item.batch_id,
                    quantity: parseInt(item.quantity) || 1
                })),
                customer_name: checkoutData.customer_name ? checkoutData.customer_name.trim() : null,
                customer_phone: checkoutData.customer_phone ? checkoutData.customer_phone.trim() : null,
                discount: parseFloat(checkoutData.discount) || 0.0,
                tax_rate: parseFloat(checkoutData.tax_rate) || 0.08
            };

            const response = await apiClient.post('/pos/checkout', payload);
            return response;
        } catch (error) {
            console.error("Lỗi khi thực hiện thanh toán POS:", error);
            throw error;
        }
    },

    /**
     * Lấy danh sách lịch sử các hóa đơn đã bán gần đây từ cơ sở dữ liệu
     * 
     * @returns {Promise<Array>} Mảng danh sách các hóa đơn
     */
    getInvoiceHistory: async () => {
        try {
            const response = await apiClient.get('/pos/history');
            return response || [];
        } catch (error) {
            console.error("Lỗi khi tải lịch sử hóa đơn POS:", error);
            throw error;
        }
    },

    /**
     * Lấy chi tiết thông tin của một hóa đơn dựa theo ID
     * 
     * @param {string} invoiceId - Mã định danh UUID của hóa đơn
     * @returns {Promise<Object>} Chi tiết hóa đơn và danh sách mặt hàng đã mua
     */
    getInvoiceDetail: async (invoiceId) => {
        try {
            const response = await apiClient.get(`/pos/invoices/${invoiceId}`);
            return response;
        } catch (error) {
            console.error(`Lỗi khi lấy chi tiết hóa đơn ID ${invoiceId}:`, error);
            throw error;
        }
    }
};

export default posService;