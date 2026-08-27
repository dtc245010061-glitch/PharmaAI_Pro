import React, { useState, useEffect } from 'react';
import DashboardLayout from '../layouts/DashboardLayout';
import { Card, Modal } from '../components/common/Modal';
import { inventoryApi, medicineApi } from '../services/api';
import { 
    Package, 
    Plus, 
    AlertTriangle, 
    Calendar, 
    Loader2, 
    CheckCircle, 
    ShieldAlert,
    Search
} from 'lucide-react';

export default function Inventory() {
    const [batches, setBatches] = useState([]);
    const [medicines, setMedicines] = useState([]);
    const [expiryAlerts, setExpiryAlerts] = useState([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [loading, setLoading] = useState(true);
    
    // Modal State cho việc Nhập kho lô mới
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [formError, setFormError] = useState('');
    const [formSuccess, setFormSuccess] = useState('');

    // Form fields nhập kho
    const [formData, setFormData] = useState({
        med_id: '',
        batch_number: '',
        mfg_date: '',
        exp_date: '',
        quantity: '',
        import_price: '',
        retail_price: '',
        supplier_id: ''
    });

    // Tải dữ liệu kho, danh mục thuốc và cảnh báo cận date
    const loadData = async () => {
        try {
            setLoading(true);
            const [batchRes, medRes, alertRes] = await Promise.all([
                inventoryApi.getBatches(),
                medicineApi.getAll(),
                inventoryApi.getExpiryAlerts(60) // Cảnh báo trong 60 ngày tới
            ]);
            setBatches(batchRes || []);
            setMedicines(medRes || []);
            setExpiryAlerts(alertRes || []);
        } catch (error) {
            console.error("Lỗi tải dữ liệu kho:", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadData();
    }, []);

    // Xử lý gửi form nhập lô hàng mới
    const handleImportSubmit = async (e) => {
        e.preventDefault();
        setFormError('');
        setFormSuccess('');

        if (!formData.med_id || !formData.batch_number || !formData.mfg_date || !formData.exp_date || !formData.quantity || !formData.import_price || !formData.retail_price) {
            setFormError('Vui lòng điền đầy đủ các trường bắt buộc.');
            return;
        }

        setSubmitting(true);
        try {
            const payload = {
                med_id: formData.med_id,
                batch_number: formData.batch_number.trim(),
                mfg_date: formData.mfg_date,
                exp_date: formData.exp_date,
                quantity: parseInt(formData.quantity),
                import_price: parseFloat(formData.import_price),
                retail_price: parseFloat(formData.retail_price),
                supplier_id: formData.supplier_id.trim() || null
            };

            await inventoryApi.importBatch(payload);
            setFormSuccess('Nhập kho thành công lô thuốc mới!');
            
            // Reset form và load lại dữ liệu
            setFormData({
                med_id: '',
                batch_number: '',
                mfg_date: '',
                exp_date: '',
                quantity: '',
                import_price: '',
                retail_price: '',
                supplier_id: ''
            });
            
            loadData();
            setTimeout(() => {
                setIsModalOpen(false);
                setFormSuccess('');
            }, 1500);
        } catch (error) {
            setFormError(error.detail || 'Lỗi hệ thống khi nhập kho.');
        } finally {
            setSubmitting(false);
        }
    };

    // Lọc danh sách lô theo từ khóa
    const filteredBatches = batches.filter(b => 
        b.batch_number.toLowerCase().includes(searchQuery.toLowerCase())
    );

    if (loading) {
        return (
            <DashboardLayout>
                <div className="flex h-[80vh] items-center justify-center">
                    <div className="flex items-center space-x-2 text-emerald-600">
                        <Loader2 className="w-8 h-8 animate-spin" />
                        <span className="text-lg font-medium">Đang tải dữ liệu Kho & FEFO...</span>
                    </div>
                </div>
            </DashboardLayout>
        );
    }

    return (
        <DashboardLayout>
            <div className="space-y-6">
                
                {/* Header & Nút Nhập Kho */}
                <div className="flex flex-col md:flex-row md:items-center md:justify-between bg-white p-6 rounded-2xl shadow-sm border border-gray-200">
                    <div>
                        <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
                            Quản lý Kho & FEFO <Package className="w-6 h-6 text-emerald-600" />
                        </h1>
                        <p className="text-sm text-slate-500 mt-1">
                            Kiểm soát hạn sử dụng, thứ tự xuất kho và nhập lô thuốc mới chuẩn GPP.
                        </p>
                    </div>
                    <button
                        onClick={() => setIsModalOpen(true)}
                        className="mt-4 md:mt-0 flex items-center justify-center space-x-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-xl shadow-lg shadow-emerald-600/20 transition-all"
                    >
                        <Plus className="w-5 h-5" />
                        <span>Nhập Lô Thuốc Mới</span>
                    </button>
                </div>

                {/* Cảnh báo cận Date (Expiry Alerts Banner) */}
                {expiryAlerts.length > 0 && (
                    <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex items-start space-x-3">
                        <AlertTriangle className="w-6 h-6 text-amber-600 flex-shrink-0 mt-0.5" />
                        <div>
                            <h3 className="text-sm font-bold text-amber-800">Cảnh báo: Có {expiryAlerts.length} lô thuốc sắp hết hạn trong 60 ngày tới!</h3>
                            <p className="text-xs text-amber-700 mt-0.5">Vui lòng ưu tiên đẩy hàng theo thuật toán FEFO hoặc thực hiện kiểm kê thanh lý.</p>
                        </div>
                    </div>
                )}

                {/* Thanh tìm kiếm & Bảng danh sách lô hàng */}
                <Card title="Danh sách Lô hàng tồn kho">
                    <div className="mb-4 flex items-center justify-between">
                        <div className="relative w-full max-w-md">
                            <Search className="absolute left-3.5 top-3 w-4 h-4 text-gray-400" />
                            <input
                                type="text"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                placeholder="Tìm kiếm theo Số lô (Batch Number)..."
                                className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:bg-white focus:border-emerald-500 focus:outline-none transition-colors"
                            />
                        </div>
                    </div>

                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse text-sm">
                            <thead>
                                <tr className="border-b border-gray-200 text-xs text-slate-400 uppercase bg-gray-50">
                                    <th className="py-3 px-4">Số lô</th>
                                    <th className="py-3 px-4">Mã thuốc ID</th>
                                    <th className="py-3 px-4">Ngày sản xuất</th>
                                    <th className="py-3 px-4">Hạn sử dụng</th>
                                    <th className="py-3 px-4 text-right">Tồn kho</th>
                                    <th className="py-3 px-4 text-right">Giá nhập</th>
                                    <th className="py-3 px-4 text-right">Giá bán lẻ</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {filteredBatches.length === 0 ? (
                                    <tr>
                                        <td colSpan="7" className="text-center py-8 text-slate-400">Không tìm thấy lô hàng nào trong kho.</td>
                                    </tr>
                                ) : (
                                    filteredBatches.map((batch) => {
                                        const isExpiringSoon = new Date(batch.exp_date) <= new Date(Date.now() + 60*24*60*60*1000);
                                        return (
                                            <tr key={batch.id} className="hover:bg-slate-50 transition-colors">
                                                <td className="py-3.5 px-4 font-bold text-slate-800">{batch.batch_number}</td>
                                                <td className="py-3.5 px-4 font-mono text-xs text-slate-500">{batch.med_id.slice(0, 8)}...</td>
                                                <td className="py-3.5 px-4 text-slate-600">{batch.mfg_date}</td>
                                                <td className={`py-3.5 px-4 font-semibold ${isExpiringSoon ? 'text-red-600' : 'text-slate-800'}`}>
                                                    {batch.exp_date} {isExpiringSoon && '⚠️'}
                                                </td>
                                                <td className="py-3.5 px-4 text-right font-bold text-emerald-600">{batch.quantity}</td>
                                                <td className="py-3.5 px-4 text-right text-slate-600">{batch.import_price.toLocaleString('vi-VN')} đ</td>
                                                <td className="py-3.5 px-4 text-right font-semibold text-slate-800">{batch.retail_price.toLocaleString('vi-VN')} đ</td>
                                            </tr>
                                        );
                                    })
                                )}
                            </tbody>
                        </table>
                    </div>
                </Card>

                {/* MODAL NHẬP KHO LÔ MỚI */}
                <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Nhập Lô Thuốc Mới Vào Kho">
                    {formError && (
                        <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl flex items-center gap-2">
                            <ShieldAlert className="w-4 h-4 flex-shrink-0" />
                            <span>{formError}</span>
                        </div>
                    )}
                    {formSuccess && (
                        <div className="mb-4 p-3 bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs rounded-xl flex items-center gap-2">
                            <CheckCircle className="w-4 h-4 flex-shrink-0" />
                            <span>{formSuccess}</span>
                        </div>
                    )}

                    <form onSubmit={handleImportSubmit} className="space-y-4">
                        <div>
                            <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">Chọn loại thuốc</label>
                            <select
                                value={formData.med_id}
                                onChange={(e) => setFormData({...formData, med_id: e.target.value})}
                                className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:bg-white focus:border-emerald-500 focus:outline-none"
                            >
                                <option value="">-- Chọn thuốc trong danh mục --</option>
                                {medicines.map(med => (
                                    <option key={med.id} value={med.id}>{med.name} ({med.unit})</option>
                                ))}
                            </select>
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">Số lô (Batch No.)</label>
                                <input
                                    type="text"
                                    value={formData.batch_number}
                                    onChange={(e) => setFormData({...formData, batch_number: e.target.value})}
                                    placeholder="VD: LOT202608"
                                    className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:bg-white focus:border-emerald-500 focus:outline-none"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">Số lượng nhập</label>
                                <input
                                    type="number"
                                    min="1"
                                    value={formData.quantity}
                                    onChange={(e) => setFormData({...formData, quantity: e.target.value})}
                                    placeholder="VD: 100"
                                    className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:bg-white focus:border-emerald-500 focus:outline-none"
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">Ngày sản xuất (NSX)</label>
                                <input
                                    type="date"
                                    value={formData.mfg_date}
                                    onChange={(e) => setFormData({...formData, mfg_date: e.target.value})}
                                    className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:bg-white focus:border-emerald-500 focus:outline-none"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">Hạn sử dụng (HSD)</label>
                                <input
                                    type="date"
                                    value={formData.exp_date}
                                    onChange={(e) => setFormData({...formData, exp_date: e.target.value})}
                                    className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:bg-white focus:border-emerald-500 focus:outline-none"
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">Giá nhập (VNĐ)</label>
                                <input
                                    type="number"
                                    step="100"
                                    value={formData.import_price}
                                    onChange={(e) => setFormData({...formData, import_price: e.target.value})}
                                    placeholder="VD: 15000"
                                    className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:bg-white focus:border-emerald-500 focus:outline-none"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">Giá bán lẻ (VNĐ)</label>
                                <input
                                    type="number"
                                    step="100"
                                    value={formData.retail_price}
                                    onChange={(e) => setFormData({...formData, retail_price: e.target.value})}
                                    placeholder="VD: 20000"
                                    className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:bg-white focus:border-emerald-500 focus:outline-none"
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">Mã nhà cung cấp (Tùy chọn)</label>
                            <input
                                type="text"
                                value={formData.supplier_id}
                                onChange={(e) => setFormData({...formData, supplier_id: e.target.value})}
                                placeholder="VD: NCC-DHG"
                                className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:bg-white focus:border-emerald-500 focus:outline-none"
                            />
                        </div>

                        <button
                            type="submit"
                            disabled={submitting}
                            className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl shadow-lg shadow-emerald-600/20 disabled:opacity-50 transition-all flex items-center justify-center space-x-2 mt-4"
                        >
                            {submitting ? (
                                <>
                                    <Loader2 className="w-5 h-5 animate-spin" />
                                    <span>Đang ghi nhận vào CSDL...</span>
                                </>
                            ) : (
                                <span>Xác nhận nhập kho</span>
                            )}
                        </button>
                    </form>
                </Modal>

            </div>
        </DashboardLayout>
    );
}