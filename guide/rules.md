# 📜 NestJS Project Master Rules & Guidelines
**Version:** 1.0.0
**Architecture:** Domain-Driven Design (DDD) + Clean/Hexagonal Architecture
**Tech Stack:** NestJS, Strict TypeScript, TypeORM

> **AGENT DIRECTIVE:** 
> Sebagai AI Agent atau Developer, Anda **WAJIB** membaca, memahami, dan mematuhi seluruh aturan di bawah ini sebelum menulis, memodifikasi, atau memberikan saran kode. Pelanggaran terhadap *Dependency Rule* atau *Strict OOP* tidak dapat ditoleransi.

---

## 🏗️ 1. Batasan Arsitektur (Clean Architecture)
Setiap modul (misal: `identity/auth` atau `identity/users`) dibagi menjadi 4 *layer*. Arah dependensi **HANYA BOLEH KE DALAM**. Layer luar boleh memanggil layer dalam, namun layer dalam tidak boleh mengetahui keberadaan layer luar.

*   **Layer 1: `domains` (Jantung Aplikasi)**
    *   **Aturan:** Murni TypeScript. **TIDAK BOLEH** ada *import* dari `@nestjs/common`, TypeORM, atau *library* infrastruktur lainnya (kecuali utilitas dasar).
    *   **Isi:** *Domain Entities* (bukan *entity database*), *Value Objects*, *Domain Services*, *Custom Validators*, dan *Mappers*.
*   **Layer 2: `applications` (Orkestrator)**
    *   **Aturan:** Menampung *Use Cases* dan DTO. Hanya boleh bergantung pada layer `domains`.
    *   **Aturan *Use Case*:** Terapkan *Single Responsibility Principle* secara absolut. Satu kelas *Use Case* hanya untuk satu aksi (contoh: `CreateUserUseCase`, bukan `UserService` yang menampung semua CRUD).
*   **Layer 3: `interface` (Pintu Masuk)**
    *   **Aturan:** Menampung *Controllers* (HTTP/GraphQL), *Filters*, *Guards*, dan *Decorators*.
    *   **Thin Controller:** Controller **DILARANG** berisi logika bisnis atau validasi manual. Maksimal 3-5 baris per *route* (hanya menerima request, memanggil *Use Case*, dan mengembalikan *response*).
*   **Layer 4: `infrastructures` (Implementasi Teknis)**
    *   **Aturan:** Menampung TypeORM *Entities*, *Repositories*, implementasi AWS/Redis, dan *Event Listeners*. 
    *   Layer ini bertugas mengimplementasikan kontrak (Abstraksi/Interface) yang dibuat oleh layer `domains` atau `applications`.

---

## 🛡️ 2. Strict TypeScript Rules
Mode strict diaktifkan secara global di `tsconfig.json`.

*   **No `any` Policy:** Penggunaan tipe `any` dilarang keras. Gunakan `unknown` jika tipe tidak diketahui, dan lakukan *Type Narrowing* (pengecekan tipe).
*   **Strict Null Checks:** Wajib menggunakan *Optional Chaining* (`?.`) dan *Nullish Coalescing* (`??`). Dilarang menggunakan pengecekan kebenaran (*truthiness*) ganda seperti `if (data && data.user)`.
*   **Utility Types (DRY):** Dilarang membuat DTO atau Interface baru jika hanya merupakan modifikasi minor dari yang sudah ada. Gunakan `PartialType`, `OmitType`, `PickType`, `Partial<T>`, atau `Omit<T, K>`.

---

## 🧱 3. Strict Object-Oriented Programming (OOP)
*   **Encapsulation (Pembungkusan State):** 
    *   Semua properti dalam kelas (`Entity` atau `Service`) **WAJIB** `private`, `protected`, atau `readonly`.
    *   Hindari *Anemic Domain Model*. Properti internal hanya boleh diubah melalui *method* kelas yang memvalidasi logika bisnis, bukan diekspos melalui pengubah (*setter*) publik tanpa filter.
