const crypto = require('crypto');
const nodemailer = require('nodemailer');

export default async function handler(req, res) {
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

    try {
        const { email, otp, hash, userData } = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;

        const secret = process.env.OTP_SECRET || 'fallback-secret-key-do-not-use-in-prod';
        
        // Verify the OTP
        const expectedHash = crypto.createHmac('sha256', secret).update(`${email}:${otp}`).digest('hex');
        if (hash !== expectedHash) {
            return res.status(400).json({ error: 'Invalid OTP' });
        }

        // Generate a random 8-character PRO CODE on the server
        const generatedProCode = crypto.randomBytes(4).toString('hex').toUpperCase();
        
        // Hash the PRO CODE so the frontend can securely verify it later
        const proCodeHash = crypto.createHmac('sha256', secret).update(generatedProCode).digest('hex');
        
        const adminEmail = process.env.EMAIL_USER;

        const transporter = nodemailer.createTransport({
            service: 'gmail',
            auth: {
                user: adminEmail,
                pass: process.env.EMAIL_PASS
            }
        });

        await transporter.sendMail({
            from: adminEmail,
            to: adminEmail, // Sending to admin
            subject: "Pro Access Request - Action Required", 
            html: `<h3>Pro Access Request</h3>
                 <p><b>Name:</b> ${userData.name}</p>
                 <p><b>Phone:</b> ${userData.phone}</p>
                 <p><b>Email:</b> ${userData.email}</p>
                 <hr>
                 <p>The user has successfully verified their email. If you want to grant them Pro access, send them the following PRO CODE:</p>
                 <h2 style="color:blue;">${generatedProCode}</h2>`
        });

        // Return the hashed pro code back to the frontend.
        // It's a hash, so the user cannot reverse engineer the actual PRO CODE.
        return res.status(200).json({ success: true, proCodeHash: proCodeHash });
    } catch (error) {
        console.error('OTP verify error:', error);
        return res.status(500).json({ error: error.message || 'Failed to verify OTP' });
    }
}
