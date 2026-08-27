import google.generativeai as genai
from sqlalchemy.orm import Session
from typing import Optional, Dict

# Import cấu hình và Models
from app.core.config import settings
from app.models.medicine_model import Medicine

# ==========================================
# 1. CẤU HÌNH SDK GOOGLE GEMINI
# ==========================================
is_ai_ready = False
if settings.AI_API_KEY and not settings.AI_API_KEY.startswith("AIzaSy_YOUR_API_KEY"):
    try:
        genai.configure(api_key=settings.AI_API_KEY)
        is_ai_ready = True
    except Exception as e:
        print(f"Lỗi khởi tạo AI: {e}")

# ==========================================
# 2. BỘ LỌC TỪ KHÓA & PROMPT TEMPLATE
# ==========================================
# Tấm khiên bảo vệ cấp 1: Chặn đứng các câu hỏi yêu cầu chẩn đoán/kê đơn
DANGEROUS_KEYWORDS = ["chữa", "điều trị", "triệu chứng", "bệnh", "nhức", "sốt", "kê đơn", "uống thuốc gì", "đau"]

SYSTEM_PROMPT = """
Bạn là Trợ lý AI nội bộ của hệ thống nhà thuốc PharmaAI Pro.
Nguyên tắc TỐI THƯỢNG (Tuân thủ GPP và Luật Dược):
1. TUYỆT ĐỐI KHÔNG chẩn đoán bệnh, KHÔNG kê đơn, KHÔNG đưa ra lời khuyên y khoa.
2. Nếu được cung cấp Dữ liệu thuốc từ Database nội bộ, hãy tóm tắt trung thực, không bịa thêm thông tin.
3. Trình bày: Tên thuốc, Hoạt chất, Công dụng chính, Liều dùng tham khảo, Chống chỉ định.
4. Trả lời bằng tiếng Việt, ngắn gọn, dùng gạch đầu dòng, tối đa 150 chữ.

Dữ liệu đầu vào (Từ Database):
{context}

Câu hỏi của Dược sĩ/Thu ngân: {question}
"""

# ==========================================
# 3. HÀM XỬ LÝ CHÍNH (SERVICE FUNCTION)
# ==========================================
def process_ai_chat(db: Session, question: str, context_type: str, med_id: Optional[str] = None) -> Dict:
    """
    Xử lý câu hỏi của nhân viên, nhúng dữ liệu thật từ DB và gọi AI.
    """
    question_lower = question.lower()

    # ---------------------------------------------------------
    # GUARDRAIL 1: KIỂM TRA TỪ KHÓA NGUY HIỂM
    # ---------------------------------------------------------
    if any(word in question_lower for word in DANGEROUS_KEYWORDS):
        return {
            "reply": "⚠️ CẢNH BÁO TỪ HỆ THỐNG GUARDRAILS: Câu hỏi của bạn có chứa yếu tố yêu cầu chẩn đoán hoặc điều trị y khoa. Trợ lý AI bị khóa tính năng này để tuân thủ quy định GPP. Vui lòng hướng dẫn khách hàng gặp Dược sĩ chuyên môn hoặc đến cơ sở y tế.",
            "is_safe": False,
            "disclaimer": "Hệ thống AI không thay thế ý kiến Bác sĩ.",
            "source": "System_Guardrail"
        }

    # ---------------------------------------------------------
    # RAG (Retrieval-Augmented Generation): LẤY DỮ LIỆU TỪ DB
    # ---------------------------------------------------------
    context_data = "Không có dữ liệu ngữ cảnh bổ sung."
    
    if context_type == "medicine" and med_id:
        # Truy vấn trực tiếp vào Database thật bằng SQLAlchemy
        medicine = db.query(Medicine).filter(Medicine.id == med_id, Medicine.is_active == True).first()
        if medicine:
            context_data = f"""
            THÔNG TIN THUỐC CHUẨN TỪ HỆ THỐNG:
            - Tên: {medicine.name}
            - Hoạt chất: {medicine.active_ingredient}
            - Hàm lượng: {medicine.dosage}
            - SĐK: {medicine.reg_number}
            - Hướng dẫn NSX: {medicine.description}
            """
        else:
            context_data = "Lỗi: Không tìm thấy thuốc này trong cơ sở dữ liệu hoặc thuốc đã ngừng kinh doanh."
            
    elif context_type == "sop":
        # Giả lập CSDL SOP nội bộ
        context_data = """
        SOP_KHO_01 (Quy trình FIFO/FEFO): Ưu tiên xuất lô có Hạn sử dụng (Date) ngắn nhất.
        SOP_POS_02: Khi thanh toán, nếu phát hiện thuốc trong giỏ hàng đã hết hạn, hệ thống POS sẽ tự động chặn giao dịch.
        """

    # ---------------------------------------------------------
    # GỌI GOOGLE GEMINI API (VỚI FALLBACK GIẢ LẬP)
    # ---------------------------------------------------------
    final_prompt = SYSTEM_PROMPT.format(context=context_data, question=question)

    if is_ai_ready:
        try:
            model = genai.GenerativeModel('gemini-1.5-flash')
            response = model.generate_content(
                final_prompt,
                generation_config=genai.types.GenerationConfig(
                    temperature=settings.AI_TEMPERATURE, # Lấy 0.1 từ file .env để giảm ảo giác
                    max_output_tokens=settings.AI_MAX_OUTPUT_TOKENS
                )
            )
            return {
                "reply": response.text,
                "is_safe": True,
                "disclaimer": "AI sinh tự động dựa trên dữ liệu nội bộ. Hãy đối chiếu với hộp thuốc thực tế.",
                "source": "Gemini_1.5_Flash"
            }
        except Exception as e:
            # Fallback nếu đứt cáp mạng hoặc hết quota Google
            return {
                "reply": f"Lỗi kết nối máy chủ Google AI: {str(e)}",
                "is_safe": False,
                "disclaimer": "Dịch vụ AI tạm thời gián đoạn.",
                "source": "API_Error"
            }
    else:
        # MOCK MODE (Chế độ giả lập khi chưa cấu hình Key .env)
        # Sinh viên rất chuộng chế độ này vì đi báo cáo Đồ án không sợ rớt mạng.
        mock_reply = "Hệ thống đang ở chế độ Giả lập (Mock Mode) vì chưa cấu hình API Key. \n"
        if context_type == "medicine":
            mock_reply += f"AI (Giả lập) đã đọc DB và thấy bạn đang hỏi về thuốc: {medicine.name if medicine else 'Không rõ'}."
        
        return {
            "reply": mock_reply,
            "is_safe": True,
            "disclaimer": "Lưu ý: Đây là dữ liệu giả lập offline.",
            "source": "Mock_AI_Engine"
        }