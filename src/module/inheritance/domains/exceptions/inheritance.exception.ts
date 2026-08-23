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
