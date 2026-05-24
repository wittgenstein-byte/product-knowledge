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
        ],
        max_tokens: 10
      })
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`HTTP Error ${response.status}: ${errText || response.statusText}`);
    }

    const data = await response.json();
    return data.choices[0].message.content.trim();
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
    }).join('\n\n`);

    return `เปรียบเทียบข้อกำหนดจำเพาะทางเทคนิค (Technical Specifications) จากไฟล์ Datasheet เอกสารที่อัปโหลดดังต่อไปนี้:

${formattedDocs}

กรุณาเขียนรายงานวิเคราะห์เปรียบเทียบรายละเอียดทางเทคนิคของอุปกรณ์ในเอกสารข้างต้นเป็นภาษาไทย:
1. **บทวิเคราะห์คุณสมบัติชนกัน (Feature-by-Feature Technical Comparison)**: วิเคราะห์สเปกทางเทคนิคที่ต่างกันอย่างชัดเจนของแต่ละอุปกรณ์ (เช่น พอร์ตเชื่อมต่อ, ประสิทธิภาพการประมวลผล, ฟังก์ชันขั้นสูง)
2. **จุดดี-จุดเสียเชิงเทคนิค (Technical Pros & Cons)**: รายการข้อดีข้อเสียทางวิศวกรรมของแต่ละไฟล์เอกสาร
3. **ข้อเสนอแนะในการจัดกลุ่มประยุกต์ใช้ (Architect's Recommendation & Best Fit)**: อุปกรณ์ในเอกสารไหนเหมาะกับประเภทโครงการแบบใด`;
  }
}
