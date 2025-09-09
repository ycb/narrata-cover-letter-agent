# Beta Testers Google Sheets Setup

This guide explains how to set up the Google Sheets integration to collect beta tester emails in a dedicated "Beta Testers" tab.

## 1. Update Google Apps Script

1. Go to [Google Apps Script](https://script.google.com/)
2. Open your existing project (the one connected to your feedback sheet)
3. Replace the entire script content with the code from `google-apps-script-updated.js`
4. Update the configuration at the top:
   ```javascript
   const CONFIG = {
     SHEET_ID: '11cTkV5BHBcpLQHpEDQtGQoD3nn7-Xt7Jd59myvzOerg',
     FEEDBACK_SHEET_NAME: 'Form Responses 1',
     BETA_TESTERS_SHEET_NAME: 'Beta Testers'
   };
   ```
5. Update the email address in the notification functions:
   ```javascript
   GmailApp.sendEmail(
     'your-email@example.com', // Replace with your email
     subject,
     body
   );
   ```
6. Save and deploy the script

## 2. Test the Setup

1. Run the test function `testBetaSignup()` in the Apps Script editor
2. Check your Google Sheet - you should see a new "Beta Testers" tab created
3. Verify the test email appears in the Beta Testers tab

## 3. Beta Testers Sheet Structure

The "Beta Testers" tab will have these columns:
- **Timestamp**: When they signed up
- **Email**: Their email address
- **Source**: Where they signed up (welcome-modal, feedback-form, manual)
- **User Agent**: Browser information
- **Page URL**: Which page they were on
- **Status**: Pending (for future use)

## 4. How It Works

### Welcome Modal Flow:
1. User enters email in welcome modal
2. Email is submitted to Google Apps Script
3. Script creates "Beta Testers" tab if it doesn't exist
4. Email is added to the Beta Testers sheet
5. Email is also stored locally for feedback form pre-population
6. You receive an email notification

### Feedback Form Flow:
1. If user provided email in welcome modal, it's pre-populated
2. When they submit feedback, email goes to "Form Responses 1" tab
3. No duplicate beta signup (unless they use a different email)

## 5. Benefits

- **Centralized collection**: All beta tester emails in one place
- **No duplicates**: Script checks for existing emails
- **Automatic notifications**: Email alerts for new signups
- **Fallback storage**: Works even if Google Sheets is down
- **Source tracking**: Know where each signup came from

## 6. Monitoring

- Check the "Beta Testers" tab regularly for new signups
- Use the Status column to track beta access (Pending → Active → Completed)
- Monitor email notifications for real-time updates

## 7. Future Enhancements

- Add email validation
- Send welcome emails to beta testers
- Track beta tester engagement
- Export data for email marketing tools
