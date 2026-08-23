export class EkycValidationException extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'EkycValidationException';
  }
}

export class EkycProviderException extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'EkycProviderException';
  }
}
