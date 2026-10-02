const bookingStatuses = ['pending', 'accepted', 'rejected', 'completed', 'cancelled'];
const allowedTransitions = {
    pending: ['accepted', 'rejected', 'cancelled'],
    accepted: ['completed', 'cancelled'],
    rejected: [],
    completed: [],
    cancelled: []
};

const isValidTransition = (currentStatus, nextStatus) =>
    bookingStatuses.includes(nextStatus) && Boolean(allowedTransitions[currentStatus]?.includes(nextStatus));

const canTransitionBooking = ({ currentStatus, nextStatus, actorRole, isRequester, isAssignedHelper }) => {
    if (!isValidTransition(currentStatus, nextStatus)) return false;

    if (actorRole === 'admin') return true;
    if (nextStatus === 'cancelled') return Boolean(isRequester);
    return Boolean(isAssignedHelper);
};

module.exports = { bookingStatuses, isValidTransition, canTransitionBooking };