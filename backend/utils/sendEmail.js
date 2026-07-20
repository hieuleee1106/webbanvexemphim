import nodemailer from 'nodemailer';

const sendEmail = async (options) => {
  // 1. Tạo một transporter (dịch vụ gửi mail)
  const transporter = nodemailer.createTransport({
    host: process.env.EMAIL_HOST,
    port: process.env.EMAIL_PORT,
    secure: false, // true for 465, false for other ports
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
  });

  // 2. Định nghĩa các tùy chọn email
  const mailOptions = {
    from: 'CinemaDB <noreply@cinemadb.com>',
    to: options.email,
    subject: options.subject,
    html: options.message,
  };

  // 3. Gửi email
  await transporter.sendMail(mailOptions);
};

export default sendEmail;