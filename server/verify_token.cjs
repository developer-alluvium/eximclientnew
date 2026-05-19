const jwt = require('jsonwebtoken');
require('dotenv').config({ path: 'c:/Users/india/Desktop/Projects/eximclientnew/server/.env' });

const token = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjY4YjgwZTI5MmZmNDdlOGJmZjE5ODI0NSIsImVtYWlsIjoicHVuaXRAYWxsdXZpdW0uaW4iLCJuYW1lIjoiUHVuaXQiLCJ1c2VyVHlwZSI6InVzZXIiLCJyb2xlIjoidXNlciIsInN0YXR1cyI6ImFjdGl2ZSIsImlhdCI6MTc3OTE3MTk3NiwiZXhwIjoxNzc5MjM2Nzc2fQ.xMXFhIrXW7li6o9TNIho-IE7LQmFzVqMZONuCvLILHw";
const secret = process.env.JWT_SECRET || "3c7c6bab80b4ca6f1980fe6c99ca20e6265ea2ed27b83fc355ab30bee18030ad";

console.log("Using Secret:", secret);
try {
    const decoded = jwt.verify(token, secret);
    console.log("✅ Token Verified Successfully!");
    console.log(decoded);
} catch (err) {
    console.log("❌ Token Verification Failed:", err.message);
}
