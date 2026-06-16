CREATE TABLE IF NOT EXISTS products (
  id             INT AUTO_INCREMENT PRIMARY KEY,
  sku            VARCHAR(50) UNIQUE NOT NULL,
  vendor         VARCHAR(100),
  model          VARCHAR(200),
  category       VARCHAR(100),
  segment        VARCHAR(100),
  description    TEXT,
  key_specs      TEXT,
  availability   VARCHAR(50),
  lead_time_weeks INT,
  distributor    VARCHAR(200),
  price_thb      DECIMAL(12,2),
  eol            BOOLEAN DEFAULT FALSE,
  replacement_sku VARCHAR(50),
  datasheet_url  TEXT,
  datasheet_date DATE,
  notes          TEXT,
  created_at     TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at     TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Seed Sample Data
INSERT INTO products (sku, vendor, model, category, segment, description, key_specs, availability, lead_time_weeks, distributor, price_thb, eol, replacement_sku, datasheet_url, datasheet_date, notes)
VALUES
  ('CSC-C9300-48P', 'Cisco', 'Catalyst 9300-48P', 'Switch', 'enterprise', 
   'Cisco Catalyst 9300 Series 48-port PoE+ Stackable Switch', 
   'throughput: 176Gbps, ports: 48x1G PoE+, poe_budget_w: 437W, uplink: 4x10G, stacking: yes, warranty_years: 5', 
   'In Stock', 4, 'Synnex Thailand', 245000.00, FALSE, NULL, NULL, NULL, 'รองรับ Cisco DNA'),
  
  ('CSC-C9200-24P', 'Cisco', 'Catalyst 9200-24P', 'Switch', 'mid-market', 
   'Cisco Catalyst 9200 Series 24-port PoE+ Switch', 
   'throughput: 56Gbps, ports: 24x1G PoE+, poe_budget_w: 370W, uplink: 4x1G, stacking: no, warranty_years: 5', 
   'In Stock', 2, 'Synnex Thailand', 115000.00, FALSE, NULL, NULL, NULL, ''),
  
  ('HP-CX6300-48G', 'HP Aruba', 'CX 6300M 48G', 'Switch', 'enterprise', 
   'Aruba CX 6300M 48-port 1G PoE Switch with VSX Stacking', 
   'throughput: 296Gbps, ports: 48x1G PoE+, poe_budget_w: 480W, uplink: 4x25G SFP28, stacking: yes, warranty_years: lifetime', 
   'Lead Time', 6, 'Ingram Micro TH', 278000.00, FALSE, NULL, NULL, NULL, 'Lifetime warranty'),
  
  ('FTN-FG100F', 'Fortinet', 'FortiGate 100F', 'Firewall', 'mid-market', 
   'FortiGate 100F Next-Generation Firewall with SD-WAN', 
   'throughput: 20Gbps, ports: 22xGE+2x10GE+2xSFP+, management: FortiOS 7.4, certifications: ICSA CC EAL4+, warranty_years: 1', 
   'In Stock', 0, 'Fortinet Direct', 195000.00, FALSE, NULL, 'https://www.fortinet.com/content/dam/fortinet/assets/data-sheets/fortigate-100f.pdf', NULL, 'FortiCare required'),
  
  ('FTN-FG60F', 'Fortinet', 'FortiGate 60F', 'Firewall', 'SMB', 
   'FortiGate 60F Compact Next-Generation Firewall', 
   'throughput: 10Gbps, ports: 10xGE, management: FortiOS 7.4, certifications: ICSA CC, warranty_years: 1', 
   'In Stock', 0, 'Fortinet Direct', 55000.00, FALSE, NULL, NULL, NULL, ''),
  
  ('ARU-AP515', 'Aruba', 'AP-515', 'Wi-Fi AP', 'enterprise', 
   'Aruba AP-515 Wi-Fi 6 (802.11ax) Indoor Access Point', 
   'throughput: 4.8Gbps, ports: 1x2.5G+1x1G, management: ArubaOS 10, certifications: Wi-Fi 6 certified, warranty_years: lifetime', 
   'In Stock', 0, 'Ingram Micro TH', 38500.00, FALSE, NULL, NULL, NULL, 'Ceiling/wall mount'),
  
  ('CSC-C9120-AXI', 'Cisco', 'Catalyst 9120AXI', 'Wi-Fi AP', 'enterprise', 
   'Cisco Catalyst 9120AXI Wi-Fi 6 Indoor Access Point', 
   'throughput: 3.6Gbps, ports: 1xmGig 2.5G, management: Cisco DNA/IOS XE, certifications: Wi-Fi 6, warranty_years: 5', 
   'In Stock', 3, 'Synnex Thailand', 42000.00, FALSE, NULL, NULL, NULL, ''),
  
  ('PAN-PA-220', 'Palo Alto', 'PA-220', 'Firewall', 'SMB', 
   'Palo Alto PA-220 Next-Gen Firewall for SMB', 
   'throughput: 500Mbps, ports: 8xGE+1xMgmt, management: PAN-OS 11, certifications: ICSA CC EAL4+, warranty_years: 1', 
   'In Stock', 0, 'Palo Alto Direct', 85000.00, FALSE, NULL, NULL, NULL, ''),
  
  ('CSC-C9300-24P-EOL', 'Cisco', 'Catalyst 9300-24P', 'Switch', 'enterprise', 
   'Cisco Catalyst 9300-24P (End of Life)', 
   'throughput: 88Gbps, ports: 24x1G PoE+, warranty_years: 5', 
   'Lead Time', 12, 'Synnex Thailand', 175000.00, TRUE, 'CSC-C9300-48P', NULL, NULL, 'EoL - ใช้ CSC-C9300-48P แทน')
ON DUPLICATE KEY UPDATE sku=sku;
