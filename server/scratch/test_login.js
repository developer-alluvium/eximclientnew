import axios from "axios";

async function test() {
  try {
    console.log("Sending POST to remote login API with correct credentials...");
    const response = await axios.post("https://eximbot.alvision.in/clientapi/api/users/login", {
      email: "tradeops@astonprocessors.com",
      password: "12345678"
    }, {
      headers: {
        "Content-Type": "application/json"
      }
    });
    console.log("Response Status:", response.status);
    console.log("Response Headers:", response.headers);
    console.log("Response Data:", response.data);
  } catch (error) {
    console.log("Error status:", error.response?.status);
    console.log("Error headers:", error.response?.headers);
    console.log("Error data:", error.response?.data);
  }
}

test();
