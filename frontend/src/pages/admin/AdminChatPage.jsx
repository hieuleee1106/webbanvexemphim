import React, { useState, useEffect, useRef } from 'react';
import { io } from 'socket.io-client';
import { useAuth } from '../../contexts/AuthContext';
import { toast } from 'sonner';

const AdminChatPage = () => {
  const { user } = useAuth();
  const [socket, setSocket] = useState(null);
  const [activeChats, setActiveChats] = useState({}); // { userId: { name, messages: [] } }
  const [selectedUserId, setSelectedUserId] = useState(null);
  const [input, setInput] = useState('');
  const scrollRef = useRef(null);
  const selectedUserRef = useRef(null); // Dùng ref để socket listener luôn lấy được ID mới nhất

  useEffect(() => {
    const newSocket = io("http://localhost:3000");
    setSocket(newSocket);
    newSocket.emit("staff_join_notifications");

    // 🔥 QUAN TRỌNG: Tải danh sách các user đã từng nhắn tin từ DB khi reload trang
    const fetchActiveUsers = async () => {
      try {
        const token = localStorage.getItem('cinema-token');
        if (!token) return toast.error("Phiên đăng nhập hết hạn");

        const res = await fetch('/api/chat/active-users', {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        const data = await res.json();
        if (data.success && data.data) {
          const chats = {};
          data.data.forEach(item => {
            chats[item.UserID] = {
              name: item.FullName || item.Username,
              avatar: item.Avatar,
              messages: item.LastMessage ? [{ text: item.LastMessage, isAdmin: false }] : [],
              unreadCount: 0, // Mặc định là 0 khi load từ DB (hoặc bạn có thể đếm từ DB nếu cần)
              lastTimestamp: new Date(item.MaxTime).getTime()
            };
          });
          setActiveChats(chats);
        } else { toast.error("Không thể lấy danh sách hội thoại"); }
      } catch (e) { 
        console.error("Lỗi API Chat:", e);
        toast.error("Lỗi kết nối máy chủ chat");
      }
    };

    fetchActiveUsers();

    newSocket.on("new_message_alert", (data) => {
      const { userId, senderName, text, isAdmin, avatar } = data;
      const isSelected = selectedUserRef.current === userId;

      setActiveChats(prev => ({
        ...prev,
        [userId]: {
          ...prev[userId],
          avatar: avatar || prev[userId]?.avatar,
          name: senderName,
          // Cập nhật mảng tin nhắn với isAdmin chính xác từ Server
          messages: [...(prev[userId]?.messages || []), { senderName, text, isAdmin: !!isAdmin }],
          // Nếu không phải admin gửi và không phải chat đang mở thì tăng số tin chưa đọc
          unreadCount: (!isAdmin && !isSelected) ? (prev[userId]?.unreadCount || 0) + 1 : 0,
          lastTimestamp: Date.now()
        }
      }));
    });

    return () => newSocket.disconnect();
  }, []); // Kết nối 1 lần duy nhất

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    selectedUserRef.current = selectedUserId; // Cập nhật ref mỗi khi chọn user mới
  }, [activeChats, selectedUserId]);

  const joinUserChat = async (userId) => {
    setSelectedUserId(userId);
    
    if (socket) socket.emit("join_chat", userId);

    // Chỉ tải lịch sử nếu chưa có tin nhắn nào hoặc muốn làm mới
    try {
      const res = await fetch(`/api/chat/history/${userId}`);
      const data = await res.json();
      if (data.success) {
        setActiveChats(prev => ({
          ...prev,
          [userId]: {
            ...prev[userId],
            unreadCount: 0, // Reset tin chưa đọc khi Admin xem
            // AI (model) và Staff đều được coi là phía "Response" (isAdmin: true) để hiện bên phải
            messages: data.data.map(m => ({ ...m, isAdmin: m.role !== 'user' }))
          }
        }));
      }
    } catch (e) { console.error(e); }
  };

  const handleSend = () => {
    if (!input.trim() || !selectedUserId) return;
    socket.emit("send_message", {
      userId: selectedUserId,
      text: input,
      senderName: user.FullName || user.Username,
      isAdmin: true
    });
    
    // Cập nhật thời gian cho chính mình để đẩy lên đầu danh sách
    setActiveChats(prev => ({
      ...prev,
      [selectedUserId]: {
        ...prev[selectedUserId],
        lastTimestamp: Date.now()
      }
    }));

    setInput('');
  };

  // Sắp xếp các cuộc hội thoại: Ưu tiên tin nhắn mới nhất lên đầu
  const sortedChats = Object.entries(activeChats).sort(([, a], [, b]) => (b.lastTimestamp || 0) - (a.lastTimestamp || 0));

  return (
    <div className="flex h-[calc(100vh-120px)] bg-white dark:bg-gray-800 rounded-2xl shadow-xl overflow-hidden border border-gray-200 dark:border-gray-700">
      {/* Sidebar: Danh sách User đang chat */}
      <div className="w-1/3 border-r dark:border-gray-700 flex flex-col">
        <div className="p-4 border-b font-bold bg-gray-50 dark:bg-gray-900/50">Hội thoại đang chờ</div>
        <div className="flex-1 overflow-y-auto">
          {Object.keys(activeChats).length === 0 && <p className="p-4 text-gray-400 italic text-sm">Chưa có khách hàng nào nhắn tin.</p>}
          {sortedChats.map(([id, data]) => (
            <div key={id} onClick={() => joinUserChat(id)} className={`p-4 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors border-b dark:border-gray-700 flex items-center gap-3 ${selectedUserId === id ? 'bg-red-50 dark:bg-red-900/20 border-r-4 border-r-red-600' : ''}`}>
              {data.avatar ? (
                <img src={data.avatar} className="w-10 h-10 rounded-full object-cover border border-gray-200" alt="Avt" />
              ) : (
                <div className="w-10 h-10 rounded-full bg-blue-500 flex items-center justify-center text-white font-bold uppercase">
                  {data.name.charAt(0)}
                </div>
              )}
              <div className="flex-1 overflow-hidden">
                <div className="font-bold truncate">{data.name}</div>
                <div className="text-xs text-gray-500 truncate">{data.messages[data.messages.length - 1]?.text}</div>
              </div>
              {data.unreadCount > 0 && (
                <div className="bg-red-600 text-white text-[10px] w-5 h-5 rounded-full flex items-center justify-center font-bold shadow-sm">
                  {data.unreadCount}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Khung chat */}
      <div className="flex-1 flex flex-col">
        {selectedUserId ? (
          <>
            <div className="p-4 border-b font-bold flex justify-between items-center bg-gray-50 dark:bg-gray-900/50">
              <div className="flex items-center gap-3">
                {activeChats[selectedUserId].avatar ? (
                  <img src={activeChats[selectedUserId].avatar} className="w-8 h-8 rounded-full object-cover" alt="Avt" />
                ) : (
                  <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center text-white text-xs font-bold uppercase">
                    {activeChats[selectedUserId].name.charAt(0)}
                  </div>
                )}
                <span>Đang hỗ trợ: {activeChats[selectedUserId].name}</span>
              </div>
              <span className="text-[10px] bg-green-500 text-white px-2 py-0.5 rounded-full animate-pulse">Trực tuyến</span>
            </div>
            <div ref={scrollRef} className="flex-1 p-4 overflow-y-auto space-y-4 bg-gray-50/30 dark:bg-gray-900/10">
              {activeChats[selectedUserId].messages.map((m, i) => (
                <div key={i} className={`flex ${m.isAdmin ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[70%] p-3 rounded-2xl text-sm ${m.isAdmin ? 'bg-blue-600 text-white rounded-tr-none' : 'bg-white dark:bg-gray-700 border dark:border-gray-600 rounded-tl-none'}`}>
                    <div className="text-[10px] opacity-50 mb-1">{m.senderName}</div>
                    {m.text}
                  </div>
                </div>
              ))}
            </div>
            <div className="p-4 border-t dark:border-gray-700 flex gap-2">
              <input type="text" value={input} onChange={e => setInput(e.target.value)} onKeyPress={e => e.key === 'Enter' && handleSend()} placeholder="Nhập phản hồi cho khách hàng..." className="flex-1 border rounded-xl px-4 py-2 bg-gray-50 dark:bg-gray-900 outline-none focus:ring-2 focus:ring-red-500" />
              <button onClick={handleSend} className="bg-red-600 text-white px-6 py-2 rounded-xl font-bold hover:bg-red-700 transition-colors">Gửi</button>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-gray-400 flex-col gap-4">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 opacity-20" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" /></svg>
            <p>Chọn một khách hàng từ danh sách để bắt đầu hỗ trợ.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminChatPage;