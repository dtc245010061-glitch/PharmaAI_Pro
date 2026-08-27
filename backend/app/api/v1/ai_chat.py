from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field
from typing import Optional
import os
import google.generativeai as genai
from dotenv import load_dotenv

# Import rào chắn bảo mật và CSDL Thuốc
from app.api.v1.users import get_current_user
from app.api.v1.medicines import fake_medicines_db

# Load biến môi trường từ file .env
load_dotenv()

router = APIRouter()

# ==========================================
# 1. CẤU HÌNH GOOGLE GEMINI AI
# ==========================================
AI_API_KEY = os.getenv("AI_API_KEY", "")
AI_TEMPERATURE = float(os.getenv("AI_TEMPERATURE", 0.1)) # Nhiệt độ thấp = Ít ảo giác (Hallucination)

# Khởi tạo kết nối với Google AI (Nếu có API Key thật)
is_ai_ready = False
if AI_API_KEY and not AI_API_KEY.startswith("AIzaSy_YOUR_API_KEY"):
    genai.configure(api_key=AI_API_KEY)
    is_ai_ready = True

# ==========================================
# 2. SCHEMAS (Cấu trúc dữ liệu Giao tiếp AI)
# ==========================================
class AIRequest(BaseModel):
    question: str = Field(..., title="Câu hỏi của nhân viên")
    context_type: str = Field(..., title="Loại ngữ cảnh", description="Giá trị: 'medicine', 'sop', hoặc 'general'")
    med_id: Optional[str] = Field(None, title="Mã thuốc (nếu tra cứu thuốc)")

class AIResponse(BaseModel):
    reply: str
    is_safe: bool
    disclaimer: str
    source: str # Báo cho FE biết đây là AI thật hay AI giả lập

# ==========================================
# 3. KỸ THUẬT PROMPT ENGINEERING & GUARDRAILS
# ==========================================
# Đây là danh sách từ khóa nhạy cảm kích hoạt lớp khiên bảo vệ y tế
DANGEROUS_KEYWORDS = ["chữa", "điều trị", "triệu chứng", "bệnh", "nhức", "sốt", "kê đơn", "uống thuốc gì", "đau"]

SYSTEM_PROMPT_TEMPLATE = """
Bạn là Trợ lý AI nội bộ của hệ thống nhà thuốc PharmaAI Pro.
Nguyên tắc TỐI THƯỢNG:
1. TUYỆT ĐỐI KHÔNG chẩn đoán bệnh, KHÔNG kê đơn, KHÔNG đưa ra lời khuyên y tế.
2. Nếu được cung cấp Dữ liệu thuốc (JSON), hãy tóm tắt ngắn gọn: Tên, Hoạt chất, Công dụng chính, Liều dùng, Chống chỉ định.
3. Trả lời bằng tiếng Việt, ngắn gọn dưới 150 chữ, định dạng gạch đầu dòng dễ đọc.

Dữ liệu đầu vào:
{context}

Câu hỏi của nhân viên: {question}
"""

