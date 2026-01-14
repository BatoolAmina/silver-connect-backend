const jwt = require('jsonwebtoken');
const User = require('../models/User');

const protect = async (req, res, next) => {
    let token;

    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
        try {
            token = req.headers.authorization.split(' ')[1];

            const decoded = jwt.verify(token, process.env.JWT_SECRET);

            req.user = await User.findById(decoded.id).select('-password');

            if (!req.user) {
                return res.status(401).json({ message: 'CRITICAL: User revoked from registry' });
            }

            next();
        } catch (error) {
            console.error("⛔ [SECURITY ALERT] Auth Bypass Attempt:", error.message);
            
            if (error.name === 'TokenExpiredError') {
                return res.status(401).json({ message: 'Session Expired: Please Re-authenticate' });
            }
            
            return res.status(401).json({ message: 'NOT AUTHORIZED: ACCESS DENIED' });
        }
    }

    if (!token) {
        return res.status(401).json({ message: 'NO CLEARANCE: Token missing' });
    }
};

const adminOnly = (req, res, next) => {
    if (req.user && req.user.role === 'admin') {
        next();
    } else {
        console.warn(`🚨 [UNAUTHORIZED ADMIN ATTEMPT] User: ${req.user?._id} at ${new Date().toISOString()}`);
        return res.status(403).json({ 
            message: 'ACCESS FORBIDDEN: High-Level Clearance Required' 
        });
    }
};

module.exports = { protect, adminOnly };