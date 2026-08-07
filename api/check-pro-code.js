const crypto = require('crypto');

export default async function handler(req, res) {
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

    try {
        const { code, hash } = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;

        const secret = process.env.OTP_SECRET || 'fallback-secret-key-do-not-use-in-prod';
        
        // Hash the code provided by the user
        const expectedHash = crypto.createHmac('sha256', secret).update(code.toUpperCase()).digest('hex');

        // Check if it matches the hash we sent earlier
        if (hash === expectedHash) {
            return res.status(200).json({ success: true, valid: true });
        } else {
            return res.status(400).json({ error: 'Invalid PRO CODE' });
        }
    } catch (error) {
        console.error('Pro Code check error:', error);
        return res.status(500).json({ error: error.message || 'Failed to check Pro Code' });
    }
}
