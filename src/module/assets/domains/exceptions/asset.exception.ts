export class AssetException extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'AssetException';
  }
}

export class AssetNotFoundException extends AssetException {
  constructor() {
    super('Aset warisan tidak ditemukan.');
    this.name = 'AssetNotFoundException';
  }
}

export class AssetNotOwnedException extends AssetException {
  constructor() {
    super(
      'Anda tidak memiliki izin untuk mengakses atau memodifikasi aset ini.',
    );
    this.name = 'AssetNotOwnedException';
  }
}

export class AssetAlreadyVerifiedException extends AssetException {
  constructor(
    message = 'Aset yang sudah diverifikasi tidak dapat diubah atau dihapus.',
  ) {
    super(message);
    this.name = 'AssetAlreadyVerifiedException';
  }
}

export class AssetAllocationExceededException extends AssetException {
  constructor(message = 'Total persentase alokasi ahli waris melebihi 100%.') {
    super(message);
    this.name = 'AssetAllocationExceededException';
  }
}
