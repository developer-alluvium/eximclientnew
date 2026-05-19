const axios = require('axios');
const http = require('http');

async function testSSE() {
    console.log("Testing SSE stream proxy locally...");
    const url = 'http://localhost:9003/api/notifications/stream?assetIds=8294630164,8294630015,8294630139,8294630573';
    
    http.get(url, (res) => {
        console.log(`Status code: ${res.statusCode}`);
        console.log(`Headers:`, res.headers);
        
        res.on('data', (chunk) => {
            console.log(`Received chunk: ${chunk.toString()}`);
            process.exit(0); // Exit on first chunk
        });
        
        res.on('end', () => {
            console.log("Stream ended");
            process.exit(0);
        });
    }).on('error', (err) => {
        console.error("Error: ", err.message);
        process.exit(1);
    });
}

testSSE();
