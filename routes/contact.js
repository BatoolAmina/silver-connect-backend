const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const Contact = require('../models/Contact');
const { protect, adminOnly } = require('../middleware/authMiddleware');

router.post('/', async (req, res) => {
    try {
        const name = typeof req.body.name === 'string' ? req.body.name.trim() : '';
        const email = typeof req.body.email === 'string' ? req.body.email.trim().toLowerCase() : '';
        const subject = typeof req.body.subject === 'string' ? req.body.subject.trim() : '';
        const message = typeof req.body.message === 'string' ? req.body.message.trim() : '';

        if (!name || !email || !message) {
            return res.status(400).json({ message: 'Name, email, and message are required.' });
        }
        if (!/^\S+@\S+\.\S+$/.test(email)) {
            return res.status(400).json({ message: 'Enter a valid email address.' });
        }
        if (name.length > 80 || email.length > 254 || subject.length > 120 || message.length > 3000) {
            return res.status(400).json({ message: 'One or more fields exceed the allowed length.' });
        }

        const newMessage = new Contact({ name, email, subject, message });
        await newMessage.save();
        res.status(201).json({ success: true, message: "Message Sent." });
    } catch (err) {
        res.status(500).json({ message: "Server Error" });
    }
});

router.get('/', protect, adminOnly, async (req, res) => {
    try {
        const messages = await Contact.find().sort({ createdAt: -1 });
        res.json(messages);
    } catch (err) {
        res.status(500).json({ message: "Fetch Failed" });
    }
});

router.patch('/:id/read', protect, adminOnly, async (req, res) => {
    try {
        if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
            return res.status(400).json({ message: 'Invalid message ID.' });
        }
        const message = await Contact.findByIdAndUpdate(
            req.params.id,
            { status: 'read' },
            { new: true, runValidators: true }
        );
        if (!message) return res.status(404).json({ message: 'Message not found.' });
        res.json({ success: true, message });
    } catch (err) {
        res.status(500).json({ message: 'Unable to update message.' });
    }
});

router.delete('/:id', protect, adminOnly, async (req, res) => {
    try {
        if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
            return res.status(400).json({ message: 'Invalid message ID.' });
        }
        const message = await Contact.findByIdAndDelete(req.params.id);
        if (!message) return res.status(404).json({ message: 'Message not found.' });
        res.json({ message: "Message deleted" });
    } catch (err) {
        res.status(500).json({ message: "Delete Failed" });
    }
});

module.exports = router;