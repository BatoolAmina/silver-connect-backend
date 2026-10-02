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
    serviceType: {
        type: String,
        enum: ['Companionship', 'Personal care', 'Meal preparation', 'Mobility support', 'Medication reminders', 'Transportation'],
        default: 'Companionship'
    },
    preferredTime: {
        type: String,
        enum: ['Morning', 'Afternoon', 'Evening'],
        default: 'Morning'
    },
    durationHours: {
        type: Number,
        min: 1,
        max: 12,
        default: 2
    },
    emergencyContactName: {
        type: String,
        trim: true,
        maxlength: 80
    },
    emergencyContactPhone: {
        type: String,
        trim: true,
        maxlength: 30
    },

    status: {
        type: String,
        enum: ['pending', 'accepted', 'rejected', 'completed', 'cancelled'],
        default: 'pending'
    },
    statusHistory: [{
        status: {
            type: String,
            enum: ['pending', 'accepted', 'rejected', 'completed', 'cancelled'],
            required: true
        },
        changedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true
        },
        note: {
            type: String,
            maxlength: 250
        },
        changedAt: {
            type: Date,
            default: Date.now
        }
    }],

    isArchived: {
        type: Boolean,
        default: false
    }
}, { 
    timestamps: true
});

BookingSchema.index({ user: 1, helper: 1, status: 1 });

module.exports = mongoose.model('Booking', BookingSchema);