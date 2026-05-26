class LlmService {
  constructor(stateService, loadingService, toastService) {
    this._state = stateService;
    this._loading = loadingService;
    this._toast = toastService;
  }

  isConfigured() {
    return !!this._state.get('llmApiKey') && !!this._state.get('llmApiUrl');
  }

  async testConnection(url, apiKey, model) {
    const targetUrl = `${url.replace(/\/$/, '')}/chat/completions`;
    const response = await fetch(targetUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: model || 'gemini-2.5-flash-lite',
        messages: [
          { role: 'system', content: 'You are a test agent.' },
          { role: 'user', content: 'Respond with exactly one word: Success' }
        ]
      })
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`HTTP Error ${response.status}: ${errText || response.statusText}`);
    }

    const data = await response.json();
    if (data.error) {
      throw new Error(data.error.message || JSON.stringify(data.error));
    }
    if (!data.choices || data.choices.length === 0 || !data.choices[0].message) {
      throw new Error(`รูปแบบ Response ไม่ถูกต้อง: ${JSON.stringify(data)}`);
    }
    
    const content = data.choices[0].message.content;
    if (content === null || content === undefined) {
      return 'เชื่อมต่อสำเร็จ (ข้อความตอบกลับเป็น null)';
    }
    
    return String(content).trim();
  }

  async query(systemPrompt, userPrompt, { silent = false } = {}) {
    const apiKey = this._state.get('llmApiKey');
    const apiUrl = this._state.get('llmApiUrl');
    const model = this._state.get('llmModel') || 'gemini-2.5-flash-lite';

    if (!apiUrl) {
      this._toast.show('กรุณาตั้งค่า URL สำหรับ LLM ก่อน', 'error');
      throw new Error('No LLM URL configured');
    }

    const endpoint = `${apiUrl.replace(/\/$/, '')}/chat/completions`;

    if (!silent) this._loading.show('AI กำลังวิเคราะห์ข้อมูลเชิงลึก...');

    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify({
          model: model,
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt }
          ],
          temperature: 0.3
        })
      });

      if (!res.ok) {
        const errorText = await res.text();
        throw new Error(`API Error ${res.status}: ${errorText || res.statusText}`);
      }

      const data = await res.json();
      if (!data.choices || !data.choices[0] || !data.choices[0].message) {
        throw new Error('โครงสร้างการตอบสนองจาก API ไม่ถูกต้อง');
      }

      return data.choices[0].message.content;
    } finally {
      if (!silent) this._loading.hide();
    }
  }

  buildCompareSystemPrompt() {
    return `คุณคือ Pre-Sales Engineer และ Solution Architect ผู้เชี่ยวชาญด้านระบบเครือข่าย ความปลอดภัย และโครงสร้างพื้นฐานไอทีขององค์กร
หน้าที่ของคุณคือการวิเคราะห์และเปรียบเทียบข้อมูลสินค้าไอทีจากข้อมูลจำเพาะทางเทคนิค (Datasheet Specs) และเงื่อนไขการค้า เช่น ราคา สถานะสินค้า ระยะเวลาจัดส่ง (Lead Time)
กรุณาตอบเป็นภาษาไทย โดยจัดรูปแบบข้อความเป็นระเบียบ สวยงาม ใช้สัญลักษณ์ (Emoji) ที่เหมาะสม และการจัดรูปแบบแบบ Markdown (เช่น หัวข้อ รายการ หรือตาราง) เพื่อให้อ่านง่ายและดูเป็นมืออาชีพ`;
  }

  buildGameTheorySystemPrompt() {
    return `คุณคือ Pre-Sales Strategist และ Game Theory Analyst ผู้เชี่ยวชาญด้านกลยุทธ์การขายสินค้าไอทีและทฤษฎีเกมประยุกต์
คุณจะได้รับข้อมูลสเปกและราคาสินค้าไอที แล้ววิเคราะห์ด้วยกรอบทฤษฎีเกม (Game Theory) เพื่อช่วยทีม SI ตัดสินใจเชิงกลยุทธ์

กฎสำคัญ — ตอบกลับเป็น **HTML บริสุทธิ์ (Raw HTML)** เท่านั้น:
- ห้ามใช้ Markdown ใดๆ (ห้ามใช้ ##, **, -, |table| syntax ของ Markdown)
- ใช้ HTML tags เท่านั้น: <h2>, <h3>, <p>, <ul>, <li>, <table>, <thead>, <tbody>, <tr>, <th>, <td>, <span>, <div>, <strong>, <em>
- ใส่ inline style ทุก element ที่สำคัญ โดยใช้สีที่เข้ากับ dark theme (พื้นหลังมืด):
  • สีพื้นหลัง section: background:#1e2433 หรือ background:#252d3d
  • สีข้อความหลัก: color:#e2e8f0
  • สีหัวข้อ: color:#38bdf8 (ฟ้า) หรือ color:#a78bfa (ม่วง)
  • เส้นแบ่ง border: border:1px solid #334155
  • ไฮไลต์ค่าสูงสุด/Nash Equilibrium: background:#065f46; color:#34d399 (เขียว)
  • ค่าต่ำสุด/Dominated: background:#450a0a; color:#f87171 (แดง)
  • ค่ากลาง: background:#1e3a5f; color:#93c5fd (ฟ้าอ่อน)
- ตาราง: ใส่ border-collapse:collapse, width:100%, แต่ละ th/td ใส่ padding:10px 14px; border:1px solid #334155
- th header: background:#0f172a; color:#94a3b8; font-size:12px; text-transform:uppercase
- ตอบเป็นภาษาไทย ยกเว้นศัพท์เทคนิคให้ใช้ภาษาอังกฤษตามปกติ
- ห้ามใส่ <!DOCTYPE>, <html>, <head>, <body> — ตอบเฉพาะ HTML fragment ภายใน body เท่านั้น`;
  }

  buildStandardComparePrompt(products) {
    const formattedProducts = products.map(p => {
      const specList = Object.entries(p.specs || {})
        .map(([k, v]) => `  - ${k}: ${v}`)
        .join('\n');
      return `แบรนด์: ${p.vendor}
รุ่น: ${p.model || p.sku}
SKU: ${p.sku}
ราคา: ${p.price_thb ? p.price_thb.toLocaleString('th-TH') + ' THB' : 'ไม่ระบุ'}
สถานะสินค้า: ${p.availability || 'ไม่ระบุ'}
ระยะเวลาจัดส่ง: ${p.lead_time_weeks !== undefined ? p.lead_time_weeks + ' สัปดาห์' : 'ไม่ระบุ'}
ข้อมูลสเปกเทคนิค:
${specList || '  - ไม่มีข้อมูลสเปกเพิ่มเติม'}`;
    }).join('\n\n=======================\n\n');

    return `เปรียบเทียบสินค้าไอทีต่อไปนี้เชิงวิเคราะห์:

${formattedProducts}

กรุณาเขียนรายงานวิเคราะห์เปรียบเทียบแยกเป็นหัวข้อดังนี้ในรูปแบบภาษาไทยที่สวยงามและมีความน่าเชื่อถือ:
1. **บทสรุปสำหรับผู้บริหาร (Executive Summary)**: เปรียบเทียบภาพรวมใน 2-3 บรรทัด
2. **ตารางวิเคราะห์เปรียบเทียบแบบย่อ (Summary Comparison Table)**: สรุปหัวข้อสำคัญเชิงวิเคราะห์ในรูปแบบตาราง Markdown
3. **การวิเคราะห์จุดเด่น & จุดด้อย (Pros & Cons Analysis)**: เขียนเป็นข้อๆ ของสินค้าแต่ละรุ่นอย่างชัดเจน
4. **กรณีใช้งานที่เหมาะสมที่สุด (Best Use Cases)**: แนะนำเจาะจงว่าสินค้ารุ่นใดเหมาะกับลูกค้ากลุ่มใด (เช่น องค์กรขนาดเล็ก, องค์กรขนาดใหญ่, เน้นประหยัดงบ, เน้นเสถียรภาพสูงสุด)
5. **ข้อแนะนำของวิศวกรโซลูชัน (Solutions Architect's Recommendation)**: ฟันธงฟังก์ชัน/ความคุ้มค่าเชิงลึก`;
  }

  buildGameTheoryComparePrompt(products) {
    const formattedProducts = products.map(p => {
      const specList = Object.entries(p.specs || {})
        .map(([k, v]) => `  - ${k}: ${v}`)
        .join('\n');
      return `แบรนด์: ${p.vendor} | รุ่น: ${p.model || p.sku} | SKU: ${p.sku}
ราคา: ${p.price_thb ? p.price_thb.toLocaleString('th-TH') + ' THB' : 'ไม่ระบุ'}
สถานะสินค้า: ${p.availability || 'ไม่ระบุ'} | จัดส่งใน: ${p.lead_time_weeks !== undefined ? p.lead_time_weeks + ' สัปดาห์' : 'ไม่ระบุ'}
ข้อมูลจำเพาะหลัก:
${specList || '  - ไม่มีข้อมูลเพิ่มเติม'}`;
    }).join('\n\n');

    return `วิเคราะห์สินค้าไอทีต่อไปนี้โดยประยุกต์ใช้แนวคิดเชิงกลยุทธ์ตาม "ทฤษฎีเกม" (Game Theory Strategic Analysis) เพื่อช่วยทีมงานตัดสินใจในการเลือกเสนอโซลูชันแก่ลูกค้า:

${formattedProducts}

กรุณาให้การวิเคราะห์เชิงลึกเป็นภาษาไทย โดยมีหัวข้อดังต่อไปนี้:
1. **ผู้เล่นและแรงจูงใจ (Players & Motivations)**: วิเคราะห์มุมมองของ (1) ลูกค้าที่ตัดสินใจซื้อ (2) ผู้รับเหมาติดตั้ง/SI และ (3) แบรนด์ผู้ผลิตคู่แข่ง ในการเปรียบเทียบครั้งนี้
2. **เมทริกซ์ผลประโยชน์เชิงกลยุทธ์ (Strategic Payoff Analysis)**: เปรียบเทียบความคุ้มค่า ผลกระทบ และผลประโยชน์ที่ได้รับ (Payoffs) ในด้านประสิทธิภาพความคุ้มทุน (Cost-Performance), ความยืดหยุ่นในอนาคต (Future-proofing), ความเสี่ยงจากการล็อคอินแบรนด์ (Vendor Lock-in) และการสนับสนุนหลังการขาย
3. **จุดสมดุลแนช (Nash Equilibrium Analysis)**: หากประเมินพฤติกรรมลูกค้าทั่วไปในสถานการณ์ตลาดปัจจุบัน และเปรียบเทียบสเปก/ราคาในข้อมูลข้างต้น การตัดสินใจร่วมกันที่สมเหตุสมผลที่สุด (Rational Choice) สำหรับลูกค้าและ SI คือตัวเลือกใด และเพราะเหตุใด
4. **กลยุทธ์เด่น & ข้อเสนอแนะแนวทางทำสงครามราคา (Dominant Strategies & Pricing/SI Strategy)**: คำแนะนำเชิงรุกสำหรับ SI ในการเจรจา เสนอราคา หรือปูทางป้องกันคู่แข่งตีตลาด`;
  }

  buildDocumentComparePrompt(documents) {
    const formattedDocs = documents.map((doc, idx) => {
      return `เอกสารที่ ${idx + 1}: ${doc.name} (ขนาด ${doc.size} bytes)
เนื้อหาเอกสาร (ส่วนสเปกเทคนิค):
${doc.content.substring(0, 8000)}
---------------------------------------------`;
    }).join('\n\n');

    return `เปรียบเทียบข้อกำหนดจำเพาะทางเทคนิค (Technical Specifications) จากไฟล์ Datasheet เอกสารที่อัปโหลดดังต่อไปนี้:

${formattedDocs}

กรุณาเขียนรายงานวิเคราะห์เปรียบเทียบรายละเอียดทางเทคนิคของอุปกรณ์ในเอกสารข้างต้นเป็นภาษาไทย:
1. **บทวิเคราะห์คุณสมบัติชนกัน (Feature-by-Feature Technical Comparison)**: วิเคราะห์สเปกทางเทคนิคที่ต่างกันอย่างชัดเจนของแต่ละอุปกรณ์ (เช่น พอร์ตเชื่อมต่อ, ประสิทธิภาพการประมวลผล, ฟังก์ชันขั้นสูง)
2. **จุดดี-จุดเสียเชิงเทคนิค (Technical Pros & Cons)**: รายการข้อดีข้อเสียทางวิศวกรรมของแต่ละไฟล์เอกสาร
3. **ข้อเสนอแนะในการจัดกลุ่มประยุกต์ใช้ (Architect's Recommendation & Best Fit)**: อุปกรณ์ในเอกสารไหนเหมาะกับประเภทโครงการแบบใด`;
  }

  buildPayoffMatrixPrompt(products) {
    const productNames = products.map(p => `${p.vendor} ${p.model || p.sku}`).join(', ');
    const formattedProducts = products.map(p => {
      const specList = Object.entries(p.specs || {})
        .map(([k, v]) => `  - ${k}: ${v}`)
        .join('\n');
      return `**${p.vendor} ${p.model || p.sku}** (SKU: ${p.sku})
ราคา: ${p.price_thb ? p.price_thb.toLocaleString('th-TH') + ' THB' : 'ไม่ระบุ'}
สถานะ: ${p.availability || 'ไม่ระบุ'} | จัดส่งใน: ${p.lead_time_weeks !== undefined ? p.lead_time_weeks + ' สัปดาห์' : 'ไม่ระบุ'}
สเปกหลัก:
${specList || '  - ไม่มีข้อมูลเพิ่มเติม'}`;
    }).join('\n\n');

    return `วิเคราะห์สินค้าไอทีต่อไปนี้ด้วยกรอบ **Payoff Matrix** เพื่อช่วยทีม SI ตัดสินใจเลือกเสนอสินค้าตามสถานการณ์ลูกค้าที่แตกต่างกัน:

${formattedProducts}

กรุณาสร้างรายงาน **Payoff Matrix Analysis** เป็นภาษาไทย โดยมีหัวข้อดังนี้:

1. **นิยาม Payoff Matrix ในบริบทนี้**: อธิบายว่าแกน "สถานการณ์" (Scenarios/States) และ "ตัวเลือกสินค้า" (Strategies) คืออะไรในการวิเคราะห์ครั้งนี้

2. **ตาราง Payoff Matrix (Markdown Table)**: สร้างตารางที่มี:
   - **แถว (Rows)** = สถานการณ์ลูกค้า เช่น:
     - ลูกค้างบจำกัด / ต้องการประหยัดที่สุด
     - ลูกค้าองค์กรขนาดใหญ่ / Enterprise Grade
     - ลูกค้าต้องการ ROI ระยะยาว / Total Cost of Ownership ต่ำ
     - ลูกค้าต้องการปรับขยายระบบได้ (Scalability)
     - ลูกค้าอยู่ภายใต้ข้อบังคับ Compliance/Governance
   - **คอลัมน์ (Columns)** = ชื่อสินค้าแต่ละตัว (${productNames})
   - **ค่า Payoff** = คะแนนความเหมาะสม 0–10 พร้อมคำอธิบายสั้นๆ (เช่น "8 — ราคาดีที่สุด")
   - **ไฮไลต์ช่องที่ได้คะแนนสูงสุดต่อแถว** เป็น Nash-dominant choice

3. **สรุป Dominant Product ต่อสถานการณ์**: ระบุว่าสินค้าใดชนะในสถานการณ์ใดบ้าง และมีสินค้าใดที่เป็น "Weakly Dominant" (ชนะเกินครึ่ง) หรือไม่

4. **คำแนะนำเชิงกลยุทธ์สำหรับ SI**: ใช้ผลลัพธ์ Matrix นี้วางแผนการนำเสนอสินค้าตามโปรไฟล์ลูกค้าอย่างไร`;
  }

  buildNashEquilibriumPrompt(products) {
    const productNames = products.map(p => `${p.vendor} ${p.model || p.sku}`).join(' vs. ');
    const formattedProducts = products.map(p => {
      const specList = Object.entries(p.specs || {})
        .map(([k, v]) => `  - ${k}: ${v}`)
        .join('\n');
      return `**${p.vendor} ${p.model || p.sku}** (SKU: ${p.sku})
ราคา: ${p.price_thb ? p.price_thb.toLocaleString('th-TH') + ' THB' : 'ไม่ระบุ'}
สถานะ: ${p.availability || 'ไม่ระบุ'} | จัดส่งใน: ${p.lead_time_weeks !== undefined ? p.lead_time_weeks + ' สัปดาห์' : 'ไม่ระบุ'}
สเปกหลัก:
${specList || '  - ไม่มีข้อมูลเพิ่มเติม'}`;
    }).join('\n\n');

    return `วิเคราะห์สินค้าไอทีต่อไปนี้ (${productNames}) โดยใช้กรอบทฤษฎีเกมเน้นที่ **Nash Equilibrium และ Dominant Strategy** อย่างละเอียด:

${formattedProducts}

กรุณาให้การวิเคราะห์เชิงลึกเป็นภาษาไทย ครอบคลุมหัวข้อต่อไปนี้:

1. **กำหนดเกมและผู้เล่น (Game Setup)**:
   - ระบุผู้เล่นทั้งหมด: ลูกค้า (Buyer), SI/Pre-sales (Advisor), และ Vendor แต่ละราย
   - ระบุ Strategy Space ของแต่ละผู้เล่น (เช่น ลูกค้า: เลือกซื้อ vs. รอ vs. เลือกคู่แข่ง)

2. **Payoff ของแต่ละ Strategy Combination**:
   - วิเคราะห์ว่าหากลูกค้าเลือกสินค้าแต่ละตัว → SI ได้ Payoff ใด, ลูกค้าได้ Payoff ใด
   - ใช้คะแนน 1–10 ในมิติ: มูลค่าที่ได้รับ, ความเสี่ยง, ต้นทุนรวม (TCO), ความพึงพอใจระยะยาว
   - แสดงเป็นตาราง Payoff Matrix แบบ (SI Strategy × Customer Choice)

3. **Nash Equilibrium Analysis**:
   - ระบุ Nash Equilibrium Point(s) ในเกมนี้ (จุดที่ไม่มีผู้เล่นคนใดอยากเปลี่ยน Strategy ฝ่ายเดียว)
   - อธิบายว่า NE ที่พบนำไปสู่การแนะนำสินค้าใด และเพราะเหตุใด
   - หาก NE ไม่ชัดเจน ให้อธิบาย Mixed Strategy Nash Equilibrium

4. **Dominant Strategy Analysis**:
   - มีสินค้าใดเป็น **Strictly Dominant** (ดีกว่าในทุกสถานการณ์) หรือไม่?
   - มีสินค้าใดเป็น **Weakly Dominant** (ไม่แพ้ในทุกสถานการณ์) หรือไม่?
   - ระบุสินค้าที่เป็น **Dominated Strategy** ที่ควร "ตัดออก" จากการแนะนำ (IESDS — Iterative Elimination)

5. **สรุปข้อเสนอแนะ Nash-Optimal สำหรับ SI**:
   - สินค้าใดที่ SI ควรเสนอเป็นหลักตามผลลัพธ์ Nash Equilibrium?
   - เงื่อนไขใดที่จะทำให้ NE เปลี่ยนแปลง? (เช่น ราคาส่วนลดเพิ่ม, สเปกเปลี่ยน)`;
  }

  buildBuyerSellerGamePrompt(products) {
    const productNames = products.map(p => `${p.vendor} ${p.model || p.sku}`).join(', ');
    const formattedProducts = products.map(p => {
      const specList = Object.entries(p.specs || {})
        .map(([k, v]) => `  - ${k}: ${v}`)
        .join('\n');
      return `**${p.vendor} ${p.model || p.sku}** (SKU: ${p.sku})
ราคา List: ${p.price_thb ? p.price_thb.toLocaleString('th-TH') + ' THB' : 'ไม่ระบุ'}
สถานะ: ${p.availability || 'ไม่ระบุ'} | จัดส่งใน: ${p.lead_time_weeks !== undefined ? p.lead_time_weeks + ' สัปดาห์' : 'ไม่ระบุ'}
สเปกหลัก:
${specList || '  - ไม่มีข้อมูลเพิ่มเติม'}`;
    }).join('\n\n');

    return `วิเคราะห์สินค้าไอทีต่อไปนี้ (${productNames}) ในกรอบ **Buyer-Seller Negotiation Game** เพื่อช่วยทีม SI วางกลยุทธ์การเจรจาต่อรองและการปิดการขาย:

${formattedProducts}

กรุณาให้การวิเคราะห์เชิงกลยุทธ์เป็นภาษาไทย ครอบคลุมหัวข้อต่อไปนี้:

1. **โครงสร้าง Negotiation Game (Game Structure)**:
   - ระบุ "ข้อมูลที่ลูกค้ารู้" vs. "ข้อมูลที่ SI รู้" (Information Asymmetry)
   - ระบุ BATNA (Best Alternative to a Negotiated Agreement) ของทั้งสองฝ่าย
   - วิเคราะห์ Bargaining Power ของ Buyer vs. SI/Seller สำหรับสินค้าแต่ละตัว

2. **กลยุทธ์การเจรจาของ SI (SI Negotiation Strategy)**:
   - **Anchoring Strategy**: ควรนำเสนอสินค้าราคาใดก่อนเพื่อ anchor การเปรียบเทียบ?
   - **Framing Strategy**: จะเฟรมสินค้าอย่างไรให้ดูคุ้มค่าที่สุด (เช่น เน้น TCO, เน้น ROI, เน้น Risk Reduction)?
   - **Concession Strategy**: ควรให้ส่วนลดเมื่อใด? และเท่าไร? สินค้าใดมี margin ให้เล่นได้มากกว่า?

3. **กลยุทธ์ที่ลูกค้ามักใช้ & วิธีรับมือ**:
   - ระบุ Buyer Tactics ที่พบบ่อย (เช่น "ขอเพิ่มเวลาคิด", "มีคู่แข่งเสนอราคาต่ำกว่า", "ขอ Demo ฟรี")
   - วิธี Counter-move ที่ SI ควรใช้สำหรับสินค้าแต่ละตัวในการเปรียบเทียบครั้งนี้

4. **Signaling และ Commitment Devices**:
   - วิเคราะห์ว่า Vendor แต่ละรายส่ง Signal ใดผ่านราคา สเปก หรือเงื่อนไข Warranty/Support
   - SI ควรใช้ Commitment Device ใดเพื่อเพิ่มความน่าเชื่อถือ (เช่น SLA, Proof of Concept, Reference Customer)?

5. **Closing Strategy & Final Recommendation**:
   - สรุปแนวทางปิดการขาย (Closing Tactics) ที่เหมาะสมสำหรับสินค้าแต่ละตัว
   - แนะนำว่าควรเสนอสินค้าใดเป็น "Hero Product" และสินค้าใดเป็น "Foil" เพื่อทำให้ Hero ดูดีขึ้น
   - ระบุ Ideal Scenario ที่การเจรจาจะส่งผลดีที่สุดสำหรับ SI`;
  }
}
