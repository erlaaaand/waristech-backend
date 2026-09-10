/**
 * ⚠️ SKRIP SEEDING LENGKAP WARISTECH (2 PEWARIS: HIDUP & MENINGGAL)
 *
 * Mengosongkan SEMUA tabel MySQL + koleksi audit_logs MongoDB, lalu mengisi
 * ulang dengan ekosistem lengkap siap demo:
 * 1. Admin & Notaris
 * 2. Pewaris 1: Hidup (Bpk. Budi Santoso) + 2 Ahli Waris + Undangan + Saksi + Aset
 * 3. Pewaris 2: Meninggal (Alm. Hendra Wijaya) + 2 Ahli Waris + Verifikasi Kematian + Saksi + Aset Siap Unlock/Likuidasi/Sengketa
 *
 * Menghasilkan kunci Shamir Secret Sharing (2-dari-3) yang valid.
 */
const mysql = require('mysql2/promise');
const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const crypto = require('crypto');
const secrets = require('secrets.js-grempe');

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

const DEFAULT_PASSWORD = 'Password123!';
const PRIVACY_POLICY_VERSION = 'v1.0';

const PEPPER = crypto
  .createHash('sha256')
  .update('WarisTech-SecretSharing-Pepper-2026')
  .digest();

function splitSecret(plainText) {
  const hex = secrets.str2hex(plainText);
  const shares = secrets.share(hex, 3, 2);
  return {
    executorShare: shares[0],
    notarisShare: shares[1],
    systemShare: shares[2],
  };
}

function sealSystemShare(rawShare, assetId) {
  const key = crypto
    .createHmac('sha256', PEPPER)
    .update(`${assetId}:SYSTEM`)
    .digest();
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv('aes-256-ctr', key, iv);
  const encrypted = Buffer.concat([
    cipher.update(rawShare, 'utf8'),
    cipher.final(),
  ]);
  return `${iv.toString('hex')}:${encrypted.toString('hex')}`;
}

