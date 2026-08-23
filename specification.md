# WarisTech: Master Project Specification & Technical Blueprint

## 1. Executive Summary & Vision

Di era digital saat ini, transisi kekayaan tidak lagi sebatas aset fisik seperti tanah atau emas, melainkan telah bergeser ke aset digital tak berwujud seperti dompet kripto, rekening digital, reksa dana *online*, hingga portofolio saham tanpa warkat. Fenomena *digital afterlife* memunculkan satu masalah kritikal: ketika seseorang meninggal dunia, jutaan aset digital sering kali terkunci selamanya karena keluarga tidak memiliki akses atau bahkan tidak menyadari keberadaan aset tersebut. Di sisi lain, pembagian harta warisan secara tradisional kerap kali berujung pada sengketa internal keluarga yang berkepanjangan akibat kurangnya transparansi dan kepastian.

**WarisTech** hadir sebagai solusi visioner berbentuk "Brankas Transisi Aset Digital" (Digital Asset Transition Vault). Dengan memadukan kepastian hukum perdata dan inovasi teknologi modern, WarisTech bertindak sebagai platform amanah yang menjamin transisi kekayaan lintas generasi berjalan secara adil, transparan, dan sah di mata hukum. Visi utama platform ini adalah menghapus bayang-bayang sengketa keluarga dengan menyediakan ekosistem terpadu yang memverifikasi identitas, mengenkripsi rahasia digital, mengotomatisasi perhitungan pembagian, dan memfasilitasi rekonsiliasi persetujuan (melalui sistem mediasi *smart-state*) sebelum aset berpindah tangan.

---

## 2. Business Value & Monetization

WarisTech menawarkan proposisi nilai (Value Proposition) yang sangat unik di lanskap LegalTech dan FinTech. Keunggulan kompetitif utamanya terletak pada mitigasi risiko kehilangan aset digital tanpa mengambil alih kepemilikan dana (*non-custodial approach*).

Potensi monetisasi strategis WarisTech mencakup:
1.  **B2B2C Partnerships dengan Notaris & Firma Hukum:** WarisTech tidak menggantikan peran notaris, melainkan mengelevasi mereka. Notaris bertindak sebagai *gatekeeper* untuk memvalidasi dokumen legal (seperti Surat Kematian atau SKW) dan memverifikasi relasi Non-Nasab. Sistem ini dapat dimonetisasi melalui skema *Subscription* atau *Pay-per-Verification* bagi mitra Notaris yang ingin menggunakan platform ini untuk melayani klien mereka dengan manajemen warisan digital.
2.  **Freemium Model untuk Pengguna Akhir:** 
    *   **Basic Tier (Gratis):** Pengguna dapat menggunakan kalkulator warisan (Faraidh/Civil/Customary) dan mendaftarkan hierarki keluarga dasar tanpa penyimpanan aset digital.
    *   **Premium Vault (Berbayar):** Akses penuh ke brankas terenkripsi, penyimpanan jumlah aset tak terbatas, integrasi *Magic Link* untuk saksi, dan jaminan pengeksekusian wasiat digital saat terjadi peristiwa kematian (Trigger of Death).

---

## 3. Arsitektur Teknis & Rincian Modul

WarisTech diarsiteki dengan filosofi *Security-First* dan skalabilitas tinggi. Platform ini dibangun menggunakan framework **NestJS (Node.js)** dengan penerapan **Clean Architecture** murni. Sistem mengisolasi logika bisnis dari detail infrastruktur, memastikan keterpisahan yang tegas antara lapisan Domain, Application (Use Case), Interface (Controller), dan Infrastructure. Pendekatan Monolitik Terpusat (*Centralized Monolith*) dipilih pada tahap awal demi kemudahan pemeliharaan dan auditabilitas sistem sebelum dipersiapkan menuju *Microservices*.

Pilar teknologi yang menopang arsitektur ini meliputi:
*   **Keamanan Kriptografis:** Semua *secret* (seperti *password*, PIN, atau *seed phrase* aset digital) tidak pernah disimpan dalam format teks terang (*plaintext*). Sistem menggunakan enkripsi **AES-256-CTR** di level infrastruktur.
*   **Dual-Database Strategy:** MySQL (TypeORM) menangani relasi transaksional yang ketat dan ACID-compliant (Pengguna, Aset, Keluarga). Sementara itu, MongoDB (Mongoose) secara eksklusif dikhususkan untuk mencatat *Audit Trail* yang tidak dapat dimutasi (*immutable*).

### Rincian Modul Utama
1.  **Identity Module (`src/module/identity`):** Pusat manajemen entitas. Mengatur otentikasi JWT, proteksi CSRF (*Double Submit Cookie*), hingga verifikasi identitas pihak ketiga (e-KYC terhubung Dukcapil). Modul ini juga memfasilitasi *Onboarding* Pewaris dan Ahli Waris.
2.  **Assets Module (`src/module/assets`):** Berfungsi sebagai "Brankas". Mendaftarkan entitas aset (`CRYPTO`, `SAHAM`, `BANK`) dan mengelola persentase alokasi untuk tiap Ahli Waris. Aset hanya dapat dikunci (*verified*) oleh Notaris.
3.  **Inheritance Module (`src/module/inheritance`):** Mengelola pohon kekerabatan keluarga. Memisahkan logika antara relasi *NASAB* (darah) dan *NON_NASAB* (adopsi/pihak ketiga). Di sinilah tata kelola mitigasi sengketa dan mekanisme validasi hukum beroperasi.
4.  **Calculation Module (`src/module/calculation`):** Mesin simulasi tanpa status (*stateless*) yang menerapkan *Strategy Pattern*. Modul ini sanggup secara dinamis menghitung distribusi berdasarkan Faraidh (Hukum Islam), Civil (KUHPerdata), maupun Customary (Musyawarah Adat).
5.  **Shared Module (`src/module/shared`):** Menyediakan utilitas *cross-cutting concerns* seperti sistem *Event-Driven Audit Logging*, penanganan notifikasi/email transaksional, dan manajemen penyimpanan berkas awan.

