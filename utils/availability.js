const availabilityPeriods = ['Morning', 'Afternoon', 'Evening'];

const parseAvailabilityDate = (value) => {
    if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
    const date = new Date(`${value}T00:00:00.000Z`);
    return Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== value ? null : date;
};

const hasActiveBookingConflict = (bookings, date, preferredTime) =>
    bookings.some((booking) =>
        ['pending', 'accepted'].includes(booking.status) &&
        booking.preferredTime === preferredTime &&
        new Date(booking.date).toISOString().slice(0, 10) === date.toISOString().slice(0, 10)
    );

module.exports = { availabilityPeriods, parseAvailabilityDate, hasActiveBookingConflict };
