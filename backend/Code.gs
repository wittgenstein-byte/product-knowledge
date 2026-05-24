/**
 * SI Product Hub — Google Apps Script Backend
 * Deploy as: Web App → Execute as Me → Anyone (or Anyone in org)
 *
 * Google Sheets required (set SPREADSHEET_ID below):
 *   Sheet "Products"   — Product Master  (columns A–P)
 *   Sheet "Pricing"    — Live pricing    (columns A–H)
 *   Sheet "BOM"        — BOM log         (columns A–L)
 *   Sheet "Proposals"  — Proposal log    (columns A–N)
 */

// ─────────────────────────────────────────────────────────────
//  CONFIG  — แก้ไข ID ของ Spreadsheet ก่อนใช้งาน
// ─────────────────────────────────────────────────────────────
var SPREADSHEET_ID = 'YOUR_SPREADSHEET_ID_HERE';  // ← วาง ID ที่นี่

// Sheet names
var SHEET = {
  PRODUCTS:  'Products',
  PRICING:   'Pricing',
  BOM:       'BOM',
  PROPOSALS: 'Proposals',
};

// ─────────────────────────────────────────────────────────────
//  ENTRY POINTS
// ─────────────────────────────────────────────────────────────

/** GET — health check */
function doGet(e) {
  return ContentService
    .createTextOutput(JSON.stringify({ status: 'ok', service: 'SI Product Hub API', version: '1.0' }))
    .setMimeType(ContentService.MimeType.JSON);
}

/** POST — main dispatcher */
function doPost(e) {
  try {
    var body   = JSON.parse(e.postData.contents);
    var action = body.action;
    var params = body.params || {};

    var result;
    switch (action) {
      case 'searchProducts':  result = searchProducts(params);  break;
      case 'getDatasheet':    result = getDatasheet(params);    break;
      case 'compareProducts': result = compareProducts(params); break;
      case 'generateBOM':     result = generateBOM(params);     break;
      case 'saveProposal':    result = saveProposal(params);    break;
      case 'getPricing':      result = getPricing(params);      break;
      case 'getMetadata':     result = getMetadata(params);     break;
      default:
        result = { error: 'Unknown action: ' + action };
    }

    return jsonResponse(result);
  } catch (err) {
    return jsonResponse({ error: err.message });
  }
}

function jsonResponse(data) {
  var output = ContentService.createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
  return output;
}

// ─────────────────────────────────────────────────────────────
//  HELPER — Spreadsheet accessor (cached per execution)
// ─────────────────────────────────────────────────────────────

var _ss = null;
function getSpreadsheet() {
  if (!_ss) _ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  return _ss;
}

function getSheet(name) {
  var sheet = getSpreadsheet().getSheetByName(name);
  if (!sheet) throw new Error('Sheet "' + name + '" not found. Please create it first.');
  return sheet;
}

/** Returns all rows as array of objects using first row as header */
function sheetToObjects(sheetName) {
  var sheet = getSheet(sheetName);
  var data  = sheet.getDataRange().getValues();
  if (data.length < 2) return [];
  var headers = data[0].map(function(h) { return String(h).trim(); });
  return data.slice(1).map(function(row) {
    var obj = {};
    headers.forEach(function(h, i) { obj[h] = row[i]; });
    return obj;
  });
}

// ─────────────────────────────────────────────────────────────
//  1. searchProducts
//
//  Sheet "Products" expected columns (case-sensitive):
//  sku | vendor | model | category | segment | description |
//  key_specs | availability | lead_time_weeks | distributor |
//  price_thb | eol | replacement_sku | datasheet_url |
//  datasheet_date | notes
// ─────────────────────────────────────────────────────────────

