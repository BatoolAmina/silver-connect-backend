const express = require('express');
const router = express.Router();
const Booking = require('../models/Booking');
const User = require('../models/User');

router.get('/', async (req, res) => {
    try {
        const helperFilter = { role: 'helper', isVerified: true };
        const [verifiedHelpers, registeredFamilies, completedVisits, workAreas] = await Promise.all([
            User.countDocuments(helperFilter),
            User.countDocuments({ role: 'user' }),
            Booking.countDocuments({ status: 'completed' }),
            User.distinct('workArea', { ...helperFilter, workArea: { $type: 'string', $ne: '' } })
        ]);

        res.set('Cache-Control', 'public, max-age=60');
        res.json({
            verifiedHelpers,
            registeredFamilies,
            completedVisits,
            serviceAreas: workAreas.length
        });
    } catch (error) {
        console.error('Unable to load public project metrics:', error.message);
        res.status(500).json({ message: 'Unable to load project metrics' });
    }
});

module.exports = router;
