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

export class HeirsNotAcknowledgedException extends AssetException {
  constructor(public readonly unacknowledgedHeirIds: string[]) {
    super(
      `Masih ada ${unacknowledgedHeirIds.length} ahli waris yang belum mengonfirmasi penerimaan bagian. Sertakan 'reason' pada request untuk menutup kasus secara paksa (force-close).`,
    );
    this.name = 'HeirsNotAcknowledgedException';
  }
}

export class InvalidAssetStatusTransitionException extends AssetException {
  constructor(
    message = 'Aset ini sedang berada di status yang tidak mengizinkan aksi ini (mungkin sudah diproses oleh permintaan lain).',
  ) {
    super(message);
    this.name = 'InvalidAssetStatusTransitionException';
  }
}

export class InvalidKeyShareFormatException extends AssetException {
  constructor(
    message = 'Format bagian kunci (key share) tidak valid atau rusak.',
  ) {
    super(message);
    this.name = 'InvalidKeyShareFormatException';
  }
}

export class AllocationDeviatesFromLegalSchemeException extends AssetException {
  constructor(
    public readonly expectedPercentage: number,
    public readonly actualPercentage: number,
  ) {
    super(
      `Persentase alokasi (${actualPercentage}%) menyimpang dari hasil hitungan skema hukum waris pilihan Anda ` +
        `(seharusnya ${expectedPercentage.toFixed(2)}%). Sertakan 'reason' pada request untuk tetap melanjutkan.`,
    );
    this.name = 'AllocationDeviatesFromLegalSchemeException';
  }
}
