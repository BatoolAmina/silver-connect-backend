const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true },
    password: { type: String, required: true },
    role: { type: String, enum: ['user', 'helper', 'admin'], default: 'user' },
    avatar: { type: String, default: "" },

    aadhar: { type: String, select: false },
    phone: { type: String },
    specialty: { type: String, enum: ['Medical Assistant', 'Companion', 'Housekeeping', 'Driver', 'Physiotherapy Aid', 'Live-in Caregiver'] },
    experience: { type: Number, default: 0 },
    workArea: { type: String },
    summary: { type: String, maxlength: 500 },
    bio: { type: String },
    
    isVerified: { type: Boolean, default: false },
    applicationStatus: { 
        type: String, 
        enum: ['none', 'pending', 'approved', 'rejected'], 
        default: 'none' 
    },
    
    rating: { type: Number, default: 5.0 },
    reviewCount: { type: Number, default: 0 },

    lastLogin: { type: Date },
    loginAttempts: { type: Number, default: 0 }
}, { timestamps: true });

userSchema.pre('save', function(next) {
    if (this.isModified('role') && this.role === 'admin' && !this.isNew) {
        console.error(`🚨 SECURITY ALERT: Unauthorized Admin Role Change Attempt by ${this._id}`);
    }
    next();
});

module.exports = mongoose.model('User', userSchema);