const express = require('express');
const router = express.Router();
const Booking = require('../models/Booking');
const { protect } = require('../middleware/authMiddleware');

router.post('/create', protect, async (req, res) => {
    try {
        const { 
            helperId, 
            helperName, 
            helperEmail, 
            seniorName, 
            seniorEmail, 
            date, 
            phone, 
            address, 
            notes 
        } = req.body;

        if (!helperId || !date || !phone || !address) {
            return res.status(400).json({ message: "Mandatory fields missing" });
        }

        if (req.user.id === helperId) {
            return res.status(400).json({ message: "Self-booking restricted" });
        }

        const newBooking = new Booking({
            user: req.user.id,
            helper: helperId,
            helperName,
            helperEmail,
            seniorName,
            seniorEmail,
            date,
            phone,
            address,
            notes,
            status: 'pending'
        });

        await newBooking.save();
        res.status(201).json({ success: true, message: 'Authorized', booking: newBooking });
    } catch (err) {
        res.status(500).json({ message: 'Dispatch Fault' });
    }
});

router.get('/my-requests', protect, async (req, res) => {
    try {
        const bookings = await Booking.find({ user: req.user.id })
            .populate('helper', 'name specialty avatar email')
            .sort({ createdAt: -1 });
        res.json(bookings);
    } catch (err) {
        res.status(500).json({ message: 'Fetch failed' });
    }
});

router.get('/helper-tasks', protect, async (req, res) => {
    try {
        if (req.user.role !== 'helper') {
            return res.status(403).json({ message: "Access Denied" });
        }

        const tasks = await Booking.find({ helper: req.user.id })
            .populate('user', 'name phone address email')
            .sort({ date: 1 });
        res.json(tasks);
    } catch (err) {
        res.status(500).json({ message: 'Fetch failed' });
    }
});

router.patch('/:id/status', protect, async (req, res) => {
    try {
        const { status } = req.body;
        const booking = await Booking.findById(req.params.id);

        if (!booking) return res.status(404).json({ message: "Not found" });

        const isOwner = booking.user.toString() === req.user.id || booking.helper.toString() === req.user.id;
        const isAdmin = req.user.role === 'admin';

        if (!isOwner && !isAdmin) {
            return res.status(403).json({ message: "Unauthorized" });
        }

        booking.status = status;
        await booking.save();
        res.json({ success: true, message: 'Updated', booking });
    } catch (err) {
        res.status(500).json({ message: 'Update failed' });
    }
});

module.exports = router;