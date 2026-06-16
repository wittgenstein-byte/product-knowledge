# SI Product Hub

**SI Product Hub** — Static SPA สำหรับทีม Sales และ Pre-sales ของบริษัท System Integrator ใช้ค้นหาสินค้า, ตรวจสอบ Datasheet, เปรียบเทียบสินค้า, และตรวจสอบราคา ระบบรองรับการวิเคราะห์เปรียบเทียบด้วย AI (LLM)

---

## Architecture

ระบบได้รับการแยกองค์ประกอบออกเป็น **Microservice Architecture** และเชื่อมต่อฐานข้อมูล **MySQL** สำหรับ Product Master เพื่อประสิทธิภาพที่รวดเร็วขึ้นบน Cloud (เช่น AWS EC2) ในขณะที่ส่วนอื่นยังคงเชื่อมต่อกับ Google Sheets เดิมผ่าน Google Sheets API (Service Account)

### Directory structure

```
/
├── frontend/
│   ├── index.html          ← เปิดเพื่อใช้งาน (ไม่ต้อง build, โหลดแบบ Static)
│   ├── style.css           ← CSS custom properties + responsive
│   └── js/
│       ├── App.js          ← Composition root (DI, boot)
│       ├── Formatters.js   ← Utility functions
│       └── services/       ← Infrastructure layer
│           ├── StateService.js      ← default API URL: http://localhost:4000/api
│           └── ...
├── gateway/                ← API Gateway Service (Port 4000)
│   ├── src/
│   │   └── index.js        ← Express Proxy router ส่งต่อ request ไปยัง backend
│   ├── Dockerfile
│   └── package.json
├── backend/                ← Main Backend Logic Service (Port 4001)
│   ├── src/
│   │   ├── index.js        ← Express App entry point + Action dispatcher
│   │   ├── db/
│   │   │   ├── mysql.js    ← MySQL Connection Pool
│   │   │   └── schema.sql  ← Schema SQL สำหรับสร้างตาราง products + seed ข้อมูลตัวอย่าง
│   │   ├── sheets/
│   │   │   └── client.js   ← Google Sheets API Client (Service Account)
│   │   └── routes/
│   │       ├── products.js ← [MySQL] searchProducts, getDatasheet, compareProducts, getMetadata
│   │       ├── pricing.js  ← [Sheets API] getPricing (Fallback MySQL)
│   │       └── bom.js      ← [Sheets API] generateBOM, saveProposal
│   ├── Dockerfile
│   └── package.json
├── docker-compose.yml      ← Orchestrate gateway + backend + mysql
└── README.md
```

---

## Technology Stack

- **Frontend**: Vanilla JavaScript (ES6+), CSS Custom Properties
- **API Gateway**: Node.js + Express.js + Http Proxy Middleware (Port 4000)
- **Backend Service**: Node.js + Express.js + MySQL Client (Port 4001)
- **Database**: MySQL 8.0 (สำหรับเก็บข้อมูล Products Master)
- **Integrations**: Google Sheets API v4 (สำหรับเก็บข้อมูล Pricing, BOM, Proposals)
- **Process Manager**: Docker Compose

---

## การเตรียมตัวติดตั้งและรันระบบ (Deployment Guide)

