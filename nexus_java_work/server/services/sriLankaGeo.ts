/**
 * Server-side Sri Lankan Administrative Geography & Location Data
 */

export interface SriLankaDistrictInfo {
  name: string;
  province: string;
  keyCities: string[];
}

export const SRI_LANKA_PROVINCES = [
  'Western',
  'Central',
  'Southern',
  'Northern',
  'Eastern',
  'North Western',
  'North Central',
  'Uva',
  'Sabaragamuwa',
] as const;

export const SRI_LANKA_DISTRICTS: Record<string, { name: string; province: string; keyCities: string[] }> = {
  Colombo: {
    name: 'Colombo',
    province: 'Western',
    keyCities: ['Colombo', 'Nugegoda', 'Rajagiriya', 'Battaramulla', 'Pelawatta', 'Thalawathugoda', 'Dehiwala', 'Mount Lavinia', 'Moratuwa', 'Kottawa', 'Maharagama', 'Kaduwela', 'Malabe', 'Homagama'],
  },
  Gampaha: {
    name: 'Gampaha',
    province: 'Western',
    keyCities: ['Gampaha', 'Negombo', 'Wattala', 'Ja-Ela', 'Kelaniya', 'Kadawatha', 'Kiribathgoda', 'Kochchikade'],
  },
  Kalutara: {
    name: 'Kalutara',
    province: 'Western',
    keyCities: ['Kalutara', 'Panadura', 'Horana', 'Beruwala', 'Aluthgama', 'Wadduwa'],
  },
  Kandy: {
    name: 'Kandy',
    province: 'Central',
    keyCities: ['Kandy', 'Peradeniya', 'Katugastota', 'Kundasale', 'Digana', 'Gampola'],
  },
  Matale: {
    name: 'Matale',
    province: 'Central',
    keyCities: ['Matale', 'Dambulla', 'Sigiriya', 'Galewela'],
  },
  NuwaraEliya: {
    name: 'Nuwara Eliya',
    province: 'Central',
    keyCities: ['Nuwara Eliya', 'Hatton', 'Talawakelle', 'Maskeliya'],
  },
  Galle: {
    name: 'Galle',
    province: 'Southern',
    keyCities: ['Galle', 'Galle Fort', 'Karapitiya', 'Unawatuna', 'Hikkaduwa', 'Bentota'],
  },
  Matara: {
    name: 'Matara',
    province: 'Southern',
    keyCities: ['Matara', 'Polhena', 'Mirissa', 'Weligama', 'Dikwella'],
  },
  Hambantota: {
    name: 'Hambantota',
    province: 'Southern',
    keyCities: ['Hambantota', 'Tangalle', 'Tissamaharama', 'Beliatta'],
  },
  Jaffna: {
    name: 'Jaffna',
    province: 'Northern',
    keyCities: ['Jaffna', 'Nallur', 'Chundikuli', 'Chavakachcheri', 'Point Pedro'],
  },
  Kilinochchi: {
    name: 'Kilinochchi',
    province: 'Northern',
    keyCities: ['Kilinochchi', 'Paranthan', 'Pallai'],
  },
  Mannar: {
    name: 'Mannar',
    province: 'Northern',
    keyCities: ['Mannar', 'Madhu', 'Pesalai'],
  },
  Mullaitivu: {
    name: 'Mullaitivu',
    province: 'Northern',
    keyCities: ['Mullaitivu', 'Puthukkudiyiruppu', 'Oddusuddan'],
  },
  Vavuniya: {
    name: 'Vavuniya',
    province: 'Northern',
    keyCities: ['Vavuniya', 'Cheddikulam'],
  },
  Batticaloa: {
    name: 'Batticaloa',
    province: 'Eastern',
    keyCities: ['Batticaloa', 'Kattankudy', 'Eravur', 'Pasikudah'],
  },
  Ampara: {
    name: 'Ampara',
    province: 'Eastern',
    keyCities: ['Ampara', 'Kalmunai', 'Akkaraipattu', 'Arugam Bay'],
  },
  Trincomalee: {
    name: 'Trincomalee',
    province: 'Eastern',
    keyCities: ['Trincomalee', 'Nilaveli', 'Kinniya', 'Kantale'],
  },
  Kurunegala: {
    name: 'Kurunegala',
    province: 'North Western',
    keyCities: ['Kurunegala', 'Kuliyapitiya', 'Narammala', 'Wariyapola', 'Polgahawela'],
  },
  Puttalam: {
    name: 'Puttalam',
    province: 'North Western',
    keyCities: ['Puttalam', 'Chilaw', 'Wennappuwa', 'Marawila', 'Kalpitiya'],
  },
  Anuradhapura: {
    name: 'Anuradhapura',
    province: 'North Central',
    keyCities: ['Anuradhapura', 'Medawachchiya', 'Kekirawa', 'Eppawala'],
  },
  Polonnaruwa: {
    name: 'Polonnaruwa',
    province: 'North Central',
    keyCities: ['Polonnaruwa', 'Kaduruwela', 'Hingurakgoda', 'Minneriya'],
  },
  Badulla: {
    name: 'Badulla',
    province: 'Uva',
    keyCities: ['Badulla', 'Bandarawela', 'Ella', 'Haputale', 'Welimada'],
  },
  Monaragala: {
    name: 'Monaragala',
    province: 'Uva',
    keyCities: ['Monaragala', 'Wellawaya', 'Buttala', 'Kataragama'],
  },
  Ratnapura: {
    name: 'Ratnapura',
    province: 'Sabaragamuwa',
    keyCities: ['Ratnapura', 'Balangoda', 'Pelmadulla', 'Embilipitiya'],
  },
  Kegalle: {
    name: 'Kegalle',
    province: 'Sabaragamuwa',
    keyCities: ['Kegalle', 'Mawanella', 'Warakapola', 'Ruwanwella'],
  },
};

export function getAllDistricts(): string[] {
  return Object.values(SRI_LANKA_DISTRICTS).map(d => d.name);
}

export const getAllDistrictNames = getAllDistricts;

export function isValidDistrict(district: string): boolean {
  if (!district) return false;
  const clean = district.trim().toLowerCase();
  return Object.values(SRI_LANKA_DISTRICTS).some(d => d.name.toLowerCase() === clean);
}

export function isValidProvince(province: string): boolean {
  if (!province) return false;
  const clean = province.trim().toLowerCase();
  return SRI_LANKA_PROVINCES.some(p => p.toLowerCase() === clean);
}

export function getProvinceForDistrict(district: string): string | null {
  if (!district) return null;
  const clean = district.trim().toLowerCase();
  const found = Object.values(SRI_LANKA_DISTRICTS).find(d => d.name.toLowerCase() === clean);
  return found ? found.province : null;
}
