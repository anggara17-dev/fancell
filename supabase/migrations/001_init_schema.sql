-- ============================================
-- TOKO HP POS - DATABASE SCHEMA
-- Versi: 1.0
-- Tanggal: 17 September 2026
-- ============================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- 1. USERS & ROLES
-- ============================================
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  username VARCHAR(50) UNIQUE NOT NULL,
  email VARCHAR(100) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  role VARCHAR(20) CHECK (role IN ('owner', 'kasir', 'gudang')) NOT NULL DEFAULT 'kasir',
  pin VARCHAR(6),
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- ============================================
-- 2. MASTER BARANG (HP, AKSESORIS, KONSINYASI)
-- ============================================
CREATE TABLE products (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(100) NOT NULL,
  category VARCHAR(50) CHECK (category IN ('hp', 'aksesoris')) NOT NULL,
  type VARCHAR(20) CHECK (type IN ('new', 'second', 'consignment')) DEFAULT 'new',
  brand VARCHAR(50),
  model VARCHAR(50),
  storage VARCHAR(20),
  color VARCHAR(50),
  imei VARCHAR(50) UNIQUE, -- UNIQUE untuk HP, NULL untuk aksesoris
  serial_number VARCHAR(100),
  condition_notes TEXT,
  kelengkapan TEXT,
  hpp DECIMAL(15,2) NOT NULL DEFAULT 0, -- Harga Pokok Penjualan (Modal)
  harga_jual DECIMAL(15,2) NOT NULL DEFAULT 0,
  status VARCHAR(20) CHECK (status IN ('available', 'sold', 'reserved', 'damaged', 'returned')) DEFAULT 'available',
  
  -- Konsinyasi fields
  consignment_owner VARCHAR(100), -- Nama penitip
  consignment_split DECIMAL(5,2), -- Persentase bagi hasil (misal 10.00 untuk 10%)
  consignment_agreement_date DATE,
  
  -- Tracking
  source VARCHAR(20) CHECK (source IN ('purchase', 'trade_in', 'consignment')) DEFAULT 'purchase',
  source_reference_id UUID, -- ID transaksi pembelian/tukar tambah
  
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Index untuk pencarian cepat
CREATE INDEX idx_products_imei ON products(imei);
CREATE INDEX idx_products_status ON products(status);
CREATE INDEX idx_products_category ON products(category);

-- ============================================
-- 3. TRANSAKSI UTAMA
-- ============================================
CREATE TABLE transactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  client_id UUID, -- UUID dari client (untuk offline sync)
  cashier_id UUID REFERENCES users(id),
  customer_name VARCHAR(100),
  customer_phone VARCHAR(20),
  
  -- Financial
  subtotal DECIMAL(15,2) NOT NULL DEFAULT 0,
  discount_amount DECIMAL(15,2) DEFAULT 0,
  discount_reason TEXT,
  total_amount DECIMAL(15,2) NOT NULL DEFAULT 0,
  
  -- Status
  payment_status VARCHAR(20) CHECK (payment_status IN ('paid', 'partial', 'pending')) DEFAULT 'paid',
  transaction_type VARCHAR(20) CHECK (transaction_type IN ('sale', 'trade_in', 'return')) DEFAULT 'sale',
  
  -- Sync tracking
  is_synced BOOLEAN DEFAULT FALSE,
  synced_at TIMESTAMP,
  
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- ============================================
-- 4. ITEM TRANSAKSI (Snapshot HPP saat transaksi)
-- ============================================
CREATE TABLE transaction_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  transaction_id UUID REFERENCES transactions(id) ON DELETE CASCADE,
  product_id UUID REFERENCES products(id),
  product_name VARCHAR(100) NOT NULL, -- Snapshot nama produk
  imei VARCHAR(50), -- Snapshot IMEI
  qty INT DEFAULT 1,
  price_at_sale DECIMAL(15,2) NOT NULL,
  hpp_at_sale DECIMAL(15,2) NOT NULL, -- Snapshot HPP saat transaksi
  profit DECIMAL(15,2) GENERATED ALWAYS AS (price_at_sale - hpp_at_sale) * qty STORED,
  
  created_at TIMESTAMP DEFAULT NOW()
);

