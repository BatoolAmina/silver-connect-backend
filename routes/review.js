const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const Review = require('../models/Review');
const { protect } = require('../middleware/authMiddleware');

router.post('/add', protect, async (req, res) => {
    try {
        const { helper, booking, rating, reviewText } = req.body;

        if (!helper || !booking) {
            return res.status(400).json({ message: "Invalid Dossier: Helper or Booking ID is missing." });
        }

        const newReview = new Review({
            user: req.user.id,
            helper: helper,
            booking: booking,
            rating: Number(rating),
            reviewText: reviewText
        });

        await newReview.save();
        res.status(201).json({ success: true, message: "Registry Signal Logged." });

    } catch (err) {
        console.error("CRITICAL BACKEND ERROR:", err);
        if (err.name === 'CastError' || err.message.includes('BSONError')) {
            return res.status(400).json({ message: "Identity Format Error: Invalid ID provided." });
        }
        res.status(500).json({ message: "Internal Registry Failure." });
    }
});

router.get('/my-reviews', protect, async (req, res) => {
    try {
        const userReviews = await Review.find({ user: req.user.id })
            .populate('helper', 'name email specialty') 
            .sort({ createdAt: -1 });

        res.status(200).json(userReviews);
    } catch (err) {
        res.status(500).json({ message: "Internal Registry Error." });
    }
});

router.get('/helper/:helperId', async (req, res) => {
    try {
        const reviews = await Review.find({ helper: req.params.helperId })
            .populate({
                path: 'user',
                select: 'name email',
                model: 'User'
            })
            .sort({ createdAt: -1 });

        res.json(reviews);
    } catch (err) {
        res.status(500).json({ message: "Error fetching audits." });
    }
});

router.delete('/:id', protect, async (req, res) => {
    try {
        const review = await Review.findById(req.params.id);

        if (!review) {
            return res.status(404).json({ message: "Review not found." });
        }

        if (review.user.toString() !== req.user.id) {
            return res.status(401).json({ message: "User not authorized." });
        }

        await review.deleteOne();
        res.status(200).json({ success: true, message: "Audit signal removed." });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Registry update failed." });
    }
});

module.exports = router;