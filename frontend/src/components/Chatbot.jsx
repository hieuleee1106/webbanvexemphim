import React, { useState, useRef, useEffect } from 'react';
import { io } from 'socket.io-client';
import { useAuth } from '../contexts/AuthContext';

const Chatbot = () => {
  const { user, notify } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [isLiveChat, setIsLiveChat] = useState(() => {
    return localStorage.getItem('cinema-live-chat') === 'true';
  });
  const [messages, setMessages] = useState([
    { role: 'model', text: 'Xin chào! Tôi là trợ lý CinemaDB. Bạn cần tôi tư vấn phim gì không?' }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [socket, setSocket] = useState(null);
  const [unreadCount, setUnreadCount] = useState(0);
  const scrollRef = useRef(null);
  const isOpenRef = useRef(isOpen);

  useEffect(() => {
    localStorage.setItem('cinema-live-chat', isLiveChat);
  }, [isLiveChat]);

  useEffect(() => {
    isOpenRef.current = isOpen;
    if (isOpen) setUnreadCount(0); // Reset khi mở khung chat
  }, [isOpen]);

  // Reset chatbot về trạng thái mới mỗi khi thông tin User thay đổi (Đăng nhập/Đăng xuất)
  useEffect(() => {
    setMessages([
      { role: 'model', text: 'Xin chào! Tôi là trợ lý CinemaDB. Bạn cần tôi tư vấn phim gì không?' }
    ]);
    setIsLiveChat(false);
    setUnreadCount(0);
    // Không gọi API lấy lịch sử cũ nữa để đảm bảo mỗi phiên đăng nhập là mới hoàn toàn
  }, [user]);

  useEffect(() => {
    if (isOpen && scrollRef.current) {
      // Sử dụng requestAnimationFrame để đảm bảo việc cuộn diễn ra sau khi DOM đã được vẽ lại hoàn toàn
      requestAnimationFrame(() => {
        if (scrollRef.current) {
          scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
      });
    }
  }, [messages, isOpen, isLiveChat]);

  // Kết nối Socket khi chuyển sang Live Chat
  useEffect(() => {
    if (isLiveChat && user) {
      const newSocket = io("http://localhost:3000");
      setSocket(newSocket);

      newSocket.emit("join_chat", user.UserID);

      newSocket.on("receive_message", (msg) => {
        // Chỉ nhận tin nhắn từ người khác (Nhân viên) để tránh lặp tin nhắn của chính mình
        if (msg.isAdmin && msg.senderName !== (user.FullName || user.Username)) {
          setMessages(prev => [...prev, { 
            role: 'staff', 
            text: msg.text, 
            senderName: msg.senderName 
          }]);
          // Nếu đang đóng khung chat thì tăng số tin chưa đọc
          if (!isOpenRef.current) {
            setUnreadCount(prev => prev + 1);
          }
        }
      });

      return () => newSocket.disconnect();
    }
  }, [isLiveChat, user]);

  const handleSwitchToLive = () => {
    if (!user) return notify.warning("Vui lòng đăng nhập để chat với nhân viên");
    setIsLiveChat(true);
  };

  const handleSwitchToAI = () => {
    setIsLiveChat(false);
  };

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMsg = input;
    setMessages(prev => [...prev, { role: 'user', text: userMsg }]);
    setInput('');

    if (isLiveChat) {
      socket.emit("send_message", {
        userId: user.UserID,
        text: userMsg,
        senderName: user.FullName || user.Username,
        isAdmin: false,
        avatar: user.Avatar
      });
      return;
    }

    setIsLoading(true);

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('cinema-token')}`
        },
        body: JSON.stringify({ 
          message: userMsg,
          history: messages.map(m => ({ role: m.role === 'staff' ? 'model' : m.role, parts: [{ text: m.text }] }))
        })
      });
      const data = await res.json();
      if (data.success) {
        setMessages(prev => [...prev, { role: 'model', text: data.reply }]);
      }
    } catch (error) {
      setMessages(prev => [...prev, { role: 'model', text: 'Xin lỗi, tôi gặp sự cố kết nối.' }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed bottom-6 right-6 z-[9999] flex flex-col items-end">
      {/* Chat Window */}
      {isOpen && (
        <div className="w-80 md:w-96 h-[450px] bg-white dark:bg-gray-800 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-700 flex flex-col mb-4 animate-fade-in-up">
          <div className="p-4 bg-red-600 text-white rounded-t-2xl flex justify-between items-center">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
              <span className="font-bold">{isLiveChat ? 'Chat với Nhân Viên' : 'Hỗ trợ CinemaDB AI'}</span>
            </div>
            <button onClick={() => setIsOpen(false)}>
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
          </div>

          {/* Modern Mode Switcher */}
          <div className="p-2 bg-gray-50 dark:bg-gray-900/50 border-b dark:border-gray-700">
            <div className="relative flex bg-gray-200 dark:bg-gray-700 rounded-xl p-1 p-0.5 h-10">
              {/* Sliding Background */}
              <div 
                className={`absolute top-1 bottom-1 w-[calc(50%-4px)] bg-white dark:bg-gray-600 rounded-lg shadow-sm transition-all duration-300 ease-out z-0 ${isLiveChat ? 'left-[calc(50%+2px)]' : 'left-1'}`}
              ></div>
              
              <button 
                onClick={handleSwitchToAI}
                className={`flex-1 flex items-center justify-center gap-2 text-xs font-bold z-10 transition-colors ${!isLiveChat ? 'text-red-600' : 'text-gray-500 hover:text-gray-700'}`}
              >
                <span className="text-base">🤖</span>
                AI Assistant
              </button>
              
              <button 
                onClick={handleSwitchToLive}
                className={`flex-1 flex items-center justify-center gap-2 text-xs font-bold z-10 transition-colors ${isLiveChat ? 'text-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
              >
                <span className="text-base">💬</span>
                Nhân viên
              </button>
            </div>
          </div>

          <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-4">
            {messages.map((msg, idx) => (
              <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[80%] p-3 rounded-2xl text-sm ${
                  msg.role === 'user' 
                  ? 'bg-red-600 text-white rounded-tr-none' 
                  : msg.role === 'staff' ? 'bg-blue-600 text-white rounded-tl-none' : 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded-tl-none'
                }`}>
                  {msg.text}
                </div>
              </div>
            ))}
            {isLoading && (
              <div className="flex justify-start">
                <div className="bg-gray-100 dark:bg-gray-700 p-3 rounded-2xl rounded-tl-none space-x-1 flex">
                  <div className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce"></div>
                  <div className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce [animation-delay:0.2s]"></div>
                  <div className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce [animation-delay:0.4s]"></div>
                </div>
              </div>
            )}
          </div>

          <div className="p-3 border-t dark:border-gray-700 flex gap-2">
            <input 
              type="text" 
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSend()}
              placeholder="Nhập câu hỏi..."
              className="flex-1 bg-gray-50 dark:bg-gray-900 border-none focus:ring-1 focus:ring-red-500 rounded-xl px-4 py-2 text-sm"
            />
            <button 
              onClick={handleSend}
              disabled={isLoading}
              className="bg-red-600 text-white p-2 rounded-xl hover:bg-red-700 disabled:opacity-50 transition-colors"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path d="M10.894 2.553a1 1 0 00-1.788 0l-7 14a1 1 0 001.169 1.409l5-1.429A1 1 0 009 15.571V11a1 1 0 112 0v4.571a1 1 0 00.725.962l5 1.428a1 1 0 001.17-1.408l-7-14z" /></svg>
            </button>
          </div>
        </div>
      )}

      {/* Toggle Button */}
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="w-14 h-14 bg-red-600 text-white rounded-full shadow-2xl flex items-center justify-center hover:scale-110 active:scale-95 transition-all duration-300 relative group"
      >
        {!isOpen && (
          <>
            <span className="absolute -top-2 -left-2 bg-green-500 text-[10px] px-2 py-0.5 rounded-full border-2 border-white animate-bounce text-white font-bold">Online</span>
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 bg-blue-500 text-white text-[10px] w-6 h-6 rounded-full flex items-center justify-center border-2 border-white font-black shadow-lg animate-pulse">
                {unreadCount}
              </span>
            )}
          </>
        )}
        {isOpen ? (
          <svg xmlns="http://www.w3.org/2000/svg" className="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
        ) : (
          <svg xmlns="http://www.w3.org/2000/svg" className="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" /></svg>
        )}
        <div className="absolute right-full mr-4 px-3 py-1 bg-gray-800 text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 whitespace-nowrap transition-opacity hidden md:block">
          Bạn cần tư vấn gì không?
        </div>
      </button>
    </div>
  );
};

export default Chatbot;