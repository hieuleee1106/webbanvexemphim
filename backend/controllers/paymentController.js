import axios from "axios";
import CryptoJS from "crypto-js";
import moment from "moment";
import zalopayConfig from "../config/zalopay.js";
import momoConfig from "../config/momo.js";
import { getPool } from "../config/db.js";
import sql from "mssql";
import crypto from "crypto";
import sendEmail from "../utils/sendEmail.js";

// ================= HELPER: LOGIC LƯU VÉ DÙNG CHUNG =================
// Hàm này dùng để tránh lặp code giữa Callback và Query (Check)
async function processSuccessfulBooking(pool, bookingData, appTransId, amount, io) {
    const { UserID, ShowtimeID, SelectedSeats = [], VoucherCode, SelectedSnacks = [] } = bookingData;

    // 1. Kiểm tra Idempotency (Chống trùng lặp)
    // Kiểm tra xem mã giao dịch này đã được tạo vé chưa
    const checkExist = await pool.request()
        .input('appTransId', sql.NVarChar, appTransId)
        .query("SELECT TicketID FROM Tickets WHERE AdminNote LIKE '%' + @appTransId + '%'");

    if (checkExist.recordset.length > 0) {
        console.log(`[Payment] Order ${appTransId} already processed.`);
        return { success: true, alreadyDone: true };
    }

    const now = new Date();
    const transaction = new sql.Transaction(pool);
    await transaction.begin();

    try {
        let orderDiscount = 0;
        if (VoucherCode) {
            const vRes = await transaction.request()
                .input('vCode', sql.NVarChar, VoucherCode)
                .query("SELECT * FROM Vouchers WHERE Code = @vCode");
            if (vRes.recordset.length > 0) {
                const v = vRes.recordset[0];
                if (v.DiscountAmount) orderDiscount = v.DiscountAmount;
                else if (v.DiscountPercent) {
                    const original = amount / (1 - v.DiscountPercent / 100);
                    orderDiscount = original - amount;
                }
            }
        }

        let firstTicketID = null;
        
        // Tạo bản ghi vé
        if (SelectedSeats.length === 0 && SelectedSnacks.length > 0) {
            const insertTicketRes = await transaction.request()
                .input('UserID', sql.Int, UserID)
                .input('Discount', sql.Decimal(10, 2), orderDiscount)
                .input('Now', sql.DateTime, now)
                .input('Note', sql.NVarChar, `ZaloPay_${appTransId}`)
                .query(`INSERT INTO Tickets (UserID, ShowtimeID, SeatID, BookingTime, Status, DiscountAmount, AdminNote)
                        OUTPUT inserted.TicketID VALUES (@UserID, NULL, NULL, @Now, N'Đã đặt', @Discount, @Note)`);
            firstTicketID = insertTicketRes.recordset[0].TicketID;
        }

        for (const SeatID of SelectedSeats) {
            const insertTicketRes = await transaction.request()
                .input('UserID', sql.Int, UserID)
                .input('ShowtimeID', sql.Int, ShowtimeID)
                .input('SeatID', sql.Int, SeatID)
                .input('Now', sql.DateTime, now)
                .input('Discount', sql.Decimal(10, 2), firstTicketID ? 0 : orderDiscount)
                .input('Note', sql.NVarChar, `ZaloPay_${appTransId}`)
                .query(`INSERT INTO Tickets (UserID, ShowtimeID, SeatID, BookingTime, Status, DiscountAmount, AdminNote)
                        OUTPUT inserted.TicketID VALUES (@UserID, @ShowtimeID, @SeatID, @Now, N'Đã đặt', @Discount, @Note)`);
            if (!firstTicketID) firstTicketID = insertTicketRes.recordset[0].TicketID;
        }

        // Lưu đồ ăn
        for (const snack of SelectedSnacks) {
            await transaction.request()
                .input('TID', sql.Int, firstTicketID)
                .input('SID', sql.Int, snack.SnackID)
                .input('Qty', sql.Int, snack.Quantity)
                .input('Price', sql.Decimal(10, 2), snack.Price)
                .query(`INSERT INTO TicketSnacks (TicketID, SnackID, Quantity, PriceAtBooking) VALUES (@TID, @SID, @Qty, @Price)`);
        }

        // Trừ Voucher
        if (VoucherCode) {
            await transaction.request()
                .input('Code', sql.NVarChar, VoucherCode)
                .query(`UPDATE Vouchers SET Quantity = Quantity - 1 WHERE Code = @Code AND Quantity > 0`);
            await transaction.request()
                .input('uID', sql.Int, UserID)
                .input('vCode', sql.NVarChar, VoucherCode)
                .query(`UPDATE VoucherUsage SET UserQuantity = UserQuantity - 1, IsUsed = CASE WHEN UserQuantity <= 1 THEN 1 ELSE 0 END 
                        FROM VoucherUsage vu JOIN Vouchers v ON vu.VoucherID = v.VoucherID
                        WHERE vu.UserID = @uID AND v.Code = @vCode AND vu.UserQuantity > 0`);
        }

        await transaction.commit();
        
        // Thông báo Realtime
        if (ShowtimeID) io.to(ShowtimeID.toString()).emit("update_seat_status");
        if (UserID) io.to(`chat_${UserID}`).emit("tickets_updated");

        sendBookingConfirmationEmail(UserID, ShowtimeID, SelectedSeats.map(s => s.SeatID), SelectedSnacks, amount);
        return { success: true, alreadyDone: false };
    } catch (err) {
        await transaction.rollback();
        throw err;
    }
}

