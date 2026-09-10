import { NestFactory } from '@nestjs/core';
import { Logger } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { getConnectionToken } from '@nestjs/mongoose';
import { Connection } from 'mongoose';
import * as crypto from 'crypto';
import * as secrets from 'secrets.js-grempe';

import { AppModule } from './app.module';
import { UserRole } from './module/identity/users/domains/entities/user.entity';
import { UserTypeOrmEntity } from './module/identity/users/infrastructures/entities/user.typeorm-entity';
import { FamilyMemberTypeOrmEntity } from './module/inheritance/infrastructures/entities/family-member.typeorm-entity';
import { InvitationTypeOrmEntity } from './module/inheritance/infrastructures/entities/invitation.typeorm-entity';
import { WitnessTypeOrmEntity } from './module/inheritance/infrastructures/entities/witness.typeorm-entity';
import { DeathVerificationTypeOrmEntity } from './module/inheritance/infrastructures/entities/death-verification.typeorm-entity';
import { AssetTypeOrmEntity } from './module/assets/infrastructures/entities/asset.typeorm-entity';
import { AssetAllocationTypeOrmEntity } from './module/assets/infrastructures/entities/asset-allocation.typeorm-entity';
import { KeyShareTypeOrmEntity } from './module/assets/infrastructures/entities/key-share.typeorm-entity';
import { LiquidationProofTypeOrmEntity } from './module/assets/infrastructures/entities/liquidation-proof.typeorm-entity';
import { NotificationEntity, NotificationType } from './module/shared/notifications/entities/notification.entity';

import {
  AssetType,
  AssetStatus,
  AssetCustodyType,
} from './module/assets/domains/enums/asset.enum';
import { KeyShareHolder } from './module/assets/domains/enums/key-share.enum';
import { LiquidationProofStatus } from './module/assets/domains/enums/liquidation-proof.enum';
import { CalculationMethod } from './module/calculation/domains/enums/calculation.enum';
import {
  RelationshipType,
  FamilyMemberStatus,
} from './module/inheritance/domains/enums/family-member.enum';
import { WitnessStatus } from './module/inheritance/domains/enums/witness.enum';
import { InvitationStatus } from './module/inheritance/domains/enums/invitation-status.enum';
import { CryptoUtil } from './module/shared/utils/crypto.util';
import { CURRENT_PRIVACY_POLICY_VERSION } from './module/shared/config/privacy-policy.constant';

// ── Helper Shamir Secret Sharing & System Seal ──────────────────────────────
const PEPPER = crypto
  .createHash('sha256')
  .update('WarisTech-SecretSharing-Pepper-2026')
  .digest();

function splitSecret(plainText: string): {
  executorShare: string;
  notarisShare: string;
  systemShare: string;
} {
  const hex = secrets.str2hex(plainText);
  const shares = secrets.share(hex, 3, 2);
  return {
    executorShare: shares[0],
    notarisShare: shares[1],
    systemShare: shares[2],
  };
}

function sealSystemShare(rawShare: string, assetId: string): string {
  const key = crypto
    .createHmac('sha256', PEPPER)
    .update(`${assetId}:${KeyShareHolder.SYSTEM}`)
    .digest();
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv('aes-256-ctr', key, iv);
  const encrypted = Buffer.concat([
    cipher.update(rawShare, 'utf8'),
    cipher.final(),
  ]);
  return `${iv.toString('hex')}:${encrypted.toString('hex')}`;
}