function searchProducts(params) {
  var query    = (params.query    || '').toLowerCase();
  var category = (params.category || '').toLowerCase();
  var vendor   = (params.vendor   || '').toLowerCase();
  var segment  = (params.segment  || '').toLowerCase();
  var maxPrice = params.max_price ? Number(params.max_price) : null;

  var rows = sheetToObjects(SHEET.PRODUCTS);

  var filtered = rows.filter(function(r) {
    if (!r.sku && !r.model) return false; // skip empty rows

    // Text search
    if (query) {
      var haystack = [r.sku, r.vendor, r.model, r.description, r.key_specs, r.category]
        .join(' ').toLowerCase();
      if (haystack.indexOf(query) === -1) return false;
    }

    if (category && String(r.category).toLowerCase() !== category) return false;
    if (vendor   && String(r.vendor).toLowerCase() !== vendor)     return false;
    if (segment  && String(r.segment).toLowerCase() !== segment)   return false;
    if (maxPrice !== null && Number(r.price_thb) > maxPrice)       return false;

    return true;
  });

  // Limit to 50 results
  var limited = filtered.slice(0, 50);

  var products = limited.map(function(r) {
    return {
      sku:          r.sku,
      vendor:       r.vendor,
      model:        r.model,
      category:     r.category,
      segment:      r.segment,
      description:  r.description,
      key_specs:    r.key_specs,
      availability: r.availability,
      lead_time_weeks: r.lead_time_weeks,
      distributor:  r.distributor,
      price_thb:    Number(r.price_thb) || 0,
      eol:          r.eol === true || String(r.eol).toUpperCase() === 'TRUE',
      replacement_sku: r.replacement_sku,
    };
  });

  return { total_found: filtered.length, products: products };
}

// ─────────────────────────────────────────────────────────────
//  2. getDatasheet
// ─────────────────────────────────────────────────────────────

function getDatasheet(params) {
  var rows = sheetToObjects(SHEET.PRODUCTS);
  var row;

  if (params.sku) {
    var skuQ = String(params.sku).trim().toLowerCase();
    row = rows.find(function(r) { return String(r.sku).toLowerCase() === skuQ; });
  } else if (params.model) {
    var modelQ  = String(params.model).trim().toLowerCase();
    var vendorQ = params.vendor ? String(params.vendor).trim().toLowerCase() : '';
    row = rows.find(function(r) {
      var modelMatch  = String(r.model).toLowerCase() === modelQ;
      var vendorMatch = !vendorQ || String(r.vendor).toLowerCase() === vendorQ;
      return modelMatch && vendorMatch;
    });
  }

  if (!row) return { found: false, message: 'ไม่พบสินค้าที่ค้นหา' };

  // Try to parse key_specs into structured object
  // Expected format: "Throughput: 10Gbps, Ports: 48x1G, PoE: 370W"
  var specs = parseKeySpecs(String(row.key_specs || ''));

  return {
    found:          true,
    sku:            row.sku,
    vendor:         row.vendor,
    model:          row.model,
    description:    row.description,
    datasheet_url:  row.datasheet_url,
    datasheet_date: row.datasheet_date ? Utilities.formatDate(new Date(row.datasheet_date), 'Asia/Bangkok', 'dd/MM/yyyy') : '',
    eol:            row.eol === true || String(row.eol).toUpperCase() === 'TRUE',
    replacement_sku: row.replacement_sku,
    specs:          specs,
    notes:          row.notes,
  };
}

/** Parse "Key: Value, Key2: Value2" into object */
function parseKeySpecs(str) {
  var specs = {};
  if (!str) return specs;

  // Try JSON first
  try {
    var parsed = JSON.parse(str);
    if (typeof parsed === 'object') return parsed;
  } catch(e) {}

  // Fallback: comma-separated "key: value" pairs
  str.split(',').forEach(function(pair) {
    var idx = pair.indexOf(':');
    if (idx > -1) {
      var key = pair.slice(0, idx).trim().toLowerCase().replace(/\s+/g, '_');
      var val = pair.slice(idx + 1).trim();
      specs[key] = val;
    }
  });
  return specs;
}

// ─────────────────────────────────────────────────────────────
//  3. compareProducts
// ─────────────────────────────────────────────────────────────

