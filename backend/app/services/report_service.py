from sqlalchemy.orm import Session
from sqlalchemy import func, desc
from datetime import datetime, date
from typing import Dict, Any, List

# Import Models
from app.models.invoice_model import Invoice, InvoiceItem
from app.models.batch_model import Batch
from app.models.medicine_model import Medicine

# ==========================================
# 1. BÁO CÁO DOANH THU & LỢI NHUẬN GỘP
# ==========================================
def get_revenue_report(db: Session, start_date: date, end_date: date) -> Dict[str, Any]:
    """
    Tính toán Tổng doanh thu, Tiền giảm giá, Tiền thuế và Lợi nhuận gộp 
    trong một khoảng thời gian nhất định.
    """
    # Ép kiểu datetime để bao phủ toàn bộ ngày cuối cùng (đến 23:59:59)
    end_datetime = datetime.combine(end_date, datetime.max.time())
    start_datetime = datetime.combine(start_date, datetime.min.time())

    # Tính các chỉ số tổng quan từ bảng Hóa đơn (Invoices)
    summary = db.query(
        func.count(Invoice.id).label("total_orders"),
        func.sum(Invoice.total_goods_amount).label("total_goods"),
        func.sum(Invoice.discount_amount).label("total_discount"),
        func.sum(Invoice.tax_amount).label("total_tax"),
        func.sum(Invoice.final_amount).label("total_revenue")
    ).filter(
        Invoice.created_at >= start_datetime,
        Invoice.created_at <= end_datetime
    ).first()

    # Tính Lợi nhuận gộp (Bằng cách quét bảng Chi tiết hóa đơn và đối chiếu giá nhập từ Kho)
    # Lợi nhuận = Doanh thu bán ra - Giá vốn hàng bán (COGS)
    cogs_query = db.query(
        func.sum(InvoiceItem.quantity * Batch.import_price).label("total_cogs")
    ).join(
        Batch, InvoiceItem.batch_id == Batch.id
    ).join(
        Invoice, InvoiceItem.invoice_id == Invoice.id
    ).filter(
        Invoice.created_at >= start_datetime,
        Invoice.created_at <= end_datetime
    ).first()

    total_revenue = summary.total_revenue or 0.0
    total_cogs = cogs_query.total_cogs or 0.0
    gross_profit = total_revenue - total_cogs

    return {
        "period": f"{start_date} to {end_date}",
        "total_orders": summary.total_orders or 0,
        "financials": {
            "total_goods": summary.total_goods or 0.0,
            "total_discount": summary.total_discount or 0.0,
            "total_tax": summary.total_tax or 0.0,
            "total_revenue": total_revenue,
            "total_cogs": total_cogs,  # Giá vốn hàng bán
            "gross_profit": gross_profit # Lợi nhuận gộp
        }
    }

# ==========================================
# 2. BÁO CÁO TOP THUỐC BÁN CHẠY NHẤT
# ==========================================
def get_top_selling_medicines(db: Session, start_date: date, end_date: date, limit: int = 10) -> List[Dict[str, Any]]:
    """
    Tìm ra Top N loại thuốc có số lượng bán ra nhiều nhất.
    """
    end_datetime = datetime.combine(end_date, datetime.max.time())
    start_datetime = datetime.combine(start_date, datetime.min.time())

    # GROUP BY mã thuốc, tính tổng số lượng (SUM) và sắp xếp giảm dần (DESC)
    top_items = db.query(
        Medicine.id,
        Medicine.name,
        Medicine.unit,
        func.sum(InvoiceItem.quantity).label("total_sold"),
        func.sum(InvoiceItem.subtotal).label("revenue_generated")
    ).join(
        Batch, InvoiceItem.batch_id == Batch.id
    ).join(
        Medicine, Batch.med_id == Medicine.id
    ).join(
        Invoice, InvoiceItem.invoice_id == Invoice.id
    ).filter(
        Invoice.created_at >= start_datetime,
        Invoice.created_at <= end_datetime
    ).group_by(
        Medicine.id, Medicine.name, Medicine.unit
    ).order_by(
        desc("total_sold")
    ).limit(limit).all()

    return [
        {
            "med_id": item.id,
            "name": item.name,
            "unit": item.unit,
            "total_sold": item.total_sold,
            "revenue_generated": item.revenue_generated
        }
        for item in top_items
    ]

# ==========================================
# 3. THỐNG KÊ GIÁ TRỊ TỒN KHO HIỆN TẠI
# ==========================================
def get_inventory_valuation(db: Session) -> Dict[str, Any]:
    """
    Tính tổng giá trị hàng hóa đang nằm trong kho (Vốn đọng lại).
    Chỉ tính các lô hàng còn số lượng > 0 và chưa bị vô hiệu hóa.
    """
    valuation = db.query(
        func.sum(Batch.quantity).label("total_items"),
        func.sum(Batch.quantity * Batch.import_price).label("total_capital_value"),
        func.sum(Batch.quantity * Batch.retail_price).label("total_retail_value")
    ).filter(
        Batch.quantity > 0,
        Batch.is_active == True
    ).first()

    return {
        "total_items_in_stock": valuation.total_items or 0,
        "total_capital_value": valuation.total_capital_value or 0.0,
        "estimated_profit_if_sold_out": (valuation.total_retail_value or 0.0) - (valuation.total_capital_value or 0.0)
    }