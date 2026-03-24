// =============================================
// ROYAL MOTORS — Google Apps Script v3
// Replace ALL code with this then redeploy
// =============================================

const SHEET_ID = '16yRIt44Ilfr8cw7XbewyvhnWoYzv5iQnKbv7gMQROS8';

/** Tab names tried in order — must match one tab at the bottom of your spreadsheet */
function getRentalsSheet_(ss) {
  const names = ['Rentals', 'Rental Cars', 'RENTALS', 'rental cars'];
  for (let i = 0; i < names.length; i++) {
    const sh = ss.getSheetByName(names[i]);
    if (sh) return sh;
  }
  return null;
}

/** If headers are wrong/missing, still map Photo (col G) and Photos (col I) by position */
function normalizeRentalRow_(row, headers) {
  const obj = {};
  headers.forEach(function(h, i) {
    if (h !== '' && h != null) obj[String(h).trim()] = row[i];
  });
  if (row.length >= 7 && (obj.Photo === undefined || obj.Photo === '') && row[6] !== '') {
    obj.Photo = row[6];
  }
  if (row.length >= 9 && (obj.Photos === undefined || obj.Photos === '') && row[8] !== '') {
    obj.Photos = row[8];
  }
  if (row.length >= 10 && (obj.Badge === undefined || obj.Badge === '') && row[9] !== '') {
    obj.Badge = row[9];
  }
  return obj;
}

/** If headers are wrong/missing, still map Photo(s) to `Photo` / `Photos` keys */
function normalizeCarRow_(row, headers) {
  const obj = {};
  headers.forEach(function(h, i) {
    if (h !== '' && h != null) obj[String(h).trim()] = row[i];
  });

  const headerStrs = headers.map(h => (h == null ? '' : String(h)).trim());
  const lower = headerStrs.map(s => s.toLowerCase());

  let photosIdx = -1;
  let photoIdx = -1;
  for (let i = 0; i < lower.length; i++) {
    if (!lower[i]) continue;
    if (lower[i].includes('photos')) photosIdx = i;
    else if (lower[i].includes('photo')) photoIdx = i;
  }

  const photosVal = photosIdx >= 0 ? row[photosIdx] : '';
  const photoVal = photoIdx >= 0 ? row[photoIdx] : '';

  // Prefer the plural key used by the frontend
  if ((obj.Photos == null || String(obj.Photos).trim() === '') && photosIdx >= 0 && photosVal) obj.Photos = photosVal;
  if ((obj.Photo == null || String(obj.Photo).trim() === '') && photoIdx >= 0 && photoVal) obj.Photo = photoVal;

  // Also handle lowercase variants like `photos` / `photo`
  if ((obj.Photos == null || String(obj.Photos).trim() === '') && obj.photos != null && String(obj.photos).trim() !== '') obj.Photos = obj.photos;
  if ((obj.Photo == null || String(obj.Photo).trim() === '') && obj.photo != null && String(obj.photo).trim() !== '') obj.Photo = obj.photo;

  // Final fallback: if last column looks like a URL(s), treat it as Photos
  if ((obj.Photos == null || String(obj.Photos).trim() === '') && headers.length) {
    const lastVal = row[headers.length - 1];
    if (typeof lastVal === 'string' && lastVal.toLowerCase().includes('http')) obj.Photos = lastVal;
  }

  return obj;
}

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
      const sheet = getRentalsSheet_(ss);
      if (!sheet) return response({ status: 'error', message: 'Rentals sheet not found' });
      const row = Number(e.parameter.row);
      sheet.deleteRow(row);
      return response({ status: 'deleted', row: row });
    }

    // Return RENTALS
    if (type === 'rentals') {
      const sheet = getRentalsSheet_(ss);
      if (!sheet) return response([]);
      const data = sheet.getDataRange().getValues();
      if (data.length < 2) return response([]);
      const headers = data[0];
      const rentals = data.slice(1)
        .filter(function(row) { return row[0]; })
        .map(function(row) {
          return normalizeRentalRow_(row, headers);
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
      .map(row => normalizeCarRow_(row, headers));
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
      const targetSheet = (data.sheet === 'Rentals')
        ? (getRentalsSheet_(ss) || ss.getActiveSheet())
        : (ss.getSheetByName(data.sheet) || ss.getActiveSheet());
      const row = Number(data.row);
      if (data.sheet === 'Rentals') {
        targetSheet.getRange(row, 1).setValue(data.make);
        targetSheet.getRange(row, 2).setValue(data.model);
        targetSheet.getRange(row, 3).setValue(data.price);
        targetSheet.getRange(row, 4).setValue(data.seats);
        targetSheet.getRange(row, 5).setValue(data.fuel);
        targetSheet.getRange(row, 6).setValue(data.trans || '');
        const photosStr = (data.photos || '').toString().trim();
        const firstPhoto = photosStr ? photosStr.split(',')[0].trim() : '';
        targetSheet.getRange(row, 7).setValue(firstPhoto);
        targetSheet.getRange(row, 8).setValue(data.description || '');
        targetSheet.getRange(row, 9).setValue(photosStr || firstPhoto);
        targetSheet.getRange(row, 10).setValue(data.badge || '');
      } else {
        targetSheet.getRange(row, 2).setValue(data.make);
        targetSheet.getRange(row, 3).setValue(data.model);
        targetSheet.getRange(row, 4).setValue(data.price);
        targetSheet.getRange(row, 5).setValue(data.year);
        targetSheet.getRange(row, 6).setValue(data.mileage);
        targetSheet.getRange(row, 7).setValue(data.fuel);
        targetSheet.getRange(row, 8).setValue(data.color);
        targetSheet.getRange(row, 9).setValue(data.engine);
        targetSheet.getRange(row, 10).setValue(data.seats);
        targetSheet.getRange(row, 11).setValue(data.badge);
        targetSheet.getRange(row, 12).setValue(data.description);
        if (data.photos) targetSheet.getRange(row, 13).setValue(data.photos);
      }
      return response({ status: 'edited', row: row });
    }

    // ADD RENTAL car
    if (data.type === 'rental') {
      let sheet = getRentalsSheet_(ss);
      if (!sheet) {
        sheet = ss.insertSheet('Rentals');
        sheet.appendRow(['Make','Model','Price','Seats','Fuel','Trans','Photo','Description','Photos','Badge']);
      }
      sheet.appendRow([
        data.make, data.model, data.price,
        data.seats, data.fuel, data.trans,
        data.photo, data.description, data.photos || data.photo,
        data.badge || ''
      ]);
      return response({ status: 'rental added' });
    }

    // ADD regular CAR
    let sheet = ss.getSheetByName('Cars');
    if (!sheet) {
      sheet = ss.getActiveSheet();
      if (sheet.getLastRow() === 0) {
        sheet.appendRow(['ID','Make','Model','Price','Year','Mileage','Fuel','Color','Engine','Seats','Trans','Badge','Description','Photos']);
      }
    }
    const lastRow = sheet.getLastRow();
    sheet.appendRow([
      lastRow,
      data.make, data.model, data.price,
      data.year, data.mileage, data.fuel,
      data.color, data.engine, data.seats,
      data.trans, data.badge, data.description, data.photos
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
