export class CalculationException extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'CalculationException';
  }
}

export class UnsupportedCalculationMethodException extends CalculationException {
  constructor() {
    super('Metode perhitungan warisan ini belum didukung atau tidak valid.');
    this.name = 'UnsupportedCalculationMethodException';
  }
}

export class InsufficientDataForCalculationException extends CalculationException {
  constructor(
    message = 'Data aset atau data keluarga belum memadai/belum diverifikasi untuk melakukan perhitungan.',
  ) {
    super(message);
    this.name = 'InsufficientDataForCalculationException';
  }
}
