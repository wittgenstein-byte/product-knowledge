const express = require('express');
const router = express.Router();
const db = require('../db/mysql');

/** Parse "Key: Value, Key2: Value2" or JSON into object */
function parseKeySpecs(str) {
  const specs = {};
  if (!str) return specs;

  // Try JSON first
  try {
    const parsed = JSON.parse(str);
    if (typeof parsed === 'object' && parsed !== null) return parsed;
  } catch(e) {}

  // Fallback: comma-separated "key: value" pairs
  str.split(',').forEach(function(pair) {
    const idx = pair.indexOf(':');
    if (idx > -1) {
      const key = pair.slice(0, idx).trim().toLowerCase().replace(/\s+/g, '_');
      const val = pair.slice(idx + 1).trim();
      specs[key] = val;
    }
  });
  return specs;
}

// Helper to format Date
function formatDate(dateVal) {
  if (!dateVal) return '';
  const d = new Date(dateVal);
  if (isNaN(d.getTime())) return '';
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  return `${day}/${month}/${year}`;
}

// 1. searchProducts
router.post('/searchProducts', async (req, res, next) => {
  try {
    const params = req.body.params || {};
    const queryStr = (params.query || '').toLowerCase();
    const category = params.category || '';
    const vendor = params.vendor || '';
    const segment = params.segment || '';
    const maxPrice = params.max_price ? Number(params.max_price) : null;

    let sql = 'SELECT * FROM products WHERE 1=1';
    const values = [];

    if (queryStr) {
      sql += ' AND (LOWER(sku) LIKE ? OR LOWER(vendor) LIKE ? OR LOWER(model) LIKE ? OR LOWER(description) LIKE ? OR LOWER(key_specs) LIKE ? OR LOWER(category) LIKE ?)';
      const likeVal = `%${queryStr}%`;
      values.push(likeVal, likeVal, likeVal, likeVal, likeVal, likeVal);
    }

    if (category) {
      sql += ' AND LOWER(category) = LOWER(?)';
      values.push(category);
    }
    if (vendor) {
      sql += ' AND LOWER(vendor) = LOWER(?)';
      values.push(vendor);
    }
    if (segment) {
      sql += ' AND LOWER(segment) = LOWER(?)';
      values.push(segment);
    }
    if (maxPrice !== null) {
      sql += ' AND price_thb <= ?';
      values.push(maxPrice);
    }

    // Limit to 50 results
    sql += ' LIMIT 50';

    const [rows] = await db.query(sql, values);

    const products = rows.map(r => ({
      sku: r.sku,
      vendor: r.vendor,
      model: r.model,
      category: r.category,
      segment: r.segment,
      description: r.description,
      key_specs: r.key_specs,
      availability: r.availability,
      lead_time_weeks: r.lead_time_weeks,
      distributor: r.distributor,
      price_thb: Number(r.price_thb) || 0,
      eol: Boolean(r.eol),
      replacement_sku: r.replacement_sku || ''
    }));

    // For total count (simple simulation/estimation matching original behavior)
    let countSql = 'SELECT COUNT(*) as total FROM products WHERE 1=1';
    const countValues = [];
    if (queryStr) {
      countSql += ' AND (LOWER(sku) LIKE ? OR LOWER(vendor) LIKE ? OR LOWER(model) LIKE ? OR LOWER(description) LIKE ? OR LOWER(key_specs) LIKE ? OR LOWER(category) LIKE ?)';
      const likeVal = `%${queryStr}%`;
      countValues.push(likeVal, likeVal, likeVal, likeVal, likeVal, likeVal);
    }
    if (category) {
      countSql += ' AND LOWER(category) = LOWER(?)';
      countValues.push(category);
    }
    if (vendor) {
      countSql += ' AND LOWER(vendor) = LOWER(?)';
      countValues.push(vendor);
    }
    if (segment) {
      countSql += ' AND LOWER(segment) = LOWER(?)';
      countValues.push(segment);
    }
    if (maxPrice !== null) {
      countSql += ' AND price_thb <= ?';
      countValues.push(maxPrice);
    }

    const [countRows] = await db.query(countSql, countValues);
    const totalFound = countRows[0] ? countRows[0].total : products.length;

    res.json({ total_found: totalFound, products });
  } catch (err) {
    next(err);
  }
});

// 2. getDatasheet
router.post('/getDatasheet', async (req, res, next) => {
  try {
    const params = req.body.params || {};
    let row = null;

    if (params.sku) {
      const [rows] = await db.query('SELECT * FROM products WHERE LOWER(sku) = LOWER(?) LIMIT 1', [String(params.sku).trim()]);
      if (rows.length > 0) row = rows[0];
    } else if (params.model) {
      const modelQ = String(params.model).trim();
      const vendorQ = params.vendor ? String(params.vendor).trim() : '';

      let sql = 'SELECT * FROM products WHERE LOWER(model) = LOWER(?)';
      const values = [modelQ];
      if (vendorQ) {
        sql += ' AND LOWER(vendor) = LOWER(?)';
        values.push(vendorQ);
      }
      sql += ' LIMIT 1';

      const [rows] = await db.query(sql, values);
      if (rows.length > 0) row = rows[0];
    }

    if (!row) {
      return res.json({ found: false, message: 'ไม่พบสินค้าที่ค้นหา' });
    }

    const specs = parseKeySpecs(row.key_specs || '');

    res.json({
      found: true,
      sku: row.sku,
      vendor: row.vendor,
      model: row.model,
      description: row.description,
      datasheet_url: row.datasheet_url || '',
      datasheet_date: formatDate(row.datasheet_date),
      eol: Boolean(row.eol),
      replacement_sku: row.replacement_sku || '',
      specs: specs,
      notes: row.notes || ''
    });
  } catch (err) {
    next(err);
  }
});

