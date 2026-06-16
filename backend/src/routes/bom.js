const express = require('express');
const router = express.Router();
const db = require('../db/mysql');
const { sheets, spreadsheetId } = require('../sheets/client');

function getBangkokTime() {
  return new Date(new Date().toLocaleString("en-US", { timeZone: "Asia/Bangkok" }));
}

function formatDateDisp(date) {
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear();
  return `${day}/${month}/${year}`;
}

function formatDateStr(date) {
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear();
  return `${year}${month}${day}`;
}

function formatDateTimeDisp(date) {
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear();
  const hour = String(date.getHours()).padStart(2, '0');
  const min = String(date.getMinutes()).padStart(2, '0');
  return `${day}/${month}/${year} ${hour}:${min}`;
}

// 1. generateBOM
router.post('/generateBOM', async (req, res, next) => {
  try {
    const params = req.body.params || {};
    const projectName = params.project_name || '';
    const customerName = params.customer_name || '';
    const preparedBy = params.prepared_by || '';
    const items = params.items || [];
    const services = params.services || [];

    if (!sheets || !spreadsheetId) {
      return res.status(500).json({ error: 'Google Sheets integration not configured.' });
    }

    // Load products from MySQL
    const skus = items.map(item => item.sku).filter(Boolean);
    let dbProducts = [];
    if (skus.length > 0) {
      const [rows] = await db.query('SELECT * FROM products WHERE sku IN (?)', [skus]);
      dbProducts = rows;
    }

    const today = getBangkokTime();
    const dateStr = formatDateStr(today);
    const seq = Math.floor(Math.random() * 900) + 100; // 3-digit
    const bomId = `BOM-${dateStr}-${seq}`;
    const dateDisp = formatDateDisp(today);

    const lines = [];
    let hardwareTotal = 0;
    let lineNum = 1;

    // Hardware items
    items.forEach(item => {
      const skuL = String(item.sku || '').trim().toLowerCase();
      const row = dbProducts.find(r => String(r.sku).toLowerCase() === skuL);

      if (!row) {
        lines.push({ line: lineNum++, sku: item.sku, qty: item.qty, error: 'ไม่พบ SKU ในระบบ' });
        return;
      }

      const unitPrice = Number(row.price_thb) || 0;
      const totalPrice = unitPrice * (Number(item.qty) || 1);
      hardwareTotal += totalPrice;

      lines.push({
        line: lineNum++,
        sku: row.sku,
        model: row.model,
        vendor: row.vendor,
        qty: Number(item.qty) || 1,
        unit_price_thb: unitPrice,
        total_price_thb: totalPrice,
        notes: item.notes || ''
      });
    });

    // Services
    let servicesTotal = 0;
    const serviceLines = [];
    services.forEach(svc => {
      const total = Number(svc.unit_price || 0) * Number(svc.qty || 1);
      servicesTotal += total;
      serviceLines.push({
        line: lineNum++,
        sku: 'SVC',
        model: svc.description,
        vendor: 'Service',
        qty: Number(svc.qty) || 1,
        unit_price_thb: Number(svc.unit_price) || 0,
        total_price_thb: total,
        notes: svc.unit || ''
      });
    });

    const grandTotal = hardwareTotal + servicesTotal;
    const allLines = lines.concat(serviceLines);

    // Append to BOM sheet in Google Sheets
    const rowsToAppend = allLines.map(l => [
      bomId,
      dateDisp,
      projectName,
      customerName,
      preparedBy,
      l.line,
      l.sku,
      l.model || '',
      l.qty,
      l.unit_price_thb || 0,
      l.total_price_thb || 0,
      l.notes || ''
    ]);

    await sheets.spreadsheets.values.append({
      spreadsheetId,
      range: 'BOM!A:L',
      valueInputOption: 'USER_ENTERED',
      requestBody: {
        values: rowsToAppend
      }
    });

    res.json({
      bom_id: bomId,
      date: dateDisp,
      project_name: projectName,
      customer_name: customerName,
      lines: allLines,
      summary: {
        hardware_total_thb: hardwareTotal,
        services_total_thb: servicesTotal,
        grand_total_thb: grandTotal
      }
    });
  } catch (err) {
    next(err);
  }
});

// 2. saveProposal
router.post('/saveProposal', async (req, res, next) => {
  try {
    const params = req.body.params || {};
    const today = getBangkokTime();
    const dateStr = formatDateStr(today);
    const seq = Math.floor(Math.random() * 900) + 100;
    const propId = `PROP-${dateStr}-${seq}`;
    const dateDisp = formatDateDisp(today);
    const dateTimeDisp = formatDateTimeDisp(today);

    const sections = params.sections || {};

    if (!sheets || !spreadsheetId) {
      return res.status(500).json({ error: 'Google Sheets integration not configured.' });
    }

    const rowToAppend = [
      propId,
      dateDisp,
      params.customer_name || '',
      params.project_name || '',
      params.prepared_by || '',
      params.bom_id || '',
      sections.executive_summary || '',
      sections.understanding || '',
      sections.solution || '',
      sections.recommendation || '',
      sections.next_steps || '',
      'Draft',          // status
      dateTimeDisp,     // created_at
      dateTimeDisp      // last_updated
    ];

    await sheets.spreadsheets.values.append({
      spreadsheetId,
      range: 'Proposals!A:N',
      valueInputOption: 'USER_ENTERED',
      requestBody: {
        values: [rowToAppend]
      }
    });

    res.json({
      proposal_id: propId,
      message: 'บันทึก Proposal เรียบร้อยแล้ว สถานะ: Draft'
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
