// =============================================
// ROYAL MOTORS — Google Apps Script v4
// Replace ALL code with this then redeploy
// =============================================

const SHEET_ID = '16yRIt44Ilfr8cw7XbewyvhnWoYzv5iQnKbv7gMQROS8';

/** Normalise any status string to exactly 'Coming Soon' or 'In Stock' */
function normalizeStatus_(val) {
  const s = String(val ?? '').trim();
  if (/coming\s*soon/i.test(s)) return 'Coming Soon';
  if (s === 'In Stock' || s === 'in stock' || s === '') return 'In Stock';
  // Catch any other truthy value that was intentionally set to Coming Soon
  if (/coming/i.test(s)) return 'Coming Soon';
  return 'In Stock';
}

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

function looksLikeUrl_(s) {
  return typeof s === 'string' && /^https?:\/\//i.test(String(s).trim());
}

function looksLikeTransmission_(s) {
  const t = String(s ?? '').trim().toLowerCase();
  if (!t) return false;
  return t === 'auto' || t === 'automatic' || t === 'manual';
}

function guessTransmissionFromRow_(row) {
  for (let i = 0; i < row.length; i++) {
    const v = row[i];
    if (v == null) continue;
    if (looksLikeUrl_(v)) continue;
    if (looksLikeTransmission_(v)) return v;
  }
  return '';
}

function hasValue_(v) {
  return v !== undefined && v !== null && String(v).trim() !== '';
}

function pickOrKeep_(incoming, current) {
  return hasValue_(incoming) ? incoming : current;
}

function pickTransOrKeep_(incoming, current) {
  if (!hasValue_(incoming)) return current;
  const t = String(incoming).trim().toLowerCase();
  if (t === 'auto' || t === 'automatic') return 'Auto';
  if (t === 'manual') return 'Manual';
  return current;
}

/** If headers are wrong/missing, still map Photo(s) to `Photo` / `Photos` keys */
function normalizeCarRow_(row, headers) {
  const obj = {};
  headers.forEach(function(h, i) {
    if (h !== '' && h != null) obj[String(h).trim()] = row[i];
  });

  const headerStrs = headers.map(h => (h == null ? '' : String(h)).trim());
  const lower = headerStrs.map(s => s.toLowerCase());

  const transIdx = lower.findIndex(function(h) {
    return h === 'trans' || h === 'transmission';
  });
  if (transIdx >= 0 && row[transIdx] != null && String(row[transIdx]).trim() !== '' && !looksLikeUrl_(row[transIdx])) {
    obj.Trans = row[transIdx];
  }
  if ((obj.Trans == null || String(obj.Trans).trim() === '' || looksLikeUrl_(obj.Trans)) && row.length > 10 && row[10] != null && String(row[10]).trim() !== '' && !looksLikeUrl_(row[10])) {
    obj.Trans = row[10];
  }
  if (obj.Trans != null && looksLikeUrl_(obj.Trans)) delete obj.Trans;
  if (obj.Trans == null || String(obj.Trans).trim() === '' || looksLikeUrl_(obj.Trans)) {
    const guessed = guessTransmissionFromRow_(row);
    if (guessed) obj.Trans = guessed;
  }

  const badgeIdx = lower.findIndex(function(h) { return h === 'badge' || h === 'badge label'; });
  if (badgeIdx >= 0 && row[badgeIdx] != null && String(row[badgeIdx]).trim() !== '' && !looksLikeUrl_(row[badgeIdx])) {
    obj.Badge = row[badgeIdx];
  }
  if ((obj.Badge == null || String(obj.Badge).trim() === '') && row.length > 11 && row[11] != null && String(row[11]).trim() !== '' && !looksLikeUrl_(row[11])) {
    obj.Badge = row[11];
  }

  let photosIdx = -1;
  let photoIdx = -1;
  for (let i = 0; i < lower.length; i++) {
    if (!lower[i]) continue;
    if (lower[i].includes('photos')) photosIdx = i;
    else if (lower[i].includes('photo')) photoIdx = i;
  }

  const photosVal = photosIdx >= 0 ? row[photosIdx] : '';
  const photoVal = photoIdx >= 0 ? row[photoIdx] : '';

  if ((obj.Photos == null || String(obj.Photos).trim() === '') && photosIdx >= 0 && photosVal) obj.Photos = photosVal;
  if ((obj.Photo == null || String(obj.Photo).trim() === '') && photoIdx >= 0 && photoVal) obj.Photo = photoVal;

  if ((obj.Photos == null || String(obj.Photos).trim() === '') && obj.photos != null && String(obj.photos).trim() !== '') obj.Photos = obj.photos;
  if ((obj.Photo == null || String(obj.Photo).trim() === '') && obj.photo != null && String(obj.photo).trim() !== '') obj.Photo = obj.photo;

  if ((obj.Photos == null || String(obj.Photos).trim() === '') && headers.length) {
    const lastVal = row[headers.length - 1];
    if (typeof lastVal === 'string' && lastVal.toLowerCase().includes('http')) obj.Photos = lastVal;
  }
  if ((obj.Photos == null || String(obj.Photos).trim() === '') && row.length > 13 && row[13] != null && String(row[13]).trim() !== '' && looksLikeUrl_(row[13])) {
    obj.Photos = row[13];
  }
  if (obj.Badge != null && looksLikeUrl_(obj.Badge)) delete obj.Badge;

  // ── STATUS / AVAILABILITY ──────────────────────────────────────────────────
  // Look for a header named Status, Availability, or Avail (case-insensitive)
  const statusIdx = lower.findIndex(function(h) {
    return h === 'status' || h === 'availability' || h === 'avail';
  });
  if (statusIdx >= 0 && row[statusIdx] != null && String(row[statusIdx]).trim() !== '') {
    obj.Status = normalizeStatus_(row[statusIdx]);
  } else if (row.length > 14 && row[14] != null && String(row[14]).trim() !== '') {
    // Column O (index 14) is the standard Status column in a 15-column Cars sheet
    obj.Status = normalizeStatus_(row[14]);
  } else {
    obj.Status = 'In Stock';
  }

  return obj;
}

