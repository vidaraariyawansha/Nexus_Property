/**
 * Sri Lankan Administrative Geography & Location Data
 * Contains all 25 districts, 9 provinces, district-to-province mappings,
 * and key cities/townships for property search and filtering.
 */

export interface SriLankaDistrictInfo {
  name: string;
  nameSi: string;
  nameTa: string;
  province: string;
  provinceSi: string;
  provinceTa: string;
  keyCities: string[];
}

export const SRI_LANKA_PROVINCES = [
  { name: 'Western', nameSi: 'බස්නාහිර', nameTa: 'மேல்' },
  { name: 'Central', nameSi: 'මධ්‍යම', nameTa: 'மத்திய' },
  { name: 'Southern', nameSi: 'දකුණු', nameTa: 'தென்' },
  { name: 'Northern', nameSi: 'උතුරු', nameTa: 'வடக்கு' },
  { name: 'Eastern', nameSi: 'නැගෙනහිර', nameTa: 'கிழக்கு' },
  { name: 'North Western', nameSi: 'වයඹ', nameTa: 'வடமேல்' },
  { name: 'North Central', nameSi: 'උතුරු මැද', nameTa: 'வடமத்திய' },
  { name: 'Uva', nameSi: 'ඌව', nameTa: 'ஊவா' },
  { name: 'Sabaragamuwa', nameSi: 'සබරගමුව', nameTa: 'சப்ரகமுவ' },
] as const;

export type SriLankaProvince = typeof SRI_LANKA_PROVINCES[number]['name'];