async function seed() {
  const logger = new Logger('DatabaseSeeder');
  logger.log('🌱 Memulai Database Seeding WarisTech (2 Pewaris: Hidup & Meninggal)...');

  const app = await NestFactory.createApplicationContext(AppModule);

  try {
    const dataSource = app.get(DataSource);
    const mongoConn = app.get<Connection>(getConnectionToken(), { strict: false });

    // ── 1. Bersihkan Data Lama (Reset MySQL & MongoDB) ───────────────────────
    logger.log('🧹 Membersihkan tabel MySQL lama...');
    const queryRunner = dataSource.createQueryRunner();
    await queryRunner.connect();

    await queryRunner.query('SET FOREIGN_KEY_CHECKS = 0');
    const tables = [
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
    for (const tbl of tables) {
      await queryRunner.query(`TRUNCATE TABLE \`${tbl}\``);
    }
    await queryRunner.query('SET FOREIGN_KEY_CHECKS = 1');
    await queryRunner.release();

    if (mongoConn && mongoConn.readyState === 1) {
      logger.log('🧹 Membersihkan koleksi MongoDB audit_logs...');
      try {
        await mongoConn.collection('audit_logs').deleteMany({});
      } catch (err) {
        logger.warn('⚠️ Gagal membersihkan audit_logs MongoDB:', err);
      }
    }

    const defaultPassword = 'Password123!';
    const hashedPassword = await CryptoUtil.hashPassword(defaultPassword);

    // ── 2. Buat Akun Pengguna ────────────────────────────────────────────────
    logger.log('👤 Membuat data akun pengguna...');
    const userRepo = dataSource.getRepository(UserTypeOrmEntity);

    // Daftar Akun
    const adminUser = userRepo.create({
      id: crypto.randomUUID(),
      email: 'admin@waristech.com',
      password: hashedPassword,
      fullName: 'System Administrator',
      nik: '3171010000000000',
      phoneNumber: '081200000000',
      role: UserRole.ADMIN,
      isEmailVerified: true,
      isActive: true,
      consentGivenAt: new Date(),
      consentVersion: CURRENT_PRIVACY_POLICY_VERSION,
    });

    const notarisUser = userRepo.create({
      id: crypto.randomUUID(),
      email: 'notaris@waristech.com',
      password: hashedPassword,
      fullName: 'Notaris Haryanto, S.H., M.Kn.',
      nik: '3171010000000001',
      phoneNumber: '081200000001',
      role: UserRole.NOTARIS,
      isEmailVerified: true,
      isActive: true,
      publicKey:
        'MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAyNotarisPublicKeyDemoWarisTech2026Base64StringSampleAQAB',
      consentGivenAt: new Date(),
      consentVersion: CURRENT_PRIVACY_POLICY_VERSION,
    });

    // PEWARIS 1: HIDUP (Bpk. Budi Santoso)
    const pewarisHidup = userRepo.create({
      id: crypto.randomUUID(),
      email: 'pewaris.hidup@waristech.com',
      password: hashedPassword,
      fullName: 'Bpk. Budi Santoso',
      nik: '3171011111110001',
      phoneNumber: '081211110001',
      role: UserRole.PEWARIS,
      isEmailVerified: true,
      isActive: true,
      lastCheckInAt: new Date(),
      proofOfLifeEscalatedAt: null,
      preferredCalculationMethod: CalculationMethod.FARAIDH,
      consentGivenAt: new Date(),
      consentVersion: CURRENT_PRIVACY_POLICY_VERSION,
    });

    // Alias Pewaris default untuk login cepat
    const pewarisDefault = userRepo.create({
      id: crypto.randomUUID(),
      email: 'pewaris@waristech.com',
      password: hashedPassword,
      fullName: 'Bpk. Budi Santoso (Alias)',
      nik: '3171011111110009',
      phoneNumber: '081211110009',
      role: UserRole.PEWARIS,
      isEmailVerified: true,
      isActive: true,
      lastCheckInAt: new Date(),
      proofOfLifeEscalatedAt: null,
      preferredCalculationMethod: CalculationMethod.FARAIDH,
      consentGivenAt: new Date(),
      consentVersion: CURRENT_PRIVACY_POLICY_VERSION,
    });

    // Ahli Waris Pewaris 1
    const ahliWaris1Budi = userRepo.create({
      id: crypto.randomUUID(),
      email: 'andi.santoso@waristech.com',
      password: hashedPassword,
      fullName: 'Andi Santoso',
      nik: '3171011111110002',
      phoneNumber: '081211110002',
      role: UserRole.AHLI_WARIS,
      isEmailVerified: true,
      isActive: true,
      consentGivenAt: new Date(),
      consentVersion: CURRENT_PRIVACY_POLICY_VERSION,
    });

    const ahliWarisDefault = userRepo.create({
      id: crypto.randomUUID(),
      email: 'ahliwaris@waristech.com',
      password: hashedPassword,
      fullName: 'Andi Santoso (Alias)',
      nik: '3171011111110008',
      phoneNumber: '081211110008',
      role: UserRole.AHLI_WARIS,
      isEmailVerified: true,
      isActive: true,
      consentGivenAt: new Date(),
      consentVersion: CURRENT_PRIVACY_POLICY_VERSION,
    });

    const ahliWaris2Budi = userRepo.create({
      id: crypto.randomUUID(),
      email: 'siti.santoso@waristech.com',
      password: hashedPassword,
      fullName: 'Siti Santoso',
      nik: '3171011111110003',
      phoneNumber: '081211110003',
      role: UserRole.AHLI_WARIS,
      isEmailVerified: true,
      isActive: true,
      consentGivenAt: new Date(),
      consentVersion: CURRENT_PRIVACY_POLICY_VERSION,
    });

    // PEWARIS 2: MENINGGAL (Alm. Hendra Wijaya)
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const pewarisWafat = userRepo.create({
      id: crypto.randomUUID(),
      email: 'pewaris.wafat@waristech.com',
      password: hashedPassword,
      fullName: 'Alm. Hendra Wijaya',
      nik: '3171022222220001',
      phoneNumber: '081222220001',
      role: UserRole.PEWARIS,
      isEmailVerified: true,
      isActive: true,
      lastCheckInAt: thirtyDaysAgo,
      proofOfLifeEscalatedAt: sevenDaysAgo,
      preferredCalculationMethod: CalculationMethod.CIVIL,
      consentGivenAt: thirtyDaysAgo,
      consentVersion: CURRENT_PRIVACY_POLICY_VERSION,
    });

    // Ahli Waris Pewaris 2
    const ahliWaris1Hendra = userRepo.create({
      id: crypto.randomUUID(),
      email: 'bambang.wijaya@waristech.com',
      password: hashedPassword,
      fullName: 'Bambang Wijaya',
      nik: '3171022222220002',
      phoneNumber: '081222220002',
      role: UserRole.AHLI_WARIS,
      isEmailVerified: true,
      isActive: true,
      consentGivenAt: new Date(),
      consentVersion: CURRENT_PRIVACY_POLICY_VERSION,
    });

    const ahliWaris2Hendra = userRepo.create({
      id: crypto.randomUUID(),
      email: 'dewi.wijaya@waristech.com',
      password: hashedPassword,
      fullName: 'Dewi Wijaya',
      nik: '3171022222220003',
      phoneNumber: '081222220003',
      role: UserRole.AHLI_WARIS,
      isEmailVerified: true,
      isActive: true,
      consentGivenAt: new Date(),
      consentVersion: CURRENT_PRIVACY_POLICY_VERSION,
    });

    await userRepo.save([
      adminUser,
      notarisUser,
      pewarisHidup,
      pewarisDefault,
      ahliWaris1Budi,
      ahliWarisDefault,
      ahliWaris2Budi,
      pewarisWafat,
      ahliWaris1Hendra,
      ahliWaris2Hendra,
    ]);

    // ── 3. Data Keluarga (Family Members) ────────────────────────────────────
    logger.log('👨‍👩‍👧‍👦 Membuat data silsilah keluarga...');
    const familyRepo = dataSource.getRepository(FamilyMemberTypeOrmEntity);

    const familyEntries: FamilyMemberTypeOrmEntity[] = [
      // Keluarga Pewaris 1 (Budi)
      familyRepo.create({
        id: crypto.randomUUID(),
        pewarisId: pewarisHidup.id,
        ahliWarisId: ahliWaris1Budi.id,
        relationshipType: RelationshipType.NASAB,
        relationshipDescription: 'Anak Kandung Laki-laki (Eksekutor)',
        status: FamilyMemberStatus.VERIFIED,
        verifiedByNotarisId: notarisUser.id,
        verifiedAt: new Date(),
      }),
      familyRepo.create({
        id: crypto.randomUUID(),
        pewarisId: pewarisHidup.id,
        ahliWarisId: ahliWaris2Budi.id,
        relationshipType: RelationshipType.NASAB,
        relationshipDescription: 'Anak Kandung Perempuan',
        status: FamilyMemberStatus.VERIFIED,
        verifiedByNotarisId: notarisUser.id,
        verifiedAt: new Date(),
      }),
      // Hubungkan juga untuk akun alias Budi
      familyRepo.create({
        id: crypto.randomUUID(),
        pewarisId: pewarisDefault.id,
        ahliWarisId: ahliWarisDefault.id,
        relationshipType: RelationshipType.NASAB,
        relationshipDescription: 'Anak Kandung Laki-laki (Eksekutor)',
        status: FamilyMemberStatus.VERIFIED,
        verifiedByNotarisId: notarisUser.id,
        verifiedAt: new Date(),
      }),

      // Keluarga Pewaris 2 (Hendra - Wafat)
      familyRepo.create({
        id: crypto.randomUUID(),
        pewarisId: pewarisWafat.id,
        ahliWarisId: ahliWaris1Hendra.id,
        relationshipType: RelationshipType.NASAB,
        relationshipDescription: 'Anak Kandung Laki-laki (Eksekutor Wasiat)',
        status: FamilyMemberStatus.VERIFIED,
        verifiedByNotarisId: notarisUser.id,
        verifiedAt: sevenDaysAgo,
      }),
      familyRepo.create({
        id: crypto.randomUUID(),
        pewarisId: pewarisWafat.id,
        ahliWarisId: ahliWaris2Hendra.id,
        relationshipType: RelationshipType.NASAB,
        relationshipDescription: 'Anak Kandung Perempuan',
        status: FamilyMemberStatus.VERIFIED,
        verifiedByNotarisId: notarisUser.id,
        verifiedAt: sevenDaysAgo,
      }),
    ];
    await familyRepo.save(familyEntries);

    // ── 4. Undangan Ahli Waris (Invitations) ──────────────────────────────────
    logger.log('✉️ Membuat kode undangan ahli waris aktif...');
    const inviteRepo = dataSource.getRepository(InvitationTypeOrmEntity);
    const thirtyDaysFuture = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

    const invites = [
      inviteRepo.create({
        id: crypto.randomUUID(),
        code: 'WARIS-DEMO-2026',
        pewarisId: pewarisHidup.id,
        status: InvitationStatus.PENDING,
        expiresAt: thirtyDaysFuture,
        relationshipType: RelationshipType.NON_NASAB,
        relationshipDescription: 'Anak Angkat / Penerima Hibah Wasiat',
        supportingDocumentUrl:
          'https://storage.waristech.com/docs/akta-pengangkatan-anak-demo.pdf',
      }),
    ];
    await inviteRepo.save(invites);

    // ── 5. Saksi & Kontak Darurat (Witnesses) ────────────────────────────────
    logger.log('🤝 Membuat data saksi & kontak darurat...');
    const witnessRepo = dataSource.getRepository(WitnessTypeOrmEntity);

    const witnesses = [
      // Saksi Pewaris 1 (Hidup)
      witnessRepo.create({
        id: crypto.randomUUID(),
        pewarisId: pewarisHidup.id,
        name: 'Rudi Hartono',
        email: 'saksi1.budi@waristech.com',
        phone: '081233330001',
        status: WitnessStatus.APPROVE,
        magicLinkToken: 'token-saksi-1-budi-valid',
        tokenExpiresAt: thirtyDaysFuture,
      }),
      witnessRepo.create({
        id: crypto.randomUUID(),
        pewarisId: pewarisHidup.id,
        name: 'Iwan Setiawan',
        email: 'saksi2.budi@waristech.com',
        phone: '081233330002',
        status: WitnessStatus.PENDING,
        magicLinkToken: 'token-saksi-2-budi-valid',
        tokenExpiresAt: thirtyDaysFuture,
      }),

      // Saksi Pewaris 2 (Wafat) - Keduanya APPROVE
      witnessRepo.create({
        id: crypto.randomUUID(),
        pewarisId: pewarisWafat.id,
        name: 'Dr. Agus Salim, Sp.PD',
        email: 'saksi1.hendra@waristech.com',
        phone: '081244440001',
        status: WitnessStatus.APPROVE,
        magicLinkToken: 'token-saksi-1-hendra-used',
        tokenExpiresAt: sevenDaysAgo,
      }),
      witnessRepo.create({
        id: crypto.randomUUID(),
        pewarisId: pewarisWafat.id,
        name: 'Ir. Bambang Tri, M.T.',
        email: 'saksi2.hendra@waristech.com',
        phone: '081244440002',
        status: WitnessStatus.APPROVE,
        magicLinkToken: 'token-saksi-2-hendra-used',
        tokenExpiresAt: sevenDaysAgo,
      }),
    ];
    await witnessRepo.save(witnesses);

    // ── 6. Verifikasi Kematian untuk Pewaris 2 ────────────────────────────────
    logger.log('📄 Membuat verifikasi kematian Pewaris 2 (Wafat)...');
    const deathRepo = dataSource.getRepository(DeathVerificationTypeOrmEntity);
    const fiveDaysAgo = new Date(Date.now() - 5 * 24 * 60 * 60 * 1000);

    const deathVerification = deathRepo.create({
      id: crypto.randomUUID(),
      pewarisId: pewarisWafat.id,
      documentUrl:
        'https://storage.waristech.com/docs/surat-kematian-rs-hendra-wijaya.pdf',
      submittedByUserId: ahliWaris1Hendra.id,
      verifiedByNotarisId: notarisUser.id,
      verifiedAt: fiveDaysAgo,
      createdAt: sevenDaysAgo,
    });
    await deathRepo.save(deathVerification);

    // ── 7. Aset Digital, Alokasi & Shamir Key Shares ──────────────────────────
    logger.log('💼 Membuat brankas aset digital & Shamir key shares...');
    const assetRepo = dataSource.getRepository(AssetTypeOrmEntity);
    const allocRepo = dataSource.getRepository(AssetAllocationTypeOrmEntity);
    const keyShareRepo = dataSource.getRepository(KeyShareTypeOrmEntity);
    const liqRepo = dataSource.getRepository(LiquidationProofTypeOrmEntity);

    const createdKeyCheatSheet: Array<{
      pewaris: string;
      assetName: string;
      status: string;
      executorShare: string;
      secretRaw: string;
    }> = [];

    // === ASET PEWARIS 1 (HIDUP) ===
    // 1. Aset Kripto Pending Verification
    const asset1BudiId = crypto.randomUUID();
    const secret1Budi = JSON.stringify({
      seedPhrase: 'apple orange lemon banana cherry dog elephant fox grape horse',
      pin: '123456',
    });
    const shares1Budi = splitSecret(secret1Budi);

    const asset1Budi = assetRepo.create({
      id: asset1BudiId,
      pewarisId: pewarisHidup.id,
      type: AssetType.CRYPTO,
      assetName: 'Bitcoin & Ethereum Cold Storage',
      platform: 'Indodax',
      accountIdentifier: 'indodax-budi-vault-01',
      status: AssetStatus.PENDING_VERIFICATION,
      custodyType: AssetCustodyType.VAULT,
      assignedNotarisId: notarisUser.id,
      inheritanceScheme: CalculationMethod.FARAIDH,
      keysRotatedAt: new Date(),
    });
    await assetRepo.save(asset1Budi);

    await allocRepo.save([
      allocRepo.create({
        id: crypto.randomUUID(),
        assetId: asset1BudiId,
        ahliWarisId: ahliWaris1Budi.id,
        percentage: 66.67,
        isExecutor: true,
      }),
      allocRepo.create({
        id: crypto.randomUUID(),
        assetId: asset1BudiId,
        ahliWarisId: ahliWaris2Budi.id,
        percentage: 33.33,
        isExecutor: false,
      }),
    ]);

    await keyShareRepo.save(
      keyShareRepo.create({
        id: crypto.randomUUID(),
        assetId: asset1BudiId,
        holder: KeyShareHolder.SYSTEM,
        encryptedShare: sealSystemShare(shares1Budi.systemShare, asset1BudiId),
      }),
    );

    createdKeyCheatSheet.push({
      pewaris: 'Bpk. Budi Santoso (Hidup)',
      assetName: asset1Budi.assetName,
      status: asset1Budi.status,
      executorShare: shares1Budi.executorShare,
      secretRaw: secret1Budi,
    });

    // 2. Aset Saham Verified (Kustodi Vault)
    const asset2BudiId = crypto.randomUUID();
    const secret2Budi = JSON.stringify({
      tradingPin: '654321',
      brokerCode: 'CC',
      loginUser: 'budi_investor',
    });
    const shares2Budi = splitSecret(secret2Budi);

    const asset2Budi = assetRepo.create({
      id: asset2BudiId,
      pewarisId: pewarisHidup.id,
      type: AssetType.SAHAM,
      assetName: 'Portofolio Saham Blue Chip (BBCA & BBRI)',
      platform: 'Stockbit (Mandiri Sekuritas)',
      accountIdentifier: 'sb-budi-98210',
      status: AssetStatus.VERIFIED,
      custodyType: AssetCustodyType.VAULT,
      assignedNotarisId: notarisUser.id,
      verifiedByNotarisId: notarisUser.id,
      verifiedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
      inheritanceScheme: CalculationMethod.FARAIDH,
      keysRotatedAt: new Date(),
    });
    await assetRepo.save(asset2Budi);

    await allocRepo.save([
      allocRepo.create({
        id: crypto.randomUUID(),
        assetId: asset2BudiId,
        ahliWarisId: ahliWaris1Budi.id,
        percentage: 50.0,
        isExecutor: true,
        acknowledgedAt: new Date(),
      }),
      allocRepo.create({
        id: crypto.randomUUID(),
        assetId: asset2BudiId,
        ahliWarisId: ahliWaris2Budi.id,
        percentage: 50.0,
        isExecutor: false,
        acknowledgedAt: new Date(),
      }),
    ]);

    await keyShareRepo.save([
      keyShareRepo.create({
        id: crypto.randomUUID(),
        assetId: asset2BudiId,
        holder: KeyShareHolder.SYSTEM,
        encryptedShare: sealSystemShare(shares2Budi.systemShare, asset2BudiId),
      }),
      keyShareRepo.create({
        id: crypto.randomUUID(),
        assetId: asset2BudiId,
        holder: KeyShareHolder.NOTARIS,
        encryptedShare: `escrowed-cipher-notaris-share-${shares2Budi.notarisShare.substring(0, 16)}`,
      }),
    ]);

    createdKeyCheatSheet.push({
      pewaris: 'Bpk. Budi Santoso (Hidup)',
      assetName: asset2Budi.assetName,
      status: asset2Budi.status,
      executorShare: shares2Budi.executorShare,
      secretRaw: secret2Budi,
    });

    // 3. Aset Perbankan Verified (Kustodi Guidance)
    const asset3BudiId = crypto.randomUUID();
    const asset3Budi = assetRepo.create({
      id: asset3BudiId,
      pewarisId: pewarisHidup.id,
      type: AssetType.REKENING_BANK,
      assetName: 'Rekening Deposito Berjangka Rupiah',
      platform: 'Bank Mandiri',
      accountIdentifier: '123-00-9988776-5',
      status: AssetStatus.VERIFIED,
      custodyType: AssetCustodyType.GUIDANCE,
      assignedNotarisId: notarisUser.id,
      verifiedByNotarisId: notarisUser.id,
      verifiedAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
      inheritanceScheme: CalculationMethod.FARAIDH,
    });
    await assetRepo.save(asset3Budi);

    await allocRepo.save([
      allocRepo.create({
        id: crypto.randomUUID(),
        assetId: asset3BudiId,
        ahliWarisId: ahliWaris1Budi.id,
        percentage: 50.0,
        isExecutor: true,
      }),
      allocRepo.create({
        id: crypto.randomUUID(),
        assetId: asset3BudiId,
        ahliWarisId: ahliWaris2Budi.id,
        percentage: 50.0,
        isExecutor: false,
      }),
    ]);

    // === ASET PEWARIS 2 (WAFAT) ===
    // 1. Aset Siap Unlock (Status: UNLOCKED)
    const asset1HendraId = crypto.randomUUID();
    const secret1Hendra = JSON.stringify({
      walletAddress: '0x71C8363437913236169338f902E862B8820B49A1',
      privateKeyOrMnemonic:
        'hazard direct script marble volcano matrix ribbon crystal dynamic filter update sphere',
      securityPin: '990011',
    });
    const shares1Hendra = splitSecret(secret1Hendra);

    const asset1Hendra = assetRepo.create({
      id: asset1HendraId,
      pewarisId: pewarisWafat.id,
      type: AssetType.CRYPTO,
      assetName: 'Binance Multi-Asset Vault',
      platform: 'Binance',
      accountIdentifier: 'binance-hendra-7729',
      status: AssetStatus.UNLOCKED,
      custodyType: AssetCustodyType.VAULT,
      assignedNotarisId: notarisUser.id,
      verifiedByNotarisId: notarisUser.id,
      verifiedAt: sevenDaysAgo,
      inheritanceScheme: CalculationMethod.CIVIL,
      keysRotatedAt: thirtyDaysAgo,
    });
    await assetRepo.save(asset1Hendra);

    await allocRepo.save([
      allocRepo.create({
        id: crypto.randomUUID(),
        assetId: asset1HendraId,
        ahliWarisId: ahliWaris1Hendra.id,
        percentage: 50.0,
        isExecutor: true,
      }),
      allocRepo.create({
        id: crypto.randomUUID(),
        assetId: asset1HendraId,
        ahliWarisId: ahliWaris2Hendra.id,
        percentage: 50.0,
        isExecutor: false,
      }),
    ]);

    await keyShareRepo.save([
      keyShareRepo.create({
        id: crypto.randomUUID(),
        assetId: asset1HendraId,
        holder: KeyShareHolder.SYSTEM,
        encryptedShare: sealSystemShare(shares1Hendra.systemShare, asset1HendraId),
      }),
      keyShareRepo.create({
        id: crypto.randomUUID(),
        assetId: asset1HendraId,
        holder: KeyShareHolder.NOTARIS,
        encryptedShare: `escrowed-cipher-notaris-share-${shares1Hendra.notarisShare.substring(0, 16)}`,
      }),
    ]);

    createdKeyCheatSheet.push({
      pewaris: 'Alm. Hendra Wijaya (Wafat)',
      assetName: asset1Hendra.assetName,
      status: asset1Hendra.status,
      executorShare: shares1Hendra.executorShare,
      secretRaw: secret1Hendra,
    });

    // 2. Aset Dalam Likuidasi (Status: LIQUIDATING dengan Bukti SPTJM Menunggu Review Notaris)
    const asset2HendraId = crypto.randomUUID();
    const secret2Hendra = JSON.stringify({
      accountName: 'hendrawijaya_toko',
      twoFactorBackupCode: '8910-2341-5512',
    });
    const shares2Hendra = splitSecret(secret2Hendra);

    const asset2Hendra = assetRepo.create({
      id: asset2HendraId,
      pewarisId: pewarisWafat.id,
      type: AssetType.CRYPTO,
      assetName: 'Tokocrypto Staking & Savings Vault',
      platform: 'Tokocrypto',
      accountIdentifier: 'toko-hendra-4431',
      status: AssetStatus.LIQUIDATING,
      custodyType: AssetCustodyType.VAULT,
      assignedNotarisId: notarisUser.id,
      verifiedByNotarisId: notarisUser.id,
      verifiedAt: sevenDaysAgo,
      inheritanceScheme: CalculationMethod.CIVIL,
      keysRotatedAt: thirtyDaysAgo,
    });
    await assetRepo.save(asset2Hendra);

    await allocRepo.save([
      allocRepo.create({
        id: crypto.randomUUID(),
        assetId: asset2HendraId,
        ahliWarisId: ahliWaris1Hendra.id,
        percentage: 50.0,
        isExecutor: true,
      }),
      allocRepo.create({
        id: crypto.randomUUID(),
        assetId: asset2HendraId,
        ahliWarisId: ahliWaris2Hendra.id,
        percentage: 50.0,
        isExecutor: false,
      }),
    ]);

    await keyShareRepo.save([
      keyShareRepo.create({
        id: crypto.randomUUID(),
        assetId: asset2HendraId,
        holder: KeyShareHolder.SYSTEM,
        encryptedShare: sealSystemShare(shares2Hendra.systemShare, asset2HendraId),
      }),
    ]);

    await liqRepo.save(
      liqRepo.create({
        id: crypto.randomUUID(),
        assetId: asset2HendraId,
        executorId: ahliWaris1Hendra.id,
        pdfFileUrl:
          'https://storage.waristech.com/proofs/sptjm-dan-bukti-transfer-bambang-ke-dewi.pdf',
        pdfPassword: null,
        sptjmAgreed: true,
        status: LiquidationProofStatus.PENDING_VALIDATION,
        validationNotes: null,
      }),
    );

    createdKeyCheatSheet.push({
      pewaris: 'Alm. Hendra Wijaya (Wafat)',
      assetName: asset2Hendra.assetName,
      status: asset2Hendra.status,
      executorShare: shares2Hendra.executorShare,
      secretRaw: secret2Hendra,
    });

    // 3. Aset Sengketa (Status: FROZEN)
    const asset3HendraId = crypto.randomUUID();
    const asset3Hendra = assetRepo.create({
      id: asset3HendraId,
      pewarisId: pewarisWafat.id,
      type: AssetType.NFT,
      assetName: 'Rare Digital Art & Metaverse Land',
      platform: 'OpenSea',
      accountIdentifier: '0x33b87913236169338f902E862B8820B49A1FF',
      status: AssetStatus.FROZEN,
      custodyType: AssetCustodyType.VAULT,
      assignedNotarisId: notarisUser.id,
      inheritanceScheme: CalculationMethod.CIVIL,
    });
    await assetRepo.save(asset3Hendra);

    await allocRepo.save([
      allocRepo.create({
        id: crypto.randomUUID(),
        assetId: asset3HendraId,
        ahliWarisId: ahliWaris1Hendra.id,
        percentage: 50.0,
        isExecutor: true,
      }),
      allocRepo.create({
        id: crypto.randomUUID(),
        assetId: asset3HendraId,
        ahliWarisId: ahliWaris2Hendra.id,
        percentage: 50.0,
        isExecutor: false,
      }),
    ]);

    // 4. Aset Selesai (Status: CLOSED)
    const asset4HendraId = crypto.randomUUID();
    const asset4Hendra = assetRepo.create({
      id: asset4HendraId,
      pewarisId: pewarisWafat.id,
      type: AssetType.REKSA_DANA,
      assetName: 'Reksadana Pasar Uang Syariah',
      platform: 'Bibit (PT Bibit Tumbuh Bersama)',
      accountIdentifier: 'bibit-hendra-9012',
      status: AssetStatus.CLOSED,
      custodyType: AssetCustodyType.GUIDANCE,
      assignedNotarisId: notarisUser.id,
      verifiedByNotarisId: notarisUser.id,
      verifiedAt: thirtyDaysAgo,
      inheritanceScheme: CalculationMethod.CIVIL,
    });
    await assetRepo.save(asset4Hendra);

    await allocRepo.save([
      allocRepo.create({
        id: crypto.randomUUID(),
        assetId: asset4HendraId,
        ahliWarisId: ahliWaris1Hendra.id,
        percentage: 50.0,
        isExecutor: true,
        acknowledgedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
      }),
      allocRepo.create({
        id: crypto.randomUUID(),
        assetId: asset4HendraId,
        ahliWarisId: ahliWaris2Hendra.id,
        percentage: 50.0,
        isExecutor: false,
        acknowledgedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
      }),
    ]);

    // ── 8. Notifikasi Interaktif ─────────────────────────────────────────────
    logger.log('🔔 Membuat notifikasi realistis...');
    const notifRepo = dataSource.getRepository(NotificationEntity);

    const notifications: NotificationEntity[] = [
      notifRepo.create({
        userId: pewarisHidup.id,
        title: 'Brankas Warisan Siap',
        message:
          'Selamat datang di WarisTech! 2 aset Anda telah terdaftar dan siap diverifikasi oleh Notaris.',
        type: NotificationType.SUCCESS,
        isRead: true,
      }),
      notifRepo.create({
        userId: notarisUser.id,
        title: 'Verifikasi Aset Baru Menunggu',
        message:
          'Bpk. Budi Santoso mendaftarkan aset "Bitcoin & Ethereum Cold Storage" yang membutuhkan review & verifikasi Anda.',
        type: NotificationType.INFO,
        isRead: false,
      }),
      notifRepo.create({
        userId: notarisUser.id,
        title: 'Bukti Pencairan Masuk',
        message:
          'Eksekutor Bambang Wijaya telah mengunggah SPTJM dan bukti transfer untuk aset Tokocrypto Alm. Hendra Wijaya.',
        type: NotificationType.WARNING,
        isRead: false,
      }),
      notifRepo.create({
        userId: ahliWaris1Hendra.id,
        title: 'Brankas Aset Terbuka',
        message:
          'Masa jeda telah selesai dan seluruh saksi telah menyetujui. Anda dapat membuka brankas aset "Binance Multi-Asset Vault" sekarang.',
        type: NotificationType.SUCCESS,
        isRead: false,
      }),
    ];
    await notifRepo.save(notifications);

    // ── 9. Audit Trail MongoDB ───────────────────────────────────────────────
    if (mongoConn && mongoConn.readyState === 1) {
      logger.log('📜 Membuat catatan Audit Trail di MongoDB...');
      try {
        await mongoConn.collection('audit_logs').insertMany([
          {
            action: 'AUTH_LOGIN_SUCCESS',
            category: 'AUTH',
            severity: 'INFO',
            status: 'SUCCESS',
            actor: {
              userId: pewarisHidup.id,
              email: pewarisHidup.email,
              fullName: pewarisHidup.fullName,
              role: pewarisHidup.role,
            },
            resource: 'auth',
            description: `Pengguna ${pewarisHidup.fullName} berhasil masuk ke sistem.`,
            timestamp: new Date(),
          },
          {
            action: 'ASSET_CREATED',
            category: 'WARIS_ASSET',
            severity: 'INFO',
            status: 'SUCCESS',
            actor: {
              userId: pewarisHidup.id,
              email: pewarisHidup.email,
              fullName: pewarisHidup.fullName,
              role: pewarisHidup.role,
            },
            resource: 'assets',
            resourceId: asset1BudiId,
            description: `Pewaris mendaftarkan aset baru "Bitcoin & Ethereum Cold Storage" (Kustodi: VAULT).`,
            timestamp: new Date(Date.now() - 1 * 60 * 60 * 1000),
          },
          {
            action: 'DEATH_VERIFIED',
            category: 'LEGAL_VERIFICATION',
            severity: 'WARNING',
            status: 'SUCCESS',
            actor: {
              userId: notarisUser.id,
              email: notarisUser.email,
              fullName: notarisUser.fullName,
              role: notarisUser.role,
            },
            resource: 'death_verifications',
            resourceId: deathVerification.id,
            description: `Notaris Haryanto, S.H. memverifikasi dokumen kematian resmi Alm. Hendra Wijaya.`,
            timestamp: fiveDaysAgo,
          },
          {
            action: 'VAULT_UNLOCKED',
            category: 'WARIS_ASSET',
            severity: 'INFO',
            status: 'SUCCESS',
            actor: {
              userId: ahliWaris1Hendra.id,
              email: ahliWaris1Hendra.email,
              fullName: ahliWaris1Hendra.fullName,
              role: ahliWaris1Hendra.role,
            },
            resource: 'assets',
            resourceId: asset1HendraId,
            description: `Eksekutor Bambang Wijaya berhasil mengakses bagian kunci brankas digital Binance.`,
            timestamp: new Date(Date.now() - 30 * 60 * 1000),
          },
        ]);
        logger.log('✅ Audit logs MongoDB berhasil dibuat.');
      } catch (mongoErr) {
        logger.warn('⚠️ Gagal memasukkan audit logs MongoDB:', mongoErr);
      }
    }

    // ── Output Ringkasan Kredensial & Kunci ──────────────────────────────────
    logger.log('================================================================');
    logger.log('🎉 DATABASE SEEDING BERHASIL DISELESAIKAN!');
    logger.log('================================================================');
    logger.log('🔑 KREDENSIAL LOGIN SEMUA AKUN:');
    logger.log(`   Password Default: ${defaultPassword}`);
    logger.log('----------------------------------------------------------------');
    logger.log('📌 1. AKTOR SISTEM:');
    logger.log('   - Admin   : admin@waristech.com');
    logger.log('   - Notaris : notaris@waristech.com');
    logger.log('----------------------------------------------------------------');
    logger.log('📌 2. PEWARIS 1 (HIDUP / AKTIF PLANNING):');
    logger.log('   - Pewaris     : pewaris.hidup@waristech.com (atau pewaris@waristech.com)');
    logger.log('   - Ahli Waris 1: andi.santoso@waristech.com (atau ahliwaris@waristech.com) [Eksekutor]');
    logger.log('   - Ahli Waris 2: siti.santoso@waristech.com');
    logger.log('   - Undangan    : Kode "WARIS-DEMO-2026"');
    logger.log('----------------------------------------------------------------');
    logger.log('📌 3. PEWARIS 2 (MENINGGAL / POST-MORTEM EXECUTION & CLAIM):');
    logger.log('   - Pewaris     : pewaris.wafat@waristech.com (Alm. Hendra Wijaya)');
    logger.log('   - Ahli Waris 1: bambang.wijaya@waristech.com [Eksekutor]');
    logger.log('   - Ahli Waris 2: dewi.wijaya@waristech.com');
    logger.log('----------------------------------------------------------------');
    logger.log('🔐 CHEAT SHEET SHAMIR EXECUTOR SHARES UNTUK DEMO UNLOCK VAULT:');
    for (const item of createdKeyCheatSheet) {
      logger.log(`▶ [${item.pewaris}] - ${item.assetName} (Status: ${item.status})`);
      logger.log(`  Executor Share: ${item.executorShare}`);
      logger.log(`  Secret Isi: ${item.secretRaw}`);
    }
    logger.log('================================================================');
  } catch (error) {
    logger.error('❌ Database Seeding Gagal:', error);
    throw error;
  } finally {
    await app.close();
  }
}

void seed();
