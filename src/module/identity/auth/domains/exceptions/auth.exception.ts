export class InvalidCredentialsError extends Error {
  constructor(message = 'Email atau password tidak valid') {
    super(message);
    this.name = 'InvalidCredentialsError';
  }
}

export class AccountDisabledError extends Error {
  constructor(message = 'Akun ini telah dinonaktifkan') {
    super(message);
    this.name = 'AccountDisabledError';
  }
}

export class AuthTokenExpiredError extends Error {
  constructor(message = 'Token sudah kadaluarsa. Silakan login kembali.') {
    super(message);
    this.name = 'AuthTokenExpiredError';
  }
}

export class InvalidTokenError extends Error {
  constructor(message = 'Token tidak valid atau telah dimanipulasi.') {
    super(message);
    this.name = 'InvalidTokenError';
  }
}

export class InvalidInvitationCodeError extends Error {
  constructor(
    message = 'Kode undangan (invitation code) tidak valid atau sudah tidak berlaku.',
  ) {
    super(message);
    this.name = 'InvalidInvitationCodeError';
  }
}
