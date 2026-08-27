import React, { useState, useRef, useEffect } from 'react';
import { Send, Bot, User, ShieldAlert, Sparkles, Loader2, HelpCircle } from 'lucide-react';
import { aiApi } from '../../services/api';

export default function AIChatWidget({ selectedMedicineId = null }) {
    const [messages, setMessages] = useState([
        {
            sender: 'ai',
            text: 'Xin chào! Tôi là Trợ lý AI của PharmaAI Pro. Tôi có thể hỗ trợ gì cho bạn về thông tin thuốc hoặc quy trình nhà thuốc (SOP)?',
            isSafe: true,
            disclaimer: 'Hệ thống hỗ trợ nội bộ chuẩn GPP.',
            source: 'System'
        }
    ]);
    const [inputQuery, setInputQuery] = useState('');
    const [contextType, setContextType] = useState(selectedMedicineId ? 'medicine' : 'sop');
    const [loading, setLoading] = useState(false);
    
    const messagesEndRef = useRef(null);

    // Tự động cuộn xuống tin nhắn mới nhất
    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages, loading]);

    const handleSendMessage = async (e) => {
        e.preventDefault();
        if (!inputQuery.trim() || loading) return;

        const userQuestion = inputQuery;
        setInputQuery('');

        // Thêm câu hỏi của user vào danh sách hiển thị
        setMessages(prev => [...prev, { sender: 'user', text: userQuestion }]);
        setLoading(true);

        try {
            // Gọi API backend ai_service
            const response = await aiApi.chat(userQuestion, contextType, selectedMedicineId);
            
            setMessages(prev => [...prev, {
                sender: 'ai',
                text: response.reply,
                isSafe: response.is_safe,
                disclaimer: response.disclaimer,
                source: response.source
            }]);
        } catch (error) {
            setMessages(prev => [...prev, {
                sender: 'ai',
                text: 'Xin lỗi, máy chủ AI đang gặp sự cố kết nối. Vui lòng thử lại sau.',
                isSafe: false,
                disclaimer: 'Lỗi kết nối',
                source: 'Error'
            }]);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="flex flex-col h-[650px] bg-white rounded-xl shadow-md border border-gray-200 overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 bg-slate-900 text-white">
                <div className="flex items-center space-x-3">
                    <div className="p-2 bg-emerald-600 rounded-lg">
                        <Bot className="w-6 h-6 text-white" />
                    </div>
                    <div>
                        <h3 className="font-bold text-base flex items-center gap-1.5">
                            PharmaAI Assistant <Sparkles className="w-4 h-4 text-amber-400" />
                        </h3>
                        <p className="text-xs text-gray-400">Tích hợp RAG Database & Guardrails GPP</p>
                    </div>
                </div>

                {/* Context Selector */}
                <div className="flex items-center space-x-2">
                    <span className="text-xs text-gray-300 hidden sm:inline">Ngữ cảnh:</span>
                    <select
                        value={contextType}
                        onChange={(e) => setContextType(e.target.value)}
                        className="bg-slate-800 text-white text-xs px-3 py-1.5 rounded-lg border border-slate-700 focus:outline-none focus:border-emerald-500"
                    >
                        <option value="sop">Quy trình Kho (SOP)</option>
                        <option value="medicine">Danh mục Thuốc</option>
                    </select>
                </div>
            </div>

            {/* Message Area */}
            <div className="flex-1 p-6 overflow-y-auto space-y-4 bg-gray-50">
                {messages.map((msg, index) => (
                    <div 
                        key={index} 
                        className={`flex items-start space-x-3 ${msg.sender === 'user' ? 'flex-row-reverse space-x-reverse' : ''}`}
                    >
                        <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${msg.sender === 'user' ? 'bg-blue-600 text-white' : 'bg-emerald-600 text-white'}`}>
                            {msg.sender === 'user' ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
                        </div>
                        
                        <div className={`max-w-[75%] rounded-2xl px-4 py-3 text-sm shadow-sm ${
                            msg.sender === 'user' 
                                ? 'bg-blue-600 text-white rounded-tr-none' 
                                : msg.isSafe === false
                                    ? 'bg-red-50 border border-red-200 text-red-900 rounded-tl-none'
                                    : 'bg-white border border-gray-200 text-gray-800 rounded-tl-none'
                        }`}>
                            {msg.isSafe === false && (
                                <div className="flex items-center space-x-1 text-red-600 font-semibold mb-1 text-xs">
                                    <ShieldAlert className="w-4 h-4" />
                                    <span>CẢNH BÁO AN TOÀN Y KHOA</span>
                                </div>
                            )}
                            
                            <p className="whitespace-pre-line leading-relaxed">{msg.text}</p>
                            
                            {msg.disclaimer && (
                                <p className="mt-2 pt-2 border-t border-gray-100 text-[10px] text-gray-400 italic">
                                    {msg.disclaimer} • Nguồn: {msg.source}
                                </p>
                            )}
                        </div>
                    </div>
                ))}

                {loading && (
                    <div className="flex items-center space-x-3">
                        <div className="w-8 h-8 rounded-full bg-emerald-600 text-white flex items-center justify-center">
                            <Bot className="w-4 h-4" />
                        </div>
                        <div className="bg-white border border-gray-200 px-4 py-3 rounded-2xl rounded-tl-none shadow-sm flex items-center space-x-2 text-gray-500 text-sm">
                            <Loader2 className="w-4 h-4 animate-spin text-emerald-600" />
                            <span>AI đang tra cứu cơ sở dữ liệu nhà thuốc...</span>
                        </div>
                    </div>
                )}
                <div ref={messagesEndRef} />
            </div>

            {/* Input Form */}
            <form onSubmit={handleSendMessage} className="p-4 bg-white border-t border-gray-200 flex items-center space-x-2">
                <input
                    type="text"
                    value={inputQuery}
                    onChange={(e) => setInputQuery(e.target.value)}
                    placeholder="Nhập câu hỏi về thuốc, quy trình kho hoặc tra cứu hướng dẫn..."
                    className="flex-1 px-4 py-2.5 text-sm bg-gray-100 border border-transparent rounded-xl focus:bg-white focus:border-emerald-500 focus:outline-none transition-colors"
                />
                <button
                    type="submit"
                    disabled={loading || !inputQuery.trim()}
                    className="p-2.5 bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                    <Send className="w-5 h-5" />
                </button>
            </form>
        </div>
    );
}