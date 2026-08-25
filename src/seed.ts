import { NestFactory } from '@nestjs/core';
import { Logger } from '@nestjs/common';
import { AppModule } from './app.module';
import { UserRole } from './module/identity/users/domains/entities/user.entity';
import {
  USER_REPOSITORY_TOKEN,
  type IUserRepository,
} from './module/identity/users/infrastructures/repositories/user.repository.interface';
import { CryptoUtil } from './module/shared/utils/crypto.util';

async function seed() {
  const logger = new Logger('Seeder');
  logger.log('🌱 Starting Database Seeding for Testing Login...');

  const app = await NestFactory.createApplicationContext(AppModule);

  try {
    const userRepo = app.get<IUserRepository>(USER_REPOSITORY_TOKEN, {
      strict: false,
    });

    const defaultPassword = 'Password123!';
    const hashedPassword = await CryptoUtil.hashPassword(defaultPassword);

    const testUsers = [
      {
        email: 'pewaris@waristech.com',
        fullName: 'Bapak Budi Santoso',
        nik: '3171012345670001',
        phoneNumber: '081234567890',
        role: UserRole.PEWARIS,
        isEmailVerified: true,
        isActive: true,
      },
      {
        email: 'ahliwaris@waristech.com',
        fullName: 'Andi Santoso',
        nik: '3171012345670002',
        phoneNumber: '081234567891',
        role: UserRole.AHLI_WARIS,
        isEmailVerified: true,
        isActive: true,
      },
      {
        email: 'notaris@waristech.com',
        fullName: 'Notaris Haryanto, S.H.',
        nik: '3171012345670003',
        phoneNumber: '081234567892',
        role: UserRole.NOTARIS,
        isEmailVerified: true,
        isActive: true,
      },
      {
        email: 'admin@waristech.com',
        fullName: 'System Administrator',
        nik: '3171012345670000',
        phoneNumber: '081234567899',
        role: UserRole.ADMIN,
        isEmailVerified: true,
        isActive: true,
      },
    ];

    for (const userData of testUsers) {
      const existingUser = await userRepo.findByEmail(userData.email);

      if (existingUser) {
        existingUser.password = hashedPassword;
        existingUser.fullName = userData.fullName;
        existingUser.role = userData.role;
        existingUser.isEmailVerified = true;
        existingUser.isActive = true;
        await userRepo.save(existingUser);
        logger.log(`🔄 User updated: ${userData.email} (${userData.role})`);
      } else {
        const newUser = await userRepo.create({
          ...userData,
          password: hashedPassword,
        });
        logger.log(`✅ User created: ${newUser.email} (${newUser.role})`);
      }
    }

    logger.log('--------------------------------------------------');
    logger.log('🎉 DB Seeding completed successfully!');
    logger.log('🔑 Credentials for Login Testing:');
    logger.log('   Default Password: Password123!');
    logger.log('   - Pewaris     : pewaris@waristech.com');
    logger.log('   - Ahli Waris  : ahliwaris@waristech.com');
    logger.log('   - Notaris     : notaris@waristech.com');
    logger.log('   - Admin       : admin@waristech.com');
    logger.log('--------------------------------------------------');
  } catch (error) {
    logger.error('❌ Seeding failed:', error);
  } finally {
    await app.close();
  }
}

seed();
