const express = require('express');
const mongoose = require('mongoose');
const router = express.Router();
const Booking = require('../models/Booking');
const AvailabilitySlot = require('../models/AvailabilitySlot');
const Notification = require('../models/Notification');
const User = require('../models/User');
const { protect } = require('../middleware/authMiddleware');
const { bookingStatuses, isValidTransition, canTransitionBooking } = require('../utils/bookingWorkflow');
const { availabilityPeriods } = require('../utils/availability');

router.post('/create', protect, async (req, res) => {
    try {
        const {
            helperId,
            date,
            phone,
            address,
            notes,
            serviceType,
            preferredTime,
            durationHours,
            emergencyContactName,
            emergencyContactPhone
        } = req.body;

        if (!helperId || !date || !phone || !address) {
            return res.status(400).json({ message: "Mandatory fields missing" });
        }

        if (!mongoose.Types.ObjectId.isValid(helperId)) {
            return res.status(400).json({ message: "Invalid helper ID" });
        }

        if (req.user.role !== 'user') {
            return res.status(403).json({ message: "Only care recipients can create bookings" });
        }

        if (req.user._id.toString() === helperId) {
            return res.status(400).json({ message: "Self-booking restricted" });
        }

        const helper = await User.findOne({ _id: helperId, role: 'helper', isVerified: true });
        if (!helper) {
            return res.status(404).json({ message: "Verified helper not found" });
        }

        const visitDate = new Date(date);
        const today = new Date();
        today.setUTCHours(0, 0, 0, 0);
        const requestedDay = new Date(visitDate);
        requestedDay.setUTCHours(0, 0, 0, 0);
        if (Number.isNaN(visitDate.getTime()) || requestedDay < today) {
            return res.status(400).json({ message: "Choose a valid future visit date" });
        }

        if (serviceType && !['Companionship', 'Personal care', 'Meal preparation', 'Mobility support', 'Medication reminders', 'Transportation'].includes(serviceType)) {
            return res.status(400).json({ message: "Choose a valid care service" });
        }

        if (preferredTime && !availabilityPeriods.includes(preferredTime)) {
            return res.status(400).json({ message: "Choose a valid preferred time" });
        }

        const visitDuration = durationHours === undefined ? 2 : Number(durationHours);
        if (!Number.isInteger(visitDuration) || visitDuration < 1 || visitDuration > 12) {
            return res.status(400).json({ message: "Visit duration must be between 1 and 12 hours" });
        }

        const visitDay = new Date(visitDate);
        visitDay.setUTCHours(0, 0, 0, 0);
        const requestedTime = preferredTime || 'Morning';
        const newBooking = new Booking({
            user: req.user._id,
            helper: helper._id,
            helperName: helper.name,
            helperEmail: helper.email,
            seniorName: req.user.name,
            seniorEmail: req.user.email,
            date: visitDate,
            phone,
            address,
            notes,
            serviceType: serviceType || 'Companionship',
            preferredTime: requestedTime,
            durationHours: visitDuration,
            emergencyContactName,
            emergencyContactPhone,
            status: 'pending',
            statusHistory: [{ status: 'pending', changedBy: req.user._id, note: 'Booking requested' }]
        });

        const slot = await AvailabilitySlot.findOneAndUpdate(
            {
                helper: helper._id,
                date: visitDay,
                preferredTime: requestedTime,
                booking: null
            },
            { $set: { booking: newBooking._id } },
            { new: true }
        );
        if (!slot) {
            return res.status(409).json({ message: 'That visit window is unavailable. Please choose a published open slot.' });
        }

        newBooking.availabilitySlot = slot._id;
        try {
            await newBooking.save();
        } catch (error) {
            await AvailabilitySlot.updateOne(
                { _id: slot._id, booking: newBooking._id },
                { $set: { booking: null } }
            );
            throw error;
        }
        try {
            await Notification.create({
                recipient: helper._id,
                booking: newBooking._id,
                title: 'New care visit request',
                message: `${req.user.name} requested ${newBooking.serviceType} for ${visitDate.toLocaleDateString()}.`
            });
        } catch (notificationError) {
            console.error('Booking notification could not be created:', notificationError.message);
        }
        res.status(201).json({ success: true, message: 'Authorized', booking: newBooking });
    } catch (err) {
        res.status(500).json({ message: 'Dispatch Fault' });
    }
});

router.get('/my-requests', protect, async (req, res) => {
    try {
        const bookings = await Booking.find({ user: req.user.id })
            .populate('helper', 'name specialty avatar email')
            .populate('statusHistory.changedBy', 'name role')
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
            .populate('statusHistory.changedBy', 'name role')
            .sort({ date: 1 });
        res.json(tasks);
    } catch (err) {
        res.status(500).json({ message: 'Fetch failed' });
    }
});

router.patch('/:id/status', protect, async (req, res) => {
    try {
        const { status, note } = req.body;
        if (!bookingStatuses.includes(status)) {
            return res.status(400).json({ message: "Invalid booking status" });
        }

        const booking = await Booking.findById(req.params.id);

        if (!booking) return res.status(404).json({ message: "Not found" });

        const isRequester = booking.user.toString() === req.user._id.toString();
        const isAssignedHelper = booking.helper.toString() === req.user._id.toString();
        const isAdmin = req.user.role === 'admin';

        if (!isRequester && !isAssignedHelper && !isAdmin) {
            return res.status(403).json({ message: "Unauthorized" });
        }

        if (!canTransitionBooking({
            currentStatus: booking.status,
            nextStatus: status,
            actorRole: req.user.role,
            isRequester,
            isAssignedHelper
        })) {
            if (!isValidTransition(booking.status, status)) {
                return res.status(400).json({ message: `Cannot change booking from ${booking.status} to ${status}` });
            }
            return res.status(403).json({ message: "This action is not available to your account" });
        }

        booking.status = status;
        booking.statusHistory.push({
            status,
            changedBy: req.user._id,
            note: typeof note === 'string' ? note.trim().slice(0, 250) : undefined
        });
        await booking.save();
        if (['rejected', 'cancelled'].includes(status) && booking.availabilitySlot) {
            await AvailabilitySlot.updateOne(
                { _id: booking.availabilitySlot, booking: booking._id },
                { $set: { booking: null } }
            );
        }
        const recipients = isAdmin
            ? [booking.user, booking.helper]
            : [isRequester ? booking.helper : booking.user];
        try {
            await Notification.insertMany(recipients.map((recipient) => ({
                recipient,
                booking: booking._id,
                title: `Care visit ${status}`,
                message: `${req.user.name} changed booking ${booking._id.toString().slice(-6).toUpperCase()} to ${status}.`
            })));
        } catch (notificationError) {
            console.error('Booking status notification could not be created:', notificationError.message);
        }
        res.json({ success: true, message: 'Updated', booking });
    } catch (err) {
        res.status(500).json({ message: 'Update failed' });
    }
});

module.exports = router;