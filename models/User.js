const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Legal name is mandatory for registry'],
    trim: true,
    maxlength: [50, 'Name cannot exceed 50 characters']
  },
  email: {
    type: String,
    required: [true, 'Email identity is mandatory'],
    unique: true,
    lowercase: true,
    trim: true,
    match: [/^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/, 'Please provide a valid email protocol']
  },
  password: {
    type: String,
    required: function() {
      return !this.googleId;
    },
    minlength: [8, 'Cipher must be at least 8 characters for security']
  },
  googleId: {
    type: String,
    unique: true,
    sparse: true 
  },
  avatar: {
    type: String,
    default: ''
  },

  resetPasswordToken: String,
  resetPasswordExpire: Date,

  role: {
    type: String,
    enum: ['user', 'helper', 'admin'],
    default: 'user'
  },
  isVerified: {
    type: Boolean,
    default: false
  },

  phone: { 
    type: String, 
    trim: true 
  },
  specialty: { 
    type: String, 
    trim: true 
  },
  experience: { 
    type: Number 
  },
  summary: { 
    type: String, 
    maxlength: 1000 
  },
  aadhar: { 
    type: String, 
    trim: true 
  },
  workArea: { 
    type: String, 
    trim: true 
  },
  resumeLink: { 
    type: String, 
    trim: true 
  },
  linkedin: { 
    type: String, 
    trim: true 
  },
  
  applicationStatus: { 
    type: String, 
    enum: ['none', 'pending', 'approved', 'rejected'], 
    default: 'none' 
  },
  lastLogin: {
    type: Date
  },
  loginAttempts: {
    type: Number,
    default: 0
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
  
});

userSchema.index({ email: 1, role: 1, applicationStatus: 1 });

module.exports = mongoose.model('User', userSchema);