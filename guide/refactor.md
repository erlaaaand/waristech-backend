# 🛠️ Code Refactoring & Remediation Guide
**Reference:** `rules.md`, `auditor.md`
**Purpose:** Panduan instruksional bagi AI Agent untuk menganalisis kode *legacy* (lama) atau kode yang buruk, merancang strategi perbaikan, dan melakukan penulisan ulang (*refactor*) agar 100% patuh pada standar arsitektur proyek.

> **AGENT DIRECTIVE:**
> Saat Anda diminta untuk me-*refactor* atau memperbaiki kode, Anda **TIDAK BOLEH** hanya menambal (*patch*) baris per baris. Anda wajib membaca kode secara holistik, mengekstraksi logika bisnis, dan mendistribusikannya ke *layer* yang tepat sesuai prinsip *Clean Architecture* dan *Strict OOP*.

---

## 🔬 Fase 1: Analisis Mendalam (Deep Analysis)
Sebelum menulis satu baris kode pun, lakukan pembedahan terhadap kode yang diberikan pengguna. Identifikasi 4 "Penyakit Utama":
1.  **Fat Controller / Fat Service:** Apakah *Controller* memuat logika bisnis? Apakah satu *Service* memuat terlalu banyak aksi (melanggar SRP)?
2.  **Coupling (Keterikatan Kuat):** Apakah komponen bergantung pada implementasi teknis (seperti TypeORM) alih-alih abstraksi (*Interface/Abstract Class*)?
3.  **Anemic Domain:** Apakah entitas hanya berupa struktur data bodoh tanpa *method* bisnis?
4.  **Boilerplate & Anti-Patterns:** Apakah ada `try-catch` berulang, validasi manual tanpa DTO, atau penggunaan tipe data `any`?

## 🗺️ Fase 2: Strategi Pemecahan (Deconstruction Strategy)
Buat rencana bagaimana kode raksasa tersebut akan dipecah. Ikuti hierarki ini:
1.  **Ekstrak Kontrak:** Pisahkan interaksi database menjadi `Abstract Class` di layer `domains/repositories`.
2.  **Ekstrak Logika Bisnis (Use Cases):** Buat kelas `UseCase` mandiri di layer `applications/use-cases` untuk setiap *endpoint* atau fitur fungsional.
3.  **Ekstrak DTO & Validasi:** Pindahkan semua *if-else* pengecekan *body request* ke kelas DTO menggunakan `class-validator`.
4.  **Penyusutan Controller:** Ubah *Controller* menjadi *Thin Controller* yang hanya menerima DTO dan memanggil *Use Case*.

---

## ⚙️ Fase 3: Prosedur Eksekusi Refactoring (The Fix)
Terapkan pedoman penulisan ulang (*rewriting*) berikut secara absolut:

*   **Aturan 1: Pembasmian Try-Catch Lokal**
    Hapus semua `try-catch` di *Controller*. Hapus semua `try-catch` redundan di *Use Case* jika proyek sudah menggunakan `BaseUseCase` (Template Method) atau `GlobalExceptionFilter`. Lempar error secara eksplisit (contoh: `throw new DataNotFoundException()`).
*   **Aturan 2: Injeksi Dependensi Berbasis Kontrak (DIP)**
    Saat memindahkan logika ke *Use Case*, ubah injeksi repositori dari kelas konkret ke kelas abstrak.
    *   ❌ *Sebelum:* `constructor(private readonly userRepo: UserTypeOrmRepository) {}`
    *   ✅ *Sesudah:* `constructor(private readonly userRepository: IUserRepository) {}`
*   **Aturan 3: Terapkan Enkapsulasi & Strict Types**
    Ubah properti yang diekspos sembarangan menjadi `private` atau `readonly`. Hapus semua kata kunci `any` dan ubah menjadi `unknown` atau buatkan tipe datanya (*Interface/Type*).
*   **Aturan 4: Terapkan DRY (Don't Repeat Yourself)**
    Jika ada manipulasi data yang berulang, buat utilitas di folder `shared/`. Gunakan `PartialType` jika *Update DTO* memiliki kemiripan dengan *Create DTO*.

---

## 📢 Format Output Refactoring (Untuk AI Agent)
Saat merespons permintaan refactoring dari pengguna, Anda **WAJIB** menyajikan jawaban dengan format berikut:

### 🛠️ Hasil Analisis & Rencana Refactor
**1. Identifikasi Masalah Utama:**
[Sebutkan pelanggaran arsitektur, OOP, atau TypeScript dari kode lama]

**2. Strategi Pemecahan (Action Plan):**
*   [Contoh: Memecah `UserService` menjadi `CreateUserUseCase` dan `UpdateUserUseCase`]
*   [Contoh: Menghapus validasi manual di Controller dan memindahkannya ke DTO]
*   [Contoh: Mengganti dependensi TypeORM langsung dengan `IUserRepository`]

### 💻 Kode yang Telah Di-Refactor
Berikan kode yang sudah diperbaiki, dipisahkan berdasarkan *file* dan *layer* yang benar. Pastikan menyertakan path folder (contoh: `// src/module/users/applications/use-cases/create-user.use-case.ts`).

[BLOK KODE 1: Layer Domain (Interface/Entities)]
[BLOK KODE 2: Layer Application (Use Cases/DTOs)]
[BLOK KODE 3: Layer Interface (Thin Controller)]

**Catatan Integrasi:**
[Berikan instruksi singkat jika ada *module provider* atau *dependency injection* token yang harus didaftarkan di `app.module.ts`]