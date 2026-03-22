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

    // DELETE RENTAL via GET request
    if (type === 'delete-rental') {
      const sheet = ss.getSheetByName('Rentals');
      if (!sheet) return response({ status: 'error', message: 'Rentals sheet not found' });
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

    // EDIT existing car or rental
    if (data.type === 'edit') {
      const sheet = ss.getSheetByName(data.sheet) || ss.getActiveSheet();
      const row = Number(data.row);
      if (data.sheet === 'Rentals') {
        sheet.getRange(row, 1).setValue(data.make);
        sheet.getRange(row, 2).setValue(data.model);
        sheet.getRange(row, 3).setValue(data.price);
        sheet.getRange(row, 4).setValue(data.seats);
        sheet.getRange(row, 5).setValue(data.fuel);
        sheet.getRange(row, 7).setValue(data.description);
        if (data.photos) sheet.getRange(row, 7).setValue(data.photos);
      } else {
        sheet.getRange(row, 2).setValue(data.make);
        sheet.getRange(row, 3).setValue(data.model);
        sheet.getRange(row, 4).setValue(data.price);
        sheet.getRange(row, 5).setValue(data.year);
        sheet.getRange(row, 6).setValue(data.mileage);
        sheet.getRange(row, 7).setValue(data.fuel);
        sheet.getRange(row, 8).setValue(data.color);
        sheet.getRange(row, 9).setValue(data.engine);
        sheet.getRange(row, 10).setValue(data.seats);
        sheet.getRange(row, 11).setValue(data.badge);
        sheet.getRange(row, 12).setValue(data.description);
        if (data.photos) sheet.getRange(row, 13).setValue(data.photos);
      }
      return response({ status: 'edited', row: row });
    }

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
