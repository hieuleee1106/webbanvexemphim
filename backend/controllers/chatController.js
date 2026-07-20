import dotenv from 'dotenv';
dotenv.config();

import { GoogleGenAI } from "@google/genai";
import Groq from "groq-sdk";
import * as MovieModel from '../models/Movie.js';
import * as ShowtimeModel from '../models/Showtime.js';
import { getPool } from "../config/db.js";
import sql from "mssql";

// ================= INIT AI =================
let ai = null;
if (process.env.GEMINI_API_KEY) {
  // Dùng bộ SDK mới nhất của Google GenAI
  ai = new GoogleGenAI({
    apiKey: process.env.GEMINI_API_KEY,
  });
}

let groq = null;
if (process.env.GROQ_API_KEY) {
  groq = new Groq({
    apiKey: process.env.GROQ_API_KEY,
  });
}

// 🔥 trạng thái block
let isGeminiBlocked = false;
let geminiRetryTime = 0;

let isGroqBlocked = false;
let groqRetryTime = 0;

// ================= CHAT =================
export async function chatWithAI(req, res) {
  try {
    const { message } = req.body;

    if (!message) {
      return res.status(400).json({
        success: false,
        message: "Tin nhắn không được để trống",
      });
    }

    // ================= LẤY DB =================
    const pool = await getPool();
    const [movies, showtimes, vouchers, snacks] = await Promise.all([
      MovieModel.getAllMovies(),
      ShowtimeModel.getAllShowtimes(),
      pool.request().query("SELECT * FROM Vouchers WHERE Status = 'Active' AND Quantity > 0 AND ExpiryDate > GETDATE()"),
      pool.request().query("SELECT * FROM Snacks WHERE Status = 'Active'")
    ]);

    // 🔥 FORMAT DATA CHUẨN & LỌC SUẤT CHIẾU HỢP LỆ (Bỏ các suất đã qua)
    const now_date = new Date();
    const currentTimeStr = now_date.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', hour12: false });
    const todayStr = now_date.toLocaleDateString('en-CA'); // YYYY-MM-DD

    const movieData = movies.map(m => ({
      title: m.Title,
      genre: m.Genre,
      duration: m.Duration,
      rated: m.Rated
    }));

    // Chỉ gửi cho AI những suất chiếu chưa diễn ra hoặc đang diễn ra trong 15p đầu
    const activeShowtimes = showtimes.filter(s => {
      const st = new Date(s.StartTime);
      return st.getTime() > (now_date.getTime() - 15 * 60 * 1000);
    }).map(s => {
      const d = new Date(s.StartTime);
      return {
        movie: s.MovieTitle,
        date: d.toLocaleDateString('en-CA'),
        time: d.toTimeString().slice(0, 5),
        room: s.RoomName,
        prices: { Standard: s.Price, VIP: s.PriceVIP, Double: s.PriceDouble }
      };
    });

    const voucherData = vouchers.recordset.map(v => ({
      code: v.Code,
      discount: v.DiscountPercent ? `${v.DiscountPercent}%` : `${v.DiscountAmount.toLocaleString()}đ`,
      min_order: v.MinOrderValue,
      expiry: new Date(v.ExpiryDate).toLocaleDateString('vi-VN')
    }));

    const snackData = snacks.recordset.map(s => ({
      name: s.Name,
      price: s.Price,
      category: s.Category
    }));

    const days = ["Chủ Nhật", "Thứ 2", "Thứ 3", "Thứ 4", "Thứ 5", "Thứ 6", "Thứ 7"];
    const dayOfWeek = days[now_date.getDay()];

    // ================= PROMPT =================
    const systemPrompt = `
      Bạn là CinemaDB AI - Trợ lý ảo chính thức và duy nhất của hệ thống rạp phim CinemaDB (Triều Khúc, Thanh Xuân, Hà Nội).

      Ngữ cảnh thời gian thực:
      - Hôm nay là: ${dayOfWeek}, ngày ${todayStr}
      - Giờ hiện tại: ${currentTimeStr}

      Dữ liệu hệ thống:
      - Phim đang chiếu: ${JSON.stringify(movieData)}
      - Suất chiếu khả dụng: ${JSON.stringify(activeShowtimes)}
      - Khuyến mãi/Voucher: ${JSON.stringify(voucherData)}
      - Bắp nước (Snacks): ${JSON.stringify(snackData)}

      Quy tắc bắt buộc:
      1. Danh tính: Bạn thuộc về CinemaDB. Nếu khách hỏi chủ rạp là ai, hãy trả lời bạn là trợ lý thông minh được phát triển bởi đội ngũ kỹ thuật của CinemaDB.
      2. Tính toán ngày: Dựa trên ngày ${todayStr} để trả lời "ngày mai", "thứ mấy". CHỈ giới thiệu suất có trong dữ liệu "Suất chiếu khả dụng". Nếu khách hỏi suất đã qua (ví dụ 13:00 mà giờ là 14:00), tuyệt đối không báo là còn suất đó, hãy báo suất đó đã kết thúc.
      3. Vòng quay may mắn: Hệ thống có tính năng "Vòng quay may mắn" trong mục cùng tên. Mỗi khách hàng được 1 lượt quay miễn phí mỗi ngày để trúng Voucher.
      4. Chính sách hủy vé: Chỉ được phép hủy vé trước giờ chiếu ít nhất 3 ngày (72 tiếng). Tiền sẽ được hoàn trả vào ví/tài khoản trong 3-5 ngày làm việc.
      5. Bắp nước: Tư vấn thêm các món bắp nước nếu khách đang chọn phim.
      6. Voucher: Khi khách hỏi mã giảm giá, hãy liệt kê danh sách mã từ dữ liệu Khuyến mãi,chỉ nêu mã giảm giá gì, k dài dòng.
      7. Phong cách: Ngôn ngữ tự nhiên, thân thiện, không máy móc. Dùng icon 🎬, 🍿, 🎟️ để sinh động.
    `;

    let aiReply = "";
    const nowTimestamp = Date.now();

    // ================= ƯU TIÊN GROQ =================
    try {
      if (isGroqBlocked && nowTimestamp < groqRetryTime) {
        throw new Error("Skip Groq");
      }

      if (!groq) throw new Error("No Groq");

      const groqRes = await groq.chat.completions.create({
        model: "llama-3.1-8b-instant",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: message }
        ],
      });

      aiReply = groqRes.choices[0]?.message?.content || "Không có phản hồi";

    } catch (err) {
      console.log("Groq lỗi:", err.message);

      // 🔥 block Groq nếu lỗi quota / rate
      if (err.message.includes("429") || err.message.includes("rate")) {
        isGroqBlocked = true;
        groqRetryTime = Date.now() + 60000; // block 60s
        console.log("Groq bị khóa 60s");
      }

      // ================= FALLBACK GEMINI =================
      try {
        if (isGeminiBlocked && nowTimestamp < geminiRetryTime) {
          throw new Error("Skip Gemini");
        }

        if (!ai) throw new Error("No Gemini");

        const response = await ai.models.generateContent({
          model: "gemini-2.5-flash",
          contents: [
            {
              role: "user",
              parts: [
                { text: systemPrompt + "\n\nCâu hỏi: " + message }
              ]
            }
          ],
        });

        aiReply = response.text;

      } catch (err2) {
        console.log("Gemini lỗi:", err2.message);

        // 🔥 block Gemini nếu hết quota
        if (err2.message.includes("429")) {
          isGeminiBlocked = true;
          geminiRetryTime = Date.now() + 24 * 60 * 60 * 1000; // block 1 ngày
          console.log("Gemini hết quota hôm nay");
        }

        aiReply = "Hệ thống AI đang bận, thử lại sau";
      }
    }

    // ================= LƯU DB =================
    try {
      const pool = await getPool();

      // user
      await pool.request()
        .input('UserID', sql.Int, req.user.userId)
        .input('Text', sql.NVarChar, message)
        .input('SenderName', sql.NVarChar, 'User')
        .input('IsAdmin', sql.Bit, 0)
        .query(`
          INSERT INTO ChatMessages (UserID, [Text], SenderName, IsAdmin)
          VALUES (@UserID, @Text, @SenderName, @IsAdmin)
        `);

      // AI
      await pool.request()
        .input('UserID', sql.Int, req.user.userId)
        .input('Text', sql.NVarChar, aiReply)
        .input('SenderName', sql.NVarChar, 'CinemaDB AI')
        .input('IsAdmin', sql.Bit, 1)
        .query(`
          INSERT INTO ChatMessages (UserID, [Text], SenderName, IsAdmin)
          VALUES (@UserID, @Text, @SenderName, @IsAdmin)
        `);

    } catch (dbErr) {
      console.log("Lỗi lưu DB:", dbErr.message);
    }

    res.json({
      success: true,
      reply: aiReply,
    });

  } catch (error) {
    console.error("Lỗi Chatbot:", error);
    res.status(500).json({
      success: false,
      message: "Server lỗi",
    });
  }
}

