import { Pool } from "@neondatabase/serverless";
import * as dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function seed() {
  console.log("Seeding database...");
  try {
    await pool.query(`
      -- Seed Admin
      INSERT INTO admins (name, email, password_hash, role) VALUES 
      ('Admin Pusat', 'admin@bookinglapang.com', 'hashed_pwd_123', 'SUPERADMIN') ON CONFLICT DO NOTHING;

      -- Seed Customers
      INSERT INTO customers (name, email, phone, password_hash, loyalty_points, tier) VALUES 
      ('Budi Santoso', 'budi@example.com', '081234567890', 'hashed_pwd_123', 150, 'SILVER'),
      ('Andi Pratama', 'andi@example.com', '085612349999', 'hashed_pwd_123', 50, 'BRONZE'),
      ('Citra Kirana', 'citra@example.com', '089987654321', 'hashed_pwd_123', 500, 'GOLD') ON CONFLICT DO NOTHING;

      -- Seed Payment Methods
      INSERT INTO payment_methods (code, name, type) VALUES 
      ('BCA_TF', 'Bank BCA', 'BANK_TRANSFER'),
      ('DANA', 'DANA E-Wallet', 'E_WALLET'),
      ('GOPAY', 'GoPay', 'E_WALLET'),
      ('OVO', 'OVO', 'E_WALLET') ON CONFLICT DO NOTHING;

      -- Seed Fields
      INSERT INTO fields (name, type, material, location, price_per_hour, status, images) VALUES 
      (
          'Champion Futsal Arena - Lapangan A', 'Futsal', 'Karpet Sintetis', 'Jl. Merdeka No. 45, Bandung', 120000, 'AKTIF', 
          ARRAY['https://images.unsplash.com/photo-1534158914592-062992fbe900', 'https://images.unsplash.com/photo-1526232761682']
      ),
      (
          'Garuda Mini Soccer Prime', 'Mini Soccer', 'Rumput Sintetis', 'Jl. Sudirman Komplek Olahraga, Jakarta', 250000, 'AKTIF',
          ARRAY['https://images.unsplash.com/photo-1518605368461', 'https://images.unsplash.com/photo-1575361204481']
      ) ON CONFLICT DO NOTHING;

      -- Seed Notification Templates
      INSERT INTO notif_templates (name, type, trigger_event, subject, content) VALUES 
      ('Notifikasi Menunggu Pembayaran', 'WHATSAPP', 'BOOKING_CREATED', NULL, 'Halo {{name}}, pesanan lapangan Anda ({{booking_code}}) berhasil dibuat. Silakan lakukan pembayaran sebesar Rp {{total_price}}.'),
      ('Notifikasi Pembayaran Sukses', 'WHATSAPP', 'PAYMENT_SUCCESS', NULL, 'Terima kasih pembayaran Anda berhasil. ID: {{booking_code}}') ON CONFLICT DO NOTHING;

      -- Seed dummy payment methods to satisfy foreign key for IDs 1-19
      INSERT INTO payment_methods (id, code, name, type)
      SELECT i, 'CODE_' || i, 'Method ' || i, 'OTHER'
      FROM generate_series(1, 19) i
      ON CONFLICT (id) DO NOTHING;

      -- Seed Payment Instructions
      INSERT INTO "public"."payment_instructions" ("id", "payment_method_id", "title", "content", "sort_order", "created_at", "step_number", "instruction_text") VALUES
      (1, 2, 'Pembayaran via Mbanking', '<ol><li>Buka aplikasi BCA Mobile</li><li>Pilih m-BCA, lalu pilih m-Transfer</li><li>Masukkan nomor Virtual Account Anda, contoh: 3816523906568, lalu tekan OK</li><li>Klik tombol Kirim di pojok kanan atas untuk melanjutkan</li><li>Klik OK untuk melanjutkan</li><li>Masukkan PIN m-BCA Anda untuk otorisasi transaksi</li></ol>', 1, '2026-05-01 03:32:23.084429+00', NULL, NULL),
      (2, 2, 'Pembayaran via Ibanking', '<ol><li>Login ke KlikBCA Individual (https://ibank.klikbca.com)</li><li>Pilih menu Transfer, lalu pilih Transfer ke BCA Virtual Account</li><li>Masukkan nomor Virtual Account, contoh: 3816523906568</li><li>Pilih Lanjutkan untuk memproses pembayaran</li><li>Masukkan respon KEYBCA APPLI 1 yang muncul di Token BCA Anda, lalu klik tombol Kirim</li><li>Masukkan kode token autentikasi</li></ol>', 2, '2026-05-01 03:32:23.084429+00', NULL, NULL),
      (3, 2, 'Pembayaran via Atm', '<ol><li>Masukkan kartu ATM BCA dan PIN Anda</li><li>Pilih menu Transaksi Lainnya</li><li>Pilih Transfer</li><li>Pilih Ke Rekening BCA Virtual Account</li><li>Masukkan nomor Virtual Account, contoh: 3816523906568. Tekan Benar untuk melanjutkan</li><li>Verifikasi detail Virtual Account lalu masukkan nominal yang akan ditransfer dan pilih Benar untuk konfirmasi</li><li>Konfirmasi detail transaksi Anda yang muncul di layar</li><li>Pilih Ya jika detail sudah benar atau Tidak jika detail belum benar</li></ol>', 3, '2026-05-01 03:32:23.084429+00', NULL, NULL),
      (4, 3, 'Pembayaran via Livin', '<ol><li>Login ke aplikasi Livin’ by Mandiri</li><li>Pilih Transfer IDR > Transfer ke penerima baru</li><li>Masukkan nomor virtual account (contoh: 8860863623046)</li><li>Masukkan atau konfirmasi jumlah pembayaran</li><li>Klik Lanjutkan</li><li>Masukkan PIN MPIN Anda</li></ol>', 4, '2026-05-01 03:32:23.084429+00', NULL, NULL),
      (5, 3, 'Pembayaran via Atm', '<ol><li>Masukkan kartu ATM</li><li>Pilih bahasa yang diinginkan</li><li>Masukkan PIN ATM</li><li>Pilih menu BAYAR > MULTI PAYMENT</li><li>Masukkan kode perusahaan 88608 (XENDIT), lalu tekan BENAR</li><li>Masukkan nomor virtual account (contoh: 8860863623046), lalu tekan BENAR</li><li>Masukkan jumlah pembayaran, lalu tekan BENAR</li><li>Konfirmasi detail pembayaran</li></ol>', 5, '2026-05-01 03:32:23.084429+00', NULL, NULL),
      (6, 9, 'Pembayaran via Brimo', '<ol><li>Login ke aplikasi BRI Mobile Banking</li><li>Pilih menu Pembayaran > Briva</li><li>Masukkan nomor virtual account (contoh: 1328216932121)</li><li>Masukkan jumlah pembayaran</li><li>Masukkan PIN</li><li>Klik Kirim</li></ol>', 6, '2026-05-01 03:32:23.084429+00', NULL, NULL),
      (7, 9, 'Pembayaran via Atm', '<ol><li>Masukkan kartu ATM</li><li>Pilih bahasa</li><li>Masukkan PIN ATM</li><li>Pilih menu Lainnya > Pembayaran > Pembayaran Lainnya > BRIVA</li><li>Masukkan nomor virtual account (contoh: 1328216932121)</li><li>Masukkan jumlah pembayaran</li><li>Konfirmasi detail pembayaran dan tekan YA</li></ol>', 7, '2026-05-01 03:32:23.084429+00', NULL, NULL),
      (8, 10, 'Pembayaran via Mobile', '<ol><li>Login ke aplikasi BNI Mobile Banking</li><li>Klik Transfer > Virtual Account Billing, lalu pilih rekening debet</li><li>Masukkan nomor virtual account (contoh: 880849021633)</li><li>Jumlah pembayaran akan muncul di layar</li><li>Konfirmasi informasi pembayaran</li><li>Masukkan password transaksi</li></ol>', 8, '2026-05-01 03:32:23.084429+00', NULL, NULL),
      (9, 10, 'Pembayaran via Ibanking', '<ol><li>Login ke https://ibank.bni.co.id</li><li>Klik Transfer > Virtual Account Billing</li><li>Masukkan nomor virtual account (contoh: 880849021633)</li><li>Pilih rekening bank</li><li>Jumlah pembayaran akan muncul di layar</li><li>Masukkan kode token autentikasi</li></ol>', 9, '2026-05-01 03:32:23.084429+00', NULL, NULL),
      (10, 10, 'Pembayaran via Atm', '<ol><li>Masukkan kartu ATM</li><li>Pilih bahasa</li><li>Masukkan PIN ATM</li><li>Pilih menu Transaksi Lainnya > Transfer</li><li>Pilih tipe rekening</li><li>Masukkan nomor virtual account (contoh: 880849021633)</li><li>Jumlah pembayaran akan muncul di layar</li><li>Konfirmasi informasi pembayaran</li></ol>', 10, '2026-05-01 03:32:23.084429+00', NULL, NULL),
      (11, 11, 'Pembayaran via Mobile', '<ol><li>Buka aplikasi BJB Mobile</li><li>Masukkan User ID dan Password</li><li>Pilih Virtual Account</li><li>Pilih tipe rekening yang Anda gunakan untuk transfer (misal: Rekening Tabungan)</li><li>Masukkan Nomor Virtual Account, contoh: 1234999968795947</li><li>Konfirmasi detail transaksi Anda yang muncul di layar</li></ol>', 11, '2026-05-01 03:32:23.084429+00', NULL, NULL),
      (12, 11, 'Pembayaran via Ibanking', '<ol><li>Buka https://ib.bankbjb.co.id/bjb.net</li><li>Masukkan User ID dan Password</li><li>Pilih Virtual Account</li><li>Pilih tipe rekening yang Anda gunakan untuk transfer (misal: Rekening Tabungan)</li><li>Masukkan Nomor Virtual Account, contoh: 1234999968795947</li><li>Konfirmasi detail transaksi Anda yang muncul di layar</li></ol>', 12, '2026-05-01 03:32:23.084429+00', NULL, NULL),
      (13, 11, 'Pembayaran via Atm', '<ol><li>Masukkan kartu ATM BJB dan PIN Anda</li><li>Pilih menu Transaksi Lainnya</li><li>Pilih Virtual Account</li><li>Pilih tipe rekening yang Anda gunakan untuk transfer (misal: Rekening Tabungan)</li></ol>', 13, '2026-05-01 03:32:23.084429+00', NULL, NULL),
      (14, 12, 'Pembayaran via Mobile', '<ol><li>Login ke aplikasi BNC mobile banking atau Neobank</li><li>Klik Hematpay VA & QRIS</li><li>Masukkan nomor virtual account (contoh: 9010001050411994)</li><li>Masukkan jumlah pembayaran</li><li>Konfirmasi informasi pembayaran</li><li>Masukkan PIN</li></ol>', 14, '2026-05-01 03:32:23.084429+00', NULL, NULL),
      (15, 12, 'Pembayaran via Atm', '<ol><li>Masukkan kartu ATM</li><li>Pilih bahasa</li><li>Masukkan PIN ATM</li><li>Pilih menu Pembayaran VA</li><li>Masukkan nomor virtual account (contoh: 9010001050411994)</li><li>Masukkan jumlah pembayaran</li><li>Konfirmasi informasi pembayaran</li><li>Masukkan PIN</li></ol>', 15, '2026-05-01 03:32:23.084429+00', NULL, NULL),
      (16, 4, 'Pembayaran via Byond', '<ol><li>Login ke BYOND BSI</li><li>Pilih menu Bayar & Beli</li><li>Cari Xendit, Pilih Prefix VA: 9347 atau 9655</li><li>Masukkan kode (tanpa prefix) (contoh: 33371937)</li><li>Masukkan PIN</li><li>Konfirmasi detail pembayaran</li></ol>', 16, '2026-05-01 03:32:23.084429+00', NULL, NULL),
      (17, 4, 'Pembayaran via Ibanking', '<ol><li>Login ke https://bsinet.bankbsi.co.id</li><li>Klik Pembayaran</li><li>Pilih sumber pembayaran</li><li>Klik Institusi</li><li>Masukkan Xendit sebagai nama institusi (kode 9347)</li><li>Masukkan nomor virtual account (contoh: 33371937)</li><li>Konfirmasi detail pembayaran</li><li>Masukkan kode token autentikasi</li></ol>', 17, '2026-05-01 03:32:23.084429+00', NULL, NULL),
      (18, 4, 'Pembayaran via Atm', '<ol><li>Masukkan kartu ATM</li><li>Pilih bahasa</li><li>Masukkan PIN ATM</li><li>Pilih menu Pembayaran/Pembelian > Institusi</li><li>Masukkan nomor virtual account (contoh: 934733371937)</li><li>Konfirmasi detail pembayaran</li></ol>', 18, '2026-05-01 03:32:23.084429+00', NULL, NULL),
      (19, 4, 'Pembayaran via Antarbank', '<ol><li>Login ke rekening bank Anda</li><li>Klik Transfer > Pilih BSI</li><li>Masukkan 009 + kode BSI Virtual Account 9347 + nomor virtual account, (contoh: 934733371937)</li><li>Masukkan jumlah pembayaran</li><li>Pilih sumber pembayaran</li><li>Pilih Transfer Online</li><li>Konfirmasi detail pembayaran</li></ol>', 19, '2026-05-01 03:32:23.084429+00', NULL, NULL),
      (20, 13, 'Pembayaran via Octo', '<ol><li>Buka aplikasi Octo Mobile dan masukkan User ID dan Password Anda</li><li>Pilih menu Transfer lalu pilih CIMB Niaga Lainnya</li><li>Masukkan Nomor Virtual Account Anda pada menu Input Baru</li><li>Masukkan jumlah pembayaran yang sesuai</li><li>Konfirmasi transaksi dan masukkan password Anda</li><li>Transaksi Anda selesai</li></ol>', 20, '2026-05-01 03:32:23.084429+00', NULL, NULL),
      (21, 13, 'Pembayaran via Atm', '<ol><li>Masukkan kartu ATM Anda</li><li>Pilih bahasa</li><li>Masukkan PIN ATM Anda</li><li>Pilih menu Transfer lalu pilih CIMB Niaga Lainnya</li><li>Masukkan Nomor Virtual Account Anda pada menu Input Baru</li><li>Masukkan jumlah pembayaran yang sesuai</li><li>Konfirmasi transaksi dan masukkan password Anda</li><li>Transaksi Anda selesai</li></ol>', 21, '2026-05-01 03:32:23.084429+00', NULL, NULL),
      (22, 13, 'Pembayaran via Ibanking', '<ol><li>Buka alamat https://www.octoclicks.co.id/login dan tekan Enter</li><li>Masukkan User ID dan Password</li><li>Pilih menu Transfer lalu pilih CIMB Niaga Lainnya</li><li>Masukkan Nomor Virtual Account Anda pada menu Input Baru</li><li>Masukkan jumlah pembayaran yang sesuai</li><li>Konfirmasi transaksi dan masukkan password Anda</li><li>Transaksi Anda selesai</li></ol>', 22, '2026-05-01 03:32:23.084429+00', NULL, NULL),
      (23, 14, 'Pembayaran via Mdin', '<ol><li>Login ke aplikasi MDIN mobile banking</li><li>Pilih menu Beli/Bayar > Beli/Bayar Tagihan > Virtual Account</li><li>Masukkan nomor virtual account (contoh: 9010001112341234234)</li><li>Masukkan jumlah pembayaran</li><li>Konfirmasi detail pembayaran</li><li>Masukkan PIN</li></ol>', 23, '2026-05-01 03:32:23.084429+00', NULL, NULL),
      (24, 14, 'Pembayaran via Ibanking', '<ol><li>Login ke Muamalat Internet Banking</li><li>Klik menu Pembayaran > Virtual Account</li><li>Masukkan nomor virtual account (contoh: 9010001112341234234)</li><li>Masukkan jumlah pembayaran</li><li>Konfirmasi detail pembayaran</li><li>Masukkan PIN</li></ol>', 24, '2026-05-01 03:32:23.084429+00', NULL, NULL),
      (25, 14, 'Pembayaran via Atm', '<ol><li>Masukkan kartu ATM</li><li>Pilih bahasa</li><li>Masukkan PIN ATM</li><li>Pilih menu Pembayaran > Virtual Account</li><li>Masukkan nomor virtual account (contoh: 9010001112341234234)</li><li>Masukkan jumlah pembayaran</li><li>Konfirmasi detail pembayaran</li><li>Masukkan PIN</li></ol>', 25, '2026-05-01 03:32:23.084429+00', NULL, NULL),
      (26, 15, 'Pembayaran via Mobile', '<ol><li>Login ke aplikasi Permata mobile</li><li>Pilih menu Pembayaran Tagihan > Virtual Account</li><li>Masukkan nomor virtual account (contoh: 729361827494)</li><li>Masukkan token autentikasi</li></ol>', 26, '2026-05-01 03:32:23.084429+00', NULL, NULL),
      (27, 15, 'Pembayaran via Ibanking', '<ol><li>Login ke https://www.permatanet.com</li><li>Pilih menu Pembayaran Tagihan > Virtual Account</li><li>Masukkan nomor virtual account (contoh: 729361827494)</li><li>Konfirmasi detail pembayaran</li><li>Masukkan kode respon token SMS</li></ol>', 27, '2026-05-01 03:32:23.084429+00', NULL, NULL),
      (28, 15, 'Pembayaran via Atm', '<ol><li>Masukkan kartu ATM</li><li>Pilih bahasa</li><li>Masukkan PIN ATM</li><li>Pilih menu Transaksi Lainnya > Pembayaran > Pembayaran Lainnya > Virtual Account</li><li>Masukkan nomor virtual account (contoh: 729361827494)</li><li>Konfirmasi detail pembayaran</li><li>Masukkan PIN</li></ol>', 28, '2026-05-01 03:32:23.084429+00', NULL, NULL),
      (29, 16, 'Pembayaran via Note', '<ol><li>Anda dapat melakukan pembayaran di Alfamart Group (Alfamart, Alfamidi, Dan+Dan, Lawson).</li><li>Pembayaran di bawah Rp 2,5 Juta tersedia di Alfamart, Alfamidi, Dan+Dan, Lawson.</li><li>Pembayaran di atas Rp 2,5 Juta tidak tersedia di Alfamidi.</li><li>Kunjungi gerai ALFAMART terdekat sebelum batas waktu kode pembayaran/barcode habis</li><li>Beri tahu kasir bahwa Anda ingin melakukan pembayaran ke "[Nama Merchant]" via Xendit atau biarkan mereka memindai barcode di atas</li><li>Tunjukkan kode pembayaran/barcode ke kasir dan konfirmasi bahwa jumlahnya sudah benar</li><li>Informasikan kepada kasir jika Anda ingin membayar menggunakan Tunai saja, atau kombinasi Tunai dan Kartu Debit/Prabayar atau E-wallet.</li><li>Jumlah maksimum yang diizinkan bayar dengan Tunai adalah Rp 2,5 Juta, sisanya harus dikombinasikan menggunakan Kartu Debit/Prabayar atau E-wallet.</li><li>Lanjutkan proses pembayaran dengan jumlah yang tertera pada kode pembayaran/barcode Anda</li></ol>', 29, '2026-05-01 03:32:23.084429+00', NULL, NULL),
      (30, 1, 'Pembayaran via Gojek / GoPay', '<ol><li>Buka aplikasi Gojek / GoPay Anda.</li><li>Pilih menu <strong>Bayar / Scan</strong>.</li><li>Scan QR Code yang tampil di layar atau upload dari galeri.</li></ol>', 30, '2026-05-01 03:32:23.084429+00', NULL, NULL),
      (31, 6, 'Pembayaran via Shopee', '<ol><li>Buka aplikasi Shopee Anda.</li><li>Pilih menu <strong>Bayar / Scan</strong>.</li><li>Scan QR Code yang tampil di layar atau upload dari galeri.</li></ol>', 31, '2026-05-01 03:32:23.084429+00', NULL, NULL),
      (32, 7, 'Pembayaran via DANA', '<ol><li>Buka aplikasi DANA Anda.</li><li>Pilih menu <strong>Bayar / Scan</strong>.</li><li>Scan QR Code yang tampil di layar atau upload dari galeri.</li></ol>', 32, '2026-05-01 03:32:23.084429+00', NULL, NULL),
      (33, 8, 'Pembayaran via LinkAja', '<ol><li>Buka aplikasi LinkAja Anda.</li><li>Pilih menu <strong>Bayar / Scan</strong>.</li><li>Scan QR Code yang tampil di layar atau upload dari galeri.</li></ol>', 33, '2026-05-01 03:32:23.084429+00', NULL, NULL),
      (34, 5, 'Pembayaran via QRIS', '<ol><li>Buka aplikasi pembayaran pilihan Anda (GoPay, OVO, DANA, LinkAja, BCA Mobile, dll).</li><li>Pilih menu <strong>Scan / Bayar</strong>.</li><li>Scan QR Code yang tampil di layar.</li><li>Konfirmasi pembayaran dan masukkan PIN Anda.</li></ol>', 34, '2026-05-01 03:32:23.084429+00', NULL, NULL),
      (35, 18, 'Instruksi Transfer Manual BCA', '<ol><li>Transfer sesuai nominal (hingga 3 digit terakhir) ke rekening berikut:</li><li><strong>Bank BCA: 1234567890</strong></li><li><strong>Atas Nama: Yayasan Peduli Sesama</strong></li><li>Simpan bukti transfer Anda.</li><li>Konfirmasi pembayaran melalui WhatsApp atau unggah bukti di halaman status.</li></ol>', 35, '2026-05-01 03:32:23.084429+00', NULL, NULL),
      (36, 19, 'Instruksi Transfer Manual Mandiri', '<ol><li>Transfer sesuai nominal (hingga 3 digit terakhir) ke rekening berikut:</li><li><strong>Bank Mandiri: 9876543210</strong></li><li><strong>Atas Nama: Yayasan Peduli Sesama</strong></li><li>Simpan bukti transfer Anda.</li><li>Konfirmasi pembayaran melalui WhatsApp atau unggah bukti di halaman status.</li></ol>', 36, '2026-05-01 03:32:23.084429+00', NULL, NULL)
      ON CONFLICT DO NOTHING;
    `);
    console.log("Seeding complete!");
  } catch (error) {
    console.error("Error seeding:", error);
  } finally {
    await pool.end();
  }
}

seed();
