import express from "express";
import nodemailer from "nodemailer";
import cors from "cors";
import dotenv from "dotenv";
import fetch from "node-fetch"; // needed for reCAPTCHA verification
import rateLimit from "express-rate-limit";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

const contactLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 2,
  message: "Too many messages from this IP, please try again later.",
});

app.post("/contact", contactLimiter, async (req, res) => {
  const { name, email, msg, token } = req.body;

  if (!name || !email || !msg || !token) {
    return res.status(400).json({ message: "All fields required" });
  }

  try {
    // ── Verify reCAPTCHA with Google ──
    const secretKey = process.env.RECAPTCHA_SECRET; // add in .env
    const verifyUrl = `https://www.google.com/recaptcha/api/siteverify?secret=${secretKey}&response=${token}`;
    const response = await fetch(verifyUrl, { method: "POST" });
    const data = await response.json();

    if (!data.success) {
      return res.status(400).json({ message: "Failed reCAPTCHA verification" });
    }

    // ── Send email via Nodemailer ──
    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });

    await transporter.sendMail({
      from: `"Portfolio Contact" <${process.env.EMAIL_USER}>`,
      to: process.env.EMAIL_USER,
      subject: `Portfolio Message from ${name} (${email})`,
      text: `Name: ${name}\nEmail: ${email}\n\nMessage:\n${msg}`,
      replyTo: email,
    });

    res.status(200).json({ message: "Email sent!" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to send email" });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