function compareProducts(params) {
  var skus = params.skus || [];
  if (skus.length < 2) throw new Error('ต้องระบุอย่างน้อย 2 SKU');

  var rows = sheetToObjects(SHEET.PRODUCTS);
  var pricing = sheetToObjects(SHEET.PRICING);

  var products = skus.map(function(sku) {
    var skuL = String(sku).trim().toLowerCase();
    var row  = rows.find(function(r) { return String(r.sku).toLowerCase() === skuL; });
    if (!row) return { sku: sku, error: 'ไม่พบ SKU' };

    // Merge live pricing if available
    var priceRow = pricing.find(function(p) { return String(p.sku).toLowerCase() === skuL; });
    var price_thb    = priceRow ? Number(priceRow.price_thb)    : Number(row.price_thb) || 0;
    var availability = priceRow ? priceRow.availability          : row.availability;
    var lead_time    = priceRow ? priceRow.lead_time_weeks       : row.lead_time_weeks;
    var distributor  = priceRow ? priceRow.distributor           : row.distributor;

    return {
      sku:             row.sku,
      vendor:          row.vendor,
      model:           row.model,
      price_thb:       price_thb,
      availability:    availability,
      lead_time_weeks: lead_time,
      distributor:     distributor,
      specs:           parseKeySpecs(String(row.key_specs || '')),
    };
  });

  return { products: products };
}

// ─────────────────────────────────────────────────────────────
//  4. generateBOM
//
//  Sheet "BOM" columns:
//  bom_id | date | project_name | customer_name | prepared_by |
//  line | sku | model | qty | unit_price_thb | total_price_thb | notes
// ─────────────────────────────────────────────────────────────

function generateBOM(params) {
  var project_name  = params.project_name  || '';
  var customer_name = params.customer_name || '';
  var prepared_by   = params.prepared_by   || '';
  var items         = params.items         || [];
  var services      = params.services      || [];

  var products = sheetToObjects(SHEET.PRODUCTS);
  var today    = new Date();
  var dateStr  = Utilities.formatDate(today, 'Asia/Bangkok', 'yyyyMMdd');
  var seq      = Math.floor(Math.random() * 900) + 100; // 3-digit
  var bom_id   = 'BOM-' + dateStr + '-' + seq;
  var dateDisp = Utilities.formatDate(today, 'Asia/Bangkok', 'dd/MM/yyyy');

  var lines         = [];
  var hardware_total = 0;
  var lineNum       = 1;

  // Hardware items
  items.forEach(function(item) {
    var skuL = String(item.sku || '').trim().toLowerCase();
    var row  = products.find(function(r) { return String(r.sku).toLowerCase() === skuL; });

    if (!row) {
      lines.push({ line: lineNum++, sku: item.sku, qty: item.qty, error: 'ไม่พบ SKU ในระบบ' });
      return;
    }

    var unit_price  = Number(row.price_thb) || 0;
    var total_price = unit_price * (Number(item.qty) || 1);
    hardware_total += total_price;

    lines.push({
      line:           lineNum++,
      sku:            row.sku,
      model:          row.model,
      vendor:         row.vendor,
      qty:            Number(item.qty) || 1,
      unit_price_thb: unit_price,
      total_price_thb: total_price,
      notes:          item.notes || '',
    });
  });

  // Services
  var services_total = 0;
  var serviceLines   = [];
  services.forEach(function(svc) {
    var total = Number(svc.unit_price || 0) * Number(svc.qty || 1);
    services_total += total;
    serviceLines.push({
      line:           lineNum++,
      sku:            'SVC',
      model:          svc.description,
      vendor:         'Service',
      qty:            svc.qty,
      unit_price_thb: svc.unit_price,
      total_price_thb: total,
      notes:          svc.unit || '',
    });
  });

  var grand_total = hardware_total + services_total;
  var allLines    = lines.concat(serviceLines);

  // Append to BOM sheet
  var sheet = getSheet(SHEET.BOM);
  allLines.forEach(function(l) {
    sheet.appendRow([
      bom_id, dateDisp, project_name, customer_name, prepared_by,
      l.line, l.sku, l.model || '', l.qty,
      l.unit_price_thb || 0, l.total_price_thb || 0, l.notes || '',
    ]);
  });

  return {
    bom_id:       bom_id,
    date:         dateDisp,
    project_name: project_name,
    customer_name: customer_name,
    lines:        allLines,
    summary: {
      hardware_total_thb:  hardware_total,
      services_total_thb:  services_total,
      grand_total_thb:     grand_total,
    },
  };
}

