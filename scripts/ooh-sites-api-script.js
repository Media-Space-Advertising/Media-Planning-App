/**
 * Google Apps Script to expose a Google Sheet as a JSON API for the OOH Media Planner.
 * 
 * Instructions:
 * 1. Open your Google Sheet.
 * 2. Go to Extensions > Apps Script.
 * 3. Paste this entire script into the editor, replacing any existing code.
 * 4. Save the script.
 * 5. Click "Deploy" > "New deployment".
 * 6. Under "Select type", choose "Web app".
 * 7. For "Who has access", select "Anyone".
 * 8. Click "Deploy" and grant the necessary permissions.
 * 9. Copy the provided Web app URL and paste it into the application code.
 * 10. To update, make changes here, then copy/paste into the Apps Script editor and deploy again ("Manage deployments" > "Edit" > "New version").
 */

// A function that is executed when a GET request is made to the web app's URL.
function doGet(e) {
  const siteData = getSitesData();
  return ContentService.createTextOutput(JSON.stringify(siteData))
    .setMimeType(ContentService.MimeType.JSON);
}

// A helper function to read and process data from the "Sites" tab.
function getSitesData() {
  const sheetName = "Sites"; // The name of the tab with your site data.
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(sheetName);

  if (!sheet) {
    return { error: `Sheet "${sheetName}" not found.` };
  }

  const dataRange = sheet.getDataRange();
  const values = dataRange.getValues();
  const headers = values.shift(); // Remove the header row.
  
  // Convert header names to camelCase for use as JSON keys.
  const camelCaseHeaders = headers.map(header => {
    // Check if the header is a string and not empty before processing.
    if (typeof header === 'string' && header.trim() !== '') {
      return header.trim()
        .replace(/\s+(.)/g, (_, group1) => group1.toUpperCase()) // "Format Name" -> "formatName"
        .replace(/[^a-zA-Z]/g, '') // Keep only letters
        .replace(/^./, (match) => match.toLowerCase()); // Lowercase the first letter
    }
    // Return null for empty or non-string headers (like availability dates).
    return null;
  });
  
  const coordsIndex = camelCaseHeaders.indexOf("coordinates");
  const priceIndex = camelCaseHeaders.indexOf("pricePerWeeks");

  // Map the rows of data to an array of objects.
  const sites = values.map(row => {
    const site = {};
    
    camelCaseHeaders.forEach((header, index) => {
      // Only process columns that have a valid header.
      if (header) {
        site[header] = row[index];
      }
    });

    // Special handling for Coordinates: split "[lng, lat]" string into numbers.
    if (coordsIndex > -1 && typeof site.coordinates === 'string' && site.coordinates.startsWith('[') && site.coordinates.endsWith(']')) {
        const coordString = site.coordinates.slice(1, -1); // Remove brackets
        const [lng, lat] = coordString.split(',').map(coord => parseFloat(coord.trim()));
        site.lat = lat;
        site.lng = lng;
    }
    
    // Special handling for Price: remove '£' and ',' and convert to a number.
    if (priceIndex > -1 && typeof site.pricePerWeeks === 'string') {
        const cleanPrice = site.pricePerWeeks.replace(/[£,]/g, '');
        site.cost = parseFloat(cleanPrice) || 0;
    }

    return site;
  });

  return sites;
} 