const Formatters = {
  price(v) {
    if (v === undefined || v === null || v === '-') return '-';
    const n = Number(v);
    if (isNaN(n)) return v;
    return new Intl.NumberFormat('th-TH').format(n);
  },
  availabilityBadge(status, eol) {
    if (eol === true || eol === 'TRUE') return '<span class="availability-badge badge-eol">EOL</span>';
    const s = String(status || '').toLowerCase().trim();
    if (s.includes('in stock') || s.includes('instock') || s.includes('มีสินค้า')) {
      return '<span class="availability-badge badge-instock">In Stock</span>';
    }
    if (s.includes('lead time') || s.includes('leadtime') || s.includes('สั่งผลิต') || s.includes('weeks')) {
      return `<span class="availability-badge badge-leadtime">${status}</span>`;
    }
    return `<span class="availability-badge badge-leadtime">${status || 'ตรวจสอบสถานะ'}</span>`;
  },
  markdown(text) {
    if (!text) return '';
    let html = text.trim();

    // Escape basic HTML tags to avoid rendering bugs, but keep it clean
    html = html
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');

    // 1. Headers: ###, ##, #
    html = html.replace(/^### (.*?)$/gm, '<h3>$1</h3>');
    html = html.replace(/^## (.*?)$/gm, '<h2>$1</h2>');
    html = html.replace(/^# (.*?)$/gm, '<h1>$1</h1>');

    // 2. Bold and Italic
    html = html.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    html = html.replace(/\*(.*?)\*/g, '<em>$1</em>');

    // 3. Tables (Markdown formatting: | Col 1 | Col 2 |)
    const lines = html.split('\n');
    let inTable = false;
    let tableHtml = '';
    let parsedLines = [];

    for (let i = 0; i < lines.length; i++) {
      let line = lines[i].trim();
      if (line.startsWith('|') && line.endsWith('|')) {
        if (!inTable) {
          inTable = true;
          tableHtml = '<div class="compare-table-wrap"><table class="compare-table">';
          if (line.includes('---') || line.includes('-:-')) {
             continue; // Skip standard divider lines
          }
          // Parse header
          const cols = line.split('|').slice(1, -1).map(c => c.trim());
          tableHtml += '<thead><tr>' + cols.map(c => `<th>${c}</th>`).join('') + '</tr></thead><tbody>';
        } else {
          if (line.includes('---') || line.includes('-:-')) {
             continue; // Skip standard divider lines
          }
          // Parse row
          const cols = line.split('|').slice(1, -1).map(c => c.trim());
          tableHtml += '<tr>' + cols.map(c => `<td>${c}</td>`).join('') + '</tr>';
        }
      } else {
        if (inTable) {
          inTable = false;
          tableHtml += '</tbody></table></div>';
          parsedLines.push(tableHtml);
          tableHtml = '';
        }
        parsedLines.push(line);
      }
    }
    if (inTable) {
      tableHtml += '</tbody></table></div>';
      parsedLines.push(tableHtml);
    }
    
    html = parsedLines.join('\n');

    // 4. Bullet lists
    let inList = false;
    let listParsed = [];
    const htmlLines = html.split('\n');
    
    for (let line of htmlLines) {
      let trimmed = line.trim();
      if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
        const content = trimmed.substring(2);
        if (!inList) {
          inList = true;
          listParsed.push('<ul style="margin: 8px 0 14px 20px; line-height: 1.6;"><li>' + content + '</li>');
        } else {
          listParsed.push('<li>' + content + '</li>');
        }
      } else {
        if (inList) {
          inList = false;
          listParsed.push('</ul>');
        }
        listParsed.push(line);
      }
    }
    if (inList) {
      listParsed.push('</ul>');
    }
    html = listParsed.join('\n');

    // 5. Paragraphs & Double Newlines
    html = html.split('\n\n').map(p => {
      const trimmedP = p.trim();
      if (trimmedP.startsWith('<h') || trimmedP.startsWith('<div') || trimmedP.startsWith('<ul') || trimmedP.startsWith('</ul') || trimmedP.startsWith('<table') || trimmedP.startsWith('<thead') || trimmedP.startsWith('<tbody')) {
        return p;
      }
      return `<p style="margin-bottom: 12px; line-height: 1.6;">${p.replace(/\n/g, '<br>')}</p>`;
    }).join('\n');

    return html;
  }
};
