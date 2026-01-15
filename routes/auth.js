const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { OAuth2Client } = require('google-auth-library');
const User = require('../models/User');
const Booking = require('../models/Booking');
const Review = require('../models/Review');
const { protect, adminOnly } = require('../middleware/authMiddleware');
const crypto = require('crypto');
const nodemailer = require('nodemailer');


const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

router.post('/register', async (req, res) => {
    try {
        const { name, email, password, role } = req.body;
        if (!email || !password || !name) {
            return res.status(400).json({ message: 'All fields are required for registry.' });
        }
        const normalizedEmail = email.toLowerCase().trim();
        let user = await User.findOne({ email: normalizedEmail });
        if (user) {
            return res.status(400).json({ message: 'Identity already exists in registry.' });
        }
        user = new User({ 
            name, 
            email: normalizedEmail, 
            password, 
            role: role || 'user' 
        });
        const salt = await bcrypt.genSalt(12);
        user.password = await bcrypt.hash(password, salt);
        await user.save();
        res.status(201).json({ message: '✓ Registration Successful.' });
    } catch (err) {
        res.status(500).json({ message: 'Registry Server Error' });
    }
});

router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        if (!email || !password) return res.status(400).json({ message: 'Missing credentials.' });
        const user = await User.findOne({ email: email.toLowerCase().trim() });
        if (!user) return res.status(400).json({ message: 'Invalid Protocol: Identity Mismatch.' });
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) return res.status(400).json({ message: 'Invalid Protocol: Credential Mismatch.' });
        const token = jwt.sign(
            { id: user._id, role: user.role },
            process.env.JWT_SECRET,
            { expiresIn: '1d' }
        );
        res.json({
            token,
            user: { 
                id: user._id, 
                name: user.name, 
                email: user.email, 
                role: user.role, 
                isVerified: user.isVerified 
            }
        });
    } catch (err) {
        res.status(500).json({ message: 'Handshake Failed' });
    }
});

router.post('/google-login', async (req, res) => {
    try {
        const { idToken, role } = req.body;
        if (!idToken) return res.status(400).json({ message: 'Token missing.' });
        const ticket = await client.verifyIdToken({
            idToken,
            audience: process.env.GOOGLE_CLIENT_ID,
        });
        const { email, name, sub: googleId, picture: avatar } = ticket.getPayload();
        const normalizedEmail = email.toLowerCase().trim();
        let user = await User.findOne({ email: normalizedEmail });
        if (!user) {
            user = new User({ 
                name, 
                email: normalizedEmail, 
                googleId, 
                avatar, 
                role: role || 'user', 
                isVerified: role === 'helper' ? false : true 
            });
            await user.save();
        }
        const token = jwt.sign(
            { id: user._id, role: user.role },
            process.env.JWT_SECRET,
            { expiresIn: '1d' }
        );
        res.json({ token, user });
    } catch (err) {
        res.status(401).json({ message: 'Google Authentication Failed' });
    }
});

router.get('/verified-helpers', async (req, res) => {
    try {
        const helpers = await User.find({ role: 'helper', isVerified: true })
            .select('name specialty experience workArea avatar summary email phone bio');
        res.status(200).json(helpers);
    } catch (err) {
        res.status(500).json({ message: 'Internal Registry Fault' });
    }
});

router.get('/me', protect, async (req, res) => {
    try {
        const user = await User.findById(req.user.id).select('-password');
        res.json(user);
    } catch (err) {
        res.status(500).json({ message: 'Server Error' });
    }
});

router.put('/update-profile', protect, async (req, res) => {
    try {
        const updates = req.body;
        delete updates.role;
        delete updates.isVerified;
        delete updates.email;
        const user = await User.findByIdAndUpdate(req.user.id, updates, { new: true }).select('-password');
        res.json({ message: 'Profile updated successfully', user });
    } catch (err) {
        res.status(500).json({ message: 'Internal Server Error' });
    }
});

router.post('/upgrade-to-helper', protect, async (req, res) => {
    try {
        const user = await User.findById(req.user.id);
        if (!user) return res.status(404).json({ message: 'Identity not found.' });
        Object.assign(user, req.body);
        user.applicationStatus = 'pending';
        user.role = 'helper'; 
        user.isVerified = false;
        await user.save();
        res.json({ message: '✓ Dossier Filed. Awaiting Vetting.' });
    } catch (err) {
        res.status(500).json({ message: 'Internal Registry Fault' });
    }
});

router.get('/admin/users', protect, adminOnly, async (req, res) => {
    try {
        const users = await User.find({}).select('-password').sort({ createdAt: -1 });
        res.json(users);
    } catch (err) {
        res.status(500).json({ message: 'User retrieval failed' });
    }
});

