// =============================================
// ROYAL MOTORS — Google Apps Script v5 (Clean Rebuild)
// Replace ALL existing code with this, then redeploy as a NEW version.
//
// SPREADSHEET SETUP — create exactly these 3 tabs with these headers:
//
// Sheet: Cars
// Row 1: Make | Model | Price | Year | Mileage | Fuel | Color | Engine | Seats | Trans | Badge | Description | Photos | Status
//
// Sheet: Rentals
// Row 1: Make | Model | Price | Seats | Fuel | Trans | Description | Photos | Badge
//
// Sheet: Parts
// Row 1: Category | Name | Brand | Price | Description | Photos | Stock
// =============================================

const SHEET_ID = '1ZAjr5opL70QUtBVwQLqgYqnquaV6K-1XAsPJu5ScOg4';
// ── Column positions (1-based, matches the header rows above exactly) ─────────

const CAR_COLS = {
  Make: 1, Model: 2, Price: 3, Year: 4, Mileage: 5,
  Fuel: 6, Color: 7, Engine: 8, Seats: 9, Trans: 10,
  Badge: 11, Description: 12, Photos: 13, Status: 14
};

const RENTAL_COLS = {
  Make: 1, Model: 2, Price: 3, Seats: 4, Fuel: 5,
  Trans: 6, Description: 7, Photos: 8, Badge: 9
};

const PART_COLS = {
  Category: 1, Name: 2, Brand: 3, Price: 4,
  Description: 5, Photos: 6, Stock: 7
};

// ── Helpers ───────────────────────────────────────────────────────────────────

function str_(v) {
  return (v === undefined || v === null) ? '' : String(v).trim();
}

// Returns ONLY "Coming Soon" or "In Stock" — nothing else, ever.
function cleanStatus_(v) {
  return /coming\s*soon/i.test(str_(v)) ? 'Coming Soon' : 'In Stock';
}

function getSheet_(ss, name) {
  return ss.getSheetByName(name);
}

// Creates the sheet with headers if it does not exist yet.
function ensureSheet_(ss, name, headers) {
  let sh = ss.getSheetByName(name);
  if (!sh) {
    sh = ss.insertSheet(name);
    sh.appendRow(headers);
  }
  return sh;
}

// Converts a spreadsheet row array + header array into a plain JS object.
function rowToObj_(row, headers) {
  const obj = {};
  headers.forEach(function (h, i) {
    obj[str_(h)] = (row[i] === undefined || row[i] === null) ? '' : row[i];
  });
  return obj;
}

function jsonResponse_(data) {
  return ContentService
    .createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}

// ── GET handler ───────────────────────────────────────────────────────────────

function doGet(e) {
  try {
    const params = (e && e.parameter) ? e.parameter : {};
    const type   = str_(params.type);
    const ss     = SpreadsheetApp.openById(SHEET_ID);

    // DELETE CAR
    if (type === 'delete-car') {
      const sh  = getSheet_(ss, 'Cars');
      if (!sh) return jsonResponse_({ error: 'Cars sheet not found' });
      const row = Number(params.row);
      if (!row || row < 2) return jsonResponse_({ error: 'Invalid row' });
      sh.deleteRow(row);
      return jsonResponse_({ status: 'ok', action: 'car deleted', row: row });
    }

    // DELETE RENTAL
    if (type === 'delete-rental') {
      const sh  = getSheet_(ss, 'Rentals');
      if (!sh) return jsonResponse_({ error: 'Rentals sheet not found' });
      const row = Number(params.row);
      if (!row || row < 2) return jsonResponse_({ error: 'Invalid row' });
      sh.deleteRow(row);
      return jsonResponse_({ status: 'ok', action: 'rental deleted', row: row });
    }

    // DELETE PART
    if (type === 'delete-part') {
      const sh  = getSheet_(ss, 'Parts');
      if (!sh) return jsonResponse_({ error: 'Parts sheet not found' });
      const row = Number(params.row);
      if (!row || row < 2) return jsonResponse_({ error: 'Invalid row' });
      sh.deleteRow(row);
      return jsonResponse_({ status: 'ok', action: 'part deleted', row: row });
    }

    // READ RENTALS
    if (type === 'rentals') {
      const sh = getSheet_(ss, 'Rentals');
      if (!sh) return jsonResponse_([]);
      const rows = sh.getDataRange().getValues();
      if (rows.length < 2) return jsonResponse_([]);
      const headers = rows[0].map(str_);
      const result  = [];
      rows.slice(1).forEach(function (row, i) {
        if (!str_(row[0]) && !str_(row[1])) return;
        const obj = rowToObj_(row, headers);
        obj._row  = i + 2;
        result.push(obj);
      });
      return jsonResponse_(result);
    }

    // READ PARTS
    if (type === 'parts') {
      const sh = getSheet_(ss, 'Parts');
      if (!sh) return jsonResponse_([]);
      const rows = sh.getDataRange().getValues();
      if (rows.length < 2) return jsonResponse_([]);
      const headers = rows[0].map(str_);
      const result  = [];
      rows.slice(1).forEach(function (row, i) {
        if (!str_(row[0]) && !str_(row[1])) return;
        const obj = rowToObj_(row, headers);
        obj._row  = i + 2;
        result.push(obj);
      });
      return jsonResponse_(result);
    }

    // READ CARS (default — no ?type= needed)
    const sh = getSheet_(ss, 'Cars');
    if (!sh) return jsonResponse_([]);
    const rows = sh.getDataRange().getValues();
    if (rows.length < 2) return jsonResponse_([]);
    const headers = rows[0].map(str_);
    const result  = [];
    rows.slice(1).forEach(function (row, i) {
      if (!str_(row[0])) return; // skip rows with no Make
      const obj  = rowToObj_(row, headers);
      obj.Status = cleanStatus_(obj.Status); // sanitise on the way out
      obj._row   = i + 2;
      result.push(obj);
    });
    return jsonResponse_(result);

  } catch (err) {
    return jsonResponse_({ error: err.toString() });
  }
}