export const SRI_LANKA_DISTRICTS: Record<string, SriLankaDistrictInfo> = {
  Colombo: {
    name: 'Colombo',
    nameSi: 'කොළඹ',
    nameTa: 'கொழும்பு',
    province: 'Western',
    provinceSi: 'බස්නාහිර',
    provinceTa: 'மேல்',
    keyCities: [
      'Colombo 01 - Fort',
      'Colombo 02 - Slave Island',
      'Colombo 03 - Kollupitiya',
      'Colombo 04 - Bambalapitiya',
      'Colombo 05 - Havelock Town',
      'Colombo 06 - Wellawatte',
      'Colombo 07 - Cinnamon Gardens',
      'Colombo 08 - Borella',
      'Nugegoda',
      'Rajagiriya',
      'Battaramulla',
      'Pelawatta',
      'Thalawathugoda',
      'Dehiwala',
      'Mount Lavinia',
      'Moratuwa',
      'Kottawa',
      'Maharagama',
      'Kaduwela',
      'Malabe',
      'Homagama',
      'Piliyandala',
    ],
  },
  Gampaha: {
    name: 'Gampaha',
    nameSi: 'ගම්පහ',
    nameTa: 'கம்பஹா',
    province: 'Western',
    provinceSi: 'බස්නාහිර',
    provinceTa: 'மேல்',
    keyCities: [
      'Gampaha',
      'Negombo',
      'Wattala',
      'Ja-Ela',
      'Kelaniya',
      'Kadawatha',
      'Kiribathgoda',
      'Minuwangoda',
      'Kochchikade',
      'Ragama',
      'Seeduwa',
    ],
  },
  Kalutara: {
    name: 'Kalutara',
    nameSi: 'කළුතර',
    nameTa: 'களுத்துறை',
    province: 'Western',
    provinceSi: 'බස්නාහිර',
    provinceTa: 'மேல்',
    keyCities: ['Kalutara', 'Panadura', 'Horana', 'Beruwala', 'Aluthgama', 'Wadduwa', 'Matugama', 'Bandaragama'],
  },
  Kandy: {
    name: 'Kandy',
    nameSi: 'මහනුවර',
    nameTa: 'கண்டி',
    province: 'Central',
    provinceSi: 'මධ්‍යම',
    provinceTa: 'மத்திய',
    keyCities: ['Kandy City', 'Peradeniya', 'Katugastota', 'Kundasale', 'Digana', 'Gampola', 'Nawalapitiya', 'Akurana'],
  },
  Matale: {
    name: 'Matale',
    nameSi: 'මාතලේ',
    nameTa: 'மாத்தளை',
    province: 'Central',
    provinceSi: 'මධ්‍යම',
    provinceTa: 'மத்திய',
    keyCities: ['Matale', 'Dambulla', 'Sigiriya', 'Galewela', 'Ukuwela', 'Rattota'],
  },
  NuwaraEliya: {
    name: 'Nuwara Eliya',
    nameSi: 'නුවරඑළිය',
    nameTa: 'நுவரெலியா',
    province: 'Central',
    provinceSi: 'මධ්‍යම',
    provinceTa: 'மத்திய',
    keyCities: ['Nuwara Eliya', 'Hatton', 'Talawakelle', 'Ginigathena', 'Maskeliya', 'Nanu Oya'],
  },
  Galle: {
    name: 'Galle',
    nameSi: 'ගාල්ල',
    nameTa: 'காலி',
    province: 'Southern',
    provinceSi: 'දකුණු',
    provinceTa: 'தென்',
    keyCities: ['Galle City', 'Galle Fort', 'Karapitiya', 'Unawatuna', 'Hikkaduwa', 'Ambalangoda', 'Bentota', 'Baddegama'],
  },
  Matara: {
    name: 'Matara',
    nameSi: 'මාතර',
    nameTa: 'மாத்தறை',
    province: 'Southern',
    provinceSi: 'දකුණු',
    provinceTa: 'தென்',
    keyCities: ['Matara City', 'Polhena', 'Mirissa', 'Weligama', 'Dikwella', 'Akuressa', 'Kamburupitiya'],
  },
  Hambantota: {
    name: 'Hambantota',
    nameSi: 'හම්බන්තොට',
    nameTa: 'அம்பாந்தோட்டை',
    province: 'Southern',
    provinceSi: 'දකුණු',
    provinceTa: 'தெන්',
    keyCities: ['Hambantota', 'Tangalle', 'Tissamaharama', 'Beliatta', 'Ambalantota'],
  },
  Jaffna: {
    name: 'Jaffna',
    nameSi: 'යාපනය',
    nameTa: 'யாழ்ப்பாணம்',
    province: 'Northern',
    provinceSi: 'උතුරු',
    provinceTa: 'வடக்கு',
    keyCities: ['Jaffna City', 'Nallur', 'Chundikuli', 'Chavakachcheri', 'Point Pedro', 'Karainagar', 'Chunnakam'],
  },
  Kilinochchi: {
    name: 'Kilinochchi',
    nameSi: 'කිලිනොච්චිය',
    nameTa: 'கிளிநொச்சி',
    province: 'Northern',
    provinceSi: 'උතුරු',
    provinceTa: 'வடக்கு',
    keyCities: ['Kilinochchi', 'Paranthan', 'Pallai', 'Poonakary'],
  },
  Mannar: {
    name: 'Mannar',
    nameSi: 'මන්නාරම',
    nameTa: 'மன்னார்',
    province: 'Northern',
    provinceSi: 'උතුරු',
    provinceTa: 'வடக்கு',
    keyCities: ['Mannar Town', 'Madhu', 'Pesalai', 'Nanaddan'],
  },
  Mullaitivu: {
    name: 'Mullaitivu',
    nameSi: 'මුලතිව්',
    nameTa: 'முல்லைத்தீவு',
    province: 'Northern',
    provinceSi: 'උතුරු',
    provinceTa: 'வடக்கு',
    keyCities: ['Mullaitivu', 'Puthukkudiyiruppu', 'Oddusuddan', 'Mankulam'],
  },
  Vavuniya: {
    name: 'Vavuniya',
    nameSi: 'වවුනියාව',
    nameTa: 'வவுனியா',
    province: 'Northern',
    provinceSi: 'උතුරු',
    provinceTa: 'வடக்கு',
    keyCities: ['Vavuniya Town', 'Cheddikulam', 'Nedunkeni'],
  },
  Batticaloa: {
    name: 'Batticaloa',
    nameSi: 'මඩකලපුව',
    nameTa: 'மட்டக்களப்பு',
    province: 'Eastern',
    provinceSi: 'නැගෙනහිර',
    provinceTa: 'கிழக்கு',
    keyCities: ['Batticaloa Town', 'Kattankudy', 'Eravur', 'Valaichchenai', 'Pasikudah', 'Kallady'],
  },
  Ampara: {
    name: 'Ampara',
    nameSi: 'අම්පාර',
    nameTa: 'அம்பாறை',
    province: 'Eastern',
    provinceSi: 'නැගෙනහිර',
    provinceTa: 'கிழக்கு',
    keyCities: ['Ampara Town', 'Kalmunai', 'Sammanthurai', 'Akkaraipattu', 'Pottuvil', 'Arugam Bay'],
  },
  Trincomalee: {
    name: 'Trincomalee',
    nameSi: 'ත්‍රිකුණාමලය',
    nameTa: 'திருகோணமலை',
    province: 'Eastern',
    provinceSi: 'නැගෙනහිර',
    provinceTa: 'கிழக்கு',
    keyCities: ['Trincomalee Town', 'Nilaveli', 'Kinniya', 'Muttur', 'Kantale', 'Uppuveli'],
  },
  Kurunegala: {
    name: 'Kurunegala',
    nameSi: 'කුරුණෑගල',
    nameTa: 'குருணாகல்',
    province: 'North Western',
    provinceSi: 'වයඹ',
    provinceTa: 'வடமேல்',
    keyCities: ['Kurunegala City', 'Kuliyapitiya', 'Narammala', 'Wariyapola', 'Pannala', 'Polgahawela', 'Mawathagama'],
  },
  Puttalam: {
    name: 'Puttalam',
    nameSi: 'පුත්තලම',
    nameTa: 'புத்தளம்',
    province: 'North Western',
    provinceSi: 'වයඹ',
    provinceTa: 'வடமேல்',
    keyCities: ['Puttalam Town', 'Chilaw', 'Wennappuwa', 'Marawila', 'Dankotuwa', 'Kalpitiya', 'Nattandiya'],
  },
  Anuradhapura: {
    name: 'Anuradhapura',
    nameSi: 'අනුරාධපුරය',
    nameTa: 'அனுராதபுரம்',
    province: 'North Central',
    provinceSi: 'උතුරු මැද',
    provinceTa: 'வடமத்திய',
    keyCities: ['Anuradhapura City', 'Medawachchiya', 'Kekirawa', 'Eppawala', 'Tambuttegama', 'Mihintale'],
  },
  Polonnaruwa: {
    name: 'Polonnaruwa',
    nameSi: 'පොළොන්නරුව',
    nameTa: 'பொலன்னறுவை',
    province: 'North Central',
    provinceSi: 'උතුරු මැද',
    provinceTa: 'வடமத்திய',
    keyCities: ['Polonnaruwa Town', 'Kaduruwela', 'Hingurakgoda', 'Medirigiriya', 'Minneriya'],
  },
  Badulla: {
    name: 'Badulla',
    nameSi: 'බදුල්ල',
    nameTa: 'பதுளை',
    province: 'Uva',
    provinceSi: 'ඌව',
    provinceTa: 'ஊவா',
    keyCities: ['Badulla City', 'Bandarawela', 'Ella', 'Hali-Ela', 'Haputale', 'Welimada', 'Mahiyanganaya'],
  },
  Monaragala: {
    name: 'Monaragala',
    nameSi: 'මොණරාගල',
    nameTa: 'மொணராகலை',
    province: 'Uva',
    provinceSi: 'ඌව',
    provinceTa: 'ஊவா',
    keyCities: ['Monaragala Town', 'Wellawaya', 'Buttala', 'Bibile', 'Kataragama'],
  },
  Ratnapura: {
    name: 'Ratnapura',
    nameSi: 'රත්නපුර',
    nameTa: 'இரத்தினபுரி',
    province: 'Sabaragamuwa',
    provinceSi: 'සබරගමුව',
    provinceTa: 'சப்ரகமுவ',
    keyCities: ['Ratnapura City', 'Balangoda', 'Pelmadulla', 'Eheliyagoda', 'Kuruwita', 'Embilipitiya'],
  },
  Kegalle: {
    name: 'Kegalle',
    nameSi: 'කෑගල්ල',
    nameTa: 'கேகாலை',
    province: 'Sabaragamuwa',
    provinceSi: 'සබරගමුව',
    provinceTa: 'சப்ரகமுව',
    keyCities: ['Kegalle Town', 'Mawanella', 'Warakapola', 'Ruwanwella', 'Yatiyantota', 'Dehiowita'],
  },
};