// API: Tạo đơn hàng thanh toán gửi sang ZaloPay
export async function createPayment(req, res) {
  try {
    const { UserID, ShowtimeID, SelectedSeats, TotalAmount, VoucherCode, SelectedSnacks } = req.body;

    // Kiểm tra số tiền hợp lệ (ZaloPay yêu cầu tối thiểu 1,000đ)
    if (!TotalAmount || TotalAmount < 1000) {
        return res.status(400).json({ success: false, message: "Số tiền thanh toán không hợp lệ (tối thiểu 1,000đ)" });
    }

    // FIX: Làm tròn số tiền thành số nguyên, ZaloPay sẽ báo lỗi nếu có số thập phân
    const amount = Math.round(Number(TotalAmount));
    const app_time = Date.now();

    // 1. Tạo mã đơn hàng duy nhất và ngắn gọn hơn (6 số ngẫu nhiên)
    const app_trans_id = `${moment().format("YYMMDD")}_${Math.floor(Math.random() * 1000000)}`;
    const orderDescription = `CinemaDB - Thanh toan don hang ${app_trans_id}`;

    // 2. Nhúng thông tin đặt vé vào embed_data để dùng lại khi Callback
    // Đây là dữ liệu ZaloPay sẽ trả ngược lại cho ta khi thanh toán xong
    const embed_data = JSON.stringify({
      redirecturl: "http://localhost:5173/my-tickets", 
      UserID,
      ShowtimeID,
      SelectedSeats: SelectedSeats || [],
      VoucherCode,
      SelectedSnacks: (SelectedSnacks || []).map(s => ({ SnackID: s.SnackID, Quantity: s.Quantity, Price: s.Price }))
    });

    const items = JSON.stringify([]); // Tối giản items để tránh lỗi MAC

    // 3. Tạo payload gửi ZaloPay
    const order = {
      app_id: Number(zalopayConfig.app_id),
      app_user: UserID ? `User_${UserID}` : "Guest",
      app_trans_id: app_trans_id,
      app_time: app_time, // mili giây
      amount: amount,
      item: items,
      description: orderDescription,
      embed_data: embed_data,
      bank_code: "",
      callback_url: zalopayConfig.callback_url, 
    };

    // 4. Tạo chữ ký (Mac) để bảo mật
    const data = order.app_id + "|" + order.app_trans_id + "|" + order.app_user + "|" + order.amount + "|" + order.app_time + "|" + order.embed_data + "|" + order.item;
    order.mac = CryptoJS.HmacSHA256(data, zalopayConfig.key1).toString();

    console.log(`🚀 [ZaloPay V2] Request: ${app_trans_id}`);

    // 5. Gọi API ZaloPay
    // Dùng JSON POST - Chuẩn V2 chính thức
    const result = await axios.post(zalopayConfig.endpoint, order, {
      timeout: 15000,
      headers: { 'Content-Type': 'application/json' }
    });

    if (result.data.return_code === 1) {
      console.log(`✅ Thành công: ${result.data.order_url}`);
      return res.json({ 
        success: true, 
        order_url: result.data.order_url, 
        app_trans_id 
      });
    } else {
      console.error("❌ ZaloPay từ chối đơn hàng:", result.data);
      res.status(400).json({ success: false, message: "Tạo giao dịch ZaloPay thất bại", detail: result.data });
    }

  } catch (error) {
    console.error("Lỗi tạo thanh toán:", error);
    res.status(500).json({ success: false, message: "Lỗi server" });
  }
}

