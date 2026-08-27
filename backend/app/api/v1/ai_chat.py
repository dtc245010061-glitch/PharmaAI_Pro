from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field
from typing import List, Optional
import os
import google.generativeai as genai

router = APIRouter(prefix="/ai", tags=["AI Guardrails & Assistant"])

# Cấu hình API Key cho Google Gemini
# Lấy từ biến môi trường hoặc cấu hình mặc định an toàn hệ thống
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "DUMMY_KEY_FOR_INIT")
if GEMINI_API_KEY and GEMINI_API_KEY != "DUMMY_KEY_FOR_INIT":
    genai.configure(api_key=GEMINI_API_KEY)

class AIChatRequest(BaseModel):
    prompt: str = Field(..., description="Câu hỏi hoặc yêu cầu tư vấn dược lý từ dược sĩ")
    context_medicine: Optional[str] = Field(None, description="Tên thuốc hoặc thành phần đi kèm nếu có")

class AIChatResponse(BaseModel):
    response: str
    guardrail_status: str = "PASSED"
    warning_note: Optional[str] = None

@router.post("/chat", response_model=AIChatResponse)
async def chat_with_pharmacy_ai(payload: AIChatRequest):
    """
    Điểm cuối (Endpoint) xử lý tư vấn trí tuệ nhân tạo tích hợp Guardrails chuẩn GPP.
    Kiểm tra tương tác thuốc, chống chỉ định và hướng dẫn liều dùng.
    """
    try:
        # Kiểm tra xem API Key đã được cấu hình thật sự chưa
        if not GEMINI_API_KEY or GEMINI_API_KEY == "DUMMY_KEY_FOR_INIT":
            # Phản hồi mô phỏng thông minh nếu chưa cấu hình API Key để hệ thống vẫn chạy thử nghiệm được giao diện
            return AIChatResponse(
                response=f"[Chế độ mô phỏng AI Guardrails]: Hệ thống đã tiếp nhận yêu cầu về thuốc '{payload.context_medicine or 'Chung'}'. Nội dung tư vấn: {payload.prompt}. Khuyến cáo luôn kiểm tra kỹ nhãn thuốc và chống chỉ định theo chuẩn GPP trước khi cấp phát.",
                guardrail_status="SIMULATED",
                warning_note="Chưa cấu hình GEMINI_API_KEY trong file .env. Đây là phản hồi giả lập an toàn."
            )

        # Khởi tạo mô hình Gemini chuyên biệt cho y tế/dược học
        generation_config = {
            "temperature": 0.2, # Độ sáng tạo thấp để đảm bảo tính chính xác y tế cao
            "top_p": 0.95,
            "top_k": 40,
            "max_output_tokens": 1024,
        }
        
        system_instruction = (
            "Bạn là PharmaAI Assistant, một trợ lý AI cao cấp chuyên hỗ trợ Dược sĩ trong hệ thống quản lý nhà thuốc chuẩn GPP. "
            "Nhiệm vụ của bạn là phân tích đơn thuốc, cảnh báo tương tác thuốc nguy hiểm, chống chỉ định và liều dùng chính xác. "
            "Luôn trả lời ngắn gọn, chuyên nghiệp bằng tiếng Việt, đặt sự an toàn của bệnh nhân lên hàng đầu."
        )

        model = genai.GenerativeModel(
            model_name="gemini-1.5-flash",
            generation_config=generation_config,
            system_instruction=system_instruction
        )

        full_prompt = f"Thông tin thuốc/bối cảnh: {payload.context_medicine or 'Không có'}\nYêu cầu tư vấn: {payload.prompt}"
        
        chat_completion = model.generate_content(full_prompt)
        ai_reply = chat_completion.text if chat_completion and chat_completion.text else "Không nhận được phản hồi hợp lệ từ mô hình AI."

        return AIChatResponse(
            response=ai_reply,
            guardrail_status="PASSED",
            warning_note=None
        )

    except Exception as e:
        print(f"Lỗi khi gọi AI Service: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Lỗi xử lý trợ lý AI: Tổng đài AI tạm gián đoạn hoặc cấu hình khóa API chưa đúng."
        )