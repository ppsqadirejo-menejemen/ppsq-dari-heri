import axios from 'axios';
import dotenv from 'dotenv';
dotenv.config();

async function test() {
  const token = process.env.API_FONNTE;
  console.log("Token length:", token?.length);
  try {
    const response = await axios.post('https://api.fonnte.com/send', {
      target: '08123456789', // Dummy number
      message: 'Test message',
    }, {
      headers: {
        'Authorization': token
      }
    });
    console.log("Success:", response.data);
  } catch (error: any) {
    console.error("Error:", error.response?.data || error.message);
  }
}
test();
