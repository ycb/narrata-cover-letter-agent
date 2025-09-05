/**
 * Google Apps Script for handling feedback submissions
 * This script acts as a web app that receives feedback data and submits it to Google Forms
 */

// Configuration - Update these with your actual values
const CONFIG = {
  // Your Google Sheet ID (from the URL)
  SHEET_ID: '11cTkV5BHBcpLQHpEDQtGQoD3nn7-Xt7Jd59myvzOerg',
  
  // Sheet name (usually "Form Responses 1" or similar)
  SHEET_NAME: 'Form Responses 1'
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
        sentiment: e.parameter.sentiment || 'Neutral'
      };
    }
    
    // Submit to Google Sheet directly
    const success = submitToGoogleSheet(data);
    
    // Create response with CORS headers embedded
    const responseData = {
      success: success,
      message: success ? 'Feedback submitted successfully' : 'Failed to submit feedback'
    };
    
    return ContentService
      .createTextOutput(JSON.stringify(responseData))
      .setMimeType(ContentService.MimeType.JSON);
    
  } catch (error) {
    console.error('Error processing feedback:', error);
    
    const responseData = {
      success: false,
      message: 'Error processing feedback: ' + error.toString()
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
 * Submit feedback data directly to Google Sheet
 */
function submitToGoogleSheet(feedbackData) {
  try {
    // Open the Google Sheet
    const spreadsheet = SpreadsheetApp.openById(CONFIG.SHEET_ID);
    const sheet = spreadsheet.getSheetByName(CONFIG.SHEET_NAME);
    
    if (!sheet) {
      console.error('Sheet not found:', CONFIG.SHEET_NAME);
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
 * Generate a dynamic ID for Google Forms
 */
function generateDynamicId() {
  return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
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
