import { EkycResult } from '../value-objects/ekyc-result.vo';

export const EKYC_PROVIDER_TOKEN = Symbol('EKYC_PROVIDER_TOKEN');

export interface IEkycProvider {
  verifyNik(nik: string): Promise<EkycResult>;
}
