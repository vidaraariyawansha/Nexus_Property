import React, { createContext, useContext, useState, useEffect } from 'react';

export type Language = 'en' | 'si' | 'ta';

export interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string, fallback?: string) => string;
}

const TRANSLATIONS: Record<Language, Record<string, string>> = {
  en: {
    // Top Bar & Branding
    'brand.title': 'Nexus Property Platform',
    'brand.subtitle': 'Certified Sri Lankan Real Estate Exchange & Brokerage',
    'brand.verified': 'Verified Listings',
    
    // Navigation
    'nav.home': 'Home',
    'nav.properties': 'Properties',
    'nav.saved': 'Wishlist',
    'nav.compare': 'Compare',
    'nav.portal': 'Customer Portal',
    'nav.admin': 'Admin Console',
    'nav.agent': 'Agent Workspace',
    'nav.owner': 'Owner Desk',
    'nav.login': 'Sign In',
    'nav.register': 'Register',
    'nav.profile': 'My Account & Privacy',
    'nav.logout': 'Sign Out',
    'nav.roleSwitch': 'Role Quick-Switch',

    // Hero Section
    'hero.badge': 'Sri Lanka\'s Premier Property Marketplace · Institutional Verification',
    'hero.title': 'Find Your Next Property in Sri Lanka',
    'hero.subtitle': 'Discover verified residential houses, luxury sea-view apartments, coconut & development land, and commercial headquarters across all 25 districts.',
    'hero.searchBtn': 'Search Properties',

    // Search & Filters
    'search.keywordLabel': 'Keyword / Style',
    'search.keywordPlaceholder': 'Villa, Modern, Architect, Sea View...',
    'search.locationLabel': 'City / Area',
    'search.locationPlaceholder': 'Colombo, Kandy, Galle, Nugegoda...',
    'search.districtLabel': 'District',
    'search.allDistricts': 'All 25 Districts',
    'search.propertyType': 'Property Type',
    'search.allTypes': 'All Property Types',
    'search.priceRange': 'Price Range (LKR)',
    'search.pricePresets': 'Price Preset',
    'search.minPrice': 'Min LKR',
    'search.maxPrice': 'Max LKR',
    'search.bedrooms': 'Bedrooms',
    'search.anyBeds': 'Any Beds',
    'search.amenities': 'Sri Lankan Amenities',
    'search.reset': 'Reset Filters',
    'search.apply': 'Apply Filters',
    'search.showing': 'Showing',
    'search.propertiesFound': 'properties in Sri Lanka',
    'search.sortBy': 'Sort by',

    'properties.title': 'Explore Properties in Sri Lanka',
    'properties.subtitle': 'Browse verified residential houses, luxury sea-view apartments, coconut estates, and commercial suites across Sri Lanka',
    // Property Types
    'type.ALL': 'All Types',
    'type.HOUSE': 'House / Bungalow',
    'type.APARTMENT': 'Apartment',
    'type.LAND': 'Land Plot / Estate',
    'type.VILLA': 'Luxury Villa',
    'type.CONDO': 'Condominium',
    'type.COMMERCIAL': 'Commercial Building',

    // Specifications & Units
    'spec.beds': 'Beds',
    'spec.baths': 'Baths',
    'spec.perches': 'Perches',
    'spec.sqft': 'sq ft',
    'spec.landSize': 'Land Size',
    'spec.floorArea': 'Floor Area',

    // Actions & Buttons
    'action.viewDetails': 'View Details',
    'action.call': 'Direct Call',
    'action.whatsapp': 'WhatsApp Chat',
    'action.bookViewing': 'Schedule Viewing',
    'action.inquiry': 'Submit Inquiry',
    'action.compare': 'Add to Compare',
    'action.inCompare': 'In Compare',
    'action.save': 'Save to Wishlist',
    'action.saved': 'Saved in Wishlist',
    'action.share': 'Share',
    'action.valuation': 'Valuation & Risk',

    // Customer Portal Tabs
    'portal.dashboard': 'My Dashboard',
    'portal.wishlist': 'Saved Properties',
    'portal.comparisons': 'Side-by-Side Comparisons',
    'portal.appointments': 'Upcoming Viewings',
    'portal.inquiries': 'My Inquiries',
    'portal.complaints': 'Tickets & Complaints',
    'portal.profile': 'Profile & Preferences',

    // Footer
    'footer.description': 'Sri Lanka\'s leading institutional real estate exchange. Connecting verified property owners, licensed consultants, and prospective buyers across Colombo, Western, Central, Southern, and all provinces.',
    'footer.rights': 'All rights reserved. Powered by Nexus Real Estate Technology.',
    'footer.locationsTitle': 'Popular Sri Lankan Locations',
    'footer.quickLinks': 'Quick Navigation',
    'footer.compliance': 'Compliant with Sri Lankan Real Estate Standards & Data Protection',
  },
  si: {
    // Top Bar & Branding
    'brand.title': 'නෙක්සස් ප්‍රොපර්ටි',
    'brand.subtitle': 'ශ්‍රී ලංකාවේ සහතිකලත් දේපළ හුවමාරු හා කළමනාකරණ පද්ධතිය',
    'brand.verified': 'සත්‍යාපිත දේපළ',

    // Navigation
    'nav.home': 'මුල් පිටුව',
    'nav.properties': 'දේපළ ලැයිස්තුව',
    'nav.saved': 'සුරැකි දේපළ',
    'nav.compare': 'සංසන්දනය',
    'nav.portal': 'පාරිභෝගික ද්වාරය',
    'nav.admin': 'පරිපාලක පුවරුව',
    'nav.agent': 'නියෝජිත වැඩබිම',
    'nav.owner': 'හිමිකරු පුවරුව',
    'nav.login': 'ඇතුල් වන්න',
    'nav.register': 'ලියාපදිංචි වන්න',
    'nav.profile': 'මගේ ගිණුම',
    'nav.logout': 'ඉවත් වන්න',
    'nav.roleSwitch': 'පරිශීලක තේරීම',

    // Hero Section
    'hero.badge': 'ශ්‍රී ලංකාවේ ප්‍රමුඛතම දේපළ වෙළඳපොළ · නිල සත්‍යාපනය',
    'hero.title': 'ශ්‍රී ලංකාවේ ඔබේ සිහින දේපළ සොයාගන්න',
    'hero.subtitle': 'කොළඹ, මහනුවර, ගාල්ල ඇතුළු දිවයිනේ දිස්ත්‍රික්ක 25 පුරාම සත්‍යාපිත නිවාස, සුඛෝපභෝගී මහල් නිවාස, ඉඩම් සහ වාණිජ ගොඩනැගිලි.',
    'hero.searchBtn': 'දේපළ සොයන්න',

    // Search & Filters
    'search.keywordLabel': 'මූලපදය / ශෛලිය',
    'search.keywordPlaceholder': 'විලා, නූතන, මුහුදු දර්ශන...',
    'search.locationLabel': 'නගරය / ප්‍රදේශය',
    'search.locationPlaceholder': 'කොළඹ, නුගේගොඩ, මහනුවර, ගාල්ල...',
    'search.districtLabel': 'දිස්ත්‍රික්කය',
    'search.allDistricts': 'දිස්ත්‍රික්ක 25 ම',
    'search.propertyType': 'දේපළ වර්ගය',
    'search.allTypes': 'සියලුම වර්ග',
    'search.priceRange': 'මිල පරාසය (රුපියල්)',
    'search.pricePresets': 'මිල කාණ්ඩය',
    'search.minPrice': 'අවම (LKR)',
    'search.maxPrice': 'උපරිම (LKR)',
    'search.bedrooms': 'නිදන කාමර',
    'search.anyBeds': 'ඕනෑම ගණනක්',
    'search.amenities': 'විශේෂ පහසුකම්',
    'search.reset': 'යළි සකසන්න',
    'search.apply': 'තහවුරු කරන්න',
    'search.showing': 'දර්ශනය වන්නේ',
    'search.propertiesFound': 'ශ්‍රී ලාංකීය දේපළ හමුවිය',
    'search.sortBy': 'පිළිවෙල',

    // Property Types
    'type.ALL': 'සියලුම වර්ග',
    'type.HOUSE': 'නිවස / බංගලාව',
    'type.APARTMENT': 'මහල් නිවාසය',
    'type.LAND': 'ඉඩම / වත්ත',
    'type.VILLA': 'විලා (Villa)',
    'type.CONDO': 'කොන්ඩෝ නිවාස',
    'type.COMMERCIAL': 'වාණිජ ගොඩනැගිලි',

    // Specifications & Units
    'spec.beds': 'නිදන කාමර',
    'spec.baths': 'නාන කාමර',
    'spec.perches': 'පර්චස්',
    'spec.sqft': 'වර්ග අඩි',
    'spec.landSize': 'ඉඩම් ප්‍රමාණය',
    'spec.floorArea': 'ගොඩනැගිලි ප්‍රමාණය',

    // Actions & Buttons
    'action.viewDetails': 'විස්තර බලන්න',
    'action.call': 'දුරකථන ඇමතුම',
    'action.whatsapp': 'WhatsApp පණිවිඩයක්',
    'action.bookViewing': 'නැරඹීමට දිනයක් වෙන්කරන්න',
    'action.inquiry': 'විමසීමක් කරන්න',
    'action.compare': 'සංසන්දනයට එක් කරන්න',
    'action.inCompare': 'සංසන්දනයට එක්කර ඇත',
    'action.save': 'සුරකින්න',
    'action.saved': 'සුරකින ලදී',
    'action.share': 'බෙදාහරින්න',
    'action.valuation': 'මිල තක්සේරුව',

    // Customer Portal Tabs
    'portal.dashboard': 'මගේ පාලක පුවරුව',
    'portal.wishlist': 'සුරැකි දේපළ',
    'portal.comparisons': 'දේපළ සංසන්දනය',
    'portal.appointments': 'නැරඹුම් වේලාවන්',
    'portal.inquiries': 'මගේ විමසීම්',
    'portal.complaints': 'පැමිණිලි හා ගැටළු',
    'portal.profile': 'ගිණුමේ තොරතුරු',

    // Footer
    'footer.description': 'ශ්‍රී ලංකාවේ ප්‍රමුඛතම නිල දේපළ හුවමාරු සේවාව. කොළඹ, බස්නාහිර, මධ්‍යම සහ දකුණු පළාත් ඇතුළු දිවයින පුරා සත්‍යාපිත ඉඩම්, නිවාස සහ වාණිජ දේපළ.',
    'footer.rights': 'සියලු හිමිකම් ඇවිරිණි. නෙක්සස් ප්‍රොපර්ටි පද්ධතිය.',
    'footer.locationsTitle': 'ජනප්‍රිය ශ්‍රී ලාංකීය ස්ථාන',
    'footer.quickLinks': 'ක්ෂණික සබැඳි',
    'footer.compliance': 'ශ්‍රී ලංකා දේපළ නීති හා දත්ත ආරක්ෂණ ප්‍රමිතීන්ට අනුකූල වේ.',
  },
  ta: {
    // Top Bar & Branding
    'brand.title': 'நெக்ஸஸ் சொத்து தளம்',
    'brand.subtitle': 'இலங்கையின் சான்றளிக்கப்பட்ட ரியல் எஸ்டேட் மற்றும் பரிமாற்ற அமைப்பு',
    'brand.verified': 'சரிபார்க்கப்பட்ட சொத்துகள்',

    // Navigation
    'nav.home': 'முகப்பு',
    'nav.properties': 'சொத்துகள்',
    'nav.saved': 'விருப்பப்பட்டியல்',
    'nav.compare': 'ஒப்பீடு',
    'nav.portal': 'வாடிக்கையாளர் போர்டல்',
    'nav.admin': 'நிர்வாக பலகை',
    'nav.agent': 'முகவர் தளம்',
    'nav.owner': 'உரிமையாளர் தளம்',
    'nav.login': 'உள்நுழைக',
    'nav.register': 'பதிவு செய்க',
    'nav.profile': 'சுயவிவரம்',
    'nav.logout': 'வெளியேறு',
    'nav.roleSwitch': 'பயனர் மாற்றம்',

    // Hero Section
    'hero.badge': 'இலங்கையின் முன்னணி சொத்து சந்தை · உத்தியோகபூர்வ சரிபார்ப்பு',
    'hero.title': 'இலங்கையில் உங்கள் கனவு சொத்தை கண்டறியுங்கள்',
    'hero.subtitle': 'கொழும்பு, கண்டி, காலி உட்பட 25 மாவட்டங்களிலும் உள்ள சரிபார்க்கப்பட்ட வீடுகள், சொகுசு அடுக்குமாடிகள், நிலங்கள் மற்றும் வணிக கட்டிடங்கள்.',
    'hero.searchBtn': 'சொத்துகளை தேடுங்கள்',

    // Search & Filters
    'search.keywordLabel': 'சொல் / பாணி',
    'search.keywordPlaceholder': 'வில்லா, நவீன, கடல் காட்சி...',
    'search.locationLabel': 'நகரம் / பகுதி',
    'search.locationPlaceholder': 'கொழும்பு, கண்டி, காலி, நுகேகொடை...',
    'search.districtLabel': 'மாவட்டம்',
    'search.allDistricts': 'அனைத்து 25 மாவட்டங்கள்',
    'search.propertyType': 'சொத்து வகை',
    'search.allTypes': 'அனைத்து வகைகள்',
    'search.priceRange': 'விலை வரம்பு (LKR)',
    'search.pricePresets': 'விலை அடுக்கு',
    'search.minPrice': 'குறைந்தபட்சம் (LKR)',
    'search.maxPrice': 'அதிகபட்சம் (LKR)',
    'search.bedrooms': 'படுக்கையறைகள்',
    'search.anyBeds': 'எந்த அளவும்',
    'search.amenities': 'வசதிகள்',
    'search.reset': 'மீட்டமைக்க',
    'search.apply': 'பயன்படுத்துக',
    'search.showing': 'காட்டப்படுகிறது',
    'search.propertiesFound': 'இலங்கை சொத்துகள் கிடைத்தன',
    'search.sortBy': 'வரிசைப்படுத்து',

    // Property Types
    'type.ALL': 'அனைத்து வகைகள்',
    'type.HOUSE': 'வீடு / பங்களா',
    'type.APARTMENT': 'அடுக்குமாடி குடியிருப்பு',
    'type.LAND': 'நிலம் / தோட்டம்',
    'type.VILLA': 'வில்லா (Villa)',
    'type.CONDO': 'காண்டோ (Condominium)',
    'type.COMMERCIAL': 'வணிக சொத்து',

    // Specifications & Units
    'spec.beds': 'படுக்கைகள்',
    'spec.baths': 'குளியலறைகள்',
    'spec.perches': 'பர்ச்சஸ்',
    'spec.sqft': 'சதுர அடி',
    'spec.landSize': 'நில அளவு',
    'spec.floorArea': 'கட்டிட பரப்பளவு',

    // Actions & Buttons
    'action.viewDetails': 'விவரங்களை காண்க',
    'action.call': 'நேரடி அழைப்பு',
    'action.whatsapp': 'வாட்ஸ்அப் அரட்டை',
    'action.bookViewing': 'பார்வையிட முன்பதிவு',
    'action.inquiry': 'விசாரணை செய்க',
    'action.compare': 'ஒப்பீட்டில் சேர்க்க',
    'action.inCompare': 'ஒப்பீட்டில் உள்ளது',
    'action.save': 'விருப்பப்பட்டியலில் சேர்',
    'action.saved': 'சேமிக்கப்பட்டது',
    'action.share': 'பகிரவும்',
    'action.valuation': 'மதிப்பீடு',

    // Customer Portal Tabs
    'portal.dashboard': 'என் கட்டுப்பாட்டு பலகை',
    'portal.wishlist': 'சேமித்த சொத்துகள்',
    'portal.comparisons': 'சொத்து ஒப்பீடுகள்',
    'portal.appointments': 'பார்வையிடல் முன்பதிவுகள்',
    'portal.inquiries': 'என் விசாரணைகள்',
    'portal.complaints': 'கோரிக்கைகள் / புகார்கள்',
    'portal.profile': 'சுயவிவரம்',

    // Footer
    'footer.description': 'இலங்கையின் முன்னணி ரியல் எஸ்டேட் பரிமாற்ற அமைப்பு. கொழும்பு, மேற்கு, மத்திய மற்றும் தென் மாகாணம் உட்பட நாடு முழுவதும் சரிபார்க்கப்பட்ட நிலங்கள் மற்றும் வீடுகள்.',
    'footer.rights': 'அனைத்து உரிமைகளும் பாதுகாக்கப்பட்டவை. நெக்ஸஸ் சொத்து தளம்.',
    'footer.locationsTitle': 'பிரபலமான இலங்கை இடங்கள்',
    'footer.quickLinks': 'விரைவு வழிசெலுத்தல்',
    'footer.compliance': 'இலங்கை ரியல் எஸ்டேட் சட்டங்கள் மற்றும் தரவு பாதுகாப்புக்கு இணங்குகிறது.',
  },
};

const LanguageContext = createContext<LanguageContextType>({
  language: 'en',
  setLanguage: () => {},
  t: (key: string, fallback?: string) => fallback || key,
});

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [language, setLanguageState] = useState<Language>(() => {
    const saved = localStorage.getItem('nexus_property_lang');
    if (saved === 'si' || saved === 'ta' || saved === 'en') return saved;
    return 'en';
  });

  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
    localStorage.setItem('nexus_property_lang', lang);
  };

  const t = (key: string, fallback?: string): string => {
    const dict = TRANSLATIONS[language] || TRANSLATIONS.en;
    if (dict[key]) return dict[key];
    if (TRANSLATIONS.en[key]) return TRANSLATIONS.en[key];
    return fallback !== undefined ? fallback : key;
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => useContext(LanguageContext);