function getPartsSheet_(ss) {
  const names = ['Parts', 'Vehicle Parts', 'PARTS', 'parts'];
  for (let i = 0; i < names.length; i++) {
    const sh = ss.getSheetByName(names[i]);
    if (sh) return sh;
  }
  return null;
}

function normalizePartRow_(row, headers) {
  const obj = {};
  headers.forEach(function(h, i) {
    if (h !== '' && h != null) obj[String(h).trim()] = row[i];
  });
  if (row.length >= 5 && (obj.Price === undefined || obj.Price === '') && row[3] !== '') obj.Price = row[3];
  if (row.length >= 6 && (obj.Photo === undefined || obj.Photo === '') && row[4] !== '') obj.Photo = row[4];
  if (row.length >= 7 && (obj.Photos === undefined || obj.Photos === '') && row[5] !== '') obj.Photos = row[5];
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

    // Return PARTS
    if (type === 'parts') {
      const sheet = getPartsSheet_(ss);
      if (!sheet) return response([]);
      const data = sheet.getDataRange().getValues();
      if (data.length < 2) return response([]);
      const headers = data[0];
      const parts = [];
      data.slice(1).forEach(function(row, idx) {
        if (!row[0] && !row[1]) return;
        const obj = normalizePartRow_(row, headers);
        obj._row = idx + 2;
        parts.push(obj);
      });
      return response(parts);
    }

    // Return RENTALS
    if (type === 'rentals') {
      const sheet = getRentalsSheet_(ss);
      if (!sheet) return response([]);
      const data = sheet.getDataRange().getValues();
      if (data.length < 2) return response([]);
      const headers = data[0];
      const rentals = [];
      data.slice(1).forEach(function(row, idx) {
        if (!row[0]) return;
        const obj = normalizeRentalRow_(row, headers);
        obj._row = idx + 2;
        rentals.push(obj);
      });
      return response(rentals);
    }

    // Return CARS (default)
    const sheet = ss.getSheetByName('Cars') || ss.getActiveSheet();
    const data = sheet.getDataRange().getValues();
    if (data.length < 2) return response([]);
    const headers = data[0];
    const cars = [];
    data.slice(1).forEach(function(row, idx) {
      if (!row[1]) return;
      const obj = normalizeCarRow_(row, headers);
      obj._row = idx + 2;
      cars.push(obj);
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
      const targetSheet = (data.sheet === 'Rentals')
        ? (getRentalsSheet_(ss) || ss.getActiveSheet())
        : (ss.getSheetByName(data.sheet) || ss.getActiveSheet());
      const row = Number(data.row);
      const existing = targetSheet.getRange(row, 1, 1, targetSheet.getLastColumn()).getValues()[0] || [];
      if (data.sheet === 'Rentals') {
        const mergedMake = pickOrKeep_(data.make, existing[0] || '');
        const mergedModel = pickOrKeep_(data.model, existing[1] || '');
        const mergedPrice = pickOrKeep_(data.price, existing[2] || '');
        const mergedSeats = pickOrKeep_(data.seats, existing[3] || '');
        const mergedFuel = pickOrKeep_(data.fuel, existing[4] || '');
        const mergedTrans = pickTransOrKeep_(data.trans, existing[5] || '');
        const existingPhotos = (existing[8] != null && String(existing[8]).trim() !== '')
          ? String(existing[8]).trim()
          : (existing[6] != null ? String(existing[6]).trim() : '');
        const incomingPhotos = hasValue_(data.photos) ? String(data.photos).trim() : '';
        const photosStr = incomingPhotos || existingPhotos;
        const firstPhoto = photosStr ? photosStr.split(',')[0].trim() : (existing[6] || '');
        const mergedDescription = pickOrKeep_(data.description, existing[7] || '');
        const mergedBadge = pickOrKeep_(data.badge, existing[9] || '');

        targetSheet.getRange(row, 1).setValue(mergedMake);
        targetSheet.getRange(row, 2).setValue(mergedModel);
        targetSheet.getRange(row, 3).setValue(mergedPrice);
        targetSheet.getRange(row, 4).setValue(mergedSeats);
        targetSheet.getRange(row, 5).setValue(mergedFuel);
        targetSheet.getRange(row, 6).setValue(mergedTrans);
        targetSheet.getRange(row, 7).setValue(firstPhoto || '');
        targetSheet.getRange(row, 8).setValue(mergedDescription);
        targetSheet.getRange(row, 9).setValue(photosStr || '');
        targetSheet.getRange(row, 10).setValue(mergedBadge);
      } else {
        // Columns: A=ID B=Make C=Model D=Price E=Year F=Mileage G=Fuel H=Color
        //          I=Engine J=Seats K=Trans L=Badge M=Description N=Photos O=Status
        const mergedMake        = pickOrKeep_(data.make,        existing[1]  || '');
        const mergedModel       = pickOrKeep_(data.model,       existing[2]  || '');
        const mergedPrice       = pickOrKeep_(data.price,       existing[3]  || '');
        const mergedYear        = pickOrKeep_(data.year,        existing[4]  || '');
        const mergedMileage     = pickOrKeep_(data.mileage,     existing[5]  || '');
        const mergedFuel        = pickOrKeep_(data.fuel,        existing[6]  || '');
        const mergedColor       = pickOrKeep_(data.color,       existing[7]  || '');
        const mergedEngine      = pickOrKeep_(data.engine,      existing[8]  || '');
        const mergedSeats       = pickOrKeep_(data.seats,       existing[9]  || '');
        const mergedTrans       = pickTransOrKeep_(data.trans,  existing[10] || '');
        const mergedBadge       = pickOrKeep_(data.badge,       existing[11] || '');
        const mergedDescription = pickOrKeep_(data.description, existing[12] || '');
        const mergedPhotos      = pickOrKeep_(data.photos,      existing[13] || '');

        // ── FIX: use normalizeStatus_ so 'Coming Soon' is always preserved ──
        const existingStatus = (existing[14] != null && String(existing[14]).trim() !== '')
          ? String(existing[14]).trim()
          : 'In Stock';
        const mergedStatus = normalizeStatus_(hasValue_(data.status) ? data.status : existingStatus);

        targetSheet.getRange(row, 2).setValue(mergedMake);
        targetSheet.getRange(row, 3).setValue(mergedModel);
        targetSheet.getRange(row, 4).setValue(mergedPrice);
        targetSheet.getRange(row, 5).setValue(mergedYear);
        targetSheet.getRange(row, 6).setValue(mergedMileage);
        targetSheet.getRange(row, 7).setValue(mergedFuel);
        targetSheet.getRange(row, 8).setValue(mergedColor);
        targetSheet.getRange(row, 9).setValue(mergedEngine);
        targetSheet.getRange(row, 10).setValue(mergedSeats);
        targetSheet.getRange(row, 11).setValue(mergedTrans);
        targetSheet.getRange(row, 12).setValue(mergedBadge);
        targetSheet.getRange(row, 13).setValue(mergedDescription);
        targetSheet.getRange(row, 14).setValue(mergedPhotos);
        targetSheet.getRange(row, 15).setValue(mergedStatus); // ← FIXED
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

    // ADD PART
    if (data.type === 'part') {
      let sheet = getPartsSheet_(ss);
      if (!sheet) {
        sheet = ss.insertSheet('Parts');
        sheet.appendRow(['Category', 'Name', 'Brand', 'Price', 'Photo', 'Photos', 'Description', 'Stock']);
      }
      sheet.appendRow([
        data.category    || '',
        data.name        || '',
        data.brand       || '',
        data.price       || '',
        data.photo       || '',
        data.photos      || data.photo || '',
        data.description || '',
        data.stock       || ''
      ]);
      return response({ status: 'part added' });
    }

    // ADD regular CAR
    let sheet = ss.getSheetByName('Cars');
    if (!sheet) {
      sheet = ss.getActiveSheet();
      if (sheet.getLastRow() === 0) {
        sheet.appendRow(['ID','Make','Model','Price','Year','Mileage','Fuel','Color','Engine','Seats','Trans','Badge','Description','Photos','Status']);
      }
    }
    const lastRow = sheet.getLastRow();

    // ── FIX: use normalizeStatus_ so 'Coming Soon' is always preserved ──
    const normStatus = normalizeStatus_(data.status);

    sheet.appendRow([
      lastRow,
      data.make,        data.model,   data.price,
      data.year,        data.mileage, data.fuel,
      data.color,       data.engine,  data.seats,
      data.trans,       data.badge,   data.description,
      data.photos,
      normStatus        // ← FIXED
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
