# 🏗️ New Module Generator Blueprint
**Reference:** `rules.md`
**Purpose:** Panduan langkah demi langkah (SOP) bagi AI Agent untuk merancang, melakukan *scaffolding*, dan membangun modul fitur baru dari nol hingga siap digunakan, tanpa merusak arsitektur *Clean Architecture*.

> **AGENT DIRECTIVE:**
> Saat Anda diminta untuk membuat modul atau fitur baru, Anda **WAJIB** mengeksekusinya secara berurutan mulai dari Fase 1 hingga Fase 4 di bawah ini. JANGAN melompat langsung membuat *Controller* atau TypeORM *Entity*. Ingat bahwa sistem ini beroperasi sebagai *backend* yang berdiri sendiri (*standalone*), bukan arsitektur *microservices*, dan berfokus pada tema hukum dan keadilan.

---

## 🗺️ Fase 1: Domain Discovery & Schema Design
Sebelum menulis kode implementasi, rancang struktur domain bisnisnya.
1.  **Identifikasi Entitas Bisnis:** Tentukan *Domain Entity* utama untuk modul ini (hindari atribut yang murni untuk keperluan database seperti *foreign keys*).
2.  **Identifikasi Use Cases:** Daftarkan semua aksi (SRP) yang bisa dilakukan oleh pengguna atau sistem terhadap entitas ini.
3.  **Minta Persetujuan (Approval):** Tampilkan rancangan struktur folder dan nama file kepada *developer* untuk disetujui sebelum mulai mengoding.

## 🧱 Fase 2: Scaffolding (Pembuatan Kerangka)
Buat struktur folder baku di dalam `src/module/[kategori-modul]/[nama-modul]/` (misal: `src/module/identity/users/` atau `src/module/shared/audit/`). Wajib ikuti kerangka ini:
*   `/domains` (Sub-folder: `/entities`, `/mappers`, `/services`, `/validators`)
*   `/applications` (Sub-folder: `/dto`, `/use-cases`, `/orchestrator`)
*   `/infrastructures` (Sub-folder: `/repositories`, `/events`, `/listeners`, `/strategies`)
*   `/interface` (Sub-folder: `/http`, `/filters`, `/guards`, `/decorators`, `/interceptors`)
*   File `[nama-modul].module.ts` di-generate pada level root modul.

## ⚙️ Fase 3: Sequential Implementation (Aturan Eksekusi Lapis)
Tulis kode secara ketat dengan urutan dari dalam ke luar:

*   **Langkah 1 (Domain Layer):** Buat kelas `Entity` murni dan `Abstract Class` untuk repositori (contoh: `I[NamaModul]Repository`).
*   **Langkah 2 (Application Layer):** Buat DTO menggunakan `class-validator`. Buat kelas-kelas `UseCase` yang menginjeksi antarmuka repositori abstrak tadi. Terapkan `BaseUseCase` jika mewajibkan *error handling* standar.
*   **Langkah 3 (Infrastructure Layer):** Buat TypeORM *Entity*. Buat kelas implementasi repositori yang meng-*implements* abstrak repositori dari layer Domain. Buat *Mapper* untuk mengubah TypeORM *Entity* menjadi Domain *Entity*.
*   **Langkah 4 (Interface Layer):** Buat *Thin Controller*. Hanya boleh menerima injeksi dari kelas `UseCase`.

## 🔗 Fase 4: Registration & Dependency Wiring (Penyambungan)
Setelah semua file siap, buat file `[nama-modul].module.ts` di *root* folder modul tersebut.
1.  **Daftarkan Providers:** Daftarkan semua *Use Cases*.
2.  **Binding Interface ke Implementasi:** Gunakan *custom provider* NestJS untuk memetakan kelas abstrak ke kelas konkret TypeORM.
    *   *Contoh Syntax:* `{ provide: IUserRepository, useClass: UserTypeOrmRepository }`
3.  **Daftarkan Controllers:** Masukkan *Controller* ke array `controllers`.
4.  **Ekspor:** Ekspor *Use Cases* jika modul ini akan digunakan oleh modul lain secara monolitik.

---

## 📢 Format Output Generator (Untuk AI Agent)
Saat membuat modul baru, sajikan jawaban Anda dengan urutan ini:
1.  **Ringkasan Modul:** Penjelasan singkat fungsionalitas modul.
2.  **Struktur Folder & File:** *Tree view* dari file yang akan dibuat.
3.  **Blok Kode:** Kode lengkap yang dipisahkan berdasarkan langkah (Domain ➔ Application ➔ Infrastructure ➔ Interface).
4.  **Instruksi *Wiring*:** Kode untuk `[nama-modul].module.ts` dan instruksi pendaftarannya di `app.module.ts`.