// API: Chủ động kiểm tra trạng thái đơn hàng (Sẽ lưu vé nếu thành công)
export async function checkZaloPayStatus(req, res) {
    try {
        const { app_trans_id } = req.body;
        const config = zalopayConfig;
        const postData = { app_id: config.app_id, app_trans_id };
        const data = postData.app_id + "|" + postData.app_trans_id + "|" + config.key1;
        postData.mac = CryptoJS.HmacSHA256(data, config.key1).toString();

        const response = await axios.post("https://sb-openapi.zalopay.vn/v2/query", postData);
        const result = response.data;

        if (result.return_code === 1) {
            const pool = await getPool();
            const embedData = JSON.parse(result.embed_data || "{}");
            const io = req.app.get('socketio');

            // 🔥 Tự động xử lý lưu vé nếu Callback chưa làm
            const processResult = await processSuccessfulBooking(pool, embedData, app_trans_id, result.amount, io);
            
            return res.json({ 
                success: true, 
                message: processResult.alreadyDone ? "Đã cập nhật trước đó" : "Thanh toán thành công (Xác thực Query)",
                data: result 
            });
        }
        res.json({ success: false, message: result.return_message });
    } catch (error) {
        console.error("❌ Query ZaloPay Error:", error);
        res.status(500).json({ success: false, message: "Lỗi kiểm tra đơn hàng" });
    }
}

// API: Tạo đơn hàng thanh toán MoMo
export async function createMoMoPayment(req, res) {
  try {
    const { UserID, ShowtimeID, SelectedSeats, TotalAmount, VoucherCode, SelectedSnacks, requestType = "captureWallet" } = req.body;
    
    const amount = Math.round(Number(TotalAmount));
    const orderId = `${momoConfig.partnerCode}_${Date.now()}`;
    const requestId = orderId;
    const orderInfo = `Thanh toán vé xem phim CinemaDB - ${orderId}`;
    // requestType có thể là: captureWallet, payWithATM, hoặc payWithCC
    const extraData = Buffer.from(JSON.stringify({
        UserID, ShowtimeID, SelectedSeats, VoucherCode, SelectedSnacks
    })).toString('base64');

    const rawSignature = `accessKey=${momoConfig.accessKey}&amount=${amount}&extraData=${extraData}&ipnUrl=${momoConfig.ipnUrl}&orderId=${orderId}&orderInfo=${orderInfo}&partnerCode=${momoConfig.partnerCode}&redirectUrl=${momoConfig.redirectUrl}&requestId=${requestId}&requestType=${requestType}`;
    
    const signature = crypto
      .createHmac("sha256", momoConfig.secretKey)
      .update(rawSignature)
      .digest("hex");

    const requestBody = {
      partnerCode: momoConfig.partnerCode,
      partnerName: "CinemaDB",
      storeId: "CinemaDB",
      requestId,
      amount,
      orderId,
      orderInfo,
      redirectUrl: momoConfig.redirectUrl,
      ipnUrl: momoConfig.ipnUrl,
      lang: "vi",
      requestType,
      autoCapture: true,
      extraData,
      signature,
    };

    const result = await axios.post(momoConfig.endpoint, requestBody);
    
    if (result.data && result.data.payUrl) {
      res.json({ success: true, order_url: result.data.payUrl });
    } else {
      res.status(400).json({ success: false, message: result.data.message || "Lỗi MoMo" });
    }
  } catch (error) {
    console.error("Lỗi tạo thanh toán MoMo:", error);
    res.status(500).json({ success: false, message: "Lỗi server MoMo" });
  }
}

