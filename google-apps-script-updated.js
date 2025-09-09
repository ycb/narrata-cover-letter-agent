/**
 * Google Apps Script for handling feedback submissions and beta tester signups
 * This script acts as a web app that receives feedback data and submits it to Google Forms
 */

// Configuration - Update these with your actual values
const CONFIG = {
  // Your Google Sheet ID (from the URL)
  SHEET_ID: '11cTkV5BHBcpLQHpEDQtGQoD3nn7-Xt7Jd59myvzOerg',
  
  // Sheet names
  FEEDBACK_SHEET_NAME: 'Form Responses 1',
  BETA_TESTERS_SHEET_NAME: 'Beta Testers'
};

/**
 * Handle POST requests from the frontend
 */
function doPost(e) {
  try {
    let data;
    
    // Handle both JSON and form data
    if (e.postData && e.postData.type === 'application/json') {
      data = JSON.parse(e.postData.contents);
    } else {
      // Handle form data
      data = {
        timestamp: e.parameter.timestamp || new Date().toISOString(),
        pageUrl: e.parameter.pageUrl || 'Unknown',
        message: e.parameter.message || 'No message',
        email: e.parameter.email || 'No email provided',
        clickLocation: (() => {
          try {
            return e.parameter.clickLocation ? JSON.parse(e.parameter.clickLocation) : { x: 0, y: 0 };
          } catch (error) {
            console.log('Error parsing clickLocation, using default:', error);
            return { x: 0, y: 0 };
          }
        })(),
        userAgent: e.parameter.userAgent || 'Unknown',
        category: e.parameter.category || 'suggestion',
        sentiment: e.parameter.sentiment || 'Neutral',
        // New field to distinguish between feedback and beta signup
        submissionType: e.parameter.submissionType || 'feedback'
      };
    }
    
    let success = false;
    
    // Route to appropriate handler based on submission type
    if (data.submissionType === 'beta-signup') {
      success = submitBetaSignup(data);
    } else {
      success = submitToGoogleSheet(data);
    }
    
    // Create response with CORS headers embedded
    const responseData = {
      success: success,
      message: success ? 'Submission successful' : 'Failed to submit data'
    };
    
    return ContentService
      .createTextOutput(JSON.stringify(responseData))
      .setMimeType(ContentService.MimeType.JSON);
    
  } catch (error) {
    console.error('Error processing submission:', error);
    
    const responseData = {
      success: false,
      message: 'Error processing submission: ' + error.toString()
    };
    
    return ContentService
      .createTextOutput(JSON.stringify(responseData))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

/**
 * Handle GET requests (when accessing URL directly in browser)
 */
function doGet(e) {
  return ContentService
    .createTextOutput(JSON.stringify({
      status: 'success',
      message: 'Google Apps Script is running correctly',
      timestamp: new Date().toISOString()
    }))
    .setMimeType(ContentService.MimeType.JSON);
}

/**
 * Handle OPTIONS requests for CORS preflight
 */
function doOptions(e) {
  return ContentService
    .createTextOutput('')
    .setMimeType(ContentService.MimeType.JSON);
}

/**
 * Submit beta signup data to Beta Testers sheet
 */
function submitBetaSignup(betaData) {
  try {
    // Open the Google Sheet
    const spreadsheet = SpreadsheetApp.openById(CONFIG.SHEET_ID);
    
    // Get or create the Beta Testers sheet
    let sheet = spreadsheet.getSheetByName(CONFIG.BETA_TESTERS_SHEET_NAME);
    
    if (!sheet) {
      // Create the Beta Testers sheet if it doesn't exist
      sheet = spreadsheet.insertSheet(CONFIG.BETA_TESTERS_SHEET_NAME);
      
      // Add headers
      const headers = [
        'Timestamp',
        'Email',
        'Source',
        'User Agent',
        'Page URL',
        'Status'
      ];
      sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
      
      // Format headers
      const headerRange = sheet.getRange(1, 1, 1, headers.length);
      headerRange.setFontWeight('bold');
      headerRange.setBackground('#f0f0f0');
    }
    
    // Check if email already exists
    const existingEmails = sheet.getRange(2, 2, sheet.getLastRow() - 1, 1).getValues().flat();
    if (existingEmails.includes(betaData.email)) {
      console.log('Email already exists in beta testers:', betaData.email);
      return true; // Consider it successful since email is already registered
    }
    
    // Prepare the row data
    const rowData = [
      betaData.timestamp,
      betaData.email,
      betaData.source || 'welcome-modal',
      betaData.userAgent || 'Unknown',
      betaData.pageUrl || 'Unknown',
      'Pending' // Status
    ];
    
    // Add the row to the sheet
    sheet.appendRow(rowData);
    
    // Send email notification for beta signup
    sendBetaSignupNotification(betaData);
    
    return true;
    
  } catch (error) {
    console.error('Error submitting beta signup:', error);
    return false;
  }
}

/**
 * Submit feedback data directly to Google Sheet
 */
function submitToGoogleSheet(feedbackData) {
  try {
    // Open the Google Sheet
    const spreadsheet = SpreadsheetApp.openById(CONFIG.SHEET_ID);
    const sheet = spreadsheet.getSheetByName(CONFIG.FEEDBACK_SHEET_NAME);
    
    if (!sheet) {
      console.error('Sheet not found:', CONFIG.FEEDBACK_SHEET_NAME);
      return false;
    }
    
    // Prepare the row data
    const rowData = [
      feedbackData.timestamp,
      feedbackData.pageUrl,
      feedbackData.category,
      feedbackData.sentiment,
      feedbackData.message,
      feedbackData.email || 'No email provided',
      `${feedbackData.clickLocation.x}, ${feedbackData.clickLocation.y}`,
      feedbackData.userAgent
    ];
    
    // Add the row to the sheet
    sheet.appendRow(rowData);
    
    // Send email notification (optional)
    sendEmailNotification(feedbackData);
    
    return true;
    
  } catch (error) {
    console.error('Error submitting to Google Sheet:', error);
    return false;
  }
}

/**
 * Send email notification when new feedback is received
 */
function sendEmailNotification(feedbackData) {
  try {
    const subject = `New ${feedbackData.category} feedback received`;
    const body = `
New feedback has been submitted:

Category: ${feedbackData.category}
Sentiment: ${feedbackData.sentiment}
Message: ${feedbackData.message}
Email: ${feedbackData.email || 'No email provided'}
Page: ${feedbackData.pageUrl}
Time: ${feedbackData.timestamp}

Click location: ${feedbackData.clickLocation.x}, ${feedbackData.clickLocation.y}
User Agent: ${feedbackData.userAgent}
    `;
    
    // Send email to yourself (replace with your email)
    GmailApp.sendEmail(
      'your-email@example.com', // Replace with your email
      subject,
      body
    );
  } catch (error) {
    console.log('Email notification failed (optional):', error);
  }
}

/**
 * Send email notification for beta signup
 */
function sendBetaSignupNotification(betaData) {
  try {
    const subject = `New Beta Tester Signup: ${betaData.email}`;
    const body = `
New beta tester has signed up:

Email: ${betaData.email}
Source: ${betaData.source || 'welcome-modal'}
Page: ${betaData.pageUrl || 'Unknown'}
Time: ${betaData.timestamp}
User Agent: ${betaData.userAgent || 'Unknown'}

Total beta testers can be viewed in the Google Sheet.
    `;
    
    // Send email to yourself (replace with your email)
    GmailApp.sendEmail(
      'your-email@example.com', // Replace with your email
      subject,
      body
    );
  } catch (error) {
    console.log('Beta signup email notification failed (optional):', error);
  }
}

/**
 * Test function to verify the script works
 */
function testSubmission() {
  const testData = {
    timestamp: new Date().toISOString(),
    pageUrl: 'https://test.com',
    message: 'Test submission from Apps Script (Direct to Sheet)',
    email: 'test@example.com',
    clickLocation: { x: 100, y: 200 },
    userAgent: 'Test User Agent',
    category: 'suggestion',
    sentiment: 'Positive'
  };
  
  const success = submitToGoogleSheet(testData);
  console.log('Test submission result:', success);
  return success;
}

/**
 * Test function for beta signup
 */
function testBetaSignup() {
  const testData = {
    timestamp: new Date().toISOString(),
    email: 'test-beta@example.com',
    source: 'welcome-modal',
    pageUrl: 'https://narrata.co/',
    userAgent: 'Test User Agent'
  };
  
  const success = submitBetaSignup(testData);
  console.log('Test beta signup result:', success);
  return success;
}
