// =============================================
// ROYAL MOTORS — Google Apps Script v3
// Replace ALL code with this then redeploy
// =============================================

const SHEET_ID = '16yRIt44Ilfr8cw7XbewyvhnWoYzv5iQnKbv7gMQROS8';

function doGet(e) {
  try {
    const type = e && e.parameter && e.parameter.type;
    const ss = SpreadsheetApp.openById(SHEET_ID);

    // DELETE via GET request
    if (type === 'delete') {
      const sheet = ss.getSheetByName('Cars') || ss.getActiveSheet();
      const row = Number(e.parameter.row);
      sheet.deleteRow(row);
      return response({ status: 'deleted', row: row });
    }

    // Return RENTALS
    if (type === 'rentals') {
      const sheet = ss.getSheetByName('Rentals');
      if (!sheet) return response([]);
      const data = sheet.getDataRange().getValues();
      if (data.length < 2) return response([]);
      const headers = data[0];
      const rentals = data.slice(1)
        .filter(row => row[0])
        .map(row => {
          const obj = {};
          headers.forEach((h, i) => obj[h] = row[i]);
          return obj;
        });
      return response(rentals);
    }

    // Return CARS (default)
    const sheet = ss.getSheetByName('Cars') || ss.getActiveSheet();
    const data = sheet.getDataRange().getValues();
    if (data.length < 2) return response([]);
    const headers = data[0];
    const cars = data.slice(1)
      .filter(row => row[1])
      .map(row => {
        const obj = {};
        headers.forEach((h, i) => obj[h] = row[i]);
        return obj;
      });
    return response(cars);

  } catch(err) {
    return response({ error: err.toString() });
  }
}

function doPost(e) {
  try {
    const data = JSON.parse(e.postData.contents);
    const ss = SpreadsheetApp.openById(SHEET_ID);

    // ADD RENTAL car
    if (data.type === 'rental') {
      let sheet = ss.getSheetByName('Rentals');
      if (!sheet) {
        sheet = ss.insertSheet('Rentals');
        sheet.appendRow(['Make','Model','Price','Seats','Fuel','Trans','Photo','Description']);
      }
      sheet.appendRow([
        data.make, data.model, data.price,
        data.seats, data.fuel, data.trans,
        data.photo, data.description
      ]);
      return response({ status: 'rental added' });
    }

    // ADD regular CAR
    let sheet = ss.getSheetByName('Cars');
    if (!sheet) {
      sheet = ss.getActiveSheet();
      if (sheet.getLastRow() === 0) {
        sheet.appendRow(['ID','Make','Model','Price','Year','Mileage','Fuel','Color','Engine','Seats','Badge','Description','Photos']);
      }
    }
    const lastRow = sheet.getLastRow();
    sheet.appendRow([
      lastRow,
      data.make, data.model, data.price,
      data.year, data.mileage, data.fuel,
      data.color, data.engine, data.seats,
      data.badge, data.description, data.photos
    ]);
    return response({ status: 'car added' });

  } catch(err) {
    return response({ status: 'error', message: err.toString() });
  }
}

function response(data) {
  return ContentService
    .createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}