// API: Xử lý Callback từ MoMo (IPN)
export async function momoCallback(req, res) {
  try {
    console.log("📩 MoMo IPN received:", req.body);
    const { partnerCode, orderId, requestId, amount, orderInfo, orderType, transId, resultCode, message, payType, responseTime, extraData, signature: reqSignature } = req.body;

    // 1. Kiểm tra chữ ký bảo mật (Sửa lại chuỗi rawSignature đúng chuẩn MoMo IPN V2)
    // Thứ tự các tham số phải cực kỳ chính xác theo bảng chữ cái
    const rawSignature = `accessKey=${momoConfig.accessKey}&amount=${amount}&extraData=${extraData}&message=${message}&orderId=${orderId}&orderInfo=${orderInfo}&orderType=${orderType}&partnerCode=${partnerCode}&payType=${payType}&requestId=${requestId}&responseTime=${responseTime}&resultCode=${resultCode}&transId=${transId}`;
    
    const signature = crypto.createHmac("sha256", momoConfig.secretKey).update(rawSignature).digest("hex");

    if (signature !== reqSignature) {
      return res.status(400).json({ message: "Chữ ký không khớp" });
    }

    // 2. Nếu thanh toán thành công (resultCode === 0)
    if (resultCode === 0) {
      const decodedData = JSON.parse(Buffer.from(extraData, 'base64').toString());
      const { UserID, ShowtimeID, SelectedSeats, VoucherCode, SelectedSnacks } = decodedData;

      const pool = await getPool();
      const now = new Date(); // 🔥 Tạo thời gian chung cho cả đơn hàng
      const transaction = new sql.Transaction(pool);
      await transaction.begin();

      try {
        let firstTicketID = null;

        // Tính toán số tiền giảm giá thực tế từ VoucherCode
        let orderDiscount = 0;
        if (VoucherCode) {
            const vRes = await transaction.request()
                .input('vCode', sql.NVarChar, VoucherCode)
                .query("SELECT * FROM Vouchers WHERE Code = @vCode");
            if (vRes.recordset.length > 0) {
                const v = vRes.recordset[0];
                // Tính toán giá trị giảm (logic giống hàm applyVoucher)
                if (v.DiscountAmount) orderDiscount = v.DiscountAmount;
                else if (v.DiscountPercent) {
                    // amount là tổng tiền đã bao gồm giảm giá từ ZaloPay gửi về, 
                    // nhưng ta cần tính toán dựa trên giá trị gốc hoặc đơn giản là dùng giá trị đã tính ở frontend gửi kèm qua embed_data
                    orderDiscount = (amount * v.DiscountPercent / (100 - v.DiscountPercent)); 
                }
            }
        }

        // Nếu mua lẻ bắp nước (không có ghế), tạo 1 vé "ảo" để gắn bắp nước vào
        if (SelectedSeats.length === 0 && SelectedSnacks.length > 0) {
            const insertTicketRes = await transaction.request()
                .input('UserID', sql.Int, UserID)
                .input('Discount', sql.Decimal(10, 2), orderDiscount)
                .input('Now', sql.DateTime, now)
                .query(`
                    INSERT INTO Tickets (UserID, ShowtimeID, SeatID, BookingTime, Status, DiscountAmount)
                    OUTPUT inserted.TicketID
                    VALUES (@UserID, NULL, NULL, @Now, N'Đã đặt', @Discount)
                `);
            firstTicketID = insertTicketRes.recordset[0].TicketID;
        }

        for (const SeatID of SelectedSeats) {
          const insertTicketRes = await transaction.request()
            .input('UserID', sql.Int, UserID)
            .input('ShowtimeID', sql.Int, ShowtimeID)
            .input('SeatID', sql.Int, SeatID)
            .input('Now', sql.DateTime, now)
            .input('Discount', sql.Decimal(10, 2), firstTicketID ? 0 : orderDiscount)
            .query(`
                INSERT INTO Tickets (UserID, ShowtimeID, SeatID, BookingTime, Status, DiscountAmount)
                OUTPUT inserted.TicketID
                VALUES (@UserID, @ShowtimeID, @SeatID, @Now, N'Đã đặt', @Discount)
            `);
          if (!firstTicketID) firstTicketID = insertTicketRes.recordset[0].TicketID;
        }

        if (SelectedSnacks?.length > 0) {
          for (const snack of SelectedSnacks) {
            await transaction.request()
              .input('TID', sql.Int, firstTicketID)
              .input('SID', sql.Int, snack.SnackID)
              .input('Qty', sql.Int, snack.Quantity)
              .input('Price', sql.Decimal(10, 2), snack.Price)
              .query(`INSERT INTO TicketSnacks (TicketID, SnackID, Quantity, PriceAtBooking) VALUES (@TID, @SID, @Qty, @Price)`);
          }
        }

        if (VoucherCode) {
          const vResult = await transaction.request()
            .input('Code', sql.NVarChar, VoucherCode)
            .query(`SELECT VoucherID FROM Vouchers WHERE Code = @Code`);

          if (vResult.recordset.length > 0) {
            const vID = vResult.recordset[0].VoucherID;
            await transaction.request().input('vID', sql.Int, vID).query(`UPDATE Vouchers SET Quantity = Quantity - 1 WHERE VoucherID = @vID AND Quantity > 0`);
            await transaction.request()
              .input('uID', sql.Int, UserID)
              .input('vID', sql.Int, vID)
              .query(`UPDATE VoucherUsage SET UserQuantity = UserQuantity - 1, IsUsed = CASE WHEN UserQuantity <= 1 THEN 1 ELSE 0 END WHERE UserID = @uID AND VoucherID = @vID AND UserQuantity > 0`);
          }
        }

        await transaction.commit();
        // Gửi email xác nhận (chạy bất đồng bộ, không đợi mail gửi xong mới phản hồi IPN)
        sendBookingConfirmationEmail(UserID, ShowtimeID, SelectedSeats, SelectedSnacks, amount);

        // 🔥 Kích hoạt Realtime: Thông báo cho mọi người trong phòng của lịch chiếu này
        const io = req.app.get('socketio');
        if (ShowtimeID) io.to(ShowtimeID.toString()).emit("update_seat_status");

        console.log(`✅ MoMo Payment Success: ${orderId}`);
      } catch (dbErr) {
        await transaction.rollback();
        console.error("❌ MoMo Callback DB Error:", dbErr);
      }
    }

    // MoMo yêu cầu response 204 No Content hoặc phản hồi nhận được IPN
    res.status(204).send();
  } catch (error) {
    console.error("❌ MoMo Callback Exception:", error);
    res.status(500).send();
  }
}

