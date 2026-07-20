import sql from "mssql";

const config = {
  server: "127.0.0.1", // Quan trọng: Đổi localhost -> 127.0.0.1 để tránh lỗi treo kết nối
  port: 1433,        // thêm dòng này
  database: "CinemaDB",
  user: "sa",
  password: "123456",
  options: {
    encrypt: false,
    trustServerCertificate: true
  }
};

let pool;

export async function connectDB() {
  try {
    pool = new sql.ConnectionPool(config);
    await pool.connect();
    console.log("✅ Kết nối SQL Server thành công!");
    return pool;
  } catch (error) {
    console.error("❌ Lỗi kết nối:", error.message);
    throw error;
  }
}

export async function getPool() {
  if (!pool) {
    return await connectDB();
  }
  return pool;
}

export default { connectDB, getPool };