router.post('/admin/verify-helper', protect, adminOnly, async (req, res) => {
    try {
        const { userId, status } = req.body;
        const helper = await User.findById(userId);
        if (!helper) return res.status(404).json({ message: 'Helper not found' });
        if (status === 'approved') {
            helper.isVerified = true;
            helper.applicationStatus = 'approved';
            helper.role = 'helper';
        } else {
            helper.isVerified = false;
            helper.applicationStatus = 'rejected';
            helper.role = 'user';
        }
        await helper.save();
        res.json({ message: `Audit Protocol: ${status.toUpperCase()}` });
    } catch (err) {
        res.status(500).json({ message: 'Update Failed' });
    }
});

router.delete('/admin/users/:id', protect, adminOnly, async (req, res) => {
    try {
        await User.findByIdAndDelete(req.params.id);
        res.json({ message: 'Entity purged from registry' });
    } catch (err) {
        res.status(500).json({ message: 'Purge operation failed' });
    }
});

router.get('/helper/stats', protect, async (req, res) => {
    try {
        const bookings = await Booking.find({ helper: req.user.id }).populate('user', 'name');
        const reviews = await Review.find({ helper: req.user.id }).populate('user', 'name avatar');
        res.json({ bookings, reviews });
    } catch (err) {
        res.status(500).json({ message: 'Error fetching helper stats' });
    }
});

router.get('/admin/pending-helpers', protect, adminOnly, async (req, res) => {
    try {
        const pendingHelpers = await User.find({ 
            role: 'helper', 
            isVerified: false,
            applicationStatus: 'pending' 
        }).select('-password').sort({ createdAt: -1 });
        res.json(pendingHelpers);
    } catch (err) {
        res.status(500).json({ message: 'Pending retrieval failed' });
    }
});

router.post('/forgot-password', async (req, res) => {
    try {
        const { email } = req.body;
        const normalizedEmail = email.toLowerCase().trim();
        const user = await User.findOne({ email: normalizedEmail });
        
        if (!user) {
            return res.status(404).json({ message: "User identity not found in registry." });
        }

        const resetToken = crypto.randomBytes(32).toString('hex');
        user.resetPasswordToken = resetToken;
        user.resetPasswordExpire = Date.now() + 3600000;
        await user.save();

        const resetUrl = `${process.env.FRONTEND_URL}/reset-password/${resetToken}`;

        const transporter = nodemailer.createTransport({
            host: 'smtp.gmail.com',
            port: 465,
            secure: true,
            auth: {
                user: process.env.EMAIL_USER,
                pass: process.env.EMAIL_PASS
            },
            tls: {
                rejectUnauthorized: false
            },
            connectionTimeout: 20000,
            greetingTimeout: 20000,
            socketTimeout: 20000
        });

        transporter.verify((error, success) => {
            if (error) console.log("SMTP Setup Error:", error);
            else console.log("✓ SMTP Server is ready");
        });

        const mailOptions = {
            from: `"Silver Connect Registry" <${process.env.EMAIL_USER}>`,
            to: user.email,
            subject: 'Password Reset Request | Secure Access',
            html: `
                <div style="font-family: sans-serif; padding: 25px; border: 1px solid #e2e8f0; border-radius: 15px; max-width: 500px; margin: auto;">
                    <h2 style="color: #0f172a; text-align: center;">RESTORE ACCESS</h2>
                    <p style="color: #475569; line-height: 1.6;">An identity recovery request was initiated. Use the secure link below to reset your cipher.</p>
                    <div style="text-align: center; margin: 30px 0;">
                        <a href="${resetUrl}" style="background: #0f172a; color: white; padding: 15px 30px; text-decoration: none; border-radius: 10px; font-weight: bold; display: inline-block; letter-spacing: 1px;">RESET PASSWORD</a>
                    </div>
                    <p style="color: #94a3b8; font-size: 11px; text-align: center;">This link expires in 60 minutes. If you did not request this, no action is required.</p>
                </div>
            `
        };

        await transporter.sendMail(mailOptions);

        res.status(200).json({ 
            success: true, 
            message: "RECOVERY LINK DISPATCHED TO REGISTERED NODE." 
        });

    } catch (err) {
        console.error("NODEMAILER ERROR:", err);

        res.status(500).json({ 
            success: false,
            message: "Security Protocol: Email dispatch failed. Please verify your credentials or try again later.",
        });
    }
});

router.put('/reset-password/:token', async (req, res) => {
    try {
        const user = await User.findOne({
            resetPasswordToken: req.params.token,
            resetPasswordExpire: { $gt: Date.now() }
        });

        if (!user) {
            return res.status(400).json({ message: "Invalid or expired recovery token." });
        }

        const salt = await bcrypt.genSalt(12);
        user.password = await bcrypt.hash(req.body.password, salt);
        
        user.resetPasswordToken = undefined;
        user.resetPasswordExpire = undefined;
        
        await user.save();

        res.status(200).json({ 
            success: true, 
            message: "CREDENTIALS UPDATED. ACCESS RESTORED." 
        });
    } catch (err) {
        console.error("RESET ERROR:", err);
        res.status(500).json({ message: "Registry update failed." });
    }
});

module.exports = router;