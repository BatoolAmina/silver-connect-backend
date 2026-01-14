const express = require('express');
const router = express.Router();
const User = require('../models/User');
const { protect } = require('../middleware/authMiddleware');

router.get('/profile/:id', async (req, res) => {
    try {
        const helper = await User.findOne({ 
            _id: req.params.id, 
            role: 'helper',
            isVerified: true 
        }).select('name email phone specialty experience workArea summary avatar rating bio reviewCount'); // EMAIL ADDED HERE

        if (!helper) {
            return res.status(404).json({ success: false, message: "Specialist not found or unverified." });
        }

        res.json({ success: true, data: helper });
    } catch (err) {
        res.status(500).json({ success: false, message: "Registry retrieval error." });
    }
});

router.put('/update-dossier', protect, async (req, res) => {
    try {
        if (req.user.role !== 'helper') {
            return res.status(403).json({ success: false, message: "Access Denied: Helper credentials required." });
        }

        const allowedUpdates = ['specialty', 'experience', 'summary', 'workArea', 'bio', 'phone'];
        const updates = Object.keys(req.body);
        const isValidOperation = updates.every((update) => allowedUpdates.includes(update));

        if (!isValidOperation) {
            return res.status(400).json({ success: false, message: "Invalid update fields detected." });
        }

        const helper = await User.findByIdAndUpdate(
            req.user.id,
            { $set: req.body },
            { new: true, runValidators: true }
        ).select('-password');

        res.json({ success: true, message: "✓ Dossier updated successfully.", data: helper });

    } catch (err) {
        res.status(500).json({ success: false, message: "Dossier update failed." });
    }
});

router.get('/my-stats', protect, async (req, res) => {
    try {
        if (req.user.role !== 'helper') {
            return res.status(403).json({ success: false, message: "Forbidden" });
        }

        const stats = await User.findById(req.user.id)
            .select('rating reviewCount isVerified applicationStatus createdAt');
            
        if (!stats) {
            return res.status(404).json({ success: false, message: "Stats not found." });
        }

        res.json({ success: true, data: stats });
    } catch (err) {
        res.status(500).json({ success: false, message: "Stats retrieval failed." });
    }
});

router.get('/verified', protect, async (req, res) => {
    try {
        const helpers = await User.find({ role: 'helper', isVerified: true })
            .select('name email phone specialty workArea experience');
        res.json({ success: true, data: helpers });
    } catch (err) {
        res.status(500).json({ success: false, message: "Failed to fetch verified helpers." });
    }
});

module.exports = router;