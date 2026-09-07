/**
 * ⚠️ SKRIP DESTRUKTIF — mengosongkan SEMUA tabel MySQL + koleksi audit_logs
 * MongoDB, lalu mengisi ulang dengan 16 akun bersih: 1 Admin, 5 Pewaris,
 * 10 Notaris. TIDAK ADA Ahli Waris (sengaja — reset untuk demo).
 *
 * Sengaja JS polos (bukan TypeScript/NestJS) — jalan langsung pakai driver
 * (mysql2, mongoose, bcrypt) yang sudah ada di node_modules produksi, tanpa
 * bootstrap AppModule penuh (Redis/Throttler/dst ikut ter-bootstrap kalau
 * pakai NestFactory, menambah titik gagal yang tidak perlu untuk operasi
 * sesederhana ini).
 *
 * DB_HOST/MONGODB_URI produksi menunjuk ke domain privat Railway
 * (*.railway.internal) — HANYA bisa dijangkau dari dalam jaringan privat
 * Railway. Jalankan lewat SSH ke service yang sudah deploy di sana, BUKAN
 * dari mesin lokal:
 *
 *   railway ssh -s waristech-backend -- node src/scripts/reset-and-seed.js
 *
 * Tidak ada konfirmasi interaktif di sini — pastikan service yang di-SSH
 * memang menyambung ke database yang ingin direset SEBELUM run.
 */
const mysql = require('mysql2/promise');
const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const { randomUUID } = require('crypto');

const MYSQL_TABLES = [
  'notifications',
  'death_verifications',
  'family_members',
  'invitations',
  'witnesses',
  'liquidation_proofs',
  'asset_key_shares',
  'asset_allocations',
  'assets',
  'stored_files',
  'users',
];

const DEFAULT_PASSWORD = 'WarisTech2026!';
const PRIVACY_POLICY_VERSION = 'v1.0';

function buildAccountRoster() {
  const accounts = [
    {
      email: 'admin@waristech.test',
      fullName: 'Administrator WarisTech',
      role: 'ADMIN',
      phoneNumber: '+628110000000',
    },
  ];

  for (let i = 1; i <= 5; i++) {
    accounts.push({
      email: `pewaris${i}@waristech.test`,
      fullName: `Pewaris Uji ${i}`,
      role: 'PEWARIS',
      phoneNumber: `+6281100001${String(i).padStart(2, '0')}`,
    });
  }

  for (let i = 1; i <= 10; i++) {
    accounts.push({
      email: `notaris${i}@waristech.test`,
      fullName: `Notaris Uji ${i}`,
      role: 'NOTARIS',
      phoneNumber: `+6281100002${String(i).padStart(2, '0')}`,
    });
  }

  return accounts;
}

async function main() {
  console.log('⚠️  FULL DATABASE RESET DIMULAI...');

  const conn = await mysql.createConnection({
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT),
    user: process.env.DB_USERNAME,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_DATABASE,
  });

  await conn.query('SET FOREIGN_KEY_CHECKS = 0');
  for (const table of MYSQL_TABLES) {
    await conn.query(`TRUNCATE TABLE \`${table}\``);
    console.log(`🗑️  Tabel dikosongkan: ${table}`);
  }
  await conn.query('SET FOREIGN_KEY_CHECKS = 1');

  const mongoConn = await mongoose
    .createConnection(process.env.MONGODB_URI)
    .asPromise();
  const auditResult = await mongoConn.collection('audit_logs').deleteMany({});
  console.log(
    `🗑️  Koleksi MongoDB audit_logs dikosongkan (${auditResult.deletedCount} dokumen).`,
  );
  await mongoConn.close();

  const hashedPassword = await bcrypt.hash(DEFAULT_PASSWORD, 10);
  const accounts = buildAccountRoster();

  for (const acc of accounts) {
    const id = randomUUID();
    await conn.query(
      `INSERT INTO users
        (id, email, password, fullName, phoneNumber, role, isActive, isEmailVerified, consentGivenAt, consentVersion, lastCheckInAt, createdAt, updatedAt)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW(), ?, NOW(), NOW(), NOW())`,
      [
        id,
        acc.email,
        hashedPassword,
        acc.fullName,
        acc.phoneNumber,
        acc.role,
        true,
        true,
        PRIVACY_POLICY_VERSION,
      ],
    );
    console.log(`✅ Akun dibuat: ${acc.email} (${acc.role})`);
  }

  await conn.end();

  console.log('--------------------------------------------------');
  console.log('🎉 Reset + seeding selesai.');
  console.log(`🔑 Password semua akun: ${DEFAULT_PASSWORD}`);
  console.log('   1 Admin   : admin@waristech.test');
  console.log(
    '   5 Pewaris : pewaris1@waristech.test .. pewaris5@waristech.test',
  );
  console.log(
    '   10 Notaris: notaris1@waristech.test .. notaris10@waristech.test',
  );
  console.log('--------------------------------------------------');
}

main().catch((e) => {
  console.error('❌ GAGAL:', e);
  process.exit(1);
});
