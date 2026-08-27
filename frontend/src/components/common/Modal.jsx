import React from 'react';
import { X } from 'lucide-react';

/**
 * Component Modal dùng chung cho toàn bộ hệ thống (Thêm thuốc, Sửa thông tin, Xác nhận thanh toán...)
 */
export function Modal({ isOpen, onClose, title, children }) {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 backdrop-blur-sm p-4 animate-fadeIn">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]">
                
                {/* Modal Header */}
                <div className="flex items-center justify-between px-6 py-4 bg-slate-900 text-white">
                    <h3 className="text-lg font-semibold tracking-wide">{title}</h3>
                    <button
                        onClick={onClose}
                        className="p-1 text-gray-400 hover:text-white rounded-lg transition-colors"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Modal Body (Cho phép cuộn nếu nội dung quá dài) */}
                <div className="p-6 overflow-y-auto flex-1">
                    {children}
                </div>
            </div>
        </div>
    );
}

/**
 * Component Card dùng chung để bao bọc các khối dữ liệu
 */
export function Card({ title, children, className = "", action = null }) {
    return (
        <div className={`bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden ${className}`}>
            {title && (
                <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-gray-50">
                    <h3 className="text-base font-semibold text-gray-800">{title}</h3>
                    {action && <div>{action}</div>}
                </div>
            )}
            <div className="p-6">
                {children}
            </div>
        </div>
    );
}