// 3. compareProducts
router.post('/compareProducts', async (req, res, next) => {
  try {
    const params = req.body.params || {};
    const skus = params.skus || [];
    if (skus.length < 2) {
      return res.status(400).json({ error: 'ต้องระบุอย่างน้อย 2 SKU' });
    }

    // Since we also need live pricing for compare, we'll implement that in pricing.js or query here.
    // Wait, let's see. In Code.gs, compareProducts merges live pricing from Sheet "Pricing".
    // Since we agreed that "Pricing" is in Google Sheets, we need to import pricing client and get it.
    // Let's implement it inside the compareProducts logic: fetch MySQL info first, then load pricing from Google Sheet, then merge.
    // Let's import the pricing logic from sheet helper or import it directly.
    // Let's first load all requested products from MySQL.
    const [rows] = await db.query('SELECT * FROM products WHERE sku IN (?)', [skus]);

    // Let's load the pricing sheet data to merge.
    let pricingRows = [];
    try {
      const { sheets, spreadsheetId } = require('../sheets/client');
      if (sheets && spreadsheetId) {
        const response = await sheets.spreadsheets.values.get({
          spreadsheetId,
          range: 'Pricing!A:J', // columns A-J: sku | model | vendor | price_thb | cost_thb | margin_pct | availability | lead_time_weeks | distributor | last_updated
        });
        const valData = response.data.values;
        if (valData && valData.length > 1) {
          const headers = valData[0].map(h => String(h).trim());
          pricingRows = valData.slice(1).map(rowValues => {
            const obj = {};
            headers.forEach((h, idx) => {
              obj[h] = rowValues[idx] || '';
            });
            return obj;
          });
        }
      }
    } catch (sheetErr) {
      console.error('Error fetching pricing sheet for compare:', sheetErr.message);
    }

    const products = skus.map(sku => {
      const skuL = String(sku).trim().toLowerCase();
      const dbRow = rows.find(r => String(r.sku).toLowerCase() === skuL);
      if (!dbRow) return { sku: sku, error: 'ไม่พบ SKU' };

      const priceRow = pricingRows.find(p => String(p.sku).toLowerCase() === skuL);
      const price_thb = priceRow ? Number(priceRow.price_thb) : Number(dbRow.price_thb) || 0;
      const availability = priceRow ? priceRow.availability : dbRow.availability;
      const lead_time = priceRow ? priceRow.lead_time_weeks : dbRow.lead_time_weeks;
      const distributor = priceRow ? priceRow.distributor : dbRow.distributor;

      return {
        sku: dbRow.sku,
        vendor: dbRow.vendor,
        model: dbRow.model,
        price_thb: price_thb,
        availability: availability,
        lead_time_weeks: lead_time,
        distributor: distributor,
        specs: parseKeySpecs(dbRow.key_specs || '')
      };
    });

    res.json({ products });
  } catch (err) {
    next(err);
  }
});

// 4. getMetadata
router.post('/getMetadata', async (req, res, next) => {
  try {
    // Distinct categories, vendors, segments
    const [catRows] = await db.query('SELECT DISTINCT category FROM products WHERE category IS NOT NULL AND category != "" ORDER BY category ASC');
    const [vendorRows] = await db.query('SELECT DISTINCT vendor FROM products WHERE vendor IS NOT NULL AND vendor != "" ORDER BY vendor ASC');
    const [segmentRows] = await db.query('SELECT DISTINCT segment FROM products WHERE segment IS NOT NULL AND segment != "" ORDER BY segment ASC');
    const [countRows] = await db.query('SELECT COUNT(*) as total FROM products WHERE sku IS NOT NULL AND sku != ""');

    const categories = catRows.map(r => r.category);
    const vendors = vendorRows.map(r => r.vendor);
    const segments = segmentRows.map(r => r.segment);
    const productCount = countRows[0] ? countRows[0].total : 0;

    const today = new Date();
    const syncedAt = `${String(today.getDate()).padStart(2, '0')}/${String(today.getMonth() + 1).padStart(2, '0')}/${today.getFullYear()} ${String(today.getHours()).padStart(2, '0')}:${String(today.getMinutes()).padStart(2, '0')}:${String(today.getSeconds()).padStart(2, '0')}`;

    res.json({
      categories,
      vendors,
      segments,
      product_count: productCount,
      synced_at: syncedAt
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
