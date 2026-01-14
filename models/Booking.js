const mongoose = require('mongoose');

const BookingSchema = new mongoose.Schema({
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

    seniorName: { type: String, required: true },
    seniorEmail: { type: String, required: true },
    helperName: { type: String, required: true },
    helperEmail: { type: String, required: true },

    date: {
        type: Date,
        required: [true, 'Dispatch date is mandatory.']
    },
    phone: {
        type: String,
        required: true
    },
    address: {
        type: String,
        required: [true, 'Operational address is required for dispatch.']
    },
    notes: {
        type: String,
        maxlength: 1000
    },

    status: {
        type: String,
        enum: ['pending', 'accepted', 'rejected', 'completed', 'cancelled'],
        default: 'pending'
    },

    isArchived: {
        type: Boolean,
        default: false
    }
}, { 
    timestamps: true
});

BookingSchema.index({ user: 1, helper: 1, status: 1 });

module.exports = mongoose.model('Booking', BookingSchema);