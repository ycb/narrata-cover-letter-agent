# Google Sheets Integration Setup Guide

This guide will help you set up Google Sheets integration for the feedback system.

## Prerequisites

1. A Google account
2. Access to Google Cloud Console
3. A Google Sheet to store feedback data

## Step 1: Create a Google Sheet

1. Go to [Google Sheets](https://sheets.google.com)
2. Create a new spreadsheet
3. Name it "Cover Letter Agent Feedback" (or any name you prefer)
4. Copy the Sheet ID from the URL:
   ```
   https://docs.google.com/spreadsheets/d/[SHEET_ID]/edit
   ```

## Step 2: Set Up Google Cloud Console

1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Create a new project or select an existing one
3. Enable the Google Sheets API:
   - Go to "APIs & Services" > "Library"
   - Search for "Google Sheets API"
   - Click "Enable"

## Step 3: Create API Key

1. In Google Cloud Console, go to "APIs & Services" > "Credentials"
2. Click "Create Credentials" > "API Key"
3. Copy the API key
4. (Optional) Restrict the API key to Google Sheets API for security

## Step 4: Configure Environment Variables

Create a `.env` file in your project root with the following variables:

```env
# Google Sheets Configuration
VITE_GOOGLE_SHEETS_ID=your_google_sheet_id_here
VITE_GOOGLE_SHEETS_RANGE=Sheet1!A:H
VITE_GOOGLE_SHEETS_API_KEY=your_google_sheets_api_key_here

# LogRocket Configuration
VITE_LOGROCKET_APP_ID=sqhkza/cover-letter-agent
```

## Step 5: Set Up Sheet Headers

In your Google Sheet, add the following headers in row 1:

| A | B | C | D | E | F | G | H |
|---|---|---|---|---|---|---|---|
| Timestamp | Page URL | Category | Sentiment | Message | Email | Click Location | User Agent |

## Step 6: Test the Integration

1. Start your development server: `npm run dev`
2. Use the feedback system to submit a test feedback
3. Check your Google Sheet to see if the data appears

## Data Structure

The feedback system will send the following data to your Google Sheet:

- **Timestamp**: When the feedback was submitted
- **Page URL**: The page where feedback was submitted
- **Category**: bug, suggestion, or praise
- **Sentiment**: positive, neutral, or negative
- **Message**: The user's feedback message
- **Email**: User's email (if provided)
- **Click Location**: X,Y coordinates of where they clicked
- **User Agent**: Browser information

## Fallback Behavior

If Google Sheets is not configured or fails:
- Feedback will be stored in localStorage as a fallback
- The system will continue to work normally
- You can retrieve stored feedback using the feedback service

## Security Notes

- The API key is exposed in the frontend code
- Consider restricting the API key to specific domains
- For production, consider using a backend service to handle API calls
- The Google Sheet should be set to "Anyone with the link can edit" or use proper sharing permissions

## Troubleshooting

### Common Issues

1. **"Google Sheets not configured" warning**
   - Check that all environment variables are set correctly
   - Restart your development server after adding environment variables

2. **"Failed to submit to Google Sheets" error**
   - Verify the API key is correct
   - Check that Google Sheets API is enabled
   - Ensure the sheet ID is correct
   - Check browser console for detailed error messages

3. **Data not appearing in sheet**
   - Verify the range is correct (e.g., "Sheet1!A:H")
   - Check that the sheet has the correct headers
   - Ensure the sheet is not protected or read-only

### Testing API Connection

You can test the Google Sheets API connection by visiting:
```
https://sheets.googleapis.com/v4/spreadsheets/YOUR_SHEET_ID/values/Sheet1!A1?key=YOUR_API_KEY
```

This should return the first cell of your sheet if everything is configured correctly.