// ─────────────────────────────────────────────────────────────
//  5. saveProposal
//
//  Sheet "Proposals" columns:
//  proposal_id | date | customer_name | project_name | prepared_by |
//  bom_id | exec_summary | understanding | solution |
//  recommendation | next_steps | status | created_at | last_updated
// ─────────────────────────────────────────────────────────────

function saveProposal(params) {
  var today   = new Date();
  var dateStr = Utilities.formatDate(today, 'Asia/Bangkok', 'yyyyMMdd');
  var seq     = Math.floor(Math.random() * 900) + 100;
  var prop_id = 'PROP-' + dateStr + '-' + seq;
  var dateDisp = Utilities.formatDate(today, 'Asia/Bangkok', 'dd/MM/yyyy HH:mm');

  var sections = params.sections || {};

  var sheet = getSheet(SHEET.PROPOSALS);
  sheet.appendRow([
    prop_id,
    Utilities.formatDate(today, 'Asia/Bangkok', 'dd/MM/yyyy'),
    params.customer_name || '',
    params.project_name  || '',
    params.prepared_by   || '',
    params.bom_id        || '',
    sections.executive_summary || '',
    sections.understanding     || '',
    sections.solution          || '',
    sections.recommendation    || '',
    sections.next_steps        || '',
    'Draft',          // status
    dateDisp,         // created_at
    dateDisp,         // last_updated
  ]);

  return {
    proposal_id: prop_id,
    message:     'บันทึก Proposal เรียบร้อยแล้ว สถานะ: Draft',
  };
}

// ─────────────────────────────────────────────────────────────
//  6. getPricing
//
//  Sheet "Pricing" columns:
//  sku | model | vendor | price_thb | cost_thb | margin_pct |
//  availability | lead_time_weeks | distributor | last_updated
// ─────────────────────────────────────────────────────────────

function getPricing(params) {
  var skus     = params.skus || [];
  var products = sheetToObjects(SHEET.PRODUCTS);
  var pricing  = sheetToObjects(SHEET.PRICING);

  var result = skus.map(function(sku) {
    var skuL     = String(sku).trim().toLowerCase();
    var priceRow = pricing.find(function(p) { return String(p.sku).toLowerCase() === skuL; });
    var prodRow  = products.find(function(p) { return String(p.sku).toLowerCase() === skuL; });

    if (!priceRow && !prodRow) {
      return { sku: sku, found: false };
    }

    var source = priceRow || {};
    var fallback = prodRow || {};

    var lastUpdated = source.last_updated
      ? Utilities.formatDate(new Date(source.last_updated), 'Asia/Bangkok', 'dd/MM/yyyy')
      : '';

    return {
      sku:          sku,
      found:        true,
      model:        source.model        || fallback.model        || '',
      vendor:       source.vendor       || fallback.vendor       || '',
      price_thb:    Number(source.price_thb  || fallback.price_thb)  || 0,
      availability: source.availability || fallback.availability || 'Lead Time',
      lead_time_weeks: source.lead_time_weeks || fallback.lead_time_weeks || '',
      distributor:  source.distributor  || fallback.distributor  || '',
      last_updated: lastUpdated,
    };
  });

  return { pricing: result };
}

// ─────────────────────────────────────────────────────────────
//  7. getMetadata
//  Returns distinct categories, vendors, segments from Products
//  so the frontend can build dynamic filter dropdowns.
// ─────────────────────────────────────────────────────────────

function getMetadata() {
  var rows = sheetToObjects(SHEET.PRODUCTS);

  var categories = {};
  var vendors    = {};
  var segments   = {};

  rows.forEach(function(r) {
    if (r.category) categories[String(r.category).trim()] = true;
    if (r.vendor)   vendors[String(r.vendor).trim()]      = true;
    if (r.segment)  segments[String(r.segment).trim()]    = true;
  });

  return {
    categories:    Object.keys(categories).sort(),
    vendors:       Object.keys(vendors).sort(),
    segments:      Object.keys(segments).sort(),
    product_count: rows.filter(function(r) { return r.sku; }).length,
    synced_at:     Utilities.formatDate(new Date(), 'Asia/Bangkok', 'dd/MM/yyyy HH:mm:ss'),
  };
}