-- ============================================
-- 5. TUKAR TAMBAH (TRADE-IN)
-- ============================================
CREATE TABLE trade_ins (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  transaction_id UUID REFERENCES transactions(id) ON DELETE CASCADE,
  old_device_name VARCHAR(100) NOT NULL,
  old_device_brand VARCHAR(50),
  old_device_model VARCHAR(50),
  old_imei VARCHAR(50),
  old_serial_number VARCHAR(100),
  condition_notes TEXT,
  kelengkapan TEXT,
  trade_in_value DECIMAL(15,2) NOT NULL, -- Nilai tukar tambah (jadi HPP baru)
  is_added_to_stock BOOLEAN DEFAULT FALSE,
  new_product_id UUID REFERENCES products(id), -- ID produk second yang dibuat
  
  created_at TIMESTAMP DEFAULT NOW()
);

-- ============================================
-- 6. METODE PEMBAYARAN
-- ============================================
CREATE TABLE payment_methods (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(50) NOT NULL, -- Tunai, Transfer, QRIS, EDC, E-wallet, dll
  type VARCHAR(20) CHECK (type IN ('cash', 'bank_transfer', 'qris', 'ewallet', 'credit_card', 'trade_in')) NOT NULL,
  admin_fee_percentage DECIMAL(5,2) DEFAULT 0, -- Biaya admin dalam persen (misal 0.70 untuk 0.7%)
  admin_fee_fixed DECIMAL(15,2) DEFAULT 0, -- Biaya admin tetap (misal 2000)
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT NOW()
);

-- ============================================
-- 7. PEMBAYARAN (Split Payment)
-- ============================================
CREATE TABLE payments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  transaction_id UUID REFERENCES transactions(id) ON DELETE CASCADE,
  payment_method_id UUID REFERENCES payment_methods(id),
  amount DECIMAL(15,2) NOT NULL,
  admin_fee DECIMAL(15,2) DEFAULT 0, -- Total admin fee untuk pembayaran ini
  reference_number VARCHAR(100), -- Nomor referensi transfer/EDC
  notes TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- ============================================
-- 8. CICILAN / TERMIN
-- ============================================
CREATE TABLE installments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  transaction_id UUID REFERENCES transactions(id) ON DELETE CASCADE,
  installment_number INT NOT NULL,
  due_date DATE NOT NULL,
  amount DECIMAL(15,2) NOT NULL,
  status VARCHAR(20) CHECK (status IN ('unpaid', 'paid', 'late')) DEFAULT 'unpaid',
  paid_at TIMESTAMP,
  paid_amount DECIMAL(15,2),
  notes TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- ============================================
-- 9. KATEGORI BIAYA OPERASIONAL
-- ============================================
CREATE TABLE cost_categories (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(100) NOT NULL, -- Sewa, Listrik, Gaji, Internet, dll
  description TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT NOW()
);

-- ============================================
-- 10. BIAYA OPERASIONAL
-- ============================================
CREATE TABLE operational_costs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  cost_category_id UUID REFERENCES cost_categories(id),
  amount DECIMAL(15,2) NOT NULL,
  description TEXT,
  date DATE DEFAULT CURRENT_DATE,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMP DEFAULT NOW()
);

-- ============================================
-- 11. JURNAL KEUANGAN (PEMBUKUAN)
-- ============================================
CREATE TABLE financial_entries (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  entry_type VARCHAR(20) CHECK (entry_type IN ('income', 'expense', 'capital', 'prive')) NOT NULL,
  amount DECIMAL(15,2) NOT NULL,
  description TEXT,
  reference_type VARCHAR(50), -- 'transaction', 'operational_cost', 'capital_in', 'prive_out'
  reference_id UUID, -- ID dari tabel referensi
  date DATE DEFAULT CURRENT_DATE,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMP DEFAULT NOW()
);

-- ============================================
-- 12. MODAL & PRIVE
-- ============================================
CREATE TABLE capital_transactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  type VARCHAR(20) CHECK (type IN ('capital_in', 'prive_out')) NOT NULL,
  amount DECIMAL(15,2) NOT NULL,
  description TEXT,
  date DATE DEFAULT CURRENT_DATE,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMP DEFAULT NOW()
);

-- ============================================
-- 13. AUDIT LOG (Untuk tracking perubahan)
-- ============================================
CREATE TABLE audit_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id),
  action VARCHAR(50) NOT NULL, -- 'create', 'update', 'delete', 'void', 'login'
  table_name VARCHAR(50),
  record_id UUID,
  old_values JSONB,
  new_values JSONB,
  reason TEXT,
  ip_address VARCHAR(50),
  user_agent TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- ============================================
