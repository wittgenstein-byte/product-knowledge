const express = require('express');
const router = express.Router();
const db = require('../db/mysql');
const { sheets, spreadsheetId } = require('../sheets/client');

// helper to format Google Sheet serial date or raw value
function formatSheetDate(val) {
  if (!val) return '';
  // If it's a number (Excel/Google Sheets serial date), we can parse it
  if (!isNaN(val) && Number(val) > 30000) {
    const date = new Date((Number(val) - 25569) * 86400 * 1000);
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
  }
  return String(val);
}

router.post('/getPricing', async (req, res, next) => {
  try {
    const params = req.body.params || {};
    const skus = params.skus || [];

    if (!sheets || !spreadsheetId) {
      return res.status(500).json({ error: 'Google Sheets integration not configured.' });
    }

    // 1. Fetch live pricing from Google Sheets
    let pricingRows = [];
    try {
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
    } catch (sheetErr) {
      console.error('Error reading Pricing sheet:', sheetErr.message);
    }

    // 2. Fetch fallbacks from MySQL products if needed
    let prodRows = [];
    if (skus.length > 0) {
      const [rows] = await db.query('SELECT * FROM products WHERE sku IN (?)', [skus]);
      prodRows = rows;
    }

    const result = skus.map(sku => {
      const skuL = String(sku).trim().toLowerCase();
      const priceRow = pricingRows.find(p => String(p.sku).toLowerCase() === skuL);
      const prodRow = prodRows.find(p => String(p.sku).toLowerCase() === skuL);

      if (!priceRow && !prodRow) {
        return { sku: sku, found: false };
      }

      const source = priceRow || {};
      const fallback = prodRow || {};

      const lastUpdatedVal = source.last_updated || '';
      const lastUpdated = formatSheetDate(lastUpdatedVal);

      return {
        sku: sku,
        found: true,
        model: source.model || fallback.model || '',
        vendor: source.vendor || fallback.vendor || '',
        price_thb: Number(source.price_thb || fallback.price_thb) || 0,
        availability: source.availability || fallback.availability || 'Lead Time',
        lead_time_weeks: source.lead_time_weeks || fallback.lead_time_weeks || '',
        distributor: source.distributor || fallback.distributor || '',
        last_updated: lastUpdated
      };
    });

    res.json({ pricing: result });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
