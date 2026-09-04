import { NestFactory } from '@nestjs/core';
import { Logger } from '@nestjs/common';
import { writeFileSync } from 'fs';
import { join } from 'path';
import { AppModule } from '../app.module';
import {
  ASSET_REPOSITORY_TOKEN,
  type IAssetRepository,
} from '../module/assets/domains/repositories/asset.repository.interface';
import {
  ENCRYPTION_SERVICE_TOKEN,
  type IEncryptionService,
} from '../module/assets/domains/services/encryption.service.interface';
import {
  SECRET_SHARING_SERVICE_TOKEN,
  type ISecretSharingService,
} from '../module/assets/domains/services/secret-sharing.service.interface';
import {
  KEY_SHARE_REPOSITORY_TOKEN,
  type IKeyShareRepository,
} from '../module/assets/domains/repositories/key-share.repository.interface';
import { KeyShareHolder } from '../module/assets/domains/enums/key-share.enum';

/**
 * Migrasi satu-kali (jalankan manual, TIDAK otomatis saat startup).
 *
 * Aset lama menyimpan kredensial sebagai `encryptedSecret` tunggal yang bisa
 * dibuka server. Skrip ini memecahnya menjadi 3 bagian Shamir, menyimpan HANYA
 * bagian SYSTEM di database, lalu menuliskan bagian EXECUTOR & NOTARIS ke satu
 * berkas keluaran untuk didistribusikan secara manual ke pemiliknya.
 *
 * ⚠️  BERKAS KELUARAN BERISI BAHAN KUNCI SENSITIF.
 *     Serahkan tiap bagian ke pemiliknya melalui kanal aman, lalu HAPUS berkas ini.
 *     Selama berkas ini masih ada di server, jaminan "server tidak memegang kunci
 *     utuh" BELUM berlaku untuk aset-aset yang baru dimigrasi.
 */
async function migrate() {
  const logger = new Logger('MigrateSecretSharing');
  logger.log(
    '🔐 Memulai migrasi aset lama ke skema Secret Sharing (2-dari-3)...',
  );

  const app = await NestFactory.createApplicationContext(AppModule);
  const distribution: Array<{
    assetId: string;
    assetName: string;
    pewarisId: string;
    executorShare: string;
    notarisShare: string;
  }> = [];

  try {
    const assetRepo = app.get<IAssetRepository>(ASSET_REPOSITORY_TOKEN, {
      strict: false,
    });
    const encryptionService = app.get<IEncryptionService>(
      ENCRYPTION_SERVICE_TOKEN,
      { strict: false },
    );
    const secretSharingService = app.get<ISecretSharingService>(
      SECRET_SHARING_SERVICE_TOKEN,
      { strict: false },
    );
    const keyShareRepo = app.get<IKeyShareRepository>(
      KEY_SHARE_REPOSITORY_TOKEN,
      { strict: false },
    );

    const legacyAssets = await assetRepo.findAllWithLegacySecret();
    logger.log(
      `Ditemukan ${legacyAssets.length} aset dengan skema enkripsi lama.`,
    );

    let migrated = 0;
    let failed = 0;

    for (const asset of legacyAssets) {
      try {
        const plainText = await encryptionService.decrypt(
          asset.getEncryptedSecret(),
        );
        const shares = await secretSharingService.splitSecret(plainText);

        const shareOf = (holder: KeyShareHolder): string => {
          const found = shares.find((s) => s.holder === holder);
          if (!found) throw new Error(`Bagian kunci ${holder} gagal dibuat.`);
          return found.rawShare;
        };

        // Hanya bagian SYSTEM yang masuk database.
        await keyShareRepo.createMany(asset.id, [
          {
            holder: KeyShareHolder.SYSTEM,
            encryptedShare: secretSharingService.sealSystemShare(
              shareOf(KeyShareHolder.SYSTEM),
              asset.id,
            ),
          },
        ]);

        distribution.push({
          assetId: asset.id,
          assetName: asset.assetName,
          pewarisId: asset.pewarisId,
          executorShare: shareOf(KeyShareHolder.EXECUTOR),
          notarisShare: shareOf(KeyShareHolder.NOTARIS),
        });

        // Data shredding kredensial lama — pola sama seperti CloseAssetUseCase.
        await assetRepo.update(asset.id, { encryptedSecret: '' });

        migrated++;
        logger.log(
          `✅ Aset ${asset.id} ("${asset.assetName}") berhasil dimigrasi.`,
        );
      } catch (error) {
        failed++;
        logger.error(
          `❌ Gagal migrasi aset ${asset.id}`,
          error instanceof Error ? error.stack : String(error),
        );
      }
    }

    if (distribution.length > 0) {
      const outPath = join(
        process.cwd(),
        `secret-shares-to-distribute-${Date.now()}.json`,
      );
      writeFileSync(outPath, JSON.stringify(distribution, null, 2), 'utf8');
      logger.warn(
        `📄 Bagian kunci untuk didistribusikan ditulis ke: ${outPath}`,
      );
      logger.warn(
        '⚠️  Serahkan tiap bagian ke Eksekutor & Notaris via kanal aman, lalu HAPUS berkas ini.',
      );
    }

    logger.log('--------------------------------------------------');
    logger.log(
      `🎉 Migrasi selesai: ${migrated} berhasil, ${failed} gagal dari total ${legacyAssets.length} aset.`,
    );
  } catch (error) {
    logger.error('❌ Migrasi gagal total:', error);
  } finally {
    await app.close();
  }
}

void migrate();
