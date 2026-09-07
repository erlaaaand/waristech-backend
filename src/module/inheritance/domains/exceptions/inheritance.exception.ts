export class InvitationExpiredException extends Error {
  constructor(message = 'Kode undangan sudah kedaluwarsa.') {
    super(message);
    this.name = 'InvitationExpiredException';
  }
}

export class InvitationAlreadyUsedException extends Error {
  constructor(message = 'Kode undangan sudah digunakan sebelumnya.') {
    super(message);
    this.name = 'InvitationAlreadyUsedException';
  }
}

export class InvitationNotFoundException extends Error {
  constructor(message = 'Kode undangan tidak ditemukan atau tidak valid.') {
    super(message);
    this.name = 'InvitationNotFoundException';
  }
}

export class FamilyMemberNotFoundException extends Error {
  constructor(message = 'Data anggota keluarga tidak ditemukan.') {
    super(message);
    this.name = 'FamilyMemberNotFoundException';
  }
}

export class NotAuthorizedForFamilyMemberException extends Error {
  constructor(
    message = 'Anda tidak memiliki akses terhadap data anggota keluarga ini.',
  ) {
    super(message);
    this.name = 'NotAuthorizedForFamilyMemberException';
  }
}

export class InvalidFamilyMemberStatusTransitionException extends Error {
  constructor(
    message = 'Data anggota keluarga ini sedang berada di status yang tidak mengizinkan aksi ini (mungkin sudah diproses oleh permintaan lain).',
  ) {
    super(message);
    this.name = 'InvalidFamilyMemberStatusTransitionException';
  }
}

export class NonNasabRequiresNotarisVerificationException extends Error {
  constructor(
    message = 'Hubungan Non-Nasab wajib diverifikasi oleh Notaris, tidak dapat dikonfirmasi langsung oleh Pewaris.',
  ) {
    super(message);
    this.name = 'NonNasabRequiresNotarisVerificationException';
  }
}

export class MissingSupportingDocumentException extends Error {
  constructor(
    message = 'Hubungan Non-Nasab wajib menyertakan URL dokumen pendukung (Surat Wasiat/Hibah).',
  ) {
    super(message);
    this.name = 'MissingSupportingDocumentException';
  }
}

export class DeathVerificationNotFoundException extends Error {
  constructor(message = 'Dokumen verifikasi kematian tidak ditemukan.') {
    super(message);
    this.name = 'DeathVerificationNotFoundException';
  }
}

export class AlreadyFamilyMemberException extends Error {
  constructor(
    message = 'Anda sudah terhubung dengan Pewaris ini sebagai anggota keluarga.',
  ) {
    super(message);
    this.name = 'AlreadyFamilyMemberException';
  }
}