---

## 4. Kebijakan No-Nominal (The No-Nominal Policy)

Salah satu keputusan arsitektural yang paling revolusioner di WarisTech adalah **Kebijakan No-Nominal**. Sistem ini secara fundamental *tidak dirancang* untuk menyimpan, meminta, atau melacak saldo aktual (dalam mata uang Rupiah/Fiat/Kripto) dari aset pengguna.

**Alasan Strategis & Keamanan:**
1.  **Kepatuhan Regulasi (Regulatory Compliance):** Dengan tidak memegang atau mencatat nilai finansial secara absolut, WarisTech menghindari klasifikasi sebagai lembaga penyimpanan finansial atau manajer investasi yang membutuhkan lisensi berat dari institusi seperti Otoritas Jasa Keuangan (OJK).
2.  **Reduksi Vektor Serangan (Attack Surface Reduction):** Kegagalan atau pembobolan data tidak akan mengungkap kekayaan absolut (*net worth*) pengguna, menjadikannya target yang kurang bernilai secara ekonomi bagi peretas konvensional.
3.  **Integritas Pembagian:** Semua alokasi dihitung secara pro-rata menggunakan persentase (unit 1-100%). Pewaris hanya perlu menginstruksikan, misalnya: "Aset Kripto X dibagikan 40% ke Anak A, dan 60% ke Istri B". Saat terjadi pencairan, Ahli Waris akan menggunakan persentase hukum tersebut terhadap saldo aktual *real-time* yang ada di platform aset tersebut.

---

## 5. Ekosistem Aktor & Mitigasi Sengketa (Dispute Resolution)

WarisTech menyadari bahwa konflik terbesar dalam warisan terjadi sesaat setelah kematian. Oleh karena itu, sistem mengorkestrasi 5 peran fungsional yang berbeda dengan batasan otorisasi yang sangat ketat:

### Ekosistem Pengguna Terdaftar (Registered Actors)
1.  **ADMIN:** Pengelola super dari sisi internal perusahaan.
2.  **PEWARIS (The Testator):** Pemilik aset yang mendaftarkan brankas, mendefinisikan pohon keluarga, dan membuat alokasi.
3.  **AHLI WARIS (The Beneficiary):** Anggota keluarga yang berhak menerima bagian, diundang ke dalam sistem melalui mekanisme kode undangan berbatas waktu.
4.  **NOTARIS (The Legal Validator):** Pihak independen berlisensi yang bertugas memverifikasi sertifikat kematian, menyetujui aset, dan memvalidasi relasi *Non-Nasab*.

### Aktor Tanpa Akun (The Guest Actors)
5.  **SAKSI / KONTAK DARURAT (The Witnesses):** Entitas eksternal yang dipercaya oleh Pewaris. Untuk menjaga *database* tetap ramping (mencegah *bloating* tabel `users`), Saksi tidak memiliki akun permanen. Mereka diotentikasi melalui alur **Magic Link**.

### Mekanisme State Machine & Jeda Penyesuaian (Cooling-Off Period)
Untuk mencegah pembagian yang terburu-buru dan sepihak, WarisTech mengimplementasikan mekanisme resolusi sengketa berbasis *State Machine*:
*   **Triggers of Death:** Saat Pewaris dilaporkan wafat dan Notaris memverifikasinya, sistem tidak langsung mencairkan akses rahasia aset. Aplikasi akan memasuki masa **Cooling-Off Period** (Masa Jeda).
*   **Validasi Magic Link:** Dalam masa jeda ini, *backend* akan secara asinkron mengirimkan *Magic Link* sekali pakai (dengan OTP tersandi) ke email atau WhatsApp para Saksi yang telah ditunjuk.
*   **Transisi Keputusan (APPROVE vs DISPUTE):** 
    Saksi masuk sebagai *Guest* berotorisasi rendah. Mereka diberi kesempatan meninjau transparansi wasiat.
    *   Jika seluruh Saksi menekan **`APPROVE`**, sistem melepas masa jeda dan Ahli Waris dapat membuka kunci aset (*Unlock Vault*).
    *   Namun, jika minimal satu Saksi menekan **`DISPUTE`** (Sanggah/Gugat), sebuah *Domain Event* asinkron (`inheritance.disputed`) akan memicu sistem untuk mengubah seluruh status aset Pewaris menjadi **`FROZEN`** (Dibekukan).
*   **Intervensi Manual:** Saat aset berada dalam status `FROZEN`, sistem membeku sepenuhnya. Kunci rahasia tidak bisa diakses siapapun hingga Notaris turun tangan melakukan mediasi manual di dunia nyata. Setelah konsensus tercapai dan dokumen arbitrase diunggah, barulah Notaris berwenang melakukan *override* untuk mereset status aset.

---

## 6. Standar Kepatuhan Operasional
1.  **Rate Limit Defense:** Lapisan perlindungan DDoS dan *Brute Force* dengan *throttler* spesifik untuk masing-masing *endpoint* (Strict untuk Auth, Default untuk operasional).
2.  **Audit Trail Wajib:** Segala jenis mutasi (CRUD Aset, Keputusan Saksi, Konfirmasi Notaris) secara atomik direkam dalam pangkalan data MongoDB yang independen.
3.  **Strict Typing & No-Any Policy:** Basis kode TypeScript diberlakukan larangan keras terhadap penggunaan tipe `any`, meminimalisir kesalahan *runtime*. Seluruh entitas dan DTO dijaga oleh kelas validator.