// ── POST handler ──────────────────────────────────────────────────────────────

function doPost(e) {
  try {
    const data = JSON.parse(e.postData.contents);
    const ss   = SpreadsheetApp.openById(SHEET_ID);
    const type = str_(data.type);

    // ADD CAR
    if (type === 'add-car') {
      const sh = ensureSheet_(ss, 'Cars',
        ['Make','Model','Price','Year','Mileage','Fuel','Color',
         'Engine','Seats','Trans','Badge','Description','Photos','Status']);
      sh.appendRow([
        str_(data.make),        // col 1  Make
        str_(data.model),       // col 2  Model
        str_(data.price),       // col 3  Price
        str_(data.year),        // col 4  Year
        str_(data.mileage),     // col 5  Mileage
        str_(data.fuel),        // col 6  Fuel
        str_(data.color),       // col 7  Color
        str_(data.engine),      // col 8  Engine
        str_(data.seats),       // col 9  Seats
        str_(data.trans),       // col 10 Trans
        str_(data.badge),       // col 11 Badge
        str_(data.description), // col 12 Description
        str_(data.photos),      // col 13 Photos
        cleanStatus_(data.status) // col 14 Status — ALWAYS clean
      ]);
      return jsonResponse_({ status: 'ok', action: 'car added' });
    }

    // ADD RENTAL
    if (type === 'add-rental') {
      const sh = ensureSheet_(ss, 'Rentals',
        ['Make','Model','Price','Seats','Fuel','Trans','Description','Photos','Badge']);
      sh.appendRow([
        str_(data.make),
        str_(data.model),
        str_(data.price),
        str_(data.seats),
        str_(data.fuel),
        str_(data.trans),
        str_(data.description),
        str_(data.photos),
        str_(data.badge)
      ]);
      return jsonResponse_({ status: 'ok', action: 'rental added' });
    }

    // EDIT RENTAL
    if (type === 'edit-rental') {
      const sh  = getSheet_(ss, 'Rentals');
      if (!sh) return jsonResponse_({ error: 'Rentals sheet not found' });
      const row = Number(data.row);
      if (!row || row < 2) return jsonResponse_({ error: 'Invalid row' });
      sh.getRange(row, RENTAL_COLS.Make).setValue(str_(data.make));
      sh.getRange(row, RENTAL_COLS.Model).setValue(str_(data.model));
      sh.getRange(row, RENTAL_COLS.Price).setValue(str_(data.price));
      sh.getRange(row, RENTAL_COLS.Seats).setValue(str_(data.seats));
      sh.getRange(row, RENTAL_COLS.Fuel).setValue(str_(data.fuel));
      sh.getRange(row, RENTAL_COLS.Trans).setValue(str_(data.trans));
      sh.getRange(row, RENTAL_COLS.Description).setValue(str_(data.description));
      sh.getRange(row, RENTAL_COLS.Photos).setValue(str_(data.photos));
      sh.getRange(row, RENTAL_COLS.Badge).setValue(str_(data.badge));
      return jsonResponse_({ status: 'ok', action: 'rental edited', row: row });
    }

    // ADD PART
    if (type === 'add-part') {
      const sh = ensureSheet_(ss, 'Parts',
        ['Category','Name','Brand','Price','Description','Photos','Stock']);
      sh.appendRow([
        str_(data.category),
        str_(data.name),
        str_(data.brand),
        str_(data.price),
        str_(data.description),
        str_(data.photos),
        str_(data.stock)
      ]);
      return jsonResponse_({ status: 'ok', action: 'part added' });
    }

    // EDIT PART
    if (type === 'edit-part') {
      const sh  = getSheet_(ss, 'Parts');
      if (!sh) return jsonResponse_({ error: 'Parts sheet not found' });
      const row = Number(data.row);
      if (!row || row < 2) return jsonResponse_({ error: 'Invalid row' });
      sh.getRange(row, PART_COLS.Category).setValue(str_(data.category));
      sh.getRange(row, PART_COLS.Name).setValue(str_(data.name));
      sh.getRange(row, PART_COLS.Brand).setValue(str_(data.brand));
      sh.getRange(row, PART_COLS.Price).setValue(str_(data.price));
      sh.getRange(row, PART_COLS.Description).setValue(str_(data.description));
      sh.getRange(row, PART_COLS.Photos).setValue(str_(data.photos));
      sh.getRange(row, PART_COLS.Stock).setValue(str_(data.stock));
      return jsonResponse_({ status: 'ok', action: 'part edited', row: row });
    }

    return jsonResponse_({ error: 'Unknown type: ' + type });

  } catch (err) {
    return jsonResponse_({ error: err.toString() });
  }
}
