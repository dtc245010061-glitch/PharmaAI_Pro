import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';
import './index.css'; // Import CSS toàn cục (Tailwind directives và custom animations)

// Khởi tạo gốc (Root) của ứng dụng React và gắn vào thẻ <div id="root"> trong file index.html
ReactDOM.createRoot(document.getElementById('root')).render(
    <React.StrictMode>
        <App />
    </React.StrictMode>
);