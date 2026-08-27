from sqlalchemy.orm import Session
from fastapi import HTTPException, status
from datetime import date
from typing import List, Dict

# Import Models để tương tác với Cơ sở dữ liệu thật
from app.models.batch_model import Batch
from app.models.medicine_model import Medicine

def process_fefo_deduction(db: Session, med_id: str, required_quantity: int) -> List[Dict]:
    """
    Thuật toán Lõi: FEFO (First-Expire-First-Out) - Tối ưu hóa tồn kho nhà thuốc.
    
    Nhiệm vụ:
    1. Quét toàn bộ kho tìm các lô thuốc hợp lệ (còn hàng, chưa hết hạn).
    2. Tự động chia nhỏ số lượng khách mua để trừ vào các lô cận Date nhất.
    3. Trả về "Kế hoạch trừ kho" để hệ thống POS xuất hóa đơn.
    
    Ví dụ: Khách mua 10 vỉ. 
    Lô cận date A còn 3 vỉ -> Lấy 3 vỉ. 
    Lô date xa B còn 20 vỉ -> Lấy 7 vỉ.
    """
    
    if required_quantity <= 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, 
            detail="Số lượng xuất kho phải lớn hơn 0."
        )

    # ==========================================
    # BƯỚC 1: LỌC & SẮP XẾP ƯU TIÊN (FEFO)
    # ==========================================
    # Truy vấn DB: Chỉ lấy lô còn tồn kho, chưa hết HSD và đang được kinh doanh.
    # ORDER BY exp_date ASC: Lệnh sống còn để đưa lô cận date nhất lên đầu danh sách.
    available_batches = db.query(Batch).filter(
        Batch.med_id == med_id,
        Batch.quantity > 0,
        Batch.exp_date > date.today(),
        Batch.is_active == True
    ).order_by(Batch.exp_date.asc()).all()

    # Tính tổng tồn kho khả dụng của tất cả các lô hợp lệ
    total_available = sum(batch.quantity for batch in available_batches)
    
    if total_available < required_quantity:
        # Lấy thêm tên thuốc để báo lỗi cho thân thiện
        medicine = db.query(Medicine).filter(Medicine.id == med_id).first()
        med_name = medicine.name if medicine else med_id
        
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Tồn kho không đủ bán! '{med_name}' chỉ còn {total_available} đơn vị hợp lệ (đã tự động loại bỏ hàng hết hạn)."
        )

    # ==========================================
    # BƯỚC 2: THỰC THI THUẬT TOÁN KHẤU TRỪ
    # ==========================================
    remaining_to_deduct = required_quantity
    deduction_plan = []

    for batch in available_batches:
        if remaining_to_deduct == 0:
            break # Đã lấy đủ hàng, thoát vòng lặp

        # Lấy số lượng tối đa có thể từ lô hiện tại
        # (Nếu lô có 5, cần 10 -> Lấy 5. Nếu lô có 20, cần 10 -> Lấy 10)
        deduct_amount = min(batch.quantity, remaining_to_deduct)
        
        # Trừ trực tiếp vào Object Database
        batch.quantity -= deduct_amount
        remaining_to_deduct -= deduct_amount

        # Lưu lại nhật ký để hệ thống POS biết đã lấy bao nhiêu từ lô nào
        deduction_plan.append({
            "batch_id": batch.id,
            "med_id": batch.med_id,
            "deducted_quantity": deduct_amount,
            "unit_price": batch.retail_price, # Lấy đúng giá của lô đó, tránh bán sai giá
            "subtotal": deduct_amount * batch.retail_price
        })

    # LƯU Ý BẢO MẬT GIAO DỊCH (ATOMIC TRANSACTION):
    # Chúng ta KHÔNG gọi db.commit() ở đây.
    # Việc lưu xuống DB phải được thực hiện ở file pos.py (Controller),
    # sau khi Hóa đơn (Invoice) đã được tạo thành công, để nếu có lỗi thì db.rollback() toàn bộ.

    return deduction_plan