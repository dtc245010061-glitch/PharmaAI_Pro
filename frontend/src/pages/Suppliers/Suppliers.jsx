import React, { useState, useEffect } from 'react';
import DashboardLayout from '../layouts/DashboardLayout';
import { Card, Modal } from '../components/common/Modal';
import apiClient from '../services/api';
import { 
    Truck, 
    Plus, 
    Search, 
    Phone, 
    MapPin, 
    Building, 
    Loader2, 
    CheckCircle, 
    ShieldAlert 
} from 'lucide-react';

export default function Suppliers() {
    const [suppliers, setSuppliers] = useState([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [loading, setLoading] = useState(true);

    // Modal Thêm nhà cung cấp
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [formError, setFormError] = useState('');
    const [formSuccess, setFormSuccess] = useState('');

    const [formData, setFormData] = useState({
        name: '',
        contact_person: '',
        phone: '',
        email: '',
        address: ''
    });

    const loadSuppliers = async () => {
        try {
            setLoading(true);
            // Giả định endpoint API backend quản lý suppliers
            const res = await apiClient.get('/suppliers/');
            setSuppliers(res || []);
        } catch (error) {
            console.error("Lỗi tải danh sách nhà cung cấp:", error);
            // Fallback dữ liệu mẫu nếu API chưa cấu hình riêng biệt
            setSuppliers([
                { id: '1', name: 'Công ty Cổ phần Dược Hậu Giang (DHG)', contact_person: 'Nguyễn Văn A', phone: '0901234567', email: 'contact@dhgpharma.com.vn', address: '289 Bis Nguyễn Văn Cừ, Cần Thơ' },
                { id: '2', name: 'Công ty TNHH Dược phẩm Sanofi Việt Nam', contact_person: 'Trần Thị B', phone: '0912345678', email: 'info@sanofi.vn', address: 'Quận 7, TP. Hồ Chí Minh' }
            ]);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadSuppliers();
    }, []);

    const handleOpenCreate = () => {
        setFormData({ name: '', contact_person: '', phone: '', email: '', address: '' });
        setFormError('');
        setFormSuccess('');
        setIsModalOpen(true);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setFormError('');
        setFormSuccess('');

        if (!formData.name || !formData.phone) {
            setFormError('Vui lòng nhập Tên nhà cung cấp và Số điện thoại.');
            return;
        }

        setSubmitting(true);
        try {
            await apiClient.post('/suppliers/', formData);
            setFormSuccess('Thêm nhà cung cấp thành công!');
            loadSuppliers();
            setTimeout(() => {
                setIsModalOpen(false);
                setFormSuccess('');
            }, 1200);
        } catch (error) {
            setFormError(error.detail || 'Lỗi khi lưu nhà cung cấp.');
        } finally {
            setSubmitting(false);
        }
    };

    const filteredSuppliers = suppliers.filter(s => 
        s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        s.phone.includes(searchQuery)
    );

    if (loading && suppliers.length === 0) {
        return (
            <DashboardLayout>
                <div className="flex h-[80vh] items-center justify-center">
                    <div className="flex items-center space-x-2 text-emerald-600">
                        <Loader2 className="w-8 h-8 animate-spin" />
                        <span className="text-lg font-medium">Đang tải danh sách nhà cung cấp...</span>
                    </div>
                </div>
            </DashboardLayout>
        );
    }

    return (
        <DashboardLayout>
            <div className="space-y-6">
                
                {/* Header & Nút Thêm */}
                <div className="flex flex-col md:flex-row md:items-center md:justify-between bg-white p-6 rounded-2xl shadow-sm border border-gray-200">
                    <div>
                        <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
                            Quản lý Nhà cung cấp <Truck className="w-6 h-6 text-emerald-600" />
                        </h1>
                        <p className="text-sm text-slate-500 mt-1">
                            Quản lý đối tác phân phối dược phẩm, thông tin liên lạc và lịch sử nguồn cung.
                        </p>
                    </div>
                    <button
                        onClick={handleOpenCreate}
                        className="mt-4 md:mt-0 flex items-center justify-center space-x-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-xl shadow-lg shadow-emerald-600/20 transition-all"
                    >
                        <Plus className="w-5 h-5" />
                        <span>Thêm Nhà Cung Cấp</span>
                    </button>
                </div>

                {/* Danh sách & Tìm kiếm */}
                <Card title="Danh sách Đối tác Phân phối">
                    <div className="mb-4 flex items-center justify-between">
                        <div className="relative w-full max-w-md">
                            <Search className="absolute left-3.5 top-3 w-4 h-4 text-gray-400" />
                            <input
                                type="text"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                placeholder="Tìm kiếm theo tên nhà cung cấp hoặc số điện thoại..."
                                className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:bg-white focus:border-emerald-500 focus:outline-none transition-colors"
                            />
                        </div>
                    </div>

                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse text-sm">
                            <thead>
                                <tr className="border-b border-gray-200 text-xs text-slate-400 uppercase bg-gray-50">
                                    <th className="py-3 px-4">Tên Nhà Cung Cấp</th>
                                    <th className="py-3 px-4">Người liên hệ</th>
                                    <th className="py-3 px-4">Số điện thoại</th>
                                    <th className="py-3 px-4">Email</th>
                                    <th className="py-3 px-4">Địa chỉ</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {filteredSuppliers.length === 0 ? (
                                    <tr>
                                        <td colSpan="5" className="text-center py-8 text-slate-400">Không tìm thấy nhà cung cấp nào.</td>
                                    </tr>
                                ) : (
                                    filteredSuppliers.map((sup) => (
                                        <tr key={sup.id} className="hover:bg-slate-50 transition-colors">
                                            <td className="py-3.5 px-4 font-bold text-slate-800 flex items-center gap-2">
                                                <Building className="w-4 h-4 text-emerald-600" /> {sup.name}
                                            </td>
                                            <td className="py-3.5 px-4 text-slate-700">{sup.contact_person || 'N/A'}</td>
                                            <td className="py-3.5 px-4 text-slate-600 flex items-center gap-1.5 mt-1">
                                                <Phone className="w-3.5 h-3.5 text-gray-400" /> {sup.phone}
                                            </td>
                                            <td className="py-3.5 px-4 text-slate-600">{sup.email || 'N/A'}</td>
                                            <td className="py-3.5 px-4 text-slate-600 text-xs flex items-center gap-1 mt-1">
                                                <MapPin className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" /> {sup.address || 'N/A'}
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </Card>

                {/* MODAL THÊM NHÀ CUNG CẤP */}
                <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Thêm Nhà Cung Cấp Mới">
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
                        <div>
                            <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">Tên công ty / Nhà cung cấp</label>
                            <input
                                type="text"
                                value={formData.name}
                                onChange={(e) => setFormData({...formData, name: e.target.value})}
                                placeholder="VD: Công ty Dược phẩm Trung ương..."
                                className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:bg-white focus:border-emerald-500 focus:outline-none"
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">Người liên hệ</label>
                                <input
                                    type="text"
                                    value={formData.contact_person}
                                    onChange={(e) => setFormData({...formData, contact_person: e.target.value})}
                                    placeholder="VD: Anh Nam"
                                    className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:bg-white focus:border-emerald-500 focus:outline-none"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">Số điện thoại</label>
                                <input
                                    type="text"
                                    value={formData.phone}
                                    onChange={(e) => setFormData({...formData, phone: e.target.value})}
                                    placeholder="VD: 0988777666"
                                    className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:bg-white focus:border-emerald-500 focus:outline-none"
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">Email liên hệ</label>
                            <input
                                type="email"
                                value={formData.email}
                                onChange={(e) => setFormData({...formData, email: e.target.value})}
                                placeholder="VD: contact@pharma.vn"
                                className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:bg-white focus:border-emerald-500 focus:outline-none"
                            />
                        </div>

                        <div>
                            <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">Địa chỉ văn phòng / Kho</label>
                            <input
                                type="text"
                                value={formData.address}
                                onChange={(e) => setFormData({...formData, address: e.target.value})}
                                placeholder="VD: Thái Nguyên, Việt Nam"
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
                                    <span>Đang lưu thông tin...</span>
                                </>
                            ) : (
                                <span>Xác nhận thêm nhà cung cấp</span>
                            )}
                        </button>
                    </form>
                </Modal>

            </div>
        </DashboardLayout>
    );
}