### 1. การตั้งค่า Google Sheets API และ Service Account
เพื่อให้ Backend บริการเชื่อมต่อกับ Sheets ได้โดยตรงโดยไม่ต้องใช้ Apps Script:
1. เข้าไปที่ [Google Cloud Console](https://console.cloud.google.com/)
2. สร้าง Project ใหม่ (หรือใช้โปรเจกต์เดิม)
3. ไปที่หน้า **APIs & Services** > **Library** ค้นหาและเปิดใช้งาน **Google Sheets API**
4. ไปที่ **APIs & Services** > **Credentials** กดสร้าง **Create Credentials** เลือก **Service Account**
5. ตั้งชื่อ Service Account แล้วกดสร้าง เสร็จแล้วให้เข้าไปที่ Service Account ที่พึ่งสร้าง กดแท็บ **Keys** > **Add Key** > **Create New Key** เลือกประเภท **JSON**
6. ระบบจะดาวน์โหลดไฟล์ JSON key มาเก็บไว้ (เช่น `credentials.json`)
7. **สำคัญมาก**: เปิดไฟล์ Google Sheet เดิมของคุณ คัดลอก **อีเมลของ Service Account** (เช่น `service-account-name@project-id.iam.gserviceaccount.com`) และนำไปแชร์ให้สิทธิ์ในการแก้ไข (Editor) แก่ชีตของคุณ

### 2. การกำหนดค่าตัวแปรสภาพแวดล้อม (Environment Variables)
คัดลอกไฟล์ `.env.example` เป็น `.env` ในโฟลเดอร์ `backend/` และแก้ไขข้อมูล:
```bash
cp backend/.env.example backend/.env
```
กำหนดค่าที่จำเป็นใน `.env`:
* `GOOGLE_SHEETS_ID` — รหัส ID ของ Google Sheet (หาได้จาก URL ของชีต)
* `GOOGLE_SERVICE_ACCOUNT_KEY` — คัดลอกข้อมูลทั้งหมดจากไฟล์ JSON key ที่ดาวน์โหลดมามาวางเป็น single-line string ในบรรทัดเดียว
* หรือระบุ `GOOGLE_SERVICE_ACCOUNT_KEY_PATH` และวางไฟล์ JSON key ไว้ที่เซิร์ฟเวอร์ของคุณ

---

## วิธีการเริ่มใช้งานระบบ (Docker Compose)

ในโฟลเดอร์หลักของโปรเจกต์ ให้พิมพ์คำสั่งเพื่อรัน Container:

```bash
docker compose up -d --build
```

ระบบจะสร้างและเริ่มการทำงานของ 3 container:
1. **mysql** — รันบนพอร์ต `3306` (จะสร้างตาราง `products` และ seed ข้อมูลตัวอย่างให้อัตโนมัติในครั้งแรก)
2. **backend** — รันบนพอร์ต `4001` (จัดการ logic และ API ทั้งหมด)
3. **gateway** — รันบนพอร์ต `4000` (รับ request จาก Frontend และ proxy ไปยัง Backend)

### ตรวจสอบความพร้อมใช้งานของ Services:
* ตรวจสอบ Gateway: `curl http://localhost:4000/health`
* ตรวจสอบ Backend: `curl http://localhost:4001/health`

---

## การ deploy บน EC2 ร่วมกับ Nginx

กรณีที่มีโปรเจกต์อื่นรันอยู่บนพอร์ต 80 ของ Nginx อยู่แล้ว คุณสามารถตั้งค่า Nginx Config (เช่น `/etc/nginx/sites-available/default` หรือไฟล์อื่นๆ) เพื่อส่งต่อ (Proxy Pass) ไปที่ API Gateway พอร์ต 4000 ได้ดังนี้:

```nginx
server {
    listen 80;
    server_name si-api.yourdomain.com; # หรือใช้ location block

    location / {
        proxy_pass http://127.0.0.1:4000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

และสำหรับ Frontend สามารถรันจากไฟล์ `frontend/index.html` หรือเปิดผ่าน Nginx ทั่วไปได้โดยการตั้งค่า API URL ในระบบ หรือกำหนดค่าเริ่มต้นที่ `frontend/js/services/StateService.js` ให้ตรงกับ Domain/IP ของ Gateway

---

## Conventions
* UI text ทั้งหมดเป็นภาษาไทย
* Dark theme เป็นค่าเริ่มต้น
* เปรียบเทียบสินค้าสูงสุด 4 SKU
* ราคาแสดงผลด้วย locale `th-TH`
* ข้อมูลสินค้า master (Products) ดึงและค้นหาผ่าน MySQL
* ข้อมูลราคาสด (Pricing), BOM และ Proposals บันทึกลง Google Sheets
