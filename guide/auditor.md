# 🕵️‍♂️ Code Auditor Guidelines & Checklist
**Reference:** `rules.md`
**Purpose:** Panduan evaluasi ketat untuk memastikan seluruh kode menjunjung tinggi *Clean Architecture*, *Strict OOP*, *DRY*, dan *NestJS Best Practices*.

> **AUDITOR DIRECTIVE:**
> Sebagai AI Agent atau Code Reviewer, tugas Anda adalah mengevaluasi kode dengan standar tertinggi yang tidak kenal kompromi. Anda **TIDAK BOLEH** meloloskan *Pull Request* atau *Commit* jika ditemukan pelanggaran terhadap batas arsitektur atau prinsip OOP. Berikan *feedback* yang mengarah pada perbaikan struktur, bukan sekadar perbaikan sintaksis.

---

## 📋 Fase 1: Audit Batas Arsitektur (Clean Architecture)
Fokus utama fase ini adalah memeriksa *import* dan arah dependensi kode.

*   **[ ] Cek Layer Domain (`src/module/*/domains`):**
    *   Apakah ada *import* dari `@nestjs/common` (selain elemen utilitas/tipe dasar), `typeorm`, atau *library* infrastruktur lainnya? Jika **YA** ➔ ❌ **REJECT**. Layer domain harus murni TypeScript.
*   **[ ] Cek Layer Application (`src/module/*/applications`):**
    *   Apakah kelas *Use Case* hanya memiliki satu tanggung jawab utama (SRP)? Jika *Use Case* bernama `UserUseCase` dan berisi *create*, *update*, *delete* sekaligus ➔ ❌ **REJECT**. Wajib dipecah.
*   **[ ] Cek Ketergantungan Eksternal (Dependency Inversion):**
    *   Apakah *Use Case* memanggil kelas *Repository* TypeORM secara langsung (contoh: `constructor(private repo: UserTypeOrmRepository)`)? Jika **YA** ➔ ❌ **REJECT**. *Use Case* harus bergantung pada *Abstract Class / Interface* kontrak.

## 🧱 Fase 2: Audit Strict OOP & TypeScript
Fokus pada pembungkusan data dan keamanan tipe data.

*   **[ ] Evaluasi Encapsulation (Enkapsulasi):**
    *   Apakah ada properti kelas (terutama di *Entity*) yang diekspos sebagai `public` tanpa alasan kuat? Jika **YA** ➔ ❌ **REJECT**. Wajib gunakan `private` atau `readonly` dan sediakan metode khusus untuk memodifikasinya.
*   **[ ] Evaluasi Anemic Model:**
    *   Apakah entitas domain hanya berisi properti tanpa ada metode (logika bisnis)? Jika entitas hanya berfungsi sebagai penampung data (*data struct*) ➔ ⚠️ **WARNING / REFACTOR**. Dorong untuk menggunakan *Rich Domain Model*.
*   **[ ] Cek Penggunaan Tipe Data:**
    *   Apakah ditemukan kata kunci `any`? Jika **YA** ➔ ❌ **REJECT**. Wajib diubah menjadi tipe definitif atau `unknown`.
*   **[ ] Pengecekan Null/Undefined:**
    *   Apakah kode masih menggunakan validasi jadul seperti `if (user && user.profile)`? Jika **YA** ➔ ❌ **REJECT**. Wajib gunakan *Optional Chaining* (`user?.profile`).

## ✂️ Fase 3: Audit DRY & Efisiensi NestJS
Fokus pada penghapusan kode berulang dan implementasi *Best Practices*.

*   **[ ] Penanganan Exception (Sentralisasi Try-Catch):**
    *   Apakah ditemukan blok `try-catch` di dalam *Controller*? Jika **YA** ➔ ❌ **REJECT**.
    *   Apakah *Use Case* tidak mewarisi (*extends*) `BaseUseCase` yang sudah memiliki *Template Method* untuk *error handling*, atau sistem tidak menggunakan *Global Exception Filter*? Jika **YA** ➔ ❌ **REJECT**.
*   **[ ] Cek Controller (Thin Controller Rule):**
    *   Apakah *Controller* berisi logika bisnis, perbandingan nilai, atau validasi manual lebih dari 5 baris? Jika **YA** ➔ ❌ **REJECT**. *Controller* hanya bertugas mengarahkan *request* ke *Use Case*.
*   **[ ] Validasi Data (DTO):**
    *   Apakah DTO baru dibuat ulang dari nol padahal strukturnya mirip dengan DTO lain? Jika **YA** ➔ ❌ **REJECT**. Wajib gunakan `PartialType`, `PickType`, atau `OmitType`.
    *   Apakah DTO menggunakan *decorator* `@IsString()`, `@IsNotEmpty()` dari `class-validator`? Jika **TIDAK** ➔ ❌ **REJECT**.

## 📝 Fase 4: Audit Naming Convention
Memastikan standardisasi nama agar kode mudah dinavigasi oleh tim.

*   **[ ] Cek Nama File & Folder:**
    *   Apakah file menggunakan *kebab-case* (contoh: `create-user.use-case.ts`)? Jika **TIDAK** ➔ ❌ **REJECT**.
*   **[ ] Cek Nama Class & Suffix:**
    *   Apakah nama kelas menggunakan *PascalCase* dan diakhiri dengan tipe layernya (contoh: `UserMapper`, `AuthTypeOrmRepository`, `LoginUseCase`)? Jika **TIDAK** ➔ ❌ **REJECT**.
*   **[ ] Cek Nama Abstract Class/Kontrak:**
    *   Apakah kontrak antarmuka (*interface/abstract class*) diawali dengan huruf kapital `I` (contoh: `IUserRepository`)? Jika **TIDAK** ➔ ❌ **REJECT**.

---

## 📢 Format Pelaporan Hasil Audit (Untuk AI Agent)
Jika Anda meninjau kode, format balasan Anda **WAJIB** mengikuti struktur ini:

### 🔎 Hasil Audit Kode
**Status:** [✅ PASSED / ⚠️ NEEDS REVISION / ❌ REJECTED]

**1. Analisis Kepatuhan Arsitektur:**
[Jelaskan apakah ada pelanggaran Clean Architecture. Jika ada, tunjukkan baris kodenya.]

**2. Analisis OOP & Strict TypeScript:**
[Jelaskan evaluasi terhadap enkapsulasi dan penggunaan tipe data. Sorot jika ada properti publik yang tidak perlu atau penggunaan 'any'.]

**3. Tindakan Perbaikan (Actionable Items):**
*   **[CRITICAL]:** [Perbaikan yang wajib dilakukan agar kode tidak di-reject]
*   **[SUGGESTION]:** [Saran refactoring agar kode lebih DRY atau elegan]

**4. Kode Refactor (Hanya jika Status = REJECTED/NEEDS REVISION):**
[Sertakan perbaikan potongan kode yang telah disesuaikan secara penuh dengan `rules.md`]