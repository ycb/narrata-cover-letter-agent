# Google Apps Script Setup for Feedback System

## 🎯 **Overview**

This guide will help you set up a Google Apps Script web app to handle feedback submissions from your frontend application. This approach solves the CORS issues we encountered with direct Google Forms submissions.

## 📋 **Step-by-Step Setup**

### **Step 1: Create a New Google Apps Script Project**

1. **Go to [script.google.com](https://script.google.com)**
2. **Click "New Project"**
3. **Delete the default code** and replace it with the contents of `google-apps-script.js`

### **Step 2: Configure the Script**

1. **Update the CONFIG section** in the script:
   ```javascript
   const CONFIG = {
     // Your Google Form URL (the formResponse endpoint)
     FORM_URL: 'https://docs.google.com/forms/d/e/1FAIpQLSfJe8zE3orRepl8iu7OrMIROdAaV3vFci2AbBVbSiOEtcSbWQ/formResponse',
     
     // Entry IDs for your form fields (these are correct based on our testing)
     ENTRY_IDS: {
       timestamp: 'entry.638918608',
       pageUrl: 'entry.1865964081', 
       message: 'entry.1916748410',
       email: 'entry.619009191',
       clickLocation: 'entry.1941192234',
       userAgent: 'entry.373119231',
       category: 'entry.1282507941',
       sentiment: 'entry.1641611400'
     }
   };
   ```

2. **Save the project** (Ctrl+S or Cmd+S)

### **Step 3: Deploy as Web App**

1. **Click "Deploy" > "New deployment"**
2. **Select "Web app" as the type**
3. **Configure the deployment:**
   - **Execute as**: "Me"
   - **Who has access**: "Anyone"
4. **Click "Deploy"**
5. **Authorize the script** when prompted
6. **Copy the web app URL** (it will look like: `https://script.google.com/macros/s/YOUR_SCRIPT_ID/exec`)

### **Step 4: Update Environment Variables**

1. **Update your `.env` file** with the Apps Script URL:
   ```env
   VITE_GOOGLE_APPS_SCRIPT_URL=https://script.google.com/macros/s/YOUR_SCRIPT_ID/exec
   ```

2. **Remove the old Google Forms URL** (if present)

### **Step 5: Test the Setup**

1. **Run the test function** in Apps Script:
   - In the Apps Script editor, select `testSubmission` from the function dropdown
   - Click "Run"
   - Check the logs to see if the test submission worked

2. **Check your Google Sheet** to see if the test submission appeared

## 🔧 **How It Works**

### **Frontend → Apps Script → Google Forms**

1. **Frontend** sends feedback data as JSON to the Apps Script web app
2. **Apps Script** receives the data and formats it for Google Forms
3. **Apps Script** submits the data to Google Forms using `UrlFetchApp`
4. **Google Forms** processes the submission and updates the linked sheet

### **Benefits of This Approach**

- ✅ **No CORS issues** - Apps Script runs on Google's servers
- ✅ **Proper session context** - Apps Script has the right permissions
- ✅ **Reliable submissions** - Uses Google's own `UrlFetchApp` service
- ✅ **Error handling** - Can see actual response codes and errors
- ✅ **Debugging** - Full logging in Apps Script console

## 🧪 **Testing**

### **Test the Apps Script**

1. **Run the test function** in Apps Script editor
2. **Check the logs** for success/failure messages
3. **Verify in Google Sheet** that the test submission appeared

### **Test from Frontend**

1. **Build and deploy** your frontend with the new Apps Script URL
2. **Submit feedback** through your application
3. **Check console** for success messages
4. **Verify in Google Sheet** that the submission appeared

## 🚨 **Troubleshooting**

### **Common Issues**

1. **"Script not authorized"**
   - Make sure you've authorized the script when deploying
   - Check that "Execute as" is set to "Me"

2. **"Access denied"**
   - Ensure "Who has access" is set to "Anyone"
   - Redeploy if you changed the access settings

3. **"Function not found"**
   - Make sure you've saved the script after pasting the code
   - Check that the function names match exactly

4. **Submissions not appearing in sheet**
   - Check the Apps Script logs for errors
   - Verify the FORM_URL and ENTRY_IDS are correct
   - Test with the `testSubmission` function first

### **Debugging Steps**

1. **Check Apps Script logs**:
   - Go to Apps Script editor
   - Click "Executions" to see recent runs
   - Click on an execution to see logs

2. **Test individual components**:
   - Run `testSubmission` function
   - Check if it appears in your Google Sheet
   - If not, check the logs for errors

3. **Verify form configuration**:
   - Make sure your Google Form is still linked to the sheet
   - Check that the entry IDs haven't changed

## 📊 **Expected Results**

After setup, you should see:

- ✅ **Apps Script test submission** appears in your Google Sheet
- ✅ **Frontend submissions** work without CORS errors
- ✅ **All 8 fields** populated correctly in the sheet
- ✅ **Real-time updates** when feedback is submitted

## 🔄 **Next Steps**

1. **Complete the setup** following the steps above
2. **Test thoroughly** with both Apps Script and frontend
3. **Deploy to production** with the new Apps Script URL
4. **Monitor submissions** to ensure everything works correctly

This approach will provide a reliable, CORS-free way to submit feedback data to your Google Form and Sheet.
