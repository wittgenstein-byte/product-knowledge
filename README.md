# SI Product Hub

**SI Product Hub** — Static SPA สำหรับทีม Sales และ Pre-sales ของบริษัท System Integrator ใช้ค้นหาสินค้า, ตรวจสอบ Datasheet, เปรียบเทียบสินค้า, และตรวจสอบราคา ระบบรองรับการวิเคราะห์เปรียบเทียบด้วย AI (LLM)

## Features

- **ค้นหาสินค้า** — ค้นหาจาก Product Master ด้วย keyword, category, vendor, segment หรือช่วงราคา พร้อมตัวกรองหลายมิติ
- **Datasheet** — ดู spec ละเอียดของสินค้าจาก Datasheet Index ค้นหาด้วย SKU หรือ Model
- **เปรียบเทียบสินค้า** — เปรียบเทียบ 2–4 SKU แบบ side-by-side พร้อม highlight จุดเด่น
- **AI เปรียบเทียบและวิเคราะห์เชิงกลยุทธ์** — วิเคราะห์เปรียบเทียบสเปกทางเทคนิคด้วย LLM (OpenAI-compatible API) เลือกวิเคราะห์แบบ Standard Comparison, Game Theory Strategy หรือ Custom Prompt รองรับการอัปโหลดไฟล์ Datasheet (.pdf, .txt, .md)
- **ตรวจราคาสินค้า** — ดูราคาและสถานะ availability ของสินค้าหลาย SKU พร้อมกัน
- **ตั้งค่า API** — กำหนด Apps Script Web App URL, LLM API, และข้อมูลผู้ใช้
- **Dark/Light theme** — สลับโหมดสีได้
- **Sync ข้อมูล** — ดึงข้อมูลล่าสุดจาก Google Sheets ผ่าน API

## Architecture

### Directory structure

```
/
├── frontend/
│   ├── index.html          ← เปิดเพื่อใช้งาน (ไม่ต้อง build)
│   ├── style.css           ← CSS custom properties + responsive
│   └── js/
│       ├── App.js          ← Composition root (DI, boot)
│       ├── Formatters.js   ← Utility functions
│       ├── services/       ← Infrastructure layer
│       │   ├── StateService.js      ← state + localStorage persistence
│       │   ├── ToastService.js      ← notification toasts
│       │   ├── LoadingService.js    ← loading overlay
│       │   ├── ApiClient.js         ← HTTP client สำหรับ Apps Script API
│       │   ├── LlmService.js        ← LLM (OpenAI-compatible) API client
│       │   ├── NavigationService.js ← page routing
│       │   └── ThemeService.js      ← dark/light theme toggle
│       └── features/       ← Domain layer
│           ├── SearchFeature.js
│           ├── DatasheetFeature.js
│           ├── CompareFeature.js
│           ├── AiCompareFeature.js
│           ├── PricingFeature.js
│           ├── SettingsFeature.js
│           └── MetadataManager.js
└── backend/
    ├── Code.gs             ← Google Apps Script Web App
    └── SETUP_APPSCRIPT.md  ← คู่มือติดตั้ง Backend
```

### Key principles

- **No build step, no dependencies** — ใช้ vanilla JavaScript โหลดผ่าน `<script>` tags
- **SRP** — แต่ละ class มี responsibility เดียว
- **DIP** — Features depend on services via constructor injection
- **OCP** — เพิ่ม feature = สร้างไฟล์ใน `features/`, register ใน `App.js`
- **Backend** — Google Apps Script Web App ผู้ใช้ตั้งค่า URL ในหน้า Settings

### API Protocol

POST ไปยัง URL ที่ตั้งค่าด้วย JSON body: `{ action, params }`

| Action | Description |
|--------|-------------|
| `searchProducts` | ค้นหาสินค้า |
| `getDatasheet` | ดู datasheet |
| `compareProducts` | เปรียบเทียบสินค้า |
| `getPricing` | ดูราคาสินค้า |
| `getMetadata` | รับ metadata (categories, vendors, segments) |
| `generateBOM` | สร้าง Bill of Materials |
| `saveProposal` | บันทึก Proposal |

## Getting Started

### Prerequisites

- เบราว์เซอร์ที่รองรับ ES6+ (Chrome, Edge, Firefox, Safari)
- Google Account (สำหรับ Backend)
- LLM API Key (optional สำหรับ AI Compare feature)

### Backend Setup

ดูรายละเอียดใน [`backend/SETUP_APPSCRIPT.md`](backend/SETUP_APPSCRIPT.md)

### Running

1. เปิด `frontend/index.html` ในเบราว์เซอร์ (เปิดตรง ไม่ต้องใช้ dev server)
2. ไปที่หน้า **ตั้งค่า API** (ไอคอนรูปเฟือง)
3. กำหนด Web App URL ที่ได้จากขั้นตอน Deploy
4. กด **ทดสอบการเชื่อมต่อ**
5. กด **Sync ข้อมูล** เพื่อดึง Product Master มาใช้งาน

## Tech Stack

- **Frontend**: Vanilla JavaScript (ES6+), CSS Custom Properties
- **Backend**: Google Apps Script (GAS)
- **Data Store**: Google Sheets
- **AI**: OpenAI-compatible LLM API (OpenAI, Gemini, etc.)
- **PDF**: pdf.js (สำหรับอ่านไฟล์ PDF ที่อัปโหลด)

## Conventions

- UI text ทั้งหมดเป็นภาษาไทย
- Dark theme เป็นค่าเริ่มต้น
- เปรียบเทียบสูงสุด 4 SKU
- ราคาแสดงด้วย locale `th-TH`
- CSS custom properties สำหรับ theming (`[data-theme="light"]`)
- State เก็บใน localStorage keys: `si_api_url`, `si_user_name`, `si_user_role`, `si_theme`, `si_llm_api_url`, `si_llm_api_key`, `si_llm_model`
