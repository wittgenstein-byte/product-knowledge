# SI Product Hub — Apps Script Setup Guide

## ขั้นตอนการติดตั้ง Backend

---

### 1. สร้าง Google Spreadsheet

1. เปิด [Google Sheets](https://sheets.new) → สร้าง Spreadsheet ใหม่
2. ตั้งชื่อไฟล์ว่า **"SI Product Hub Data"** (หรือชื่ออื่นก็ได้)
3. คัดลอก **Spreadsheet ID** จาก URL:
   ```
   https://docs.google.com/spreadsheets/d/[SPREADSHEET_ID]/edit
   ```

---

### 2. สร้าง Apps Script Project

1. ไปที่ [script.google.com](https://script.google.com) → **New Project**
2. ตั้งชื่อ Project ว่า **"SI Product Hub API"**
3. ลบโค้ดเดิมทิ้ง → วางเนื้อหาจาก `Code.gs` ทั้งหมด
4. แก้ไขบรรทัดที่ 15:
   ```javascript
   var SPREADSHEET_ID = 'วาง_ID_ของคุณ_ที่นี่';
   ```

---

### 3. สร้าง Sheets และ Headers

1. ใน Apps Script Editor → เลือก function **`setupSheets`** จาก dropdown
2. คลิก **▶ Run**
3. อนุมัติสิทธิ์ Google (ครั้งแรก)
4. ตรวจใน Spreadsheet — ควรมี 4 sheets: `Products`, `Pricing`, `BOM`, `Proposals`

---

### 4. เพิ่มข้อมูลตัวอย่าง (ทดสอบ)

1. เลือก function **`seedSampleData`** → คลิก **▶ Run**
2. Spreadsheet จะมีสินค้า 9 รายการและราคา 8 รายการ

---

### 5. Deploy เป็น Web App

1. คลิก **Deploy** → **New deployment**
2. เลือก Type: **Web app**
3. ตั้งค่า:
   | Field | Value |
   |-------|-------|
   | Description | SI Product Hub API v1 |
   | Execute as | **Me** |
   | Who has access | **Anyone** (หรือ Anyone in org สำหรับ Workspace) |
4. คลิก **Deploy** → คัดลอก **Web App URL**

---

### 6. ตั้งค่าใน Frontend

1. เปิด `index.html` ในเบราว์เซอร์
2. ไปหน้า **ตั้งค่า API** (ไอคอนรูปเฟือง)
3. วาง Web App URL ใน **"Web App URL"**
4. กรอกชื่อและบทบาท → **บันทึกการตั้งค่า**
5. กด **ทดสอบการเชื่อมต่อ** — ควรขึ้น ✓ เชื่อมต่อสำเร็จ

---

## โครงสร้าง Google Sheets

### Sheet: Products
| Column | Description | ตัวอย่าง |
|--------|-------------|---------|
| sku | รหัสสินค้า (unique) | `CSC-C9300-48P` |
| vendor | แบรนด์ | `Cisco` |
| model | รุ่นสินค้า | `Catalyst 9300-48P` |
| category | หมวดหมู่ | `Switch`, `Firewall`, `Wi-Fi AP`, `Router`, `Server` |
| segment | กลุ่มลูกค้า | `SMB`, `mid-market`, `enterprise`, `government` |
| description | คำอธิบาย | ประโยคสั้น ๆ |
| key_specs | สเปค (CSV format) | `throughput: 176Gbps, ports: 48x1G PoE+, warranty_years: 5` |
| availability | สถานะสินค้า | `In Stock`, `Lead Time`, `Out of Stock` |
| lead_time_weeks | Lead time (สัปดาห์) | `4` |
| distributor | ตัวแทนจำหน่าย | `Synnex Thailand` |
| price_thb | ราคา (บาท) | `245000` |
| eol | End of Life? | `TRUE` หรือ `FALSE` |
| replacement_sku | SKU ทดแทน (ถ้า EoL) | `CSC-C9300-48P` |
| datasheet_url | URL PDF | `https://...` |
| datasheet_date | วันที่อัพเดท datasheet | `2024-01-15` |
| notes | หมายเหตุ | |

### Sheet: Pricing (ราคา live — อัพเดทได้บ่อย)
| Column | Description |
|--------|-------------|
| sku | รหัสสินค้า |
| model | รุ่น |
| vendor | แบรนด์ |
| price_thb | ราคาขาย (บาท) |
| cost_thb | ราคาทุน |
| margin_pct | Margin % |
| availability | สถานะ |
| lead_time_weeks | Lead time |
| distributor | Distributor |
| last_updated | วันที่อัพเดท |

### Sheet: BOM (auto-generated โดยระบบ)
BOM จะถูก append อัตโนมัติเมื่อกด **สร้าง BOM** จากหน้าเว็บ

### Sheet: Proposals (auto-generated โดยระบบ)
Proposal จะถูก append อัตโนมัติเมื่อกด **บันทึก Proposal** จากหน้าเว็บ

---

## การแก้ไขหลัง Deploy

> ⚠️ ทุกครั้งที่แก้ไขโค้ด ต้อง **Deploy ใหม่** (New Deployment หรือ Manage Deployments → Edit)
> URL เดิมจะยังใช้ได้ถ้า Manage → Edit แทนที่จะสร้างใหม่

---

## CORS Note

Apps Script Web App รองรับ CORS โดย default เมื่อเปิด `Who has access: Anyone`  
ถ้าเจอ CORS error ตรวจสอบ:
1. ตั้งค่า **Execute as: Me** และ **Who has access: Anyone**
2. Deploy เป็น **Web app** ไม่ใช่ API executable
3. ใช้ URL ที่ลงท้ายด้วย `/exec` ไม่ใช่ `/dev`