// ─────────────────────────────────────────────────────────────
//  SETUP HELPER — run once to create all sheets with headers
//  Run this manually from the Apps Script editor: Tools → Run → setupSheets
// ─────────────────────────────────────────────────────────────

function setupSheets() {
  var ss = getSpreadsheet();

  var schemas = {
    Products: [
      'sku','vendor','model','category','segment','description',
      'key_specs','availability','lead_time_weeks','distributor',
      'price_thb','eol','replacement_sku','datasheet_url','datasheet_date','notes'
    ],
    Pricing: [
      'sku','model','vendor','price_thb','cost_thb','margin_pct',
      'availability','lead_time_weeks','distributor','last_updated'
    ],
    BOM: [
      'bom_id','date','project_name','customer_name','prepared_by',
      'line','sku','model','qty','unit_price_thb','total_price_thb','notes'
    ],
    Proposals: [
      'proposal_id','date','customer_name','project_name','prepared_by',
      'bom_id','exec_summary','understanding','solution',
      'recommendation','next_steps','status','created_at','last_updated'
    ],
  };

  Object.keys(schemas).forEach(function(name) {
    var sheet = ss.getSheetByName(name);
    if (!sheet) {
      sheet = ss.insertSheet(name);
      Logger.log('Created sheet: ' + name);
    }
    // Write headers only if row 1 is empty
    if (sheet.getRange(1,1).getValue() === '') {
      sheet.getRange(1, 1, 1, schemas[name].length).setValues([schemas[name]]);
      sheet.getRange(1, 1, 1, schemas[name].length)
        .setFontWeight('bold')
        .setBackground('#1a1a2e')
        .setFontColor('#ffffff');
      Logger.log('Headers written for: ' + name);
    }
  });

  Logger.log('setupSheets complete.');
}

// ─────────────────────────────────────────────────────────────
//  SEED HELPER — สำหรับทดสอบ: เพิ่มข้อมูลตัวอย่าง
//  Run: Tools → Run → seedSampleData
// ─────────────────────────────────────────────────────────────