async function main() {
  console.log('⚠️  DATABASE RESET & COMPREHENSIVE SEEDING DIMULAI...');

  const conn = await mysql.createConnection({
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT),
    user: process.env.DB_USERNAME,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_DATABASE,
  });

  // 1. Truncate MySQL
  await conn.query('SET FOREIGN_KEY_CHECKS = 0');
  for (const table of MYSQL_TABLES) {
    await conn.query(`TRUNCATE TABLE \`${table}\``);
    console.log(`🗑️  Tabel dikosongkan: ${table}`);
  }
  await conn.query('SET FOREIGN_KEY_CHECKS = 1');

  // 2. Clear MongoDB Audit Logs
  if (process.env.MONGODB_URI) {
    try {
      const mongoConn = await mongoose
        .createConnection(process.env.MONGODB_URI)
        .asPromise();
      const auditResult = await mongoConn
        .collection('audit_logs')
        .deleteMany({});
      console.log(
        `🗑️  Koleksi MongoDB audit_logs dikosongkan (${auditResult.deletedCount} dokumen).`,
      );
      await mongoConn.close();
    } catch (mErr) {
      console.warn('⚠️ Gagal terhubung ke MongoDB:', mErr.message);
    }
  }

  const hashedPassword = await bcrypt.hash(DEFAULT_PASSWORD, 10);
  const now = new Date();
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const thirtyDaysFuture = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

  // 3. User Roster
  const users = {
    admin: {
      id: crypto.randomUUID(),
      email: 'admin@waristech.com',
      fullName: 'System Administrator',
      role: 'ADMIN',
      phoneNumber: '081200000000',
      nik: '3171010000000000',
    },
    notaris: {
      id: crypto.randomUUID(),
      email: 'notaris@waristech.com',
      fullName: 'Notaris Haryanto, S.H., M.Kn.',
      role: 'NOTARIS',
      phoneNumber: '081200000001',
      nik: '3171010000000001',
      publicKey:
        'MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAyNotarisPublicKeyDemoWarisTech2026Base64StringSampleAQAB',
    },
    pewarisHidup: {
      id: crypto.randomUUID(),
      email: 'pewaris.hidup@waristech.com',
      fullName: 'Bpk. Budi Santoso',
      role: 'PEWARIS',
      phoneNumber: '081211110001',
      nik: '3171011111110001',
      preferredCalculationMethod: 'FARAIDH',
      lastCheckInAt: now,
    },
    pewarisAlias: {
      id: crypto.randomUUID(),
      email: 'pewaris@waristech.com',
      fullName: 'Bpk. Budi Santoso (Alias)',
      role: 'PEWARIS',
      phoneNumber: '081211110009',
      nik: '3171011111110009',
      preferredCalculationMethod: 'FARAIDH',
      lastCheckInAt: now,
    },
    andi: {
      id: crypto.randomUUID(),
      email: 'andi.santoso@waristech.com',
      fullName: 'Andi Santoso',
      role: 'AHLI_WARIS',
      phoneNumber: '081211110002',
      nik: '3171011111110002',
    },
    ahliwarisAlias: {
      id: crypto.randomUUID(),
      email: 'ahliwaris@waristech.com',
      fullName: 'Andi Santoso (Alias)',
      role: 'AHLI_WARIS',
      phoneNumber: '081211110008',
      nik: '3171011111110008',
    },
    siti: {
      id: crypto.randomUUID(),
      email: 'siti.santoso@waristech.com',
      fullName: 'Siti Santoso',
      role: 'AHLI_WARIS',
      phoneNumber: '081211110003',
      nik: '3171011111110003',
    },
    pewarisWafat: {
      id: crypto.randomUUID(),
      email: 'pewaris.wafat@waristech.com',
      fullName: 'Alm. Hendra Wijaya',
      role: 'PEWARIS',
      phoneNumber: '081222220001',
      nik: '3171022222220001',
      preferredCalculationMethod: 'CIVIL',
      lastCheckInAt: thirtyDaysAgo,
      proofOfLifeEscalatedAt: sevenDaysAgo,
    },
    bambang: {
      id: crypto.randomUUID(),
      email: 'bambang.wijaya@waristech.com',
      fullName: 'Bambang Wijaya',
      role: 'AHLI_WARIS',
      phoneNumber: '081222220002',
      nik: '3171022222220002',
    },
    dewi: {
      id: crypto.randomUUID(),
      email: 'dewi.wijaya@waristech.com',
      fullName: 'Dewi Wijaya',
      role: 'AHLI_WARIS',
      phoneNumber: '081222220003',
      nik: '3171022222220003',
    },
  };

  for (const u of Object.values(users)) {
    await conn.query(
      `INSERT INTO users
        (id, email, password, fullName, nik, phoneNumber, role, isActive, isEmailVerified,
         lastCheckInAt, proofOfLifeEscalatedAt, preferredCalculationMethod, consentGivenAt,
         consentVersion, publicKey, createdAt, updatedAt)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())`,
      [
        u.id,
        u.email,
        hashedPassword,
        u.fullName,
        u.nik || null,
        u.phoneNumber,
        u.role,
        true,
        true,
        u.lastCheckInAt || now,
        u.proofOfLifeEscalatedAt || null,
        u.preferredCalculationMethod || null,
        now,
        PRIVACY_POLICY_VERSION,
        u.publicKey || null,
      ],
    );
    console.log(`✅ User dibuat: ${u.email} (${u.role})`);
  }

  // 4. Family Members
  const familyData = [
    {
      pewarisId: users.pewarisHidup.id,
      ahliWarisId: users.andi.id,
      rel: 'NASAB',
      desc: 'Anak Kandung Laki-laki (Eksekutor)',
    },
    {
      pewarisId: users.pewarisHidup.id,
      ahliWarisId: users.siti.id,
      rel: 'NASAB',
      desc: 'Anak Kandung Perempuan',
    },
    {
      pewarisId: users.pewarisAlias.id,
      ahliWarisId: users.ahliwarisAlias.id,
      rel: 'NASAB',
      desc: 'Anak Kandung Laki-laki (Eksekutor)',
    },
    {
      pewarisId: users.pewarisWafat.id,
      ahliWarisId: users.bambang.id,
      rel: 'NASAB',
      desc: 'Anak Kandung Laki-laki (Eksekutor)',
    },
    {
      pewarisId: users.pewarisWafat.id,
      ahliWarisId: users.dewi.id,
      rel: 'NASAB',
      desc: 'Anak Kandung Perempuan',
    },
  ];

  for (const f of familyData) {
    await conn.query(
      `INSERT INTO family_members
        (id, pewarisId, ahliWarisId, relationshipType, relationshipDescription, status, verifiedByNotarisId, verifiedAt, createdAt, updatedAt)
       VALUES (?, ?, ?, ?, ?, 'VERIFIED', ?, NOW(), NOW(), NOW())`,
      [
        crypto.randomUUID(),
        f.pewarisId,
        f.ahliWarisId,
        f.rel,
        f.desc,
        users.notaris.id,
      ],
    );
  }
  console.log('✅ Data silsilah keluarga dibuat.');

  // 5. Invitations
  await conn.query(
    `INSERT INTO invitations
      (id, code, pewarisId, status, expiresAt, relationshipType, relationshipDescription, supportingDocumentUrl, createdAt)
     VALUES (?, 'WARIS-DEMO-2026', ?, 'PENDING', ?, 'NON_NASAB', 'Anak Angkat / Penerima Hibah Wasiat', 'https://storage.waristech.com/docs/akta-pengangkatan-anak-demo.pdf', NOW())`,
    [crypto.randomUUID(), users.pewarisHidup.id, thirtyDaysFuture],
  );
  console.log('✅ Kode undangan WARIS-DEMO-2026 dibuat.');

  // 6. Witnesses
  const witnesses = [
    {
      pewarisId: users.pewarisHidup.id,
      name: 'Rudi Hartono',
      email: 'saksi1.budi@waristech.com',
      phone: '081233330001',
      status: 'APPROVE',
    },
    {
      pewarisId: users.pewarisHidup.id,
      name: 'Iwan Setiawan',
      email: 'saksi2.budi@waristech.com',
      phone: '081233330002',
      status: 'PENDING',
    },
    {
      pewarisId: users.pewarisWafat.id,
      name: 'Dr. Agus Salim, Sp.PD',
      email: 'saksi1.hendra@waristech.com',
      phone: '081244440001',
      status: 'APPROVE',
    },
    {
      pewarisId: users.pewarisWafat.id,
      name: 'Ir. Bambang Tri, M.T.',
      email: 'saksi2.hendra@waristech.com',
      phone: '081244440002',
      status: 'APPROVE',
    },
  ];
  for (const w of witnesses) {
    await conn.query(
      `INSERT INTO witnesses (id, pewarisId, name, email, phone, status, magicLinkToken, tokenExpiresAt, createdAt, updatedAt)
       VALUES (?, ?, ?, ?, ?, ?, 'token-saksi-demo', ?, NOW(), NOW())`,
      [
        crypto.randomUUID(),
        w.pewarisId,
        w.name,
        w.email,
        w.phone,
        w.status,
        thirtyDaysFuture,
      ],
    );
  }
  console.log('✅ Data saksi dibuat.');

  // 7. Death Verification for Hendra
  await conn.query(
    `INSERT INTO death_verifications (id, pewarisId, documentUrl, submittedByUserId, verifiedByNotarisId, verifiedAt, createdAt)
     VALUES (?, ?, 'https://storage.waristech.com/docs/surat-kematian-rs-hendra-wijaya.pdf', ?, ?, NOW(), ?)`,
    [
      crypto.randomUUID(),
      users.pewarisWafat.id,
      users.bambang.id,
      users.notaris.id,
      sevenDaysAgo,
    ],
  );
  console.log('✅ Verifikasi kematian Pewaris 2 dibuat.');

  // 8. Assets, Allocations, Key Shares
  const cheatSheet = [];

  // Asset 1 Budi: Pending Verification
  const a1BudiId = crypto.randomUUID();
  const a1BudiSecret = JSON.stringify({
    seedPhrase: 'apple orange lemon banana cherry dog elephant fox grape horse',
    pin: '123456',
  });
  const a1BudiShares = splitSecret(a1BudiSecret);
  await conn.query(
    `INSERT INTO assets (id, pewarisId, type, assetName, platform, accountIdentifier, custodyType, status, assignedNotarisId, inheritanceScheme, keysRotatedAt, createdAt, updatedAt)
     VALUES (?, ?, 'CRYPTO', 'Bitcoin & Ethereum Cold Storage', 'Indodax', 'indodax-budi-vault-01', 'VAULT', 'PENDING_VERIFICATION', ?, 'FARAIDH', NOW(), NOW(), NOW())`,
    [a1BudiId, users.pewarisHidup.id, users.notaris.id],
  );
  await conn.query(
    `INSERT INTO asset_allocations (id, assetId, ahliWarisId, percentage, isExecutor, createdAt)
     VALUES (?, ?, ?, 66.67, 1, NOW()), (?, ?, ?, 33.33, 0, NOW())`,
    [
      crypto.randomUUID(),
      a1BudiId,
      users.andi.id,
      crypto.randomUUID(),
      a1BudiId,
      users.siti.id,
    ],
  );
  await conn.query(
    `INSERT INTO asset_key_shares (id, assetId, holder, encryptedShare, createdAt)
     VALUES (?, ?, 'SYSTEM', ?, NOW())`,
    [
      crypto.randomUUID(),
      a1BudiId,
      sealSystemShare(a1BudiShares.systemShare, a1BudiId),
    ],
  );
  cheatSheet.push({
    pewaris: 'Bpk. Budi (Hidup)',
    assetName: 'Bitcoin & Ethereum Cold Storage',
    status: 'PENDING_VERIFICATION',
    share: a1BudiShares.executorShare,
  });

  // Asset 2 Budi: Verified Vault
  const a2BudiId = crypto.randomUUID();
  const a2BudiSecret = JSON.stringify({
    tradingPin: '654321',
    brokerCode: 'CC',
    loginUser: 'budi_investor',
  });
  const a2BudiShares = splitSecret(a2BudiSecret);
  await conn.query(
    `INSERT INTO assets (id, pewarisId, type, assetName, platform, accountIdentifier, custodyType, status, assignedNotarisId, verifiedByNotarisId, verifiedAt, inheritanceScheme, keysRotatedAt, createdAt, updatedAt)
     VALUES (?, ?, 'SAHAM', 'Portofolio Saham Blue Chip (BBCA & BBRI)', 'Stockbit (Mandiri Sekuritas)', 'sb-budi-98210', 'VAULT', 'VERIFIED', ?, ?, NOW(), 'FARAIDH', NOW(), NOW(), NOW())`,
    [a2BudiId, users.pewarisHidup.id, users.notaris.id, users.notaris.id],
  );
  await conn.query(
    `INSERT INTO asset_allocations (id, assetId, ahliWarisId, percentage, isExecutor, acknowledgedAt, createdAt)
     VALUES (?, ?, ?, 50.0, 1, NOW(), NOW()), (?, ?, ?, 50.0, 0, NOW(), NOW())`,
    [
      crypto.randomUUID(),
      a2BudiId,
      users.andi.id,
      crypto.randomUUID(),
      a2BudiId,
      users.siti.id,
    ],
  );
  await conn.query(
    `INSERT INTO asset_key_shares (id, assetId, holder, encryptedShare, createdAt)
     VALUES (?, ?, 'SYSTEM', ?, NOW()), (?, ?, 'NOTARIS', ?, NOW())`,
    [
      crypto.randomUUID(),
      a2BudiId,
      sealSystemShare(a2BudiShares.systemShare, a2BudiId),
      crypto.randomUUID(),
      a2BudiId,
      `escrowed-${a2BudiShares.notarisShare.substring(0, 16)}`,
    ],
  );
  cheatSheet.push({
    pewaris: 'Bpk. Budi (Hidup)',
    assetName: 'Saham Blue Chip BBCA/BBRI',
    status: 'VERIFIED',
    share: a2BudiShares.executorShare,
  });

  // Asset 3 Budi: Verified Guidance
  const a3BudiId = crypto.randomUUID();
  await conn.query(
    `INSERT INTO assets (id, pewarisId, type, assetName, platform, accountIdentifier, custodyType, status, assignedNotarisId, verifiedByNotarisId, verifiedAt, inheritanceScheme, createdAt, updatedAt)
     VALUES (?, ?, 'REKENING_BANK', 'Rekening Deposito Berjangka Rupiah', 'Bank Mandiri', '123-00-9988776-5', 'GUIDANCE', 'VERIFIED', ?, ?, NOW(), 'FARAIDH', NOW(), NOW())`,
    [a3BudiId, users.pewarisHidup.id, users.notaris.id, users.notaris.id],
  );
  await conn.query(
    `INSERT INTO asset_allocations (id, assetId, ahliWarisId, percentage, isExecutor, createdAt)
     VALUES (?, ?, ?, 50.0, 1, NOW()), (?, ?, ?, 50.0, 0, NOW())`,
    [
      crypto.randomUUID(),
      a3BudiId,
      users.andi.id,
      crypto.randomUUID(),
      a3BudiId,
      users.siti.id,
    ],
  );

  // Asset 1 Hendra (Wafat): UNLOCKED (Siap Dicairkan)
  const a1HendraId = crypto.randomUUID();
  const a1HendraSecret = JSON.stringify({
    walletAddress: '0x71C8363437913236169338f902E862B8820B49A1',
    mnemonic:
      'hazard direct script marble volcano matrix ribbon crystal dynamic filter update sphere',
    pin: '990011',
  });
  const a1HendraShares = splitSecret(a1HendraSecret);
  await conn.query(
    `INSERT INTO assets (id, pewarisId, type, assetName, platform, accountIdentifier, custodyType, status, assignedNotarisId, verifiedByNotarisId, verifiedAt, inheritanceScheme, keysRotatedAt, createdAt, updatedAt)
     VALUES (?, ?, 'CRYPTO', 'Binance Multi-Asset Vault', 'Binance', 'binance-hendra-7729', 'VAULT', 'UNLOCKED', ?, ?, NOW(), 'CIVIL', ?, NOW(), NOW())`,
    [
      a1HendraId,
      users.pewarisWafat.id,
      users.notaris.id,
      users.notaris.id,
      thirtyDaysAgo,
    ],
  );
  await conn.query(
    `INSERT INTO asset_allocations (id, assetId, ahliWarisId, percentage, isExecutor, createdAt)
     VALUES (?, ?, ?, 50.0, 1, NOW()), (?, ?, ?, 50.0, 0, NOW())`,
    [
      crypto.randomUUID(),
      a1HendraId,
      users.bambang.id,
      crypto.randomUUID(),
      a1HendraId,
      users.dewi.id,
    ],
  );
  await conn.query(
    `INSERT INTO asset_key_shares (id, assetId, holder, encryptedShare, createdAt)
     VALUES (?, ?, 'SYSTEM', ?, NOW()), (?, ?, 'NOTARIS', ?, NOW())`,
    [
      crypto.randomUUID(),
      a1HendraId,
      sealSystemShare(a1HendraShares.systemShare, a1HendraId),
      crypto.randomUUID(),
      a1HendraId,
      `escrowed-${a1HendraShares.notarisShare.substring(0, 16)}`,
    ],
  );
  cheatSheet.push({
    pewaris: 'Alm. Hendra (Wafat)',
    assetName: 'Binance Multi-Asset Vault',
    status: 'UNLOCKED (Siap Buka Kunci)',
    share: a1HendraShares.executorShare,
  });

  // Asset 2 Hendra (Wafat): LIQUIDATING with Liquidation Proof
  const a2HendraId = crypto.randomUUID();
  const a2HendraSecret = JSON.stringify({
    accountName: 'hendrawijaya_toko',
    code: '8910-2341-5512',
  });
  const a2HendraShares = splitSecret(a2HendraSecret);
  await conn.query(
    `INSERT INTO assets (id, pewarisId, type, assetName, platform, accountIdentifier, custodyType, status, assignedNotarisId, verifiedByNotarisId, verifiedAt, inheritanceScheme, keysRotatedAt, createdAt, updatedAt)
     VALUES (?, ?, 'CRYPTO', 'Tokocrypto Staking & Savings Vault', 'Tokocrypto', 'toko-hendra-4431', 'VAULT', 'LIQUIDATING', ?, ?, NOW(), 'CIVIL', ?, NOW(), NOW())`,
    [
      a2HendraId,
      users.pewarisWafat.id,
      users.notaris.id,
      users.notaris.id,
      thirtyDaysAgo,
    ],
  );
  await conn.query(
    `INSERT INTO asset_allocations (id, assetId, ahliWarisId, percentage, isExecutor, createdAt)
     VALUES (?, ?, ?, 50.0, 1, NOW()), (?, ?, ?, 50.0, 0, NOW())`,
    [
      crypto.randomUUID(),
      a2HendraId,
      users.bambang.id,
      crypto.randomUUID(),
      a2HendraId,
      users.dewi.id,
    ],
  );
  await conn.query(
    `INSERT INTO asset_key_shares (id, assetId, holder, encryptedShare, createdAt)
     VALUES (?, ?, 'SYSTEM', ?, NOW())`,
    [
      crypto.randomUUID(),
      a2HendraId,
      sealSystemShare(a2HendraShares.systemShare, a2HendraId),
    ],
  );
  await conn.query(
    `INSERT INTO liquidation_proofs (id, assetId, executorId, pdfFileUrl, sptjmAgreed, status, createdAt, updatedAt)
     VALUES (?, ?, ?, 'https://storage.waristech.com/proofs/sptjm-transfer.pdf', 1, 'PENDING_VALIDATION', NOW(), NOW())`,
    [crypto.randomUUID(), a2HendraId, users.bambang.id],
  );
  cheatSheet.push({
    pewaris: 'Alm. Hendra (Wafat)',
    assetName: 'Tokocrypto Staking Vault',
    status: 'LIQUIDATING (SPTJM Menunggu Notaris)',
    share: a2HendraShares.executorShare,
  });

  // Asset 3 Hendra (Wafat): FROZEN
  const a3HendraId = crypto.randomUUID();
  await conn.query(
    `INSERT INTO assets (id, pewarisId, type, assetName, platform, accountIdentifier, custodyType, status, assignedNotarisId, inheritanceScheme, createdAt, updatedAt)
     VALUES (?, ?, 'NFT', 'Rare Digital Art NFT', 'OpenSea', '0x33b87913236169338f902E862B8820B49A1FF', 'VAULT', 'FROZEN', ?, 'CIVIL', NOW(), NOW())`,
    [a3HendraId, users.pewarisWafat.id, users.notaris.id],
  );
  await conn.query(
    `INSERT INTO asset_allocations (id, assetId, ahliWarisId, percentage, isExecutor, createdAt)
     VALUES (?, ?, ?, 50.0, 1, NOW()), (?, ?, ?, 50.0, 0, NOW())`,
    [
      crypto.randomUUID(),
      a3HendraId,
      users.bambang.id,
      crypto.randomUUID(),
      a3HendraId,
      users.dewi.id,
    ],
  );

  // Asset 4 Hendra (Wafat): CLOSED
  const a4HendraId = crypto.randomUUID();
  await conn.query(
    `INSERT INTO assets (id, pewarisId, type, assetName, platform, accountIdentifier, custodyType, status, assignedNotarisId, verifiedByNotarisId, verifiedAt, inheritanceScheme, createdAt, updatedAt)
     VALUES (?, ?, 'REKSA_DANA', 'Reksadana Pasar Uang Syariah', 'Bibit', 'bibit-hendra-9012', 'GUIDANCE', 'CLOSED', ?, ?, NOW(), 'CIVIL', NOW(), NOW())`,
    [a4HendraId, users.pewarisWafat.id, users.notaris.id, users.notaris.id],
  );
  await conn.query(
    `INSERT INTO asset_allocations (id, assetId, ahliWarisId, percentage, isExecutor, acknowledgedAt, createdAt)
     VALUES (?, ?, ?, 50.0, 1, NOW(), NOW()), (?, ?, ?, 50.0, 0, NOW(), NOW())`,
    [
      crypto.randomUUID(),
      a4HendraId,
      users.bambang.id,
      crypto.randomUUID(),
      a4HendraId,
      users.dewi.id,
    ],
  );

  // 9. Notifications
  await conn.query(
    `INSERT INTO notifications (id, userId, title, message, type, isRead, createdAt)
     VALUES
     (?, ?, 'Brankas Warisan Siap', 'Selamat datang di WarisTech! 2 aset Anda telah terdaftar dan siap diverifikasi Notaris.', 'SUCCESS', 1, NOW()),
     (?, ?, 'Verifikasi Aset Baru Menunggu', 'Bpk. Budi Santoso mendaftarkan aset Bitcoin & Ethereum yang membutuhkan verifikasi Anda.', 'INFO', 0, NOW()),
     (?, ?, 'Bukti Pencairan Masuk', 'Eksekutor Bambang Wijaya telah mengunggah SPTJM dan bukti transfer untuk aset Tokocrypto.', 'WARNING', 0, NOW()),
     (?, ?, 'Brankas Aset Terbuka', 'Masa jeda telah selesai. Anda dapat membuka brankas aset Binance Multi-Asset Vault sekarang.', 'SUCCESS', 0, NOW())`,
    [
      crypto.randomUUID(),
      users.pewarisHidup.id,
      crypto.randomUUID(),
      users.notaris.id,
      crypto.randomUUID(),
      users.notaris.id,
      crypto.randomUUID(),
      users.bambang.id,
    ],
  );
  console.log('✅ Notifikasi dibuat.');

  await conn.end();

  console.log('--------------------------------------------------');
  console.log('🎉 Reset + Database Seeding Selesai Sukses!');
  console.log(`🔑 Password semua akun: ${DEFAULT_PASSWORD}`);
  console.log('   - Admin       : admin@waristech.com');
  console.log('   - Notaris     : notaris@waristech.com');
  console.log(
    '   - Pewaris 1   : pewaris.hidup@waristech.com (Bpk. Budi Santoso - Hidup)',
  );
  console.log(
    '   - Ahli Waris 1: andi.santoso@waristech.com (Eksekutor Pewaris 1)',
  );
  console.log('   - Ahli Waris 2: siti.santoso@waristech.com');
  console.log(
    '   - Pewaris 2   : pewaris.wafat@waristech.com (Alm. Hendra Wijaya - Meninggal)',
  );
  console.log(
    '   - Ahli Waris 1: bambang.wijaya@waristech.com (Eksekutor Pewaris 2)',
  );
  console.log('   - Ahli Waris 2: dewi.wijaya@waristech.com');
  console.log('--------------------------------------------------');
  console.log('🔐 CHEAT SHEET EXECUTOR KEY SHARES:');
  for (const c of cheatSheet) {
    console.log(`▶ [${c.pewaris}] ${c.assetName} (${c.status})`);
    console.log(`  Executor Share: ${c.share}`);
  }
  console.log('--------------------------------------------------');
}

main().catch((e) => {
  console.error('❌ GAGAL:', e);
  process.exit(1);
});