// API: ZaloPay gọi vào đây để báo thành công (Callback)
export async function callback(req, res) {
  
  let result = {};

  try {
    console.log('📩 ZaloPay callback received:', req.body);
    const { data: dataStr, mac: reqMac } = req.body;
    const config = zalopayConfig;

    if (!dataStr || !reqMac) {
      result.return_code = 0;
      result.return_message = 'invalid callback payload';
      console.warn('⚠️ ZaloPay callback missing data or mac');
      return res.json(result);
    }

    // 1. Kiểm tra chữ ký callback (đảm bảo request đến từ ZaloPay thật)
    const mac = CryptoJS.HmacSHA256(dataStr, config.key2).toString();

    // 2. Nếu chữ ký không khớp -> Báo lỗi
    if (reqMac !== mac) {
      result.return_code = -1;
      result.return_message = "mac not equal";
    } else {
      // 3. Thanh toán thành công -> Tiến hành lưu vé vào Database
      const dataJson = JSON.parse(dataStr);
      const embedData = JSON.parse(dataJson.embed_data);
      
      const { UserID, ShowtimeID, SelectedSeats = [], VoucherCode, SelectedSnacks = [] } = embedData;

      const now = new Date(); // 🔥 Tạo thời gian chung
      // Dùng Transaction để đảm bảo thêm vé và đồ ăn an toàn
      const pool = await getPool();
      const transaction = new sql.Transaction(pool);
      
      await transaction.begin();
      try {
        // Kiểm tra xem giao dịch này đã được xử lý chưa (Idempotency)
        // Nếu bạn có cột AppTransID trong bảng Tickets, nên kiểm tra tại đây.
        // Ở đây ta log để theo dõi:
        console.log(`[Callback] Processing AppTransID: ${dataJson.app_trans_id}`);

        // FIX: Tính toán số tiền giảm giá thực tế từ VoucherCode để lưu vào DB
        let orderDiscount = 0;
        if (VoucherCode) {
            const vRes = await transaction.request()
                .input('vCode', sql.NVarChar, VoucherCode)
                .query("SELECT * FROM Vouchers WHERE Code = @vCode");
            if (vRes.recordset.length > 0) {
                const v = vRes.recordset[0];
                if (v.DiscountAmount) orderDiscount = v.DiscountAmount;
                else if (v.DiscountPercent) {
                    // dataJson.amount là tổng tiền đã thanh toán sau khi trừ giảm giá
                    // Tính ngược lại: Gốc = Sau_Giảm / (1 - %_Giảm)
                    const original = dataJson.amount / (1 - v.DiscountPercent / 100);
                    orderDiscount = original - dataJson.amount;
                }
            }
        }

        console.log(`📝 Processing order for User: ${UserID}, Seats: ${SelectedSeats}`);
        let firstTicketID = null;
        
        // Nếu mua lẻ bắp nước (không có ghế), tạo 1 vé "ảo" để gắn bắp nước vào
        if (SelectedSeats.length === 0 && SelectedSnacks.length > 0) {
            const insertTicketRes = await transaction.request()
                .input('UserID', sql.Int, UserID)
                .input('Discount', sql.Decimal(10, 2), orderDiscount)
                .input('Now', sql.DateTime, now)
                .query(`
                    INSERT INTO Tickets (UserID, ShowtimeID, SeatID, BookingTime, Status, DiscountAmount)
                    OUTPUT inserted.TicketID
                    VALUES (@UserID, NULL, NULL, @Now, N'Đã đặt', @Discount)
                `);
            firstTicketID = insertTicketRes.recordset[0].TicketID;
        }

        for (const SeatID of SelectedSeats) {
             // Kiểm tra ghế đã bị đặt chưa (đề phòng xung đột)
             const checkResult = await transaction.request()
                 .input('ShowtimeID', sql.Int, ShowtimeID)
                 .input('SeatID', sql.Int, SeatID)
                 .query("SELECT TicketID FROM Tickets WHERE ShowtimeID = @ShowtimeID AND SeatID = @SeatID AND Status != 'Cancelled'");

             if (checkResult.recordset.length === 0) {
                 const insertTicketRes = await transaction.request()
                    .input('UserID', sql.Int, UserID)
                    .input('ShowtimeID', sql.Int, ShowtimeID)
                    .input('SeatID', sql.Int, SeatID)
                    .input('Now', sql.DateTime, now)
                    .input('Discount', sql.Decimal(10, 2), firstTicketID ? 0 : orderDiscount) // Chỉ lưu discount vào vé đầu tiên
                    .query(`
                        INSERT INTO Tickets (UserID, ShowtimeID, SeatID, BookingTime, Status, DiscountAmount)
                        OUTPUT inserted.TicketID
                        VALUES (@UserID, @ShowtimeID, @SeatID, @Now, N'Đã đặt', @Discount)
                    `);
                 if (!firstTicketID) firstTicketID = insertTicketRes.recordset[0].TicketID;
             }
        }

        // Lưu đồ ăn
        if (SelectedSnacks.length > 0) {
            for (const snack of SelectedSnacks) {
                await transaction.request()
                    .input('TID', sql.Int, firstTicketID || null)
                    .input('SID', sql.Int, snack.SnackID)
                    .input('Qty', sql.Int, snack.Quantity)
                    .input('Price', sql.Decimal(10, 2), snack.Price)
                    .query(`
                        INSERT INTO TicketSnacks (TicketID, SnackID, Quantity, PriceAtBooking)
                        VALUES (@TID, @SID, @Qty, @Price)
                    `);
            }
        }

        // Trừ số lượng Voucher nếu có sử dụng
        if (VoucherCode) {
            // 1. Lấy VoucherID từ Code
            const vResult = await transaction.request()
                .input('Code', sql.NVarChar, VoucherCode)
                .query(`SELECT VoucherID FROM Vouchers WHERE Code = @Code`);

            if (vResult.recordset.length > 0) {
                const vID = vResult.recordset[0].VoucherID;
                
                // 2. Cập nhật số lượng còn lại
                await transaction.request().input('vID', sql.Int, vID).query(`UPDATE Vouchers SET Quantity = Quantity - 1 WHERE VoucherID = @vID AND Quantity > 0`);
                
                // 3. Trừ số lượng trong kho của User
                await transaction.request()
                    .input('uID', sql.Int, UserID)
                    .input('vID', sql.Int, vID)
                    .query(`
                        UPDATE VoucherUsage 
                        SET UserQuantity = UserQuantity - 1, IsUsed = CASE WHEN UserQuantity <= 1 THEN 1 ELSE 0 END 
                        WHERE UserID = @uID AND VoucherID = @vID AND UserQuantity > 0
                    `);
            }
        }

        await transaction.commit();
        // Gửi email xác nhận đặt vé thành công
        sendBookingConfirmationEmail(UserID, ShowtimeID, SelectedSeats, SelectedSnacks, dataJson.amount);

        // 🔥 Kích hoạt Realtime: Thông báo cho mọi người trong phòng của lịch chiếu này
        const io = req.app.get('socketio');
        if (ShowtimeID) io.to(ShowtimeID.toString()).emit("update_seat_status");

        console.log(`✅ Success: Order ${dataJson.app_trans_id} finished.`);
        result.return_code = 1;
        result.return_message = "success";
      } catch (err) {
        if (transaction) await transaction.rollback();
        console.error(`❌ DB Error:`, err.message);
        // Log chi tiết lỗi để debug
        console.error(err); 
        result.return_code = 0;
        result.return_message = err.message;
      }
    }
  } catch (ex) {
    console.error("❌ Callback Exception:", ex.message);
    result.return_code = 0;
    result.return_message = ex.message;
  }
  // ZaloPay mong đợi phản hồi json này
  res.json(result);
}