function seedSampleData() {
  var ss = getSpreadsheet();

  // ── Products sample data ──────────────────────────────────
  var prodSheet = ss.getSheetByName(SHEET.PRODUCTS);
  var products = [
    ['CSC-C9300-48P','Cisco','Catalyst 9300-48P','Switch','enterprise',
     'Cisco Catalyst 9300 Series 48-port PoE+ Stackable Switch',
     'throughput: 176Gbps, ports: 48x1G PoE+, poe_budget_w: 437W, uplink: 4x10G, stacking: yes, warranty_years: 5',
     'In Stock', 4, 'Synnex Thailand', 245000, 'FALSE','','','','รองรับ Cisco DNA'],
    ['CSC-C9200-24P','Cisco','Catalyst 9200-24P','Switch','mid-market',
     'Cisco Catalyst 9200 Series 24-port PoE+ Switch',
     'throughput: 56Gbps, ports: 24x1G PoE+, poe_budget_w: 370W, uplink: 4x1G, stacking: no, warranty_years: 5',
     'In Stock', 2, 'Synnex Thailand', 115000, 'FALSE','','','',''],
    ['HP-CX6300-48G','HP Aruba','CX 6300M 48G','Switch','enterprise',
     'Aruba CX 6300M 48-port 1G PoE Switch with VSX Stacking',
     'throughput: 296Gbps, ports: 48x1G PoE+, poe_budget_w: 480W, uplink: 4x25G SFP28, stacking: yes, warranty_years: lifetime',
     'Lead Time', 6, 'Ingram Micro TH', 278000, 'FALSE','','','','Lifetime warranty'],
    ['FTN-FG100F','Fortinet','FortiGate 100F','Firewall','mid-market',
     'FortiGate 100F Next-Generation Firewall with SD-WAN',
     'throughput: 20Gbps, ports: 22xGE+2x10GE+2xSFP+, management: FortiOS 7.4, certifications: ICSA CC EAL4+, warranty_years: 1',
     'In Stock', 0, 'Fortinet Direct', 195000, 'FALSE','','https://www.fortinet.com/content/dam/fortinet/assets/data-sheets/fortigate-100f.pdf','','FortiCare required'],
    ['FTN-FG60F','Fortinet','FortiGate 60F','Firewall','SMB',
     'FortiGate 60F Compact Next-Generation Firewall',
     'throughput: 10Gbps, ports: 10xGE, management: FortiOS 7.4, certifications: ICSA CC, warranty_years: 1',
     'In Stock', 0, 'Fortinet Direct', 55000, 'FALSE','','','',''],
    ['ARU-AP515','Aruba','AP-515','Wi-Fi AP','enterprise',
     'Aruba AP-515 Wi-Fi 6 (802.11ax) Indoor Access Point',
     'throughput: 4.8Gbps, ports: 1x2.5G+1x1G, management: ArubaOS 10, certifications: Wi-Fi 6 certified, warranty_years: lifetime',
     'In Stock', 0, 'Ingram Micro TH', 38500, 'FALSE','','','','Ceiling/wall mount'],
    ['CSC-C9120-AXI','Cisco','Catalyst 9120AXI','Wi-Fi AP','enterprise',
     'Cisco Catalyst 9120AXI Wi-Fi 6 Indoor Access Point',
     'throughput: 3.6Gbps, ports: 1xmGig 2.5G, management: Cisco DNA/IOS XE, certifications: Wi-Fi 6, warranty_years: 5',
     'In Stock', 3, 'Synnex Thailand', 42000, 'FALSE','','','',''],
    ['PAN-PA-220','Palo Alto','PA-220','Firewall','SMB',
     'Palo Alto PA-220 Next-Gen Firewall for SMB',
     'throughput: 500Mbps, ports: 8xGE+1xMgmt, management: PAN-OS 11, certifications: ICSA CC EAL4+, warranty_years: 1',
     'In Stock', 0, 'Palo Alto Direct', 85000, 'FALSE','','','',''],
    ['CSC-C9300-24P-EOL','Cisco','Catalyst 9300-24P','Switch','enterprise',
     'Cisco Catalyst 9300-24P (End of Life)',
     'throughput: 88Gbps, ports: 24x1G PoE+, warranty_years: 5',
     'Lead Time', 12, 'Synnex Thailand', 175000, 'TRUE','CSC-C9300-48P','','','EoL - ใช้ CSC-C9300-48P แทน'],
  ];
  prodSheet.getRange(2, 1, products.length, products[0].length).setValues(products);

  // ── Pricing sample data ───────────────────────────────────
  var priceSheet = ss.getSheetByName(SHEET.PRICING);
  var today = Utilities.formatDate(new Date(), 'Asia/Bangkok', 'dd/MM/yyyy');
  var pricing = [
    ['CSC-C9300-48P','Catalyst 9300-48P','Cisco',245000,180000,26.5,'In Stock',4,'Synnex Thailand',today],
    ['CSC-C9200-24P','Catalyst 9200-24P','Cisco',115000,86000,25.2,'In Stock',2,'Synnex Thailand',today],
    ['HP-CX6300-48G','CX 6300M 48G','HP Aruba',278000,205000,26.3,'Lead Time',6,'Ingram Micro TH',today],
    ['FTN-FG100F','FortiGate 100F','Fortinet',195000,145000,25.6,'In Stock',0,'Fortinet Direct',today],
    ['FTN-FG60F','FortiGate 60F','Fortinet',55000,40000,27.3,'In Stock',0,'Fortinet Direct',today],
    ['ARU-AP515','AP-515','Aruba',38500,29000,24.7,'In Stock',0,'Ingram Micro TH',today],
    ['CSC-C9120-AXI','Catalyst 9120AXI','Cisco',42000,31000,26.2,'In Stock',3,'Synnex Thailand',today],
    ['PAN-PA-220','PA-220','Palo Alto',85000,63000,25.9,'In Stock',0,'Palo Alto Direct',today],
  ];
  priceSheet.getRange(2, 1, pricing.length, pricing[0].length).setValues(pricing);

  Logger.log('Sample data seeded successfully.');
  Logger.log('Products: ' + products.length + ' rows');
  Logger.log('Pricing:  ' + pricing.length + ' rows');
}
