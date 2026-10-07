const express = require('express');
const mongoose = require('mongoose');
const router = express.Router();
const AvailabilitySlot = require('../models/AvailabilitySlot');
const Booking = require('../models/Booking');
const User = require('../models/User');
const { protect } = require('../middleware/authMiddleware');
const { availabilityPeriods, parseAvailabilityDate, hasActiveBookingConflict } = require('../utils/availability');

const startOfToday = () => {
    const today = new Date();
    today.setUTCHours(0, 0, 0, 0);
    return today;
};

router.get('/mine', protect, async (req, res) => {
    if (req.user.role !== 'helper') {
        return res.status(403).json({ message: 'Only helpers can view their availability' });
    }

    try {
        const slots = await AvailabilitySlot.find({ helper: req.user._id, date: { $gte: startOfToday() } })
            .sort({ date: 1, preferredTime: 1 });
        res.json({ slots });
    } catch (error) {
        console.error('Unable to load helper availability:', error.message);
        res.status(500).json({ message: 'Unable to load availability' });
    }
});

router.get('/:helperId', async (req, res) => {
    if (!mongoose.Types.ObjectId.isValid(req.params.helperId)) {
        return res.status(400).json({ message: 'Invalid helper ID' });
    }

    try {
        const helper = await User.findOne({ _id: req.params.helperId, role: 'helper', isVerified: true }).select('_id');
        if (!helper) return res.status(404).json({ message: 'Verified helper not found' });

        const slots = await AvailabilitySlot.find({
            helper: helper._id,
            isPublished: true,
            booking: null,
            date: { $gte: startOfToday() }
        }).select('date preferredTime').sort({ date: 1, preferredTime: 1 });
        res.json({ slots });
    } catch (error) {
        console.error('Unable to load public helper availability:', error.message);
        res.status(500).json({ message: 'Unable to load availability' });
    }
});

router.post('/', protect, async (req, res) => {
    if (req.user.role !== 'helper' || !req.user.isVerified) {
        return res.status(403).json({ message: 'Only verified helpers can publish availability' });
    }

    const date = parseAvailabilityDate(req.body.date);
    const { preferredTime } = req.body;
    if (!date || date < startOfToday() || !availabilityPeriods.includes(preferredTime)) {
        return res.status(400).json({ message: 'Choose a valid future date and visit window' });
    }

    try {
        const nextDay = new Date(date);
        nextDay.setUTCDate(nextDay.getUTCDate() + 1);
        const existingBookings = await Booking.find({
            helper: req.user._id,
            date: { $gte: date, $lt: nextDay },
            preferredTime,
            status: { $in: ['pending', 'accepted'] }
        }).select('date preferredTime status').lean();

        if (hasActiveBookingConflict(existingBookings, date, preferredTime)) {
            return res.status(409).json({ message: 'An active booking already uses this visit window' });
        }

        const slot = await AvailabilitySlot.create({ helper: req.user._id, date, preferredTime });
        res.status(201).json({ slot });
    } catch (error) {
        if (error.code === 11000) {
            return res.status(409).json({ message: 'This visit window is already published' });
        }
        console.error('Unable to publish helper availability:', error.message);
        res.status(500).json({ message: 'Unable to publish availability' });
    }
});

router.delete('/:id', protect, async (req, res) => {
    if (req.user.role !== 'helper') {
        return res.status(403).json({ message: 'Only helpers can change their availability' });
    }
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
        return res.status(400).json({ message: 'Invalid availability ID' });
    }

    try {
        const slot = await AvailabilitySlot.findOneAndDelete({
            _id: req.params.id,
            helper: req.user._id,
            booking: null
        });
        if (!slot) return res.status(404).json({ message: 'Available slot not found' });
        res.json({ success: true });
    } catch (error) {
        console.error('Unable to remove helper availability:', error.message);
        res.status(500).json({ message: 'Unable to remove availability' });
    }
});

module.exports = router;
