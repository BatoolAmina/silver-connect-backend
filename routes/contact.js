const express = require('express');
const router = express.Router();
const Contact = require('../models/Contact');
const { protect, adminOnly } = require('../middleware/authMiddleware');

router.post('/', async (req, res) => {
    try {
        const { name, email, subject, message } = req.body;
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

router.delete('/:id', protect, adminOnly, async (req, res) => {
    try {
        await Contact.findByIdAndDelete(req.params.id);
        res.json({ message: "Message deleted" });
    } catch (err) {
        res.status(500).json({ message: "Delete Failed" });
    }
});

module.exports = router;