// API: Thanh toán trực tiếp (Ấn phát là xong luôn)
export async function createDirectPayment(req, res) {
  const { UserID, ShowtimeID, SelectedSeats = [], VoucherCode, SelectedSnacks = [], TotalAmount } = req.body;
  const pool = await getPool();
  const now = new Date(); // 🔥 Tạo thời gian chung
  const transaction = new sql.Transaction(pool);

  try {
    await transaction.begin();

    console.log(`📝 Processing Direct Payment for User: ${UserID}`);
    let firstTicketID = null;
    
    // Tính toán giảm giá (Direct Payment nhận TotalAmount là giá SAU giảm)
    // Để đơn giản và chính xác nhất, chúng ta nên tính toán số tiền giảm dựa trên Voucher
    let orderDiscount = 0;
    if (VoucherCode) {
        const vRes = await transaction.request()
            .input('vCode', sql.NVarChar, VoucherCode)
            .query("SELECT * FROM Vouchers WHERE Code = @vCode");
        if (vRes.recordset.length > 0) {
            const v = vRes.recordset[0];
            // Ở đây ta tính ngược lại: Giá gốc = TotalAmount + Discount
            // Nhưng vì thanh toán trực tiếp ta có dữ liệu tin cậy hơn, 
            // ta sẽ lấy giá trị giảm giá dựa trên loại Voucher
            if (v.DiscountAmount) orderDiscount = v.DiscountAmount;
            else if (v.DiscountPercent) {
                // Phức tạp hơn chút: TotalAmount = Gốc * (1 - Percent/100) => Gốc = TotalAmount / (1 - Percent/100)
                const original = TotalAmount / (1 - v.DiscountPercent / 100);
                orderDiscount = original - TotalAmount;
            }
        }
    }

    // Hỗ trợ mua lẻ bắp nước cho thanh toán trực tiếp
    if (SelectedSeats.length === 0 && SelectedSnacks.length > 0) {
      const insertTicketRes = await transaction.request()
        .input('UserID', sql.Int, UserID)
        .input('Discount', sql.Decimal(10, 2), orderDiscount)
        .input('Now', sql.DateTime, now)
        .query(`
          INSERT INTO Tickets (UserID, ShowtimeID, SeatID, BookingTime, Status, DiscountAmount)
          OUTPUT inserted.TicketID
          VALUES (@UserID, NULL, NULL, @Now, N'Đã đặt', @Discount)
        `);
      firstTicketID = insertTicketRes.recordset[0].TicketID;
    }

    // 1. Lưu vé
    for (const SeatID of SelectedSeats) {
      const checkResult = await transaction.request()
        .input('ShowtimeID', sql.Int, ShowtimeID)
        .input('SeatID', sql.Int, SeatID)
        .query("SELECT TicketID FROM Tickets WHERE ShowtimeID = @ShowtimeID AND SeatID = @SeatID AND Status != 'Cancelled'");

      if (checkResult.recordset.length === 0) {
        const insertTicketRes = await transaction.request()
          .input('UserID', sql.Int, UserID)
          .input('ShowtimeID', sql.Int, ShowtimeID)
          .input('SeatID', sql.Int, SeatID)
          .input('Now', sql.DateTime, now)
          .input('Discount', sql.Decimal(10, 2), firstTicketID ? 0 : orderDiscount)
          .query(`
            INSERT INTO Tickets (UserID, ShowtimeID, SeatID, BookingTime, Status, DiscountAmount)
            OUTPUT inserted.TicketID
            VALUES (@UserID, @ShowtimeID, @SeatID, @Now, N'Đã đặt', @Discount)
          `);
        if (!firstTicketID) firstTicketID = insertTicketRes.recordset[0].TicketID;
      } else {
        throw new Error("Một trong các ghế bạn chọn đã có người vừa đặt.");
      }
    }

    // 2. Lưu đồ ăn
    if (SelectedSnacks.length > 0) {
      for (const snack of SelectedSnacks) {
        await transaction.request()
          .input('TID', sql.Int, firstTicketID)
          .input('SID', sql.Int, snack.SnackID)
          .input('Qty', sql.Int, snack.Quantity)
          .input('Price', sql.Decimal(10, 2), snack.Price)
          .query(`
            INSERT INTO TicketSnacks (TicketID, SnackID, Quantity, PriceAtBooking)
            VALUES (@TID, @SID, @Qty, @Price)
          `);
      }
    }

    // 3. Xử lý Voucher
    if (VoucherCode) {
      const vResult = await transaction.request()
        .input('Code', sql.NVarChar, VoucherCode)
        .query(`SELECT VoucherID FROM Vouchers WHERE Code = @Code`);

      if (vResult.recordset.length > 0) {
        const vID = vResult.recordset[0].VoucherID;
        await transaction.request().input('vID', sql.Int, vID).query(`UPDATE Vouchers SET Quantity = Quantity - 1 WHERE VoucherID = @vID AND Quantity > 0`);
        await transaction.request()
          .input('uID', sql.Int, UserID)
          .input('vID', sql.Int, vID)
          .query(`
            UPDATE VoucherUsage 
            SET UserQuantity = UserQuantity - 1, IsUsed = CASE WHEN UserQuantity <= 1 THEN 1 ELSE 0 END 
            WHERE UserID = @uID AND VoucherID = @vID AND UserQuantity > 0
          `);
      }
    }

    await transaction.commit();

    // Gửi email xác nhận
    sendBookingConfirmationEmail(UserID, ShowtimeID, SelectedSeats, SelectedSnacks, TotalAmount || 0);

    // 🔥 Kích hoạt Realtime cho thanh toán trực tiếp
    const io = req.app.get('socketio');
    if (ShowtimeID) io.to(ShowtimeID.toString()).emit("update_seat_status");

    res.json({ success: true, message: "Thanh toán trực tiếp thành công!" });
  } catch (err) {
    if (transaction) await transaction.rollback();
    console.error("❌ Direct Payment Error:", err.message);
    res.status(500).json({ success: false, message: err.message });
  }
}

