import { google } from 'googleapis';
import dotenv from 'dotenv';
dotenv.config();

async function test() {
  try {
    const auth = new google.auth.GoogleAuth({
      credentials: {
        client_email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
        private_key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
      },
      scopes: ['https://www.googleapis.com/auth/spreadsheets'],
    });
    const sheets = google.sheets({ version: 'v4', auth });
    const res = await sheets.spreadsheets.values.get({
      spreadsheetId: process.env.GOOGLE_SHEET_ID,
      range: 'Syahriah!A2:B100',
    });
    console.log("Syahriah:", JSON.stringify(res.data.values, null, 2));
  } catch (e) {
    console.error(e);
  }
}
test();
