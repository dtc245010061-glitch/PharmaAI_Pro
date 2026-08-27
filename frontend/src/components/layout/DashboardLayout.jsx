import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { 
    Home, 
    ShoppingCart, 
    Package, 
    BookOpen, 
    Users, 
    Bot, 
    LogOut, 
    Menu, 
    X,
    ShieldCheck
} from 'lucide-react';

export default function DashboardLayout({ children }) {
    const { user, logout, isAdmin, isPharmacist } = useAuth();
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const location = useLocation();

    // Danh sách các mục menu tích hợp sẵn kiểm tra phân quyền
    const menuItems = [
        { path: '/', label: 'Tổng quan (Dashboard)', icon: Home, roles: ['admin', 'pharmacist', 'cashier'] },
        { path: '/pos', label: 'Bán hàng (POS)', icon: ShoppingCart, roles: ['admin', 'pharmacist', 'cashier'] },
        { path: '/inventory', label: 'Quản lý Kho & FEFO', icon: Package, roles: ['admin', 'pharmacist'] },
        { path: '/medicines', label: 'Danh mục Thuốc', icon: BookOpen, roles: ['admin', 'pharmacist'] },
        { path: '/users', label: 'Quản lý Nhân sự', icon: Users, roles: ['admin'] },
        { path: '/ai-chat', label: 'Trợ lý AI Thông minh', icon: Bot, roles: ['admin', 'pharmacist', 'cashier'] },
    ];

    // Lọc menu theo quyền thực tế của user
    const filteredMenu = menuItems.filter(item => user && item.roles.includes(user.role));

    return (
        <div className="flex h-screen bg-gray-100 overflow-hidden">
            {/* ================= SIDEBAR ================= */}
            <aside className={`
                fixed inset-y-0 left-0 z-50 w-64 bg-slate-900 text-white transition-transform duration-300 ease-in-out md:static md:translate-x-0
                ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
            `}>
                {/* Brand Logo */}
                <div className="flex items-center justify-between h-16 px-6 bg-slate-950">
                    <div className="flex items-center space-x-2">
                        <ShieldCheck className="w-8 h-8 text-emerald-400" />
                        <span className="text-xl font-bold tracking-wider">PharmaAI Pro</span>
                    </div>
                    <button 
                        onClick={() => setSidebarOpen(false)}
                        className="md:hidden text-gray-400 hover:text-white"
                    >
                        <X className="w-6 h-6" />
                    </button>
                </div>

                {/* Navigation Links */}
                <nav className="p-4 space-y-1.5 overflow-y-auto">
                    {filteredMenu.map((item) => {
                        const Icon = item.icon;
                        const isActive = location.pathname === item.path;
                        return (
                            <Link
                                key={item.path}
                                to={item.path}
                                onClick={() => setSidebarOpen(false)}
                                className={`
                                    flex items-center px-4 py-3 rounded-lg text-sm font-medium transition-colors
                                    ${isActive 
                                        ? 'bg-emerald-600 text-white shadow-md' 
                                        : 'text-gray-300 hover:bg-slate-800 hover:text-white'
                                    }
                                `}
                            >
                                <Icon className="w-5 h-5 mr-3" />
                                {item.label}
                            </Link>
                        );
                    })}
                </nav>

                {/* User Info Footer in Sidebar */}
                <div className="absolute bottom-0 left-0 right-0 p-4 bg-slate-950 border-t border-slate-800">
                    <div className="flex items-center justify-between">
                        <div className="truncate">
                            <p className="text-sm font-semibold text-white truncate">{user?.username || 'Nhân viên'}</p>
                            <p className="text-xs text-emerald-400 uppercase tracking-wider">{user?.role || 'Staff'}</p>
                        </div>
                        <button
                            onClick={logout}
                            title="Đăng xuất"
                            className="p-2 text-gray-400 hover:text-red-400 hover:bg-slate-800 rounded-lg transition-colors"
                        >
                            <LogOut className="w-5 h-5" />
                        </button>
                    </div>
                </div>
            </aside>

            {/* ================= MAIN CONTENT CONTAINER ================= */}
            <div className="flex flex-col flex-1 h-full overflow-hidden">
                {/* Top Navbar */}
                <header className="flex items-center justify-between h-16 px-6 bg-white border-b border-gray-200 shadow-sm z-10">
                    <button
                        onClick={() => setSidebarOpen(true)}
                        className="md:hidden text-gray-600 hover:text-gray-900"
                    >
                        <Menu className="w-6 h-6" />
                    </button>

                    <div className="flex items-center space-x-3">
                        <span className="hidden sm:inline-block text-sm text-gray-600">
                            Hệ thống Quản lý Nhà thuốc chuẩn GPP
                        </span>
                    </div>

                    <div className="flex items-center space-x-4">
                        <div className="text-right">
                            <span className="block text-sm font-bold text-gray-800">{user?.username}</span>
                            <span className="inline-block px-2 py-0.5 text-xs font-semibold bg-emerald-100 text-emerald-800 rounded-full">
                                {user?.role}
                            </span>
                        </div>
                    </div>
                </header>

                {/* Page Dynamic Content */}
                <main className="flex-1 overflow-x-hidden overflow-y-auto bg-gray-50 p-6">
                    {children}
                </main>
            </div>
        </div>
    );
}