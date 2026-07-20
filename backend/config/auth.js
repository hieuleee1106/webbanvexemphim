const JWT_SECRET = process.env.JWT_SECRET || "your_secret_key_here";
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || "1h";

export default {
  JWT_SECRET,
  JWT_EXPIRES_IN
};
