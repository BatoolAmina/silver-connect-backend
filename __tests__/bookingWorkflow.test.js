const test = require('node:test');
const assert = require('node:assert/strict');
const { canTransitionBooking } = require('../utils/bookingWorkflow');

test('helpers can accept or reject pending requests and complete accepted visits', () => {
    assert.equal(canTransitionBooking({ currentStatus: 'pending', nextStatus: 'accepted', actorRole: 'helper', isAssignedHelper: true }), true);
    assert.equal(canTransitionBooking({ currentStatus: 'pending', nextStatus: 'rejected', actorRole: 'helper', isAssignedHelper: true }), true);
    assert.equal(canTransitionBooking({ currentStatus: 'accepted', nextStatus: 'completed', actorRole: 'helper', isAssignedHelper: true }), true);
});

test('requesters can cancel active visits but cannot set helper outcomes', () => {
    assert.equal(canTransitionBooking({ currentStatus: 'pending', nextStatus: 'cancelled', actorRole: 'user', isRequester: true }), true);
    assert.equal(canTransitionBooking({ currentStatus: 'accepted', nextStatus: 'cancelled', actorRole: 'user', isRequester: true }), true);
    assert.equal(canTransitionBooking({ currentStatus: 'pending', nextStatus: 'accepted', actorRole: 'user', isRequester: true }), false);
});

test('unassigned users, invalid transitions, and terminal states are rejected', () => {
    assert.equal(canTransitionBooking({ currentStatus: 'pending', nextStatus: 'accepted', actorRole: 'helper', isAssignedHelper: false }), false);
    assert.equal(canTransitionBooking({ currentStatus: 'completed', nextStatus: 'cancelled', actorRole: 'user', isRequester: true }), false);
    assert.equal(canTransitionBooking({ currentStatus: 'pending', nextStatus: 'unknown', actorRole: 'admin' }), false);
});

test('admins may perform valid transitions', () => {
    assert.equal(canTransitionBooking({ currentStatus: 'pending', nextStatus: 'accepted', actorRole: 'admin' }), true);
});