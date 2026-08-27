import React, { useState, useEffect } from 'react';
import DashboardLayout from '../layouts/DashboardLayout';
import { Card } from '../components/common/Modal';
import { inventoryApi, posApi } from '../services/api';
import { 
    DollarSign, 
    ShoppingCart, 
    PackageAlert, 
    TrendingUp, 
    AlertTriangle, 
    Calendar,
    ShieldCheck,
    Loader2
} from 'lucide-react';

export default function Dashboard() {
    const [loading, setLoading] = useState(true);
    const [expiryAlerts, setExpiryAlerts] = useState([]);
    const [recentInvoices, setRecentInvoices] = useState([]);
    const [stats, setStats] = useState({
        totalRevenue: 0,
        totalOrders: 0,
        lowStockItems: 0,
        nearExpiryCount: 0
    });

    useEffect(() => {
        const fetchDashboardData = async () => {
            try {
                // Lấy cảnh báo cận date trong vòng 30 ngày tới
                const alerts = await inventoryApi.getExpiryAlerts(30);
                setExpiryAlerts(alerts || []);

                // Lấy lịch sử hóa đơn gần đây
                const invoices = await posApi.getHistory();
                setRecentInvoices(invoices ? invoices.slice(0, 5) : []);

                // Tính toán sơ bộ thống kê từ dữ liệu thực tế
                const revenueSum = (invoices || []).reduce((acc, inv) => acc + (inv.final_amount || 0), 0);
                
                setStats({
                    totalRevenue: revenueSum,
                    totalOrders: (invoices || []).length,
                    nearExpiryCount: (alerts || []).length,
                    lowStockItems: (alerts || []).filter(item => item.quantity < 10).length
                });
            } catch (error) {
                console.error("Lỗi tải dữ liệu Dashboard:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchDashboardData();
    }, []);

    if (loading) {
        return (
            <DashboardLayout>
                <div className="flex h-[80vh] items-center justify-center">
                    <div className="flex items-center space-x-2 text-emerald-600">
                        <Loader2 className="w-8 h-8 animate-spin" />
                        <span className="text-lg font-medium">Đang tổng hợp dữ liệu hệ thống...</span>
                    </div>
                </div>
            </DashboardLayout>
        );
    }

    return (
        <DashboardLayout>
            <div className="space-y-6">
                {/* Welcome Header */}
                <div className="flex flex-col md:flex-row md:items-center md:justify-between bg-white p-6 rounded-2xl shadow-sm border border-gray-200">
                    <div>
                        <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
                            Tổng quan Nhà thuốc <ShieldCheck className="w-6 h-6 text-emerald-600" />
                        </h1>
                        <p className="text-sm text-slate-500 mt-1">
                            Hệ thống kiểm soát tồn kho FEFO, doanh thu và cảnh báo hạn sử dụng chuẩn GPP.
                        </p>
                    </div>
                    <div className="mt-4 md:mt-0 flex items-center space-x-2 text-xs text-slate-500 bg-slate-50 px-4 py-2 rounded-xl border border-slate-200">
                        <Calendar className="w-4 h-4 text-emerald-600" />
                        <span>Hôm nay: {new Date().toLocaleDateString('vi-VN')}</span>
                    </div>
                </div>

                {/* KPI Metrics Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                    <Card className="border-l-4 border-l-emerald-500">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-xs font-semibold uppercase text-slate-400 tracking-wider">Tổng doanh thu</p>
                                <h3 className="text-2xl font-bold text-slate-900 mt-1">
                                    {stats.totalRevenue.toLocaleString('vi-VN')} đ
                                </h3>
                            </div>
                            <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl">
                                <DollarSign className="w-6 h-6" />
                            </div>
                        </div>
                    </Card>

                    <Card className="border-l-4 border-l-blue-500">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-xs font-semibold uppercase text-slate-400 tracking-wider">Giao dịch hóa đơn</p>
                                <h3 className="text-2xl font-bold text-slate-900 mt-1">{stats.totalOrders}</h3>
                            </div>
                            <div className="p-3 bg-blue-50 text-blue-600 rounded-xl">
                                <ShoppingCart className="w-6 h-6" />
                            </div>
                        </div>
                    </Card>

                    <Card className="border-l-4 border-l-amber-500">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-xs font-semibold uppercase text-slate-400 tracking-wider">Lô sắp hết hạn</p>
                                <h3 className="text-2xl font-bold text-slate-900 mt-1">{stats.nearExpiryCount}</h3>
                            </div>
                            <div className="p-3 bg-amber-50 text-amber-600 rounded-xl">
                                <AlertTriangle className="w-6 h-6" />
                            </div>
                        </div>
                    </Card>

                    <Card className="border-l-4 border-l-red-500">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-xs font-semibold uppercase text-slate-400 tracking-wider">Cảnh báo tồn kho thấp</p>
                                <h3 className="text-2xl font-bold text-slate-900 mt-1">{stats.lowStockItems}</h3>
                            </div>
                            <div className="p-3 bg-red-50 text-red-600 rounded-xl">
                                <PackageAlert className="w-6 h-6" />
                            </div>
                        </div>
                    </Card>
                </div>

                {/* Main Content Grid: Expiry Alerts & Recent Invoices */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Expiry Alerts (FEFO Warning) */}
                    <Card title="⚠️ Cảnh báo Lô thuốc cận Date (Sắp hết hạn)">
                        {expiryAlerts.length === 0 ? (
                            <p className="text-sm text-slate-500 text-center py-6">Kho hàng an toàn, không có lô thuốc nào sắp hết hạn trong 30 ngày tới.</p>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="w-full text-left border-collapse text-sm">
                                    <thead>
                                        <tr className="border-b border-gray-100 text-xs text-slate-400 uppercase">
                                            <th className="py-2.5 px-3">Số lô</th>
                                            <th className="py-2.5 px-3">Hạn sử dụng</th>
                                            <th className="py-2.5 px-3 text-right">Tồn kho</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100">
                                        {expiryAlerts.slice(0, 5).map((item, index) => (
                                            <tr key={index} className="hover:bg-slate-50">
                                                <td className="py-3 px-3 font-medium text-slate-800">{item.batch_number}</td>
                                                <td className="py-3 px-3 text-red-600 font-semibold">{item.exp_date}</td>
                                                <td className="py-3 px-3 text-right font-bold text-slate-700">{item.quantity}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </Card>

                    {/* Recent Invoices */}
                    <Card title="🧾 Giao dịch Bán hàng Gần đây">
                        {recentInvoices.length === 0 ? (
                            <p className="text-sm text-slate-500 text-center py-6">Chưa có giao dịch bán hàng nào được ghi nhận.</p>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="w-full text-left border-collapse text-sm">
                                    <thead>
                                        <tr className="border-b border-gray-100 text-xs text-slate-400 uppercase">
                                            <th className="py-2.5 px-3">Mã hóa đơn</th>
                                            <th className="py-2.5 px-3">Thu ngân</th>
                                            <th className="py-2.5 px-3 text-right">Tổng tiền</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100">
                                        {recentInvoices.map((inv) => (
                                            <tr key={inv.id} className="hover:bg-slate-50">
                                                <td className="py-3 px-3 font-medium text-emerald-600">{inv.invoice_code}</td>
                                                <td className="py-3 px-3 text-slate-600">{inv.cashier_username}</td>
                                                <td className="py-3 px-3 text-right font-bold text-slate-800">
                                                    {inv.final_amount.toLocaleString('vi-VN')} đ
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </Card>
                </div>
            </div>
        </DashboardLayout>
    );
}
