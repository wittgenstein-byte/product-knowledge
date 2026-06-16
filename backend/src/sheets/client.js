const { google } = require('googleapis');
require('dotenv').config();

let auth = null;

if (process.env.GOOGLE_SERVICE_ACCOUNT_KEY) {
  try {
    // Parse key JSON string from environment variable (useful in Docker/production envs)
    const credentials = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_KEY);
    auth = new google.auth.JWT(
      credentials.client_email,
      null,
      credentials.private_key,
      ['https://www.googleapis.com/auth/spreadsheets']
    );
  } catch (err) {
    console.error('Error parsing GOOGLE_SERVICE_ACCOUNT_KEY env variable:', err.message);
  }
} else if (process.env.GOOGLE_SERVICE_ACCOUNT_KEY_PATH) {
  try {
    auth = new google.auth.GoogleAuth({
      keyFile: process.env.GOOGLE_SERVICE_ACCOUNT_KEY_PATH,
      scopes: ['https://www.googleapis.com/auth/spreadsheets'],
    });
  } catch (err) {
    console.error('Error loading Google Auth Key file:', err.message);
  }
}

const sheets = google.sheets({ version: 'v4', auth });

module.exports = {
  sheets,
  spreadsheetId: process.env.GOOGLE_SHEETS_ID
};
