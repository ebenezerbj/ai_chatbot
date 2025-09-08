// Simple test to debug SMS notification issue
const { notifyHandover, getMergedRecipients, getSmsProvider, getHandoverRecipientCount } = require('./dist/notifications/index.js');

console.log('=== SMS Configuration Debug ===');
console.log('SMSONLINEGH_KEY:', process.env.SMSONLINEGH_KEY ? 'SET' : 'NOT SET');
console.log('SMSONLINEGH_SENDER:', process.env.SMSONLINEGH_SENDER || 'NOT SET');
console.log('HANDOVER_SMS_TO:', process.env.HANDOVER_SMS_TO || 'NOT SET');
console.log('EXTRA_SMS_RECIPIENTS:', process.env.EXTRA_SMS_RECIPIENTS || 'NOT SET');

console.log('\n=== Recipients Debug ===');
console.log('Handover recipient count:', getHandoverRecipientCount());
console.log('SMS provider:', getSmsProvider());

console.log('\n=== Testing handover notification ===');
notifyHandover({
    ticketId: 'test-123',
    sessionId: 'test-session',
    name: 'Test User',
    phone: '0243082750',
    message: 'Test notification message'
}).then(() => {
    console.log('Handover notification completed');
}).catch(err => {
    console.error('Handover notification failed:', err);
});