// ================= HISTORY =================
export async function getChatHistory(req, res) {
  try {
    const { userId } = req.params;
    const pool = await getPool();

    const result = await pool.request()
      .input('UserID', sql.Int, userId)
      .query(`
        SELECT [Text] as text, SenderName as senderName, IsAdmin as isAdmin
        FROM ChatMessages
        WHERE UserID = @UserID
        ORDER BY Timestamp ASC
      `);
      
    // Lấy avatar của user để admin thấy ở header khung chat
    const userRes = await pool.request()
      .input('UserID', sql.Int, userId)
      .query("SELECT Avatar FROM Users WHERE UserID = @UserID");
    
    const userAvatar = userRes.recordset[0]?.Avatar || null;

    const messages = result.recordset.map(m => ({
      role: m.senderName === 'CinemaDB AI'
        ? 'model'
        : (m.isAdmin ? 'staff' : 'user'),
      text: m.text,
      senderName: m.senderName
    }));

    res.json({ success: true, data: messages, userAvatar });

  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
}

// ================= ADMIN =================
export async function getActiveChatUsers(req, res) {
  try {
    const pool = await getPool();

    const result = await pool.request().query(`
      WITH LastMessages AS (
          SELECT UserID, [Text], Timestamp,
                 ROW_NUMBER() OVER(PARTITION BY UserID ORDER BY Timestamp DESC) as rn
          FROM ChatMessages
      )
      SELECT u.UserID, u.FullName, u.Username, u.Avatar,
             lm.[Text] as LastMessage, lm.Timestamp as MaxTime
      FROM Users u
      INNER JOIN LastMessages lm ON u.UserID = lm.UserID
      WHERE lm.rn = 1
      ORDER BY lm.Timestamp DESC
    `);

    res.json({ success: true, data: result.recordset });

  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
}