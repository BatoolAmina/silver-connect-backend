const express = require('express');
const router = express.Router();
const { protect, adminOnly } = require('../middleware/authMiddleware');
const User = require('../models/User');
const Booking = require('../models/Booking');

router.use(protect);
router.use(adminOnly);

router.get('/stats', async (req, res) => {
    try {
        const totalUsers = await User.countDocuments({ role: 'user' });
        const totalHelpers = await User.countDocuments({ role: 'helper' });
        const pendingHelpers = await User.countDocuments({ role: 'helper', isVerified: false });
        const totalBookings = await Booking.countDocuments();

        res.status(200).json({
            success: true,
            stats: { totalUsers, totalHelpers, pendingHelpers, totalBookings }
        });
    } catch (err) {
        res.status(500).json({ message: "Analytics Audit Failed" });
    }
});

router.get('/pending-helpers', async (req, res) => {
    try {
        const helpers = await User.find({ role: 'helper', isVerified: false })
            .select('-password')
            .sort({ createdAt: -1 });
        res.status(200).json(helpers);
    } catch (err) {
        res.status(500).json({ message: "Registry Fetch Failed" });
    }
});

router.put('/verify-helper/:id', async (req, res) => {
    try {
        const helper = await User.findByIdAndUpdate(
            req.params.id, 
            { isVerified: true }, 
            { new: true }
        );
        if (!helper) return res.status(404).json({ message: "Dossier not found" });
        
        res.status(200).json({ message: `Dossier for ${helper.name} verified successfully.` });
    } catch (err) {
        res.status(500).json({ message: "Verification Authorization Error" });
    }
});

router.delete('/remove-user/:id', async (req, res) => {
    try {
        await User.findByIdAndDelete(req.params.id);
        res.status(200).json({ message: "Entity successfully purged from registry." });
    } catch (err) {
        res.status(500).json({ message: "Purge Request Failed" });
    }
});

router.get('/all-bookings', protect, adminOnly, async (req, res) => {
    try {
        const bookings = await Booking.find()
            .populate('user', 'name email')
            .populate('helper', 'name specialty')
            .sort({ createdAt: -1 });
        res.status(200).json(bookings);
    } catch (err) {
        res.status(500).json({ message: "Dispatch registry offline." });
    }
});

module.exports = router;