-- 14. PRINTER SETTINGS (Per device)
-- ============================================
CREATE TABLE printer_settings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id),
  device_name VARCHAR(100),
  printer_type VARCHAR(20) CHECK (printer_type IN ('usb', 'bluetooth', 'network')),
  printer_name VARCHAR(100),
  is_default BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT NOW()
);

-- ============================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================

-- Enable RLS untuk semua tabel
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE transaction_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE trade_ins ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_methods ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE installments ENABLE ROW LEVEL SECURITY;
ALTER TABLE cost_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE operational_costs ENABLE ROW LEVEL SECURITY;
ALTER TABLE financial_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE capital_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE printer_settings ENABLE ROW LEVEL SECURITY;

-- ============================================
-- POLICIES: USERS
-- ============================================
-- Owner bisa lihat semua users
CREATE POLICY "Owners can view all users"
ON users FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM users WHERE id = auth.uid() AND role = 'owner'
  )
);

-- User bisa lihat data sendiri
CREATE POLICY "Users can view own data"
ON users FOR SELECT
USING (id = auth.uid());

-- ============================================
-- POLICIES: PRODUCTS
-- ============================================
-- Semua authenticated users bisa lihat produk
CREATE POLICY "Authenticated users can view products"
ON products FOR SELECT
USING (auth.role() = 'authenticated');

-- Owner & Gudang bisa create/update produk
CREATE POLICY "Owner and Gudang can manage products"
ON products FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('owner', 'gudang')
  )
);

-- ============================================
-- POLICIES: TRANSACTIONS
-- ============================================
-- Semua authenticated users bisa lihat transaksi
CREATE POLICY "Authenticated users can view transactions"
ON transactions FOR SELECT
USING (auth.role() = 'authenticated');

-- Kasir & Owner bisa create transaksi
CREATE POLICY "Kasir and Owner can create transactions"
ON transactions FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('owner', 'kasir')
  )
);

-- Owner bisa update transaksi (untuk void/retur)
CREATE POLICY "Owner can update transactions"
ON transactions FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM users WHERE id = auth.uid() AND role = 'owner'
  )
);

-- ============================================
-- POLICIES: FINANCIAL ENTRIES (Hanya Owner)
-- ============================================
CREATE POLICY "Only owners can view financial entries"
ON financial_entries FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM users WHERE id = auth.uid() AND role = 'owner'
  )
);

CREATE POLICY "Only owners can manage financial entries"
ON financial_entries FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM users WHERE id = auth.uid() AND role = 'owner'
  )
);

-- ============================================
-- POLICIES: CAPITAL TRANSACTIONS (Hanya Owner)
-- ============================================
CREATE POLICY "Only owners can view capital transactions"
ON capital_transactions FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM users WHERE id = auth.uid() AND role = 'owner'
  )
);

CREATE POLICY "Only owners can manage capital transactions"
ON capital_transactions FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM users WHERE id = auth.uid() AND role = 'owner'
  )
);

-- ============================================
-- FUNCTIONS & TRIGGERS
-- ============================================

-- Auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_products_updated_at BEFORE UPDATE ON products
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_transactions_updated_at BEFORE UPDATE ON transactions
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- SAMPLE DATA (Optional - untuk testing)
-- ============================================

-- Insert sample payment methods
INSERT INTO payment_methods (name, type, admin_fee_percentage, admin_fee_fixed) VALUES
('Tunai', 'cash', 0, 0),
('Transfer Bank', 'bank_transfer', 0, 0),
('QRIS', 'qris', 0.70, 0),
('EDC Debit', 'credit_card', 0.50, 0),
('EDC Credit', 'credit_card', 1.50, 0),
('GoPay', 'ewallet', 1.00, 0),
('OVO', 'ewallet', 1.00, 0),
('Dana', 'ewallet', 1.00, 0);

-- Insert sample cost categories
INSERT INTO cost_categories (name, description) VALUES
('Sewa Tempat', 'Biaya sewa toko per bulan'),
('Listrik', 'Biaya listrik bulanan'),
('Internet', 'Biaya internet & WiFi'),
('Gaji Karyawan', 'Gaji kasir & gudang'),
('Transportasi', 'Biaya transportasi operasional'),
('Marketing', 'Biaya promosi & iklan'),
('Lain-lain', 'Biaya operasional lainnya');

-- ============================================
-- END OF MIGRATION
-- ============================================
