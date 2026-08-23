/**
 * Jenis instrumen keuangan/digital yang dapat disimpan sebagai aset warisan.
 * HANYA mencakup aset digital — tidak ada aset fisik (tanah, rumah, dll).
 */
export enum AssetType {
  CRYPTO = 'CRYPTO', // Bitcoin, Ethereum, Altcoin, dst.
  SAHAM = 'SAHAM', // Saham lokal (BEI) maupun global
  REKSA_DANA = 'REKSA_DANA', // Reksa Dana Pasar Uang (RDPU), campuran, dll.
  OBLIGASI = 'OBLIGASI', // Obligasi, SBN, ORI, Sukuk
  E_WALLET = 'E_WALLET', // GoPay, OVO, Dana, ShopeePay, LinkAja
  REKENING_BANK = 'REKENING_BANK', // Tabungan, Deposito, Giro
  ASURANSI_JIWA = 'ASURANSI_JIWA', // Polis asuransi jiwa unit-link/tradisional
  P2P_LENDING = 'P2P_LENDING', // Portofolio pinjaman di platform P2P
  EMAS_DIGITAL = 'EMAS_DIGITAL', // Emas digital (Antam Digital, Pegadaian Digital)
  NFT = 'NFT', // Non-Fungible Token yang bernilai
  DOMAIN_WEBSITE = 'DOMAIN_WEBSITE', // Aset digital domain/website bernilai bisnis
  LAINNYA = 'LAINNYA', // Aset digital lain yang belum terkategori
}

export enum AssetStatus {
  PENDING_VERIFICATION = 'PENDING_VERIFICATION', // Menunggu verifikasi Notaris
  VERIFIED = 'VERIFIED', // Diverifikasi Notaris
  REJECTED = 'REJECTED', // Ditolak Notaris
  FROZEN = 'FROZEN', // Dibekukan karena ada sengketa (DISPUTE) dari Saksi
  UNLOCKED = 'UNLOCKED', // Brankas terbuka (Saksi APPROVE semua)
  LIQUIDATING = 'LIQUIDATING', // Eksekutor sedang mencairkan (sudah upload bukti)
  DISTRIBUTED = 'DISTRIBUTED', // Validasi AI sukses, menunggu konfirmasi penerima
  DISPUTED_LIQUIDATION = 'DISPUTED_LIQUIDATION', // Timeout / sengketa saat pencairan
  CLOSED = 'CLOSED', // Kasus ditutup oleh Notaris, data di-shredding
}
