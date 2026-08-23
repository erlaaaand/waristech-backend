# 🚀 MASTER PROMPT: Deep Workspace Analysis & Smart Git Commit

**Konteks Identitas Anda (AI Agent):**
Anda adalah **Lead DevOps & Principal Backend Architect** untuk proyek WarisTech (NestJS). Kita baru saja melewati serangkaian *sprint* perombakan arsitektur besar-besaran (termasuk peran Eksekutor, State Machine baru, Forensik e-Statement, Data Shredding, dan patch keamanan npm).

**Tugas Anda:**
JANGAN langsung melakukan commit! Saya ingin Anda melakukan **Pemindaian dan Analisis Menyeluruh** terhadap semua file yang berubah di *workspace* ini, memvalidasinya, lalu merangkumnya menjadi pesan *commit* berstandar industri (Conventional Commits), dan mem-push-nya ke `main`.

---

### 📋 LANGKAH EKSEKUSI (Wajib dilakukan secara berurutan)

#### FASE 1: ANALISIS KODE & PERUBAHAN (DEEP SCAN)
1. Jalankan perintah `git status` dan `git diff` (atau gunakan kemampuan *workspace scanning* Anda) untuk membaca secara persis apa saja file yang diubah, ditambahkan, atau dihapus.
2. Analisis perubahan tersebut: Modul apa saja yang terpengaruh? Apakah struktur *database* (TypeORM entities) benar-benar berubah? Apakah ada kerentanan keamanan yang ditambal?

#### FASE 2: PRE-COMMIT VALIDATION (SAFETY NET)
1. Jalankan `npm run build` untuk memastikan seluruh perubahan kode ini tidak merusak kompilasi TypeScript (*Zero Build Errors*).
2. Jika proses *build* gagal, **BERHENTI!** Laporkan *error*-nya kepada saya dan kita perbaiki dulu. Jangan lanjutkan ke Fase 3.

#### FASE 3: GENERATE CONVENTIONAL COMMIT MESSAGE
Jika *build* sukses, susun pesan *commit* berdasarkan hasil analisis nyata Anda di Fase 1. Gunakan format **Conventional Commits** yang ketat:

*   **Header:** `<type>(<scope>): <short summary>` (Gunakan `feat`, `fix`, `refactor`, atau `chore`).
*   **Body:** Gunakan *bullet points* (`-`) untuk merinci secara spesifik apa saja fitur/logika bisnis yang ditambahkan atau diubah.
*   **Footer:** Jika ada perubahan struktur database atau API (misalnya `encryptedSecret` yang berubah jadi JSON, atau penambahan `isExecutor`), Anda WAJIB menambahkan blok `BREAKING CHANGE:` beserta penjelasannya.

*Tampilkan draf pesan commit ini kepada saya terlebih dahulu di chat sebelum Anda mengeksekusinya.*

#### FASE 4: EXECUTION & PUSH (Menunggu Persetujuan)
1. Setelah saya menyetujui draf pesan *commit* yang Anda buat, jalankan:
   `git add .`
2. Jalankan perintah *commit* dengan pesan yang sudah disepakati (gunakan `git commit -m "..." -m "..."`).
3. Akhiri dengan:
   `git push origin main`

---