# ==========================================
# 4. API ENDPOINT (Giao tiếp Chatbot)
# ==========================================
@router.post("/chat", response_model=AIResponse)
async def chat_with_ai(
    req: AIRequest, 
    current_user: dict = Depends(get_current_user) # Bắt buộc đăng nhập
):
    """
    API: Giao tiếp với Trợ lý AI.
    Tích hợp bộ lọc Semantic Routing và Safety Guardrails.
    """
    question_lower = req.question.lower()

    # ---------------------------------------------------------
    # LỚP BẢO VỆ 1: BỘ LỌC TỪ KHÓA (Keyword-based Guardrail)
    # ---------------------------------------------------------
    if any(word in question_lower for word in DANGEROUS_KEYWORDS):
        return AIResponse(
            reply="⚠️ CẢNH BÁO TỪ HỆ THỐNG: Câu hỏi của bạn có chứa yếu tố yêu cầu tư vấn y khoa (chẩn đoán/điều trị). Theo quy định chuẩn GPP và thiết lập hệ thống, tôi không được phép đưa ra lời khuyên y tế. Vui lòng chuyển hướng khách hàng gặp trực tiếp Dược sĩ chuyên môn hoặc Bác sĩ.",
            is_safe=False,
            disclaimer="AI bị giới hạn tính năng tư vấn y tế để đảm bảo tuân thủ Pháp luật Dược hiện hành.",
            source="System_Guardrail"
        )

    # ---------------------------------------------------------
    # CHUẨN BỊ NGỮ CẢNH (RAG - Retrieval-Augmented Generation)
    # ---------------------------------------------------------
    context_data = "Không có dữ liệu ngữ cảnh."
    
    # Nghiệp vụ 1: AI Tóm tắt Thuốc (Yêu cầu 2.1)
    if req.context_type == "medicine" and req.med_id:
        med = fake_medicines_db.get(req.med_id)
        if med:
            context_data = f"THÔNG TIN THUỐC ĐÃ DUYỆT: {med}"
        else:
            context_data = "Thuốc này không tồn tại trong cơ sở dữ liệu nội bộ."
            
    # Nghiệp vụ 2: AI Hỏi đáp Quy trình SOP (Yêu cầu 2.3)
    elif req.context_type == "sop":
        context_data = """
        SOP_KHO_01: Quy trình xử lý hàng cận date:
        - Dưới 30 ngày: Đưa vào danh sách Giảm giá.
        - Dưới 15 ngày: Báo cáo Quản lý để trả NCC hoặc Tiêu hủy.
        SOP_NHAP_02: Nhập hàng phải kiểm tra hóa đơn đỏ, số lô, HSD trùng khớp.
        """

    # ---------------------------------------------------------
    # GỌI GOOGLE GEMINI API (Hoặc Fallback Giả lập)
    # ---------------------------------------------------------
    final_prompt = SYSTEM_PROMPT_TEMPLATE.format(context=context_data, question=req.question)

    reply_text = ""
    source_used = "Gemini_1.5_Flash"

    if is_ai_ready:
        try:
            # Gọi API thật của Google
            model = genai.GenerativeModel('gemini-1.5-flash')
            response = model.generate_content(
                final_prompt,
                generation_config=genai.types.GenerationConfig(
                    temperature=AI_TEMPERATURE, # Nhiệt độ 0.1 lấy từ env
                    max_output_tokens=500
                )
            )
            reply_text = response.text
        except Exception as e:
            reply_text = f"Lỗi kết nối máy chủ AI: {str(e)}"
            source_used = "Error"
    else:
        # CHẾ ĐỘ GIẢ LẬP (Dành cho Sinh viên báo cáo khi không có mạng/API Key)
        source_used = "Mock_AI_Engine"
        if req.context_type == "medicine":
            reply_text = "Dựa trên CSDL nội bộ:\n- Hoạt chất: Paracetamol\n- Tác dụng: Giảm đau, hạ sốt.\n- Liều dùng: 1-2 viên/lần.\n- Chống chỉ định: Bệnh nhân suy gan."
        elif req.context_type == "sop":
            reply_text = "Theo quy trình nội bộ SOP_KHO_01, đối với hàng cận date dưới 30 ngày, bạn cần lập danh sách đưa vào chương trình Giảm giá. Dưới 15 ngày phải báo cáo trả nhà cung cấp."
        else:
            reply_text = "Tôi là trợ lý ảo nội bộ. Hệ thống hiện đang chạy ở chế độ giả lập (Mock Mode) do chưa cấu hình API Key thực."

    # ---------------------------------------------------------
    # TRẢ KẾT QUẢ CHO FRONTEND
    # ---------------------------------------------------------
    return AIResponse(
        reply=reply_text,
        is_safe=True,
        disclaimer="Lưu ý: Mọi tóm tắt và đề xuất từ AI chỉ mang tính chất tham khảo hỗ trợ nhân viên. Cần đối chiếu với tài liệu gốc.",
        source=source_used
    )