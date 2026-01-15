const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const hpp = require('hpp');
require('dotenv').config();

const app = express();

app.set('trust proxy', 1);

app.use(helmet());

const corsOptions = {
    origin: true,
    methods: 'GET,POST,PUT,DELETE,PATCH,OPTIONS',
    credentials: true,
    allowedHeaders: ['Content-Type', 'Authorization']
};
app.use(cors(corsOptions));

const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, 
    max: 100, 
    message: "🚨 High traffic detected. Security lockout active for 15 mins.",
    standardHeaders: true,
    legacyHeaders: false,
});
app.use('/api/', limiter);

app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: true, limit: '10kb' }));

app.use((req, res, next) => {
    const sanitize = (obj) => {
        if (Array.isArray(obj)) return obj.map(v => sanitize(v));
        if (obj !== null && typeof obj === 'object') {
            const newObj = {};
            for (let key in obj) {
                if (!key.startsWith('$')) newObj[key] = sanitize(obj[key]);
            }
            return newObj;
        }
        return obj;
    };
    if (req.body) req.body = sanitize(req.body);
    if (req.params) req.params = sanitize(req.params);
    if (req.query) {
        try {
            const cleanQuery = sanitize(JSON.parse(JSON.stringify(req.query)));
            Object.assign(req.query, cleanQuery);
        } catch (e) {
            next();
        }
    }
    next();
});

app.use(hpp());

mongoose.connect(process.env.MONGO_URI)
    .then(() => console.log("✓ SECURE CONNECTION: Registry Database Online"))
    .catch(err => {
        console.error("CRITICAL: Database offline.");
        process.exit(1);
    });

app.use('/api/auth', require('./routes/auth'));
app.use('/api/bookings', require('./routes/booking'));
app.use('/api/helpers', require('./routes/helper'));
app.use('/api/admin', require('./routes/admin')); 
app.use('/api/contact', require('./routes/contact'));
app.use('/api/reviews', require('./routes/review'));

app.get('/', (req, res) => res.send('Silver Connect API is Active 🛡️'));

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`SECURITY TERMINAL ACTIVE ON PORT ${PORT}`);
});