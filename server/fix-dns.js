import dns from 'dns';

// FIX: Force Google DNS to resolve MongoDB Atlas SRV records in this environment
// This must run before any MongoDB connection is attempted
// This is required because the local environment is failing to resolve the SRV record with default DNS
try {
    dns.setServers(['8.8.8.8', '8.8.4.4']);
    console.log('DNS servers set to Google DNS (8.8.8.8) to resolve MongoDB Atlas');
} catch (error) {
    console.error('Failed to force DNS servers:', error.message);
}
