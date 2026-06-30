import axios from 'axios';

async function testApi() {
    try {
        console.log("Making request to local eximclientnew server proxy...");
        const response = await axios.get(
            "http://localhost:9007/api/elock/assignments?page=1&limit=20&status=All+Status&ieCodeNo=0802000703",
            {
                headers: {
                    Authorization: "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjY4YjgwZTI5MmZmNDdlOGJmZjE5ODI0NSIsImVtYWlsIjoicHVuaXRAYWxsdXZpdW0uaW4iLCJuYW1lIjoiUHVuaXQiLCJ1c2VyVHlwZSI6InVzZXIiLCJyb2xlIjoidXNlciIsInN0YXR1cyI6ImFjdGl2ZSIsImlhdCI6MTc3OTE3MTk3NiwiZXhwIjoxNzc5MjM2Nzc2fQ.xMXFhIrXW7li6o9TNIho-IE7LQmFzVqMZONuCvLILHw"
                }
            }
        );
        console.log("✅ Success! Status:", response.status);
        console.log("Data:", JSON.stringify(response.data, null, 2).substring(0, 500) + "...");
    } catch (error) {
        console.log("❌ Failed! Error:", error.message);
        if (error.response) {
            console.log("   Status:", error.response.status);
            console.log("   Data:", error.response.data);
        }
    }
}
testApi();