*   **Dependency Inversion Principle (DIP):**
    *   *Use Case* tidak boleh bergantung pada implementasi teknis (contoh: `UserTypeOrmRepository`).
    *   Gunakan **Abstract Class** sebagai kontrak (karena TypeScript *Interface* hilang saat di-kompilasi ke JS, membuat injeksi dependensi NestJS gagal).
    *   *Contoh:* `class CreateUserUseCase` bergantung pada `abstract class IUserRepository`. Layer `infrastructures` akan meng- *implements* `IUserRepository`.

---

## ✂️ 4. Aturan DRY & NestJS Best Practices
*   **Validasi Input:** Wajib menggunakan `class-validator` dan `class-transformer` di level DTO. Dilarang menempatkan validasi input (seperti cek format email) di dalam *Controller* atau *Use Case*.
*   **Penanganan Error (Error Handling):**
    *   **DILARANG** menggunakan blok `try/catch` di level *Controller*.
    *   Bila terjadi *error* pada *Use Case*, lempar *Custom Exception* (misal: `UserNotFoundException`).
    *   Gunakan **Global Exception Filter** (ditempatkan di folder `shared/common/filters`) untuk menangkap *exception* dan memformatnya menjadi respons HTTP standar.
*   **Gunakan Decorator Kustom:** Untuk data yang berulang diambil dari *Request* (seperti `req.user`), wajib menggunakan *Custom Decorator* (misal: `@CurrentUser()`) yang diletakkan di `shared/common/decorators`.
*   **Base Classes:** Gunakan kelas turunan (*inheritance*) untuk struktur entitas standar yang selalu memiliki ID, Tanggal Pembuatan, dan Tanggal Perubahan (letakkan di `shared/`).

---

## 📝 5. Naming Conventions
Penamaan harus konsisten, prediktabel, dan memperjelas letak *layer* sistem.

*   **Files & Folders:** Gunakan *kebab-case*.
    *   *Format:* `[nama-entitas].[tipe-file].ts` (contoh: `create-user.use-case.ts`, `user.entity.ts`, `auth.controller.ts`).
*   **Classes:** Gunakan *PascalCase* dengan *suffix* yang sesuai tipe layernya.
    *   *Domain Layer:* `User` (untuk entitas domain murni), `UserMapper`.
    *   *Application Layer:* `CreateUserUseCase`, `UpdateUserDto`.
    *   *Infrastructure Layer:* `UserTypeOrmEntity`, `UserRepository`.
    *   *Interface Layer:* `UserController`.
*   **Abstraksi/Kontrak:** Gunakan awalan `I` untuk menandakan Interface/Abstract Class kontrak (contoh: `IUserRepository`).
*   **Methods/Functions:** Gunakan *camelCase* dengan kata kerja aksi yang jelas (contoh: `findByEmail`, `registerUser`, `execute`).

---

## 🤖 6. Instruksi Spesifik untuk AI Agent
Jika Anda diminta untuk membuat atau memodifikasi fitur baru:
1.  **Evaluasi Dependensi:** Selalu cek di direktori `shared` terlebih dahulu apakah utilitas (seperti *Error*, *Decorator*, *Base Class*) sudah ada sebelum membuat yang baru.
2.  **Mulai dari Domain:** Selalu kerjakan atau analisis layer `domains` terlebih dahulu. Buat entitas domain murni, lalu kontrak *repository*-nya, kemudian buat `use-cases`, diikuti dengan `controller`, dan terakhir implementasi TypeORM di `infrastructures`.
3.  **No Boilerplate Override:** Jangan pernah menghancurkan batas arsitektur (*architectural boundaries*) hanya demi "kode yang lebih pendek". Kesederhanaan (*simplicity*) harus dicapai dengan OOP & DRY, bukan dengan meleburkan logika bisnis ke dalam *Controller*.