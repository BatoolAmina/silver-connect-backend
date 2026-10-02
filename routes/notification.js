const express = require('express');
const router = express.Router();
const Notification = require('../models/Notification');
const { protect } = require('../middleware/authMiddleware');

router.get('/my', protect, async (req, res) => {
    try {
        const notifications = await Notification.find({ recipient: req.user._id })
            .sort({ createdAt: -1 })
            .limit(50);
        const unreadCount = notifications.filter((notification) => !notification.readAt).length;
        res.json({ notifications, unreadCount });
    } catch (err) {
        res.status(500).json({ message: 'Unable to load notifications' });
    }
});

router.patch('/read-all', protect, async (req, res) => {
    try {
        await Notification.updateMany(
            { recipient: req.user._id, readAt: null },
            { $set: { readAt: new Date() } }
        );
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ message: 'Unable to mark notifications as read' });
    }
});

router.patch('/:id/read', protect, async (req, res) => {
    try {
        const notification = await Notification.findOneAndUpdate(
            { _id: req.params.id, recipient: req.user._id },
            { $set: { readAt: new Date() } },
            { new: true }
        );

        if (!notification) return res.status(404).json({ message: 'Notification not found' });
        res.json({ success: true, notification });
    } catch (err) {
        res.status(500).json({ message: 'Unable to update notification' });
    }
});

module.exports = router;