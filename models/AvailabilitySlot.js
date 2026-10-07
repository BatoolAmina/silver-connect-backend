const mongoose = require('mongoose');

const availabilitySlotSchema = new mongoose.Schema({
    helper: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    date: {
        type: Date,
        required: true
    },
    preferredTime: {
        type: String,
        enum: ['Morning', 'Afternoon', 'Evening'],
        required: true
    },
    booking: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Booking',
        default: null
    },
    isPublished: {
        type: Boolean,
        default: true
    }
}, { timestamps: true });

availabilitySlotSchema.index({ helper: 1, date: 1, preferredTime: 1 }, { unique: true });

module.exports = mongoose.model('AvailabilitySlot', availabilitySlotSchema);
