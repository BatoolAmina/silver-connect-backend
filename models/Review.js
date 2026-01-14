const mongoose = require('mongoose');

const ReviewSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    helper: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    booking: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Booking',
        required: true,
        unique: true
    },
    rating: {
        type: Number,
        required: true,
        min: 1,
        max: 5
    },
    reviewText: {
        type: String,
        required: [true, 'Please provide a qualitative statement.'],
        trim: true,
        maxlength: 500
    },
    isFlagged: {
        type: Boolean,
        default: false
    }
}, { 
    timestamps: true 
});

ReviewSchema.index({ user: 1, booking: 1 }, { unique: true });

module.exports = mongoose.model('Review', ReviewSchema);