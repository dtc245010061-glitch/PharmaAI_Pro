import React, { useState, useEffect } from 'react';
import DashboardLayout from '../layouts/DashboardLayout';
import { Card, Modal } from '../components/common/Modal';
import { medicineApi, aiApi } from '../services/api';
import { 
    BookOpen, 
    Plus, 
    Search, 
    Bot, 
    Loader2, 
    CheckCircle, 
    ShieldAlert, 
    Sparkles,
    Edit3
} from 'lucide-react';

export default function Medicines() {
    const [medicines, setMedicines] = useState([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [loading, setLoading] = useState(true);

    // Modal Thêm/Sửa thuốc
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingMedId, setEditingMedId] = useState(null);
    const [submitting, setSubmitting] = useState(false);
    const [formError, setFormError] = useState('');
    const [formSuccess, setFormSuccess] = useState('');

    // Modal AI Tóm tắt thuốc
    const [isAiModalOpen, setIsAiModalOpen] = useState(false);
    const [aiLoading, setAiLoading] = useState(false);
    const [selectedMedForAi, setSelectedMedForAi] = useState(null);
    const [aiSummary, setAiSummary] = useState('');

    // Form fields
    const [formData, setFormData] = useState({
        name: '',
        group: '',
        active_ingredient: '',
        dosage: '',
        unit: '',
        route: '',
        manufacturer: '',
        reg_number: '',
        description: ''
    });

    const loadMedicines = async () => {
        try {
            setLoading(true);
            const res = await medicineApi.getAll(searchQuery);
            setMedicines(res || []);
        } catch (error) {
            console.error("Lỗi tải danh mục thuốc:", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadMedicines();
    }, [searchQuery]);

    // Mở modal thêm mới
    const handleOpenCreate = () => {
        setEditingMedId(null);
        setFormData({
            name: '',
            group: '',
            active_ingredient: '',
            dosage: '',
            unit: '',
            route: '',
            manufacturer: '',
            reg_number: '',
            description: ''
        });
        setFormError('');
        setFormSuccess('');
        setIsModalOpen(true);
    };

    // Mở modal sửa thông tin
    const handleOpenEdit = (med) => {
        setEditingMedId(med.id);
        setFormData({
            name: med.name || '',
            group: med.group || '',
            active_ingredient: med.active_ingredient || '',
            dosage: med.dosage || '',
            unit: med.unit || '',
            route: med.route || '',
            manufacturer: med.manufacturer || '',
            reg_number: med.reg_number || '',
            description: med.description || ''
        });
        setFormError('');
        setFormSuccess('');
        setIsModalOpen(true);
    };

    // Gửi form Thêm / Sửa
    const handleSubmit = async (e) => {
        e.preventDefault();
        setFormError('');
        setFormSuccess('');

        if (!formData.name || !formData.group || !formData.active_ingredient || !formData.dosage || !formData.unit || !formData.route || !formData.manufacturer) {
            setFormError('Vui lòng điền đầy đủ các thông tin bắt buộc.');
            return;
        }

        setSubmitting(true);
        try {
            if (editingMedId) {
                await medicineApi.update(editingMedId, formData);
                setFormSuccess('Cập nhật thông tin thuốc thành công!');
            } else {
                await medicineApi.create(formData);
                setFormSuccess('Thêm mới loại thuốc vào danh mục thành công!');
            }

            loadMedicines();
            setTimeout(() => {
                setIsModalOpen(false);
                setFormSuccess('');
            }, 1200);
        } catch (error) {
            setFormError(error.detail || 'Lỗi khi lưu thông tin thuốc.');
        } finally {
            setSubmitting(false);
        }
    };

    // Mở modal AI tóm tắt thông tin thuốc
    const handleOpenAiSummary = async (med) => {
        setSelectedMedForAi(med);
        setIsAiModalOpen(true);
        setAiLoading(true);
        setAiSummary('');

        try {
            const response = await aiApi.chat(
                `Hãy tóm tắt hướng dẫn sử dụng và công dụng chuẩn của thuốc này.`,
                'medicine',
                med.id
            );
            setAiSummary(response.reply);
        } catch (error) {
            setAiSummary('Không thể kết nối máy chủ AI để lấy tóm tắt.');
        } finally {
            setAiLoading(false);
        }
    };

    if (loading && medicines.length === 0) {
        return (
            <DashboardLayout>
                <div className="flex h-[80vh] items-center justify-center">
                    <div className="flex items-center space-x-2 text-emerald-600">
                        <Loader2 className="w-8 h-8 animate-spin" />
                        <span className="text-lg font-medium">Đang tải danh mục thuốc chuẩn GPP...</span>
                    </div>
                </div>
            </DashboardLayout>
        );
    }

    return (
        <DashboardLayout>
            <div className="space-y-6">
                
                {/* Header & Nút Thêm Thuốc */}
                <div className="flex flex-col md:flex-row md:items-center md:justify-between bg-white p-6 rounded-2xl shadow-sm border border-gray-200">
                    <div>
                        <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
                            Danh mục Thuốc <BookOpen className="w-6 h-6 text-emerald-600" />
                        </h1>
                        <p className="text-sm text-slate-500 mt-1">
                            Quản lý từ điển y khoa, hoạt chất, số đăng ký và tích hợp AI tóm tắt hướng dẫn sử dụng.
                        </p>
                    </div>
                    <button
                        onClick={handleOpenCreate}
                        className="mt-4 md:mt-0 flex items-center justify-center space-x-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-xl shadow-lg shadow-emerald-600/20 transition-all"
                    >
                        <Plus className="w-5 h-5" />
                        <span>Thêm Thuốc Mới</span>
                    </button>
                </div>

                {/* Thanh tìm kiếm & Bảng danh sách */}
                <Card title="Danh sách Thuốc trong Hệ thống">
                    <div className="mb-4 flex items-center justify-between">
                        <div className="relative w-full max-w-md">
                            <Search className="absolute left-3.5 top-3 w-4 h-4 text-gray-400" />
                            <input
                                type="text"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                placeholder="Tra cứu theo tên thương mại hoặc hoạt chất..."
                                className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:bg-white focus:border-emerald-500 focus:outline-none transition-colors"
                            />
                        </div>
                    </div>

                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse text-sm">
                            <thead>
                                <tr className="border-b border-gray-200 text-xs text-slate-400 uppercase bg-gray-50">
                                    <th className="py-3 px-4">Tên thuốc</th>
                                    <th className="py-3 px-4">Hoạt chất chính</th>
                                    <th className="py-3 px-4">Nhóm thuốc</th>
                                    <th className="py-3 px-4">Hàm lượng & ĐVT</th>
                                    <th className="py-3 px-4">Số ĐK (SĐK)</th>
                                    <th className="py-3 px-4 text-right">Thao tác</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {medicines.length === 0 ? (
                                    <tr>
                                        <td colSpan="6" className="text-center py-8 text-slate-400">Không tìm thấy loại thuốc nào.</td>
                                    </tr>
                                ) : (
                                    medicines.map((med) => (
                                        <tr key={med.id} className="hover:bg-slate-50 transition-colors">
                                            <td className="py-3.5 px-4 font-bold text-slate-800">{med.name}</td>
                                            <td className="py-3.5 px-4 text-slate-600">{med.active_ingredient}</td>
                                            <td className="py-3.5 px-4">
                                                <span className="px-2.5 py-1 bg-slate-100 text-slate-700 text-xs font-semibold rounded-full">
                                                    {med.group}
                                                </span>
                                            </td>
                                            <td className="py-3.5 px-4 text-slate-600">{med.dosage} ({med.unit})</td>
                                            <td className="py-3.5 px-4 font-mono text-xs text-slate-500">{med.reg_number || 'N/A'}</td>
                                            <td className="py-3.5 px-4 text-right space-x-2">
                                                <button
                                                    onClick={() => handleOpenAiSummary(med)}
                                                    title="Hỏi AI tóm tắt thông tin thuốc"
                                                    className="inline-flex items-center px-2.5 py-1 bg-indigo-50 text-indigo-600 hover:bg-indigo-100 rounded-lg text-xs font-semibold transition-colors"
                                                >
                                                    <Bot className="w-3.5 h-3.5 mr-1" /> AI Hỏi đáp
                                                </button>
                                                <button
                                                    onClick={() => handleOpenEdit(med)}
                                                    title="Chỉnh sửa thông tin"
                                                    className="inline-flex items-center px-2.5 py-1 bg-slate-100 text-slate-700 hover:bg-slate-200 rounded-lg text-xs font-semibold transition-colors"
                                                >
                                                    <Edit3 className="w-3.5 h-3.5" />
                                                </button>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </Card>

                {/* MODAL THÊM / SỬA THUỐC */}
                <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={editingMedId ? "Cập nhật Thông tin Thuốc" : "Thêm Thuốc Mới Vào Danh Mục"}>
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

                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">Tên thương mại</label>
                                <input
                                    type="text"
                                    value={formData.name}
                                    onChange={(e) => setFormData({...formData, name: e.target.value})}
                                    placeholder="VD: Hapacol 500mg"
                                    className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:bg-white focus:border-emerald-500 focus:outline-none"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">Nhóm thuốc</label>
                                <input
                                    type="text"
                                    value={formData.group}
                                    onChange={(e) => setFormData({...formData, group: e.target.value})}
                                    placeholder="VD: Giảm đau, hạ sốt"
                                    className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:bg-white focus:border-emerald-500 focus:outline-none"
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">Hoạt chất chính</label>
                            <input
                                type="text"
                                value={formData.active_ingredient}
                                onChange={(e) => setFormData({...formData, active_ingredient: e.target.value})}
                                placeholder="VD: Paracetamol"
                                className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:bg-white focus:border-emerald-500 focus:outline-none"
                            />
                        </div>

                        <div className="grid grid-cols-3 gap-3">
                            <div>
                                <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">Hàm lượng</label>
                                <input
                                    type="text"
                                    value={formData.dosage}
                                    onChange={(e) => setFormData({...formData, dosage: e.target.value})}
                                    placeholder="VD: 500mg"
                                    className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:bg-white focus:border-emerald-500 focus:outline-none"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">Đơn vị tính</label>
                                <input
                                    type="text"
                                    value={formData.unit}
                                    onChange={(e) => setFormData({...formData, unit: e.target.value})}
                                    placeholder="VD: Hộp, Viên"
                                    className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:bg-white focus:border-emerald-500 focus:outline-none"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">Đường dùng</label>
                                <input
                                    type="text"
                                    value={formData.route}
                                    onChange={(e) => setFormData({...formData, route: e.target.value})}
                                    placeholder="VD: Uống"
                                    className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:bg-white focus:border-emerald-500 focus:outline-none"
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">Nhà sản xuất</label>
                                <input
                                    type="text"
                                    value={formData.manufacturer}
                                    onChange={(e) => setFormData({...formData, manufacturer: e.target.value})}
                                    placeholder="VD: DHG Pharma"
                                    className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:bg-white focus:border-emerald-500 focus:outline-none"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">Số đăng ký (SĐK)</label>
                                <input
                                    type="text"
                                    value={formData.reg_number}
                                    onChange={(e) => setFormData({...formData, reg_number: e.target.value})}
                                    placeholder="VD: VD-12345-20"
                                    className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:bg-white focus:border-emerald-500 focus:outline-none"
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">Hướng dẫn sử dụng / Mô tả chi tiết (Cho AI đọc)</label>
                            <textarea
                                rows="3"
                                value={formData.description}
                                onChange={(e) => setFormData({...formData, description: e.target.value})}
                                placeholder="Dán văn bản hướng dẫn sử dụng vào đây..."
                                className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:bg-white focus:border-emerald-500 focus:outline-none resize-none"
                            ></textarea>
                        </div>

                        <button
                            type="submit"
                            disabled={submitting}
                            className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl shadow-lg shadow-emerald-600/20 disabled:opacity-50 transition-all flex items-center justify-center space-x-2 mt-4"
                        >
                            {submitting ? (
                                <>
                                    <Loader2 className="w-5 h-5 animate-spin" />
                                    <span>Đang lưu vào CSDL...</span>
                                </>
                            ) : (
                                <span>{editingMedId ? "Cập nhật thông tin" : "Xác nhận thêm thuốc"}</span>
                            )}
                        </button>
                    </form>
                </Modal>

                {/* MODAL AI TÓM TẮT THUỐC */}
                <Modal isOpen={isAiModalOpen} onClose={() => setIsAiModalOpen(false)} title={`Trợ lý AI - Tóm tắt thuốc: ${selectedMedForAi?.name || ''}`}>
                    <div className="space-y-4">
                        <div className="p-4 bg-indigo-50 border border-indigo-100 rounded-xl flex items-start space-x-3">
                            <Sparkles className="w-5 h-5 text-indigo-600 flex-shrink-0 mt-0.5" />
                            <div className="text-xs text-indigo-900">
                                <span className="font-bold">RAG Engine:</span> AI tự động truy xuất cơ sở dữ liệu nội bộ để phân tích thông tin của thuốc <span className="font-semibold">{selectedMedForAi?.name}</span> theo tiêu chuẩn GPP.
                            </div>
                        </div>

                        <div className="p-4 bg-gray-50 border border-gray-200 rounded-xl min-h-[150px] text-sm text-slate-800">
                            {aiLoading ? (
                                <div className="flex flex-col items-center justify-center py-8 space-y-2 text-slate-500">
                                    <Loader2 className="w-6 h-6 animate-spin text-emerald-600" />
                                    <span>AI đang đọc tài liệu và phân tích hướng dẫn sử dụng...</span>
                                </div>
                            ) : (
                                <p className="whitespace-pre-line leading-relaxed">{aiSummary}</p>
                            )}
                        </div>

                        <button
                            onClick={() => setIsAiModalOpen(false)}
                            className="w-full py-2.5 bg-slate-900 hover:bg-slate-800 text-white text-sm font-semibold rounded-xl transition-colors"
                        >
                            Đóng cửa sổ
                        </button>
                    </div>
                </Modal>

            </div>
        </DashboardLayout>
    );
}