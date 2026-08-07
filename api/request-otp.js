const crypto = require('crypto');
const nodemailer = require('nodemailer');

export default async function handler(req, res) {
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

    try {
        const { email } = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;

        const otp = Math.floor(100000 + Math.random() * 900000).toString();
        
        // Hash the OTP securely
        const secret = process.env.OTP_SECRET || 'fallback-secret-key-do-not-use-in-prod';
        const hash = crypto.createHmac('sha256', secret).update(`${email}:${otp}`).digest('hex');

        const transporter = nodemailer.createTransport({
            service: 'gmail',
            auth: {
                user: process.env.EMAIL_USER,
                pass: process.env.EMAIL_PASS
            }
        });

        await transporter.sendMail({
            from: process.env.EMAIL_USER,
            to: email,
            subject: 'Money Tracker Pro - Verification Code',
            html: `Your verification code is: <b style="font-size: 24px;">${otp}</b>`
        });

        return res.status(200).json({ success: true, hash: hash });
    } catch (error) {
        console.error('OTP request error:', error);
        return res.status(500).json({ error: error.message || 'Failed to request OTP' });
    }
}
