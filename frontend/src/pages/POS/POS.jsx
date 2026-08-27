import React, { useState, useEffect } from 'react';
import DashboardLayout from '../layouts/DashboardLayout';
import { Card } from '../components/common/Modal';
import { medicineApi, inventoryApi, posApi } from '../services/api';
import { 
    ShoppingCart, 
    Search, 
    Plus, 
    Trash2, 
    CheckCircle, 
    AlertTriangle, 
    Loader2,
    DollarSign,
    User,
    Phone
} from 'lucide-react';

export default function POS() {
    const [medicines, setMedicines] = useState([]);
    const [batches, setBatches] = useState([]);
    const [selectedMedBatches, setSelectedMedBatches] = useState([]);
    const [searchQuery, setSearchQuery] = useState('');
    
    // Giỏ hàng (Cart) lưu danh sách các batch_id, số lượng, tên thuốc và giá
    const [cart, setCart] = useState([]);
    
    // Thông tin khách hàng & thanh toán
    const [customerName, setCustomerName] = useState('');
    const [customerPhone, setCustomerPhone] = useState('');
    const [discount, setDiscount] = useState(0);
    const [taxRate, setTaxRate] = useState(0.08); // Mặc định VAT 8%
    
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [successMessage, setSuccessMessage] = useState('');
    const [errorMessage, setErrorMessage] = useState('');

    // Tải danh mục thuốc và toàn bộ lô hàng khi mở trang
    useEffect(() => {
        const loadInitialData = async () => {
            try {
                const [medRes, batchRes] = await Promise.all([
                    medicineApi.getAll(),
                    inventoryApi.getBatches()
                ]);
                setMedicines(medRes || []);
                setBatches(batchRes || []);
            } catch (error) {
                console.error("Lỗi tải dữ liệu POS:", error);
                setErrorMessage("Không thể kết nối cơ sở dữ liệu kho thuốc.");
            } finally {
                setLoading(false);
            }
        };
        loadInitialData();
    }, []);

    // Lọc danh sách thuốc theo từ khóa tìm kiếm
    const filteredMedicines = medicines.filter(med => 
        med.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        med.active_ingredient.toLowerCase().includes(searchQuery.toLowerCase())
    );

    // Khi chọn một loại thuốc, tự động lọc ra các lô hàng còn tồn kho của thuốc đó
    const handleSelectMedicine = (medId) => {
        const validBatches = batches.filter(b => b.med_id === medId && b.quantity > 0);
        setSelectedMedBatches(validBatches);
    };

    // Thêm lô thuốc vào giỏ hàng (Áp dụng FEFO: Gợi ý hoặc chọn trực tiếp lô cận date)
    const handleAddToCart = (batch) => {
        const medicineInfo = medicines.find(m => m.id === batch.med_id);
        const medName = medicineInfo ? medicineInfo.name : 'Thuốc';

        setCart(prevCart => {
            const existingIndex = prevCart.findIndex(item => item.batch_id === batch.id);
            if (existingIndex > -1) {
                // Nếu lô này đã có trong giỏ -> Tăng số lượng lên 1
                const updated = [...prevCart];
                if (updated[existingIndex].quantity < batch.quantity) {
                    updated[existingIndex].quantity += 1;
                }
                return updated;
            } else {
                // Thêm mới vào giỏ
                return [...prevCart, {
                    batch_id: batch.id,
                    med_name: medName,
                    batch_number: batch.batch_number,
                    exp_date: batch.exp_date,
                    unit_price: batch.retail_price,
                    max_stock: batch.quantity,
                    quantity: 1
                }];
            }
        });
    };

    // Thay đổi số lượng mua trực tiếp trong giỏ hàng
    const handleQuantityChange = (batchId, newQty) => {
        const qty = parseInt(newQty) || 0;
        setCart(prevCart => prevCart.map(item => {
            if (item.batch_id === batchId) {
                const validQty = Math.min(Math.max(1, qty), item.max_stock);
                return { ...item, quantity: validQty };
            }
            return item;
        }));
    };

    // Xóa một món ra khỏi giỏ hàng
    const handleRemoveItem = (batchId) => {
        setCart(prev => prev.filter(item => item.batch_id !== batchId));
    };

    // Tính toán tài chính giỏ hàng
    const totalGoodsAmount = cart.reduce((sum, item) => sum + (item.unit_price * item.quantity), 0);
    const taxableAmount = Math.max(0, totalGoodsAmount - discount);
    const taxAmount = taxableAmount * taxRate;
    const finalAmount = taxableAmount + taxAmount;

    // Thanh toán hóa đơn (Gửi lên Backend POS API)
    const handleCheckout = async () => {
        if (cart.length === 0) return;

        setSubmitting(true);
        setErrorMessage('');
        setSuccessMessage('');

        try {
            const payload = {
                items: cart.map(item => ({
                    batch_id: item.batch_id,
                    quantity: item.quantity
                })),
                customer_name: customerName.trim() || null,
                customer_phone: customerPhone.trim() || null,
                discount: parseFloat(discount) || 0.0,
                tax_rate: parseFloat(taxRate) || 0.08
            };

            const response = await posApi.checkout(payload);
            setSuccessMessage(`Thanh toán thành công! Mã hóa đơn: ${response.invoice_code}`);
            
            // Reset giỏ hàng và form sau khi thành công
            setCart([]);
            setCustomerName('');
            setCustomerPhone('');
            setDiscount(0);

            // Cập nhật lại tồn kho local
            const batchRes = await inventoryApi.getBatches();
            setBatches(batchRes || []);
            setSelectedMedBatches([]);
        } catch (error) {
            setErrorMessage(error.detail || "Lỗi thanh toán. Vui lòng kiểm tra lại tồn kho.");
        } finally {
            setSubmitting(false);
        }
    };

    if (loading) {
        return (
            <DashboardLayout>
                <div className="flex h-[80vh] items-center justify-center">
                    <div className="flex items-center space-x-2 text-emerald-600">
                        <Loader2 className="w-8 h-8 animate-spin" />
                        <span className="text-lg font-medium">Đang khởi tạo hệ thống POS...</span>
                    </div>
                </div>
            </DashboardLayout>
        );
    }

    return (
        <DashboardLayout>
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 h-[calc(100vh-7rem)]">
                
                {/* ================= CỘT TRÁI: DANH MỤC THUỐC & LÔ KHO (FEFO) ================= */}
                <div className="lg:col-span-7 flex flex-col space-y-4 overflow-hidden">
                    
                    {/* Thanh tìm kiếm */}
                    <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200 flex items-center space-x-3">
                        <Search className="w-5 h-5 text-gray-400" />
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder="Tra cứu tên thuốc hoặc hoạt chất..."
                            className="w-full text-sm focus:outline-none"
                        />
                    </div>

                    {/* Danh sách thuốc */}
                    <Card title="Danh mục Thuốc" className="flex-1 overflow-y-auto">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            {filteredMedicines.map(med => (
                                <div
                                    key={med.id}
                                    onClick={() => handleSelectMedicine(med.id)}
                                    className="p-3.5 bg-gray-50 hover:bg-emerald-50 border border-gray-200 hover:border-emerald-300 rounded-xl cursor-pointer transition-all"
                                >
                                    <h4 className="font-bold text-sm text-slate-800">{med.name}</h4>
                                    <p className="text-xs text-slate-500 mt-0.5">Hoạt chất: {med.active_ingredient}</p>
                                    <div className="flex items-center justify-between mt-2">
                                        <span className="text-[11px] px-2 py-0.5 bg-slate-200 text-slate-700 rounded font-medium">{med.group}</span>
                                        <span className="text-xs text-emerald-600 font-semibold">Chọn xem lô »</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </Card>

                    {/* Danh sách Lô kho (FEFO Selection) */}
                    <Card title="Lô hàng Khả dụng (FEFO - Ưu tiên HSD gần nhất)" className="h-48 overflow-y-auto">
                        {selectedMedBatches.length === 0 ? (
                            <p className="text-xs text-slate-400 text-center py-6">Vui lòng chọn một loại thuốc ở trên để hiển thị các lô tồn kho.</p>
                        ) : (
                            <div className="space-y-2">
                                {selectedMedBatches.map(batch => (
                                    <div key={batch.id} className="flex items-center justify-between p-2.5 bg-slate-50 border border-gray-200 rounded-lg text-xs">
                                        <div>
                                            <span className="font-bold text-slate-800">Số lô: {batch.batch_number}</span>
                                            <span className="ml-3 text-red-600 font-semibold">HSD: {batch.exp_date}</span>
                                            <span className="ml-3 text-slate-600">Tồn: {batch.quantity}</span>
                                        </div>
                                        <div className="flex items-center space-x-3">
                                            <span className="font-bold text-emerald-600">{batch.retail_price.toLocaleString('vi-VN')} đ</span>
                                            <button
                                                onClick={() => handleAddToCart(batch)}
                                                className="px-3 py-1.5 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 flex items-center gap-1 font-medium"
                                            >
                                                <Plus className="w-3.5 h-3.5" /> Thêm
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </Card>
                </div>

                {/* ================= CỘT PHẢI: GIỎ HÀNG & THANH TOÁN ================= */}
                <div className="lg:col-span-5 flex flex-col bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                    
                    {/* Header giỏ hàng */}
                    <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between">
                        <h3 className="font-bold text-base flex items-center gap-2">
                            <ShoppingCart className="w-5 h-5 text-emerald-400" /> Giỏ hàng POS
                        </h3>
                        <span className="text-xs px-2.5 py-1 bg-emerald-600 text-white rounded-full font-semibold">
                            {cart.length} món
                        </span>
                    </div>

                    {/* Thông báo lỗi / Thành công */}
                    {errorMessage && (
                        <div className="m-4 mb-0 p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl flex items-center gap-2">
                            <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                            <span>{errorMessage}</span>
                        </div>
                    )}
                    {successMessage && (
                        <div className="m-4 mb-0 p-3 bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs rounded-xl flex items-center gap-2">
                            <CheckCircle className="w-4 h-4 flex-shrink-0" />
                            <span>{successMessage}</span>
                        </div>
                    )}

                    {/* Danh sách sản phẩm trong giỏ */}
                    <div className="flex-1 p-4 overflow-y-auto space-y-3">
                        {cart.length === 0 ? (
                            <div className="flex flex-col items-center justify-center h-full text-gray-400 space-y-2">
                                <ShoppingCart className="w-12 h-12 stroke-1" />
                                <p className="text-sm">Chưa có sản phẩm nào trong giỏ hàng.</p>
                            </div>
                        ) : (
                            cart.map(item => (
                                <div key={item.batch_id} className="p-3 bg-gray-50 border border-gray-200 rounded-xl space-y-2">
                                    <div className="flex items-center justify-between">
                                        <h4 className="font-bold text-sm text-slate-800">{item.med_name}</h4>
                                        <button onClick={() => handleRemoveItem(item.batch_id)} className="text-gray-400 hover:text-red-500">
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </div>
                                    <div className="flex items-center justify-between text-xs text-slate-500">
                                        <span>Lô: {item.batch_number} (HSD: {item.exp_date})</span>
                                        <span className="font-bold text-slate-700">{item.unit_price.toLocaleString('vi-VN')} đ</span>
                                    </div>
                                    <div className="flex items-center justify-between pt-1">
                                        <span className="text-xs font-medium text-slate-600">Số lượng:</span>
                                        <div className="flex items-center space-x-2">
                                            <input
                                                type="number"
                                                min="1"
                                                max={item.max_stock}
                                                value={item.quantity}
                                                onChange={(e) => handleQuantityChange(item.batch_id, e.target.value)}
                                                className="w-16 px-2 py-1 bg-white border border-gray-300 rounded-lg text-center text-xs font-bold"
                                            />
                                            <span className="text-xs font-bold text-emerald-600">
                                                {(item.unit_price * item.quantity).toLocaleString('vi-VN')} đ
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>

                    {/* Khung nhập thông tin khách hàng & Tổng tiền */}
                    <div className="p-4 bg-gray-50 border-t border-gray-200 space-y-3">
                        <div className="grid grid-cols-2 gap-2">
                            <div className="relative">
                                <User className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
                                <input
                                    type="text"
                                    value={customerName}
                                    onChange={(e) => setCustomerName(e.target.value)}
                                    placeholder="Tên khách hàng"
                                    className="w-full pl-9 pr-3 py-2 bg-white border border-gray-200 rounded-lg text-xs focus:outline-none focus:border-emerald-500"
                                />
                            </div>
                            <div className="relative">
                                <Phone className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
                                <input
                                    type="text"
                                    value={customerPhone}
                                    onChange={(e) => setCustomerPhone(e.target.value)}
                                    placeholder="Số điện thoại"
                                    className="w-full pl-9 pr-3 py-2 bg-white border border-gray-200 rounded-lg text-xs focus:outline-none focus:border-emerald-500"
                                />
                            </div>
                        </div>

                        {/* Bảng tính tiền chi tiết */}
                        <div className="space-y-1.5 text-xs pt-2 border-t border-gray-200">
                            <div className="flex justify-between text-slate-600">
                                <span>Tổng tiền hàng:</span>
                                <span className="font-semibold">{totalGoodsAmount.toLocaleString('vi-VN')} đ</span>
                            </div>
                            <div className="flex justify-between items-center text-slate-600">
                                <span>Chiết khấu (VND):</span>
                                <input
                                    type="number"
                                    value={discount}
                                    onChange={(e) => setDiscount(Math.max(0, parseFloat(e.target.value) || 0))}
                                    className="w-24 px-2 py-1 bg-white border border-gray-200 rounded text-right text-xs"
                                />
                            </div>
                            <div className="flex justify-between text-slate-600">
                                <span>Thuế VAT (8%):</span>
                                <span className="font-semibold">{taxAmount.toLocaleString('vi-VN')} đ</span>
                            </div>
                            <div className="flex justify-between text-base font-bold text-slate-900 pt-2 border-t border-gray-300">
                                <span>Khách cần trả:</span>
                                <span className="text-emerald-600">{finalAmount.toLocaleString('vi-VN')} đ</span>
                            </div>
                        </div>

                        {/* Nút thanh toán */}
                        <button
                            onClick={handleCheckout}
                            disabled={cart.length === 0 || submitting}
                            className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl shadow-lg shadow-emerald-600/20 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center space-x-2"
                        >
                            {submitting ? (
                                <>
                                    <Loader2 className="w-5 h-5 animate-spin" />
                                    <span>Đang xử lý giao dịch...</span>
                                </>
                            ) : (
                                <>
                                    <DollarSign className="w-5 h-5" />
                                    <span>Thanh toán & In hóa đơn</span>
                                </>
                            )}
                        </button>
                    </div>

                </div>
            </div>
        </DashboardLayout>
    );
}