/**
 * Returns all district names as string array
 */
export function getAllDistrictNames(): string[] {
  return Object.values(SRI_LANKA_DISTRICTS).map(d => d.name);
}

/**
 * Validates if district is an authentic Sri Lankan administrative district
 */
export function isValidDistrict(district: string): boolean {
  if (!district) return false;
  const clean = district.trim().toLowerCase();
  return Object.values(SRI_LANKA_DISTRICTS).some(d => d.name.toLowerCase() === clean);
}

/**
 * Resolves province from district name
 */
export function getProvinceForDistrict(district: string): string | null {
  if (!district) return null;
  const clean = district.trim().toLowerCase();
  const found = Object.values(SRI_LANKA_DISTRICTS).find(d => d.name.toLowerCase() === clean);
  return found ? found.province : null;
}

/**
 * Resolves districts belonging to a province
 */
export function getDistrictsForProvince(province: string): string[] {
  if (!province) return [];
  const clean = province.trim().toLowerCase();
  return Object.values(SRI_LANKA_DISTRICTS)
    .filter(d => d.province.toLowerCase() === clean)
    .map(d => d.name);
}

/**
 * Authentic Sri Lankan property price tiers for quick search filter
 */
export const SRI_LANKA_PRICE_PRESETS = [
  { label: 'All Prices', min: undefined, max: undefined },
  { label: 'Under LKR 15M', min: undefined, max: 15000000 },
  { label: 'LKR 15M – 35M', min: 15000000, max: 35000000 },
  { label: 'LKR 35M – 60M', min: 35000000, max: 60000000 },
  { label: 'LKR 60M – 100M', min: 60000000, max: 100000000 },
  { label: 'Above LKR 100M', min: 100000000, max: undefined },
];
