const crypto = require('crypto');
const nodemailer = require('nodemailer');
const User = require('../models/User');

exports.forgotPassword = async (req, res) => {
    try {
        const { email } = req.body;
        const user = await User.findOne({ email });

        if (!user) {
            return res.status(404).json({ message: "Identity not found in registry." });
        }

        // 1. Generate Random Reset Token
        const resetToken = crypto.randomBytes(32).toString('hex');
        
        // 2. Hash and save to database with 10-minute expiry
        user.resetPasswordToken = crypto.createHash('sha256').update(resetToken).digest('hex');
        user.resetPasswordExpires = Date.now() + 10 * 60 * 1000; // 10 minutes
        await user.save();

        const resetUrl = `http://localhost:3000/reset-password/${resetToken}`;

        const transporter = nodemailer.createTransport({
            service: 'gmail',
            auth: {
                user: process.env.EMAIL_USER,
                pass: process.env.EMAIL_PASS // Use App Password from Google
            }
        });

        const mailOptions = {
            from: '"Silver Connect Registry" <no-reply@registry.com>',
            to: user.email,
            subject: 'PASSWORD RESET PROTOCOL',
            text: `Authorize password reset by clicking: ${resetUrl}`,
            html: `
                <div style="font-family: sans-serif; padding: 20px; border: 1px solid #eee;">
                    <h2 style="color: #0f172a;">Identity Recovery Signal</h2>
                    <p>A password reset has been requested for your node.</p>
                    <a href="${resetUrl}" style="background: #0f172a; color: white; padding: 12px 25px; text-decoration: none; border-radius: 5px; display: inline-block;">Set New Cipher</a>
                    <p style="margin-top: 20px; font-size: 10px; color: #888;">This link expires in 10 minutes.</p>
                </div>
            `
        };

        await transporter.sendMail(mailOptions);
        res.status(200).json({ success: true, message: "Recovery signal dispatched." });

    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Transmitter failure." });
    }
};