// Helper function: Gửi email xác nhận đặt vé chi tiết
async function sendBookingConfirmationEmail(userId, showtimeId, seatIds, selectedSnacks, totalAmount) {
  try {
    const pool = await getPool();
    
    // 1. Lấy thông tin người dùng (Email lưu ở cột Username)
    const userResult = await pool.request()
      .input('UserID', sql.Int, userId)
      .query("SELECT Username, FullName FROM Users WHERE UserID = @UserID");
    
    if (userResult.recordset.length === 0) return;
    const user = userResult.recordset[0];

    // 2. Lấy thông tin phim và suất chiếu
    let showtimeInfo = null;
    if (showtimeId) {
      const stResult = await pool.request()
        .input('ShowtimeID', sql.Int, showtimeId)
        .query(`
          SELECT st.StartTime, m.Title, r.RoomName
          FROM Showtimes st
          JOIN Movies m ON st.MovieID = m.MovieID
          JOIN Rooms r ON st.RoomID = r.RoomID
          WHERE st.ShowtimeID = @ShowtimeID
        `);
      showtimeInfo = stResult.recordset[0];
    }

    // 3. Lấy danh sách tên ghế từ ID
    let seatNames = [];
    if (seatIds && seatIds.length > 0) {
      const ids = seatIds.join(',');
      const seatsResult = await pool.request().query(`SELECT SeatRow, SeatNumber FROM Seats WHERE SeatID IN (${ids})`);
      seatNames = seatsResult.recordset.map(s => `${s.SeatRow}${s.SeatNumber}`);
    }

    // 4. Lấy tên bắp nước (vì dữ liệu thô chỉ có ID)
    let snacksHtml = "";
    if (selectedSnacks && selectedSnacks.length > 0) {
      const snackIds = selectedSnacks.map(s => s.SnackID).join(',');
      const snackResult = await pool.request().query(`SELECT SnackID, Name FROM Snacks WHERE SnackID IN (${snackIds})`);
      
      snacksHtml = "<p><b>Dịch vụ đi kèm:</b></p><ul style='margin-bottom: 20px;'>";
      selectedSnacks.forEach(s => {
        const info = snackResult.recordset.find(item => item.SnackID === s.SnackID);
        snacksHtml += `<li>${info ? info.Name : 'Sản phẩm'} x${s.Quantity}</li>`;
      });
      snacksHtml += "</ul>";
    }

    const message = `
      <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: auto; border: 1px solid #eee; border-radius: 15px; overflow: hidden; box-shadow: 0 4px 15px rgba(0,0,0,0.05);">
        <div style="background-color: #e11d48; color: white; padding: 30px; text-align: center;">
          <h1 style="margin: 0; font-size: 28px; letter-spacing: -1px;">CinemaDB</h1>
          <p style="margin: 5px 0 0; opacity: 0.8;">Xác nhận giao dịch thành công</p>
        </div>
        <div style="padding: 30px; color: #333; line-height: 1.6;">
          <h2 style="color: #111; margin-top: 0;">Xin chào ${user.FullName || user.Username},</h2>
          <p>Cảm ơn bạn đã đặt vé tại <b>CinemaDB</b>. Đơn hàng của bạn đã được xác nhận thành công. Dưới đây là thông tin chi tiết:</p>
          
          <div style="background-color: #f8fafc; padding: 20px; border-radius: 12px; border-left: 4px solid #e11d48; margin: 25px 0;">
            <p style="margin: 8px 0;"><b>🎬 Phim:</b> ${showtimeInfo ? showtimeInfo.Title : 'Hóa đơn dịch vụ lẻ'}</p>
            <p style="margin: 8px 0;"><b>🏛️ Rạp:</b> ${showtimeInfo ? showtimeInfo.RoomName : 'Quầy Bắp Nước'}</p>
            <p style="margin: 8px 0;"><b>📅 Suất chiếu:</b> ${showtimeInfo ? new Date(showtimeInfo.StartTime).toLocaleString('vi-VN') : 'N/A'}</p>
            <p style="margin: 8px 0;"><b>💺 Ghế:</b> <span style="color: #e11d48; font-weight: bold;">${seatNames.join(', ') || 'Mua lẻ bắp nước'}</span></p>
            ${snacksHtml}
            <div style="text-align: right; border-top: 1px dashed #cbd5e1; margin-top: 15px; pt-15px;">
                <span style="font-size: 14px; color: #64748b;">Tổng cộng:</span><br/>
                <span style="font-size: 24px; color: #e11d48; font-weight: 800;">${Number(totalAmount).toLocaleString()} đ</span>
            </div>
          </div>
          
          <p style="font-size: 14px; color: #475569; background: #fffbeb; padding: 10px; border-radius: 6px; border: 1px solid #fde68a;">
            💡 <b>Lưu ý:</b> Bạn hãy đưa email này cho nhân viên tại rạp để quét mã hoặc đối soát thông tin khi nhận vé và đồ ăn.
          </p>
          <p style="margin-top: 25px;">Chúc bạn có một buổi xem phim thật vui vẻ!</p>
        </div>
        <div style="background-color: #f1f5f9; color: #94a3b8; padding: 15px; text-align: center; font-size: 12px;">
          CinemaDB - Hệ thống rạp chiếu phim hiện đại<br/>
          Đây là email tự động, vui lòng không phản hồi.
        </div>
      </div>
    `;

    await sendEmail({
      email: user.Username, 
      subject: `[CinemaDB] Xác nhận đơn hàng thành công: ${showtimeInfo ? showtimeInfo.Title : 'Dịch vụ lẻ'}`,
      message
    });
  } catch (error) {
    console.error("❌ Lỗi logic gửi email xác nhận:", error.message);
  }
}