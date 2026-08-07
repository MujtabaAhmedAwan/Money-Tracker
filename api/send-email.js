const nodemailer = require('nodemailer');

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        const { to, subject, html } = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;

        // Hardcoded securely (Repository is Private)
        const adminEmail = 'sultanmujtabaahmedawan@gmail.com';
        const appPassword = 'bafhjdmivstfhkyy';

        const transporter = nodemailer.createTransport({
            service: 'gmail',
            auth: {
                user: adminEmail,
                pass: appPassword
            }
        });

        const info = await transporter.sendMail({
            from: adminEmail,
            to: to,
            subject: subject,
            html: html
        });

        return res.status(200).json({ success: true, messageId: info.messageId });
    } catch (error) {
        console.error('Email sending error:', error);
        return res.status(500).json({ error: error.message || 'Failed to send email' });
    }
}
