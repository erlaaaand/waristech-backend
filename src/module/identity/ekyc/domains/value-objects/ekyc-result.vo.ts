export class EkycResult {
  constructor(
    public readonly isValid: boolean,
    public readonly nik: string,
    public readonly message: string,
    public readonly simulatedData?: {
      provinsi: string;
      tanggalLahir: string;
      jenisKelamin: 'Laki-laki' | 'Perempuan';
    },
  ) {}
}
