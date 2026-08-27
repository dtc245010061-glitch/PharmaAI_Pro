import apiClient from './api';

/**
 * Service chuyên trách giao tiếp với phân hệ AI của Backend (PharmaAI Pro)
 */
export const aiService = {
    /**
     * Gửi câu hỏi hoặc yêu cầu tra cứu đến trợ lý AI
     * 
     * @param {string} question - Câu hỏi của nhân viên / dược sĩ
     * @param {string} contextType - Loại ngữ cảnh ('medicine' hoặc 'sop')
     * @param {string|null} medId - Mã thuốc cụ thể (nếu đang hỏi về một loại thuốc trong danh mục)
     * @returns {Promise<Object>} Phản hồi từ AI bao gồm { reply, isSafe, disclaimer, source }
     */
    chatWithAI: async (question, contextType = 'sop', medId = null) => {
        try {
            const payload = {
                question: question.trim(),
                context_type: contextType,
                med_id: medId || null
            };

            const response = await apiClient.post('/ai/chat', payload);
            return response;
        } catch (error) {
            console.error("Lỗi khi giao tiếp với AI Service:", error);
            throw {
                reply: "⚠️ Hệ thống không thể kết nối tới máy chủ Trợ lý AI. Vui lòng kiểm tra lại kết nối mạng hoặc cấu hình API Key.",
                isSafe: false,
                disclaimer: "Lỗi kết nối ngoại tuyến",
                source: "Frontend_Error_Handler"
            };
        }
    },

    /**
     * Lấy nhanh thông tin tóm tắt hướng dẫn sử dụng của một loại thuốc thông qua AI
     * 
     * @param {string} medId - Mã định danh của thuốc trong Database
     * @returns {Promise<string>} Nội dung tóm tắt chuẩn hướng dẫn
     */
    getMedicineSummary: async (medId) => {
        try {
            const response = await apiClient.post('/ai/chat', {
                question: "Hãy tóm tắt công dụng, liều dùng tham khảo và chống chỉ định chính của thuốc này.",
                context_type: "medicine",
                med_id: medId
            });
            return response.reply;
        } catch (error) {
            console.error("Lỗi khi lấy tóm tắt thuốc từ AI:", error);
            return "Không thể tải tóm tắt từ AI lúc này.";
        }
    }
};

export default aiService;