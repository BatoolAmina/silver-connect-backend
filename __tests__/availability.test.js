const test = require('node:test');
const assert = require('node:assert/strict');
const {
    availabilityPeriods,
    parseAvailabilityDate,
    hasActiveBookingConflict
} = require('../utils/availability');

test('availability accepts only real ISO calendar dates', () => {
    assert.equal(parseAvailabilityDate('2026-10-08').toISOString(), '2026-10-08T00:00:00.000Z');
    assert.equal(parseAvailabilityDate('2026-02-30'), null);
    assert.equal(parseAvailabilityDate('08-10-2026'), null);
    assert.deepEqual(availabilityPeriods, ['Morning', 'Afternoon', 'Evening']);
});

test('active bookings conflict only for the same date and visit window', () => {
    const bookings = [
        { date: new Date('2026-10-08T00:00:00.000Z'), preferredTime: 'Morning', status: 'pending' },
        { date: new Date('2026-10-09T00:00:00.000Z'), preferredTime: 'Afternoon', status: 'accepted' }
    ];

    assert.equal(hasActiveBookingConflict(bookings, new Date('2026-10-08T00:00:00.000Z'), 'Morning'), true);
    assert.equal(hasActiveBookingConflict(bookings, new Date('2026-10-08T00:00:00.000Z'), 'Evening'), false);
    assert.equal(hasActiveBookingConflict(bookings, new Date('2026-10-09T00:00:00.000Z'), 'Afternoon'), true);
});

test('rejected and cancelled bookings do not block availability', () => {
    const bookings = [
        { date: new Date('2026-10-08T00:00:00.000Z'), preferredTime: 'Morning', status: 'rejected' },
        { date: new Date('2026-10-08T00:00:00.000Z'), preferredTime: 'Afternoon', status: 'cancelled' }
    ];

    assert.equal(hasActiveBookingConflict(bookings, new Date('2026-10-08T00:00:00.000Z'), 'Morning'), false);
    assert.equal(hasActiveBookingConflict(bookings, new Date('2026-10-08T00:00:00.000Z'), 'Afternoon'), false);
});
