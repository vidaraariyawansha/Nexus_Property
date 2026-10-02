import bcrypt from 'bcryptjs';
import { queryOne, execute, executeTransaction } from './database.js';
import { seedAllRealisticPropertyImages } from '../services/propertyImageService.js';

export async function seedDatabase(): Promise<void> {
  const existingUser = await queryOne('SELECT id FROM users LIMIT 1');
  const existingProp = await queryOne('SELECT id FROM properties LIMIT 1');
  const existingProfile = await queryOne('SELECT id FROM user_profiles LIMIT 1');

  if (existingUser && existingProp) {
    if (!existingProfile) {
      await seedProfiles();
    }
    await updateLegacyPropertiesToSriLanka();
    await seedSriLankanProperties();
    await seedAllRealisticPropertyImages();
    return;
  }

  console.log('Seeding Nexus Property relational database...');

  await executeTransaction(async () => {
    const salt = bcrypt.genSaltSync(10);
    const adminPass = bcrypt.hashSync('Admin@123', salt);
    const agentPass = bcrypt.hashSync('Agent@123', salt);
    const ownerPass = bcrypt.hashSync('Owner@123', salt);
    const customerPass = bcrypt.hashSync('Customer@123', salt);

    const now = Date.now();
    const day = 24 * 60 * 60 * 1000;

    // 1. Users
    const users = [
      {
        id: 'usr_admin_01',
        fullName: 'Victoria Vance',
        email: 'admin@nexusproperty.com',
        passwordHash: adminPass,
        phone: '+1 (555) 019-2831',
        role: 'ADMIN',
        enabled: 1,
        createdAt: now - 90 * day,
      },
      {
        id: 'usr_agent_01',
        fullName: 'Sarah Jenkins',
        email: 'agent.sarah@nexusproperty.com',
        passwordHash: agentPass,
        phone: '+1 (555) 234-5678',
        role: 'AGENT',
        enabled: 1,
        createdAt: now - 80 * day,
      },
      {
        id: 'usr_agent_02',
        fullName: 'Marcus Sterling',
        email: 'agent.marcus@nexusproperty.com',
        passwordHash: agentPass,
        phone: '+1 (555) 876-5432',
        role: 'AGENT',
        enabled: 1,
        createdAt: now - 75 * day,
      },
      {
        id: 'usr_owner_01',
        fullName: 'David Sterling',
        email: 'owner.david@nexusproperty.com',
        passwordHash: ownerPass,
        phone: '+1 (555) 345-6789',
        role: 'PROPERTY_OWNER',
        enabled: 1,
        createdAt: now - 60 * day,
      },
      {
        id: 'usr_owner_02',
        fullName: 'Clara Oswald',
        email: 'owner.clara@nexusproperty.com',
        passwordHash: ownerPass,
        phone: '+1 (555) 456-7890',
        role: 'PROPERTY_OWNER',
        enabled: 1,
        createdAt: now - 45 * day,
      },
      {
        id: 'usr_customer_01',
        fullName: 'Elena Rostova',
        email: 'customer.elena@nexusproperty.com',
        passwordHash: customerPass,
        phone: '+1 (555) 567-8901',
        role: 'CUSTOMER',
        enabled: 1,
        createdAt: now - 30 * day,
      },
      {
        id: 'usr_customer_02',
        fullName: 'Alex Mercer',
        email: 'customer.alex@nexusproperty.com',
        passwordHash: customerPass,
        phone: '+1 (555) 678-9012',
        role: 'CUSTOMER',
        enabled: 1,
        createdAt: now - 20 * day,
      },
      {
        id: 'usr_customer_disabled',
        fullName: 'Suspended Account Test',
        email: 'disabled.user@nexusproperty.com',
        passwordHash: customerPass,
        phone: '+1 (555) 000-0000',
        role: 'CUSTOMER',
        enabled: 0,
        createdAt: now - 10 * day,
      }
    ];

    for (const u of users) {
      await execute(
        `INSERT INTO users (id, full_name, email, password_hash, phone, role, enabled, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [u.id, u.fullName, u.email, u.passwordHash, u.phone, u.role, u.enabled, u.createdAt, u.createdAt]
      );
    }

    // 2. Properties (All Sri Lankan locations and realistic LKR prices)
    const properties = [
      {
        id: 'prop_01',
        ownerId: 'usr_owner_01',
        title: 'The Azure Vista Contemporary Villa in Cinnamon Gardens',
        description: 'Spectacular architectural marvel nestled in prestigious Cinnamon Gardens, Colombo 07. Features private swimming pool with sun deck, custom teak chef kitchen, imported Italian marble, temperature-controlled wine gallery, 10kW solar net metering, landscaped tropical courtyard, and 24/7 security.',
        propertyType: 'VILLA',
        location: 'Ward Place, Cinnamon Gardens, Colombo 07, Western Province',
        price: 125000000,
        bedrooms: 5,
        bathrooms: 6,
        area: 5800,
        amenities: JSON.stringify(['Ocean View', 'Swimming Pool', 'Wine Cellar', 'Smart Home', 'Security System', 'Garage 3+ Cars', 'Private Garden', 'Solar Panels']),
        status: 'ACTIVE',
        createdAt: now - 25 * day,
      },
      {
        id: 'prop_02',
        ownerId: 'usr_owner_01',
        title: 'Havelock City Sky Penthouse Residence',
        description: 'Exquisite duplex penthouse perched high above Havelock City with panoramic skyline and coastline views. Features private rooftop terrace with outdoor BBQ pavilion, bespoke bronze fixtures, 14-foot beamed ceilings, wide-plank teak flooring, and direct private elevator access.',
        propertyType: 'CONDO',
        location: 'Havelock City, Colombo 05, Western Province',
        price: 145000000,
        bedrooms: 4,
        bathrooms: 4,
        area: 4200,
        amenities: JSON.stringify(['Private Terrace', 'Doorman', 'Elevator', 'Fitness Center', 'City Skyline View', 'Concierge Service', 'Swimming Pool']),
        status: 'ACTIVE',
        createdAt: now - 22 * day,
      },
      {
        id: 'prop_03',
        ownerId: 'usr_owner_02',
        title: 'Bolgoda Modern Waterfront Estate',
        description: 'Ultra-luxurious Bolgoda Lake waterfront sanctuary with private 60-foot yacht dock, resort-style lap pool, outdoor summer kitchen, expansive covered verandas, and dramatic double-height foyer with floating timber staircase.',
        propertyType: 'HOUSE',
        location: 'Bolgoda Lake, Moratuwa, Colombo District, Western Province',
        price: 85000000,
        bedrooms: 4,
        bathrooms: 5,
        area: 4950,
        amenities: JSON.stringify(['Waterfront', 'Private Boat Dock', 'Swimming Pool', 'Outdoor Kitchen', 'Gated Community', 'Solar Panels']),
        status: 'ACTIVE',
        createdAt: now - 18 * day,
      },
      {
        id: 'prop_04',
        ownerId: 'usr_owner_02',
        title: 'Mount Lavinia Coastal Luxury Apartment',
        description: 'Sophisticated modern apartment steps from Mount Lavinia golden beach and coastal promenade. Features designer kitchen with granite waterfall island, acoustic soundproofing, walk-in wardrobes with integrated lighting, and dedicated EV charging space.',
        propertyType: 'APARTMENT',
        location: 'Hotel Road, Mount Lavinia, Colombo District, Western Province',
        price: 36000000,
        bedrooms: 2,
        bathrooms: 2,
        area: 1350,
        amenities: JSON.stringify(['EV Charging', 'Gym & Sauna', 'Rooftop Lounge', 'Ocean View', 'Balcony', '24/7 Security']),
        status: 'ACTIVE',
        createdAt: now - 15 * day,
      },
      {
        id: 'prop_05',
        ownerId: 'usr_owner_01',
        title: 'Peradeniya Royal Valley Modern Farmhouse',
        description: 'Masterfully crafted estate residence overlooking the Mahaweli River valley near Peradeniya Royal Botanical Gardens. Set on 2.5 manicured acres with detached guest casita, sparkling pool with sun shelf, wraparound verandah, and high-efficiency solar system.',
        propertyType: 'HOUSE',
        location: 'Peradeniya Road, Kandy, Central Province',
        price: 62000000,
        bedrooms: 5,
        bathrooms: 5,
        area: 4600,
        amenities: JSON.stringify(['Acreage', 'Guest House', 'Swimming Pool', 'Solar Panels', 'Hardwood Floors', 'Mountain View']),
        status: 'ACTIVE',
        createdAt: now - 12 * day,
      },
      {
        id: 'prop_06',
        ownerId: 'usr_owner_02',
        title: 'World Trade Center Commercial Headquarters Suite',
        description: 'Class-A commercial office floors ideal for regional headquarters, multinational bank, or fintech hub in Colombo Fort. Flexible open floor plan, telepresence conference suites, high-speed fiber optic connectivity, and secure executive basement parking.',
        propertyType: 'COMMERCIAL',
        location: 'Echelon Square, Fort, Colombo 01, Western Province',
        price: 135000000,
        bedrooms: 0,
        bathrooms: 6,
        area: 12500,
        amenities: JSON.stringify(['Fiber Internet', 'Conference Facilities', '24/7 Access', 'HVAC Multi-Zone', 'Backup Generator', 'Elevator']),
        status: 'ACTIVE',
        createdAt: now - 10 * day,
      },
      {
        id: 'prop_07',
        ownerId: 'usr_owner_01',
        title: 'Mirissa Coastal Coconut Estate & Land',
        description: 'Prime 12-acre parcel in coastal Mirissa with panoramic ocean glimpses and gentle sea breezes. Features verified clear title deeds, mature coconut groves, permitted well water rights, preliminary architectural plans for luxury eco-resort, and carpeted road access.',
        propertyType: 'LAND',
        location: 'Bandaramulla, Mirissa, Matara District, Southern Province',
        price: 42000000,
        bedrooms: 0,
        bathrooms: 0,
        area: 522720, // 12 acres in sq ft
        amenities: JSON.stringify(['Water Rights', 'Ocean View', 'Mountain Views', 'Road Access', 'Agricultural Zoning', 'Clear Deeds']),
        status: 'ACTIVE',
        createdAt: now - 8 * day,
      },
      {
        id: 'prop_08',
        ownerId: 'usr_owner_02',
        title: 'Nuwara Eliya Misty Highlands Pine Lodge',
        description: 'Magnificent colonial-inspired timber and stone highland lodge featuring radiant heated stone floors, double-sided stone fireplace, outdoor cedar hot tub, tea plantation walking trails, and dramatic views of Mount Pedro and Lake Gregory.',
        propertyType: 'VILLA',
        location: 'Single Tree Hill, Nuwara Eliya, Central Province',
        price: 78000000,
        bedrooms: 6,
        bathrooms: 7,
        area: 6400,
        amenities: JSON.stringify(['Hot Tub', 'Fireplace', 'Heated Driveway', 'Mountain View', 'Sauna', 'Wine Cellar', 'Private Garden']),
        status: 'ACTIVE',
        createdAt: now - 6 * day,
      },
      // Pending approval listing for workflow testing
      {
        id: 'prop_09',
        ownerId: 'usr_owner_01',
        title: 'Bambalapitiya Urban Studio Loft (Pending Approval)',
        description: 'Chic designer studio loft recently completed with polished terrazzo floors, soaring 11ft ceilings, Italian gas range, and south-facing terrace overlooking the ocean corridor.',
        propertyType: 'APARTMENT',
        location: 'Marine Drive, Bambalapitiya, Colombo 04, Western Province',
        price: 24500000,
        bedrooms: 1,
        bathrooms: 1,
        area: 850,
        amenities: JSON.stringify(['Balcony', 'Fitness Center', 'Covered Parking', 'High Ceilings', 'Ocean View']),
        status: 'PENDING_APPROVAL',
        createdAt: now - 2 * day,
      },
      // Under contract listing
      {
        id: 'prop_10',
        ownerId: 'usr_owner_02',
        title: 'Dharmapala Mawatha Colonial Townhouse (Under Contract)',
        description: 'Restored 19th-century colonial townhouse with restored ornamental teak woodwork, garden courtyard terrace, private library, and high ceilings throughout.',
        propertyType: 'HOUSE',
        location: 'Dharmapala Mawatha, Colombo 07, Western Province',
        price: 88000000,
        bedrooms: 4,
        bathrooms: 3,
        area: 3600,
        amenities: JSON.stringify(['Historic Detail', 'Private Garden', 'Library', 'Solar Panels', 'Roller Shutter Gate']),
        status: 'UNDER_CONTRACT',
        createdAt: now - 40 * day,
      },
      // Sold listing
      {
        id: 'prop_11',
        ownerId: 'usr_owner_01',
        title: 'Bentota River Sanctuary Residence (Sold)',
        description: 'Tropical modern riverfront retreat with swimming pool, landscaped mangrove sanctuary, private boat ramp, and unobstructed sunset views.',
        propertyType: 'HOUSE',
        location: 'Robalgoda, Bentota, Galle District, Southern Province',
        price: 55000000,
        bedrooms: 3,
        bathrooms: 3,
        area: 3100,
        amenities: JSON.stringify(['Swimming Pool', 'River View', 'Private Boat Dock', 'Zero Maintenance']),
        status: 'SOLD',
        createdAt: now - 60 * day,
      },
      // Draft listing
      {
        id: 'prop_12',
        ownerId: 'usr_owner_01',
        title: 'Ella Mountain View Eco Chalet (Draft)',
        description: 'Upcoming rustic modern eco-chalet overlooking Ella Rock and Ravana Falls.',
        propertyType: 'HOUSE',
        location: 'Passara Road, Ella, Badulla District, Uva Province',
        price: 28500000,
        bedrooms: 3,
        bathrooms: 2,
        area: 2200,
        amenities: JSON.stringify(['Fireplace', 'Mountain View', 'Deck', 'Rainwater Harvesting']),
        status: 'DRAFT',
        createdAt: now - 1 * day,
      }
    ];

    for (const p of properties) {
      await execute(
        `INSERT INTO properties (id, owner_id, title, description, property_type, location, price, bedrooms, bathrooms, area, amenities, status, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [p.id, p.ownerId, p.title, p.description, p.propertyType, p.location, p.price, p.bedrooms, p.bathrooms, p.area, p.amenities, p.status, p.createdAt, p.createdAt]
      );
    }

    // 3. Property Images (curated Unsplash architectural photography)
    const images = [
      // prop_01 (Azure Vista Villa)
      { id: 'img_01_1', propertyId: 'prop_01', url: 'https://images.unsplash.com/photo-1613977257363-707ba9348227?auto=format&fit=crop&w=1600&q=80', isPrimary: 1, order: 0 },
      { id: 'img_01_2', propertyId: 'prop_01', url: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=1600&q=80', isPrimary: 0, order: 1 },
      { id: 'img_01_3', propertyId: 'prop_01', url: 'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?auto=format&fit=crop&w=1600&q=80', isPrimary: 0, order: 2 },
      { id: 'img_01_4', propertyId: 'prop_01', url: 'https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?auto=format&fit=crop&w=1600&q=80', isPrimary: 0, order: 3 },

      // prop_02 (Tribeca Penthouse)
      { id: 'img_02_1', propertyId: 'prop_02', url: 'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?auto=format&fit=crop&w=1600&q=80', isPrimary: 1, order: 0 },
      { id: 'img_02_2', propertyId: 'prop_02', url: 'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?auto=format&fit=crop&w=1600&q=80', isPrimary: 0, order: 1 },
      { id: 'img_02_3', propertyId: 'prop_02', url: 'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?auto=format&fit=crop&w=1600&q=80', isPrimary: 0, order: 2 },

      // prop_03 (Biscayne Waterfront)
      { id: 'img_03_1', propertyId: 'prop_03', url: 'https://images.unsplash.com/photo-1580587771525-78b9dba3b914?auto=format&fit=crop&w=1600&q=80', isPrimary: 1, order: 0 },
      { id: 'img_03_2', propertyId: 'prop_03', url: 'https://images.unsplash.com/photo-1600566753190-17f0baa2a6c3?auto=format&fit=crop&w=1600&q=80', isPrimary: 0, order: 1 },
      { id: 'img_03_3', propertyId: 'prop_03', url: 'https://images.unsplash.com/photo-1600585154526-990dced4db0d?auto=format&fit=crop&w=1600&q=80', isPrimary: 0, order: 2 },

      // prop_04 (Bellevue Apartment)
      { id: 'img_04_1', propertyId: 'prop_04', url: 'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?auto=format&fit=crop&w=1600&q=80', isPrimary: 1, order: 0 },
      { id: 'img_04_2', propertyId: 'prop_04', url: 'https://images.unsplash.com/photo-1502005229762-ee1b2b80a562?auto=format&fit=crop&w=1600&q=80', isPrimary: 0, order: 1 },

      // prop_05 (Austin Modern Farmhouse)
      { id: 'img_05_1', propertyId: 'prop_05', url: 'https://images.unsplash.com/photo-1518780664697-55e3ad937233?auto=format&fit=crop&w=1600&q=80', isPrimary: 1, order: 0 },
      { id: 'img_05_2', propertyId: 'prop_05', url: 'https://images.unsplash.com/photo-1600573472550-8090b5e0745e?auto=format&fit=crop&w=1600&q=80', isPrimary: 0, order: 1 },

      // prop_06 (Chicago Commercial)
      { id: 'img_06_1', propertyId: 'prop_06', url: 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&w=1600&q=80', isPrimary: 1, order: 0 },
      { id: 'img_06_2', propertyId: 'prop_06', url: 'https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&w=1600&q=80', isPrimary: 0, order: 1 },

      // prop_07 (Sonoma Vineyard Land)
      { id: 'img_07_1', propertyId: 'prop_07', url: 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=1600&q=80', isPrimary: 1, order: 0 },
      { id: 'img_07_2', propertyId: 'prop_07', url: 'https://images.unsplash.com/photo-1511497584788-87676104235f?auto=format&fit=crop&w=1600&q=80', isPrimary: 0, order: 1 },

      // prop_08 (Aspen Lodge)
      { id: 'img_08_1', propertyId: 'prop_08', url: 'https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?auto=format&fit=crop&w=1600&q=80', isPrimary: 1, order: 0 },
      { id: 'img_08_2', propertyId: 'prop_08', url: 'https://images.unsplash.com/photo-1510798831971-661eb04b3739?auto=format&fit=crop&w=1600&q=80', isPrimary: 0, order: 1 },

      // prop_09 (Midtown Loft Pending)
      { id: 'img_09_1', propertyId: 'prop_09', url: 'https://images.unsplash.com/photo-1536376072261-38c75010e6c9?auto=format&fit=crop&w=1600&q=80', isPrimary: 1, order: 0 },

      // prop_10 (Beacon Hill Under Contract)
      { id: 'img_10_1', propertyId: 'prop_10', url: 'https://images.unsplash.com/photo-1568605117036-5fe5e7bab0b7?auto=format&fit=crop&w=1600&q=80', isPrimary: 1, order: 0 },

      // prop_11 (Scottsdale Sold)
      { id: 'img_11_1', propertyId: 'prop_11', url: 'https://images.unsplash.com/photo-1570129477492-45c003edd2be?auto=format&fit=crop&w=1600&q=80', isPrimary: 1, order: 0 },

      // prop_12 (Tahoe Draft)
      { id: 'img_12_1', propertyId: 'prop_12', url: 'https://images.unsplash.com/photo-1518780664697-55e3ad937233?auto=format&fit=crop&w=1600&q=80', isPrimary: 1, order: 0 }
    ];

    for (const img of images) {
      await execute(
        `INSERT INTO property_images (id, property_id, url, is_primary, display_order, created_at)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [img.id, img.propertyId, img.url, img.isPrimary, img.order, now - 20 * day]
      );
    }

    // 4. Ratings
    const ratings = [
      {
        id: 'rtg_01',
        propertyId: 'prop_01',
        customerId: 'usr_customer_01',
        score: 5,
        comment: 'Absolutely stunning property. The sunset views over the ocean are breathtaking and the finish quality is world-class.',
        createdAt: now - 15 * day,
      },
      {
        id: 'rtg_02',
        propertyId: 'prop_02',
        customerId: 'usr_customer_01',
        score: 5,
        comment: 'Unrivaled Tribeca location. Private elevator and rooftop terrace set this penthouse apart from anything else in Manhattan.',
        createdAt: now - 10 * day,
      },
      {
        id: 'rtg_03',
        propertyId: 'prop_01',
        customerId: 'usr_customer_02',
        score: 4,
        comment: 'Exceptional modern design and privacy. Driveway entrance is slightly steep, but the architectural brilliance makes it worth every penny.',
        createdAt: now - 5 * day,
      },
      {
        id: 'rtg_04',
        propertyId: 'prop_03',
        customerId: 'usr_customer_02',
        score: 5,
        comment: 'The boat dock and outdoor living spaces are immaculate. Perfect for yachting enthusiasts.',
        createdAt: now - 8 * day,
      }
    ];

    for (const r of ratings) {
      await execute(
        `INSERT INTO ratings (id, property_id, customer_id, score, comment, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [r.id, r.propertyId, r.customerId, r.score, r.comment, r.createdAt, r.createdAt]
      );
    }

    // 5. Inquiries
    const inquiries = [
      {
        id: 'inq_01',
        ticketId: 'INQ-1001',
        propertyId: 'prop_01',
        customerId: 'usr_customer_01',
        assignedAgentId: 'usr_agent_01',
        subject: 'Colombo Municipal Council rates assessment & deed history request',
        message: 'Could you please send over the official disclosures regarding the Colombo Municipal Council rates assessment, deed history, and survey report for the Cinnamon Gardens villa?',
        status: 'IN_PROGRESS',
        response: 'Hi Elena, Sarah here. I have compiled the 2025/2026 CMC rates assessment and the licensed surveyor plan. Sending the disclosure package to your email shortly.',
        createdAt: now - 5 * day,
      },
      {
        id: 'inq_02',
        ticketId: 'INQ-1002',
        propertyId: 'prop_02',
        customerId: 'usr_customer_02',
        assignedAgentId: 'usr_agent_02',
        subject: 'Private rooftop terrace sound ordinance and BBQ installation permission',
        message: 'Hello Marcus, can you verify if the Havelock City management permits gas line installation for an outdoor BBQ station on the private rooftop deck?',
        status: 'RESOLVED',
        response: 'Hi Alex, the condominium management corporation has pre-approved gas line hookups for outdoor BBQ stations as long as certified technicians are utilized. I have uploaded the alteration guidelines for you.',
        createdAt: now - 3 * day,
      },
      {
        id: 'inq_03',
        ticketId: 'INQ-1003',
        propertyId: 'prop_03',
        customerId: 'usr_customer_01',
        assignedAgentId: 'usr_agent_01',
        subject: 'Bolgoda canal depth and boat jetty mooring capacity',
        message: 'What is the navigable draft and boat jetty mooring capacity along the Bolgoda Lake waterfront during dry and rainy seasons? We have a 45ft cabin cruiser with 3.8ft draft.',
        status: 'NEW',
        response: null,
        createdAt: now - 1 * day,
      }
    ];

    for (const inq of inquiries) {
      await execute(
        `INSERT INTO inquiries (id, ticket_id, property_id, customer_id, assigned_agent_id, subject, message, status, response, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [inq.id, inq.ticketId, inq.propertyId, inq.customerId, inq.assignedAgentId, inq.subject, inq.message, inq.status, inq.response, inq.createdAt, inq.createdAt]
      );
    }

    // 6. Complaints
    const complaints = [
      {
        id: 'cmp_01',
        ticketId: 'CMP-2001',
        propertyId: 'prop_04',
        customerId: 'usr_customer_02',
        subject: 'Agent was 30 minutes late to scheduled property viewing',
        description: 'I booked a private viewing for Mount Lavinia Coastal Apartment on Tuesday at 2:00 PM. The agent arrived at 2:32 PM without prior notification. My schedule was severely disrupted.',
        status: 'RESOLVED',
        resolution: 'We sincerely apologize for the delay. The agent encountered unexpected Galle Road congestion and failed to notify dispatch in time. A senior partner has scheduled a private VIP tour with complimentary refreshments and our brokerage service credit.',
        createdAt: now - 7 * day,
      },
      {
        id: 'cmp_02',
        ticketId: 'CMP-2002',
        propertyId: 'prop_01',
        customerId: 'usr_customer_01',
        subject: 'Discrepancy in square footage listing',
        description: 'The listing stated 5,800 sq ft, but during my preliminary architectural walkthrough the gross living area appeared closer to 5,200 sq ft without the covered patio.',
        status: 'IN_PROGRESS',
        resolution: 'Our operations team has ordered an independent BOMA laser-measured floor plan from our surveyor. A revised measurement report will be attached to the listing by Friday.',
        createdAt: now - 2 * day,
      }
    ];

    for (const cmp of complaints) {
      await execute(
        `INSERT INTO complaints (id, ticket_id, property_id, customer_id, subject, description, status, resolution, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [cmp.id, cmp.ticketId, cmp.propertyId, cmp.customerId, cmp.subject, cmp.description, cmp.status, cmp.resolution, cmp.createdAt, cmp.createdAt]
      );
    }

    // 7. Appointments (Viewing Schedule)
    const appointments = [
      {
        id: 'apt_01',
        propertyId: 'prop_01',
        customerId: 'usr_customer_01',
        agentId: 'usr_agent_01',
        appointmentTime: now + 2 * day + 14 * 60 * 60 * 1000, // In 2 days at 2 PM
        durationMinutes: 60,
        status: 'CONFIRMED',
        notes: 'Client interested in sunset views and structural integrity documentation.',
        cancellationReason: null,
        createdAt: now - 2 * day,
      },
      {
        id: 'apt_02',
        propertyId: 'prop_02',
        customerId: 'usr_customer_01',
        agentId: 'usr_agent_02',
        appointmentTime: now + 5 * day + 11 * 60 * 60 * 1000, // In 5 days at 11 AM
        durationMinutes: 60,
        status: 'REQUESTED',
        notes: 'Weekend morning tour requested with financial pre-approval letter ready.',
        cancellationReason: null,
        createdAt: now - 1 * day,
      },
      {
        id: 'apt_03',
        propertyId: 'prop_03',
        customerId: 'usr_customer_02',
        agentId: 'usr_agent_01',
        appointmentTime: now - 3 * day,
        durationMinutes: 60,
        status: 'COMPLETED',
        notes: 'Walkthrough went smoothly. Client requested HOA bylaws and dock permits.',
        cancellationReason: null,
        createdAt: now - 6 * day,
      },
      {
        id: 'apt_04',
        propertyId: 'prop_04',
        customerId: 'usr_customer_01',
        agentId: 'usr_agent_02',
        appointmentTime: now - 8 * day,
        durationMinutes: 60,
        status: 'CANCELLED',
        notes: 'Client had flight delay into Seattle.',
        cancellationReason: 'Cancelled by customer due to travel delay',
        createdAt: now - 10 * day,
      }
    ];

    for (const apt of appointments) {
      await execute(
        `INSERT INTO appointments (id, property_id, customer_id, agent_id, appointment_time, duration_minutes, status, notes, cancellation_reason, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [apt.id, apt.propertyId, apt.customerId, apt.agentId, apt.appointmentTime, apt.durationMinutes, apt.status, apt.notes, apt.cancellationReason, apt.createdAt, apt.createdAt]
      );
    }

    // 8. Wishlists & Items
    const wishlistId = 'wsh_customer_01';
    await execute(
      `INSERT INTO wishlists (id, customer_id, name, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?)`,
      [wishlistId, 'usr_customer_01', 'Elena\'s Dream Portfolio', now - 10 * day, now - 2 * day]
    );

    const wishlistItems = [
      { id: 'wshi_01', wishlistId, propertyId: 'prop_01', createdAt: now - 10 * day },
      { id: 'wshi_02', wishlistId, propertyId: 'prop_02', createdAt: now - 5 * day },
      { id: 'wshi_03', wishlistId, propertyId: 'prop_05', createdAt: now - 2 * day },
    ];

    for (const wi of wishlistItems) {
      await execute(
        `INSERT INTO wishlist_items (id, wishlist_id, property_id, created_at)
         VALUES (?, ?, ?, ?)`,
        [wi.id, wi.wishlistId, wi.propertyId, wi.createdAt]
      );
    }

    // 9. Notifications
    const notifications = [
      {
        id: 'notif_01',
        userId: 'usr_customer_01',
        type: 'APPOINTMENT_CONFIRMED',
        title: 'Viewing Confirmed',
        message: 'Your viewing appointment for The Azure Vista Contemporary Villa has been confirmed by Agent Sarah Jenkins.',
        refId: 'apt_01',
        isRead: 0,
        createdAt: now - 1 * day,
      },
      {
        id: 'notif_02',
        userId: 'usr_customer_01',
        type: 'INQUIRY_REPLIED',
        title: 'Inquiry Response Received',
        message: 'Agent Sarah Jenkins has replied to your inquiry INQ-1001 regarding tax disclosures.',
        refId: 'inq_01',
        isRead: 1,
        createdAt: now - 3 * day,
      },
      {
        id: 'notif_03',
        userId: 'usr_owner_01',
        type: 'PROPERTY_STATUS_UPDATED',
        title: 'Listing Active',
        message: 'Your property "The Azure Vista Contemporary Villa" was approved and is now publicly active.',
        refId: 'prop_01',
        isRead: 1,
        createdAt: now - 25 * day,
      },
      {
        id: 'notif_04',
        userId: 'usr_agent_01',
        type: 'APPOINTMENT_REQUESTED',
        title: 'New Viewing Request',
        message: 'Elena Rostova has requested a viewing appointment for Azure Vista Contemporary Villa.',
        refId: 'apt_01',
        isRead: 0,
        createdAt: now - 2 * day,
      },
      {
        id: 'notif_05',
        userId: 'usr_admin_01',
        type: 'LISTING_APPROVAL_REQUIRED',
        title: 'New Property Pending Review',
        message: 'David Sterling submitted "Midtown Modernist Studio Loft" for review and publication.',
        refId: 'prop_09',
        isRead: 0,
        createdAt: now - 2 * day,
      }
    ];

    for (const n of notifications) {
      await execute(
        `INSERT INTO notifications (id, user_id, type, title, message, reference_id, is_read, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [n.id, n.userId, n.type, n.title, n.message, n.refId, n.isRead, n.createdAt]
      );
    }

    // 10. Audit Logs
    const auditLogs = [
      {
        id: 'aud_01',
        actorId: 'usr_admin_01',
        action: 'PROPERTY_APPROVED',
        entityType: 'PROPERTY',
        entityId: 'prop_01',
        details: 'Admin Victoria Vance approved listing prop_01 to ACTIVE status',
        createdAt: now - 25 * day,
      },
      {
        id: 'aud_02',
        actorId: 'usr_agent_01',
        action: 'APPOINTMENT_CONFIRMED',
        entityType: 'APPOINTMENT',
        entityId: 'apt_01',
        details: 'Agent Sarah Jenkins confirmed viewing slot for Elena Rostova',
        createdAt: now - 1 * day,
      }
    ];

    for (const a of auditLogs) {
      await execute(
        `INSERT INTO audit_logs (id, actor_id, action, entity_type, entity_id, details, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [a.id, a.actorId, a.action, a.entityType, a.entityId, a.details, a.createdAt]
      );
    }

    await seedProfiles();
    await seedComparisons();
    await seedSriLankanProperties();
    await seedAllRealisticPropertyImages();
  });

  console.log('Nexus Property database seeded successfully with realistic accounts & listings.');
}

export async function seedProfiles(): Promise<void> {
  const now = Date.now();
  const profiles = [
    {
      id: 'prof_admin_01',
      userId: 'usr_admin_01',
      profileImageUrl: null,
      jobTitle: 'Managing Director & Principal Broker',
      company: 'Nexus Real Estate Sri Lanka',
      yearsOfExperience: 16,
      areasServed: 'Colombo 07, Colombo 03, Havelock City, Galle Fort',
      languages: 'English, Sinhala, Tamil',
      bio: 'Directing prime architectural portfolios, luxury developments, and institutional acquisitions across Sri Lanka. Overseeing verified agent representations and regulatory compliance.',
      whatsapp: '+94 77 019 2831',
      address: 'Level 34, World Trade Center, Echelon Square',
      city: 'Colombo 01',
      country: 'Sri Lanka',
      preferredContactMethod: 'EMAIL',
      preferredContactTime: 'MORNING',
      phoneVisibility: 'PUBLIC',
      emailVisibility: 'REGISTERED',
      whatsappVisibility: 'PUBLIC',
      isVerified: 1,
    },
    {
      id: 'prof_agent_01',
      userId: 'usr_agent_01',
      profileImageUrl: null,
      jobTitle: 'Senior Luxury Property Consultant',
      company: 'Nexus Premier Realty',
      yearsOfExperience: 8,
      areasServed: 'Cinnamon Gardens, Kollupitiya, Mount Lavinia, Battaramulla',
      languages: 'English, Sinhala',
      bio: 'Licensed luxury advisor dedicated to bespoke residential marketing, private walkthroughs, and verified escrow management.',
      whatsapp: '+94 77 234 5678',
      address: '45 Ward Place, Colombo 07',
      city: 'Colombo 07',
      country: 'Sri Lanka',
      preferredContactMethod: 'PHONE',
      preferredContactTime: 'AFTERNOON',
      phoneVisibility: 'PUBLIC',
      emailVisibility: 'REGISTERED',
      whatsappVisibility: 'PUBLIC',
      isVerified: 1,
    },
    {
      id: 'prof_agent_02',
      userId: 'usr_agent_02',
      profileImageUrl: null,
      jobTitle: 'Commercial & Coastal Estate Specialist',
      company: 'Nexus Commercial Partners',
      yearsOfExperience: 10,
      areasServed: 'Colombo Fort, Rajagiriya, Kandy, Galle Fort',
      languages: 'English, Sinhala, Tamil',
      bio: 'Specializing in commercial office suites, colonial villas, and high-yield tourism and residential investments.',
      whatsapp: '+94 77 876 5432',
      address: '12 Light House Street, Galle Fort',
      city: 'Galle Fort',
      country: 'Sri Lanka',
      preferredContactMethod: 'WHATSAPP',
      preferredContactTime: 'ANY_TIME',
      phoneVisibility: 'PUBLIC',
      emailVisibility: 'REGISTERED',
      whatsappVisibility: 'PUBLIC',
      isVerified: 1,
    },
    {
      id: 'prof_owner_01',
      userId: 'usr_owner_01',
      profileImageUrl: null,
      jobTitle: 'Principal Estate Investor',
      company: 'Sterling Capital Holdings Sri Lanka',
      yearsOfExperience: 14,
      areasServed: 'Colombo 07, Kandy, Nuwara Eliya',
      languages: 'English, Sinhala',
      bio: 'Private architectural collector and residential property owner with landmark holdings across Western and Central Provinces.',
      whatsapp: '+94 71 345 6789',
      address: '18 Alfred House Gardens',
      city: 'Colombo 03',
      country: 'Sri Lanka',
      preferredContactMethod: 'PHONE',
      preferredContactTime: 'MORNING',
      phoneVisibility: 'REGISTERED',
      emailVisibility: 'REGISTERED',
      whatsappVisibility: 'REGISTERED',
      isVerified: 1,
    },
    {
      id: 'prof_owner_02',
      userId: 'usr_owner_02',
      profileImageUrl: null,
      jobTitle: 'Residential Property Developer',
      company: 'Oswald Heritage Residences',
      yearsOfExperience: 7,
      areasServed: 'Galle Fort, Bentota, Mount Lavinia',
      languages: 'English, Sinhala',
      bio: 'Curating historic villa restorations and sustainable coastal residential projects.',
      whatsapp: '+94 71 456 7890',
      address: '24 Pedlar Street, Galle Fort',
      city: 'Galle',
      country: 'Sri Lanka',
      preferredContactMethod: 'EMAIL',
      preferredContactTime: 'AFTERNOON',
      phoneVisibility: 'REGISTERED',
      emailVisibility: 'REGISTERED',
      whatsappVisibility: 'REGISTERED',
      isVerified: 1,
    },
    {
      id: 'prof_customer_01',
      userId: 'usr_customer_01',
      profileImageUrl: null,
      jobTitle: null,
      company: null,
      yearsOfExperience: null,
      areasServed: null,
      languages: null,
      bio: null,
      whatsapp: '+94 76 567 8901',
      address: '15 Gregory\'s Road',
      city: 'Colombo 07',
      country: 'Sri Lanka',
      preferredContactMethod: 'EMAIL',
      preferredContactTime: 'AFTERNOON',
      phoneVisibility: 'REGISTERED',
      emailVisibility: 'REGISTERED',
      whatsappVisibility: 'REGISTERED',
      isVerified: 1,
    },
    {
      id: 'prof_customer_02',
      userId: 'usr_customer_02',
      profileImageUrl: null,
      jobTitle: null,
      company: null,
      yearsOfExperience: null,
      areasServed: null,
      languages: null,
      bio: null,
      whatsapp: '+94 76 678 9012',
      address: '88 Peradeniya Road',
      city: 'Kandy',
      country: 'Sri Lanka',
      preferredContactMethod: 'PHONE',
      preferredContactTime: 'MORNING',
      phoneVisibility: 'REGISTERED',
      emailVisibility: 'REGISTERED',
      whatsappVisibility: 'REGISTERED',
      isVerified: 0,
    }
  ];

  for (const p of profiles) {
    const existing = await queryOne('SELECT id FROM user_profiles WHERE user_id = ?', [p.userId]);
    if (!existing) {
      await execute(
        `INSERT INTO user_profiles (
          id, user_id, profile_image_url, bio, job_title, company,
          years_of_experience, areas_served, languages, whatsapp,
          address, city, country, preferred_contact_method, preferred_contact_time,
          phone_visibility, email_visibility, whatsapp_visibility,
          is_verified, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          p.id,
          p.userId,
          p.profileImageUrl,
          p.bio,
          p.jobTitle,
          p.company,
          p.yearsOfExperience,
          p.areasServed,
          p.languages,
          p.whatsapp,
          p.address,
          p.city,
          p.country,
          p.preferredContactMethod,
          p.preferredContactTime,
          p.phoneVisibility,
          p.emailVisibility,
          p.whatsappVisibility,
          p.isVerified,
          now,
          now,
        ]
      );
    }
  }
}

export async function seedComparisons(): Promise<void> {
  const existing = await queryOne<{ count: number }>('SELECT COUNT(*) as count FROM property_comparisons');
  if (existing && existing.count > 0) return;

  const now = Date.now();
  const day = 24 * 60 * 60 * 1000;

  const comp1Id = 'cmp_customer_01';
  await execute(
    'INSERT INTO property_comparisons (id, customer_id, name, created_at, updated_at) VALUES (?, ?, ?, ?, ?)',
    [comp1Id, 'usr_customer_01', 'Colombo Luxury Living', now - 4 * day, now - 1 * day]
  );

  const items = [
    { id: 'cmpi_01', comparisonId: comp1Id, propertyId: 'prop_01', position: 0, createdAt: now - 4 * day },
    { id: 'cmpi_02', comparisonId: comp1Id, propertyId: 'prop_02', position: 1, createdAt: now - 3 * day },
  ];

  for (const item of items) {
    await execute(
      'INSERT INTO comparison_items (id, comparison_id, property_id, position, created_at) VALUES (?, ?, ?, ?, ?)',
      [item.id, item.comparisonId, item.propertyId, item.position, item.createdAt]
    );
  }

  const comp2Id = 'cmp_customer_02';
  await execute(
    'INSERT INTO property_comparisons (id, customer_id, name, created_at, updated_at) VALUES (?, ?, ?, ?, ?)',
    [comp2Id, 'usr_customer_01', 'Coastal Investment Shortlist', now - 2 * day, now - 2 * day]
  );

  await execute(
    'INSERT INTO comparison_items (id, comparison_id, property_id, position, created_at) VALUES (?, ?, ?, ?, ?)',
    ['cmpi_03', comp2Id, 'prop_03', 0, now - 2 * day]
  );
}

export async function updateLegacyPropertiesToSriLanka(): Promise<void> {
  const legacyUpdates = [
    {
      id: 'prop_01',
      title: 'The Azure Vista Contemporary Villa in Cinnamon Gardens',
      description: 'Spectacular architectural marvel nestled in prestigious Cinnamon Gardens, Colombo 07. Features private swimming pool with sun deck, custom teak chef kitchen, imported Italian marble, temperature-controlled wine gallery, 10kW solar net metering, landscaped tropical courtyard, and 24/7 security.',
      location: 'Ward Place, Cinnamon Gardens, Colombo 07, Western Province',
      price: 125000000,
      amenities: JSON.stringify(['Ocean View', 'Swimming Pool', 'Wine Cellar', 'Smart Home', 'Security System', 'Garage 3+ Cars', 'Private Garden', 'Solar Panels'])
    },
    {
      id: 'prop_02',
      title: 'Havelock City Sky Penthouse Residence',
      description: 'Exquisite duplex penthouse perched high above Havelock City with panoramic skyline and coastline views. Features private rooftop terrace with outdoor BBQ pavilion, bespoke bronze fixtures, 14-foot beamed ceilings, wide-plank teak flooring, and direct private elevator access.',
      location: 'Havelock City, Colombo 05, Western Province',
      price: 145000000,
      amenities: JSON.stringify(['Private Terrace', 'Doorman', 'Elevator', 'Fitness Center', 'City Skyline View', 'Concierge Service', 'Swimming Pool'])
    },
    {
      id: 'prop_03',
      title: 'Bolgoda Modern Waterfront Estate',
      description: 'Ultra-luxurious Bolgoda Lake waterfront sanctuary with private 60-foot yacht dock, resort-style lap pool, outdoor summer kitchen, expansive covered verandas, and dramatic double-height foyer with floating timber staircase.',
      location: 'Bolgoda Lake, Moratuwa, Colombo District, Western Province',
      price: 85000000,
      amenities: JSON.stringify(['Waterfront', 'Private Boat Dock', 'Swimming Pool', 'Outdoor Kitchen', 'Gated Community', 'Solar Panels'])
    },
    {
      id: 'prop_04',
      title: 'Mount Lavinia Coastal Luxury Apartment',
      description: 'Sophisticated modern apartment steps from Mount Lavinia golden beach and coastal promenade. Features designer kitchen with granite waterfall island, acoustic soundproofing, walk-in wardrobes with integrated lighting, and dedicated EV charging space.',
      location: 'Hotel Road, Mount Lavinia, Colombo District, Western Province',
      price: 36000000,
      amenities: JSON.stringify(['EV Charging', 'Gym & Sauna', 'Rooftop Lounge', 'Ocean View', 'Balcony', '24/7 Security'])
    },
    {
      id: 'prop_05',
      title: 'Peradeniya Royal Valley Modern Farmhouse',
      description: 'Masterfully crafted estate residence overlooking the Mahaweli River valley near Peradeniya Royal Botanical Gardens. Set on 2.5 manicured acres with detached guest casita, sparkling pool with sun shelf, wraparound verandah, and high-efficiency solar system.',
      location: 'Peradeniya Road, Kandy, Central Province',
      price: 62000000,
      amenities: JSON.stringify(['Acreage', 'Guest House', 'Swimming Pool', 'Solar Panels', 'Hardwood Floors', 'Mountain View'])
    },
    {
      id: 'prop_06',
      title: 'World Trade Center Commercial Headquarters Suite',
      description: 'Class-A commercial office floors ideal for regional headquarters, multinational bank, or fintech hub in Colombo Fort. Flexible open floor plan, telepresence conference suites, high-speed fiber optic connectivity, and secure executive basement parking.',
      location: 'Echelon Square, Fort, Colombo 01, Western Province',
      price: 135000000,
      amenities: JSON.stringify(['Fiber Internet', 'Conference Facilities', '24/7 Access', 'HVAC Multi-Zone', 'Backup Generator', 'Elevator'])
    },
    {
      id: 'prop_07',
      title: 'Mirissa Coastal Coconut Estate & Land',
      description: 'Prime 12-acre parcel in coastal Mirissa with panoramic ocean glimpses and gentle sea breezes. Features verified clear title deeds, mature coconut groves, permitted well water rights, preliminary architectural plans for luxury eco-resort, and carpeted road access.',
      location: 'Bandaramulla, Mirissa, Matara District, Southern Province',
      price: 42000000,
      amenities: JSON.stringify(['Water Rights', 'Ocean View', 'Mountain Views', 'Road Access', 'Agricultural Zoning', 'Clear Deeds'])
    },
    {
      id: 'prop_08',
      title: 'Nuwara Eliya Misty Highlands Pine Lodge',
      description: 'Magnificent colonial-inspired timber and stone highland lodge featuring radiant heated stone floors, double-sided stone fireplace, outdoor cedar hot tub, tea plantation walking trails, and dramatic views of Mount Pedro and Lake Gregory.',
      location: 'Single Tree Hill, Nuwara Eliya, Central Province',
      price: 78000000,
      amenities: JSON.stringify(['Hot Tub', 'Fireplace', 'Heated Driveway', 'Mountain View', 'Sauna', 'Wine Cellar', 'Private Garden'])
    },
    {
      id: 'prop_09',
      title: 'Bambalapitiya Urban Studio Loft (Pending Approval)',
      description: 'Chic designer studio loft recently completed with polished terrazzo floors, soaring 11ft ceilings, Italian gas range, and south-facing terrace overlooking the ocean corridor.',
      location: 'Marine Drive, Bambalapitiya, Colombo 04, Western Province',
      price: 24500000,
      amenities: JSON.stringify(['Balcony', 'Fitness Center', 'Covered Parking', 'High Ceilings', 'Ocean View'])
    },
    {
      id: 'prop_10',
      title: 'Dharmapala Mawatha Colonial Townhouse (Under Contract)',
      description: 'Restored 19th-century colonial townhouse with restored ornamental teak woodwork, garden courtyard terrace, private library, and high ceilings throughout.',
      location: 'Dharmapala Mawatha, Colombo 07, Western Province',
      price: 88000000,
      amenities: JSON.stringify(['Historic Detail', 'Private Garden', 'Library', 'Solar Panels', 'Roller Shutter Gate'])
    },
    {
      id: 'prop_11',
      title: 'Bentota River Sanctuary Residence (Sold)',
      description: 'Tropical modern riverfront retreat with swimming pool, landscaped mangrove sanctuary, private boat ramp, and unobstructed sunset views.',
      location: 'Robalgoda, Bentota, Galle District, Southern Province',
      price: 55000000,
      amenities: JSON.stringify(['Swimming Pool', 'River View', 'Private Boat Dock', 'Zero Maintenance'])
    },
    {
      id: 'prop_12',
      title: 'Ella Mountain View Eco Chalet (Draft)',
      description: 'Upcoming rustic modern eco-chalet overlooking Ella Rock and Ravana Falls.',
      location: 'Passara Road, Ella, Badulla District, Uva Province',
      price: 28500000,
      amenities: JSON.stringify(['Fireplace', 'Mountain View', 'Deck', 'Rainwater Harvesting'])
    }
  ];

  for (const upd of legacyUpdates) {
    await execute(
      'UPDATE properties SET title = ?, description = ?, location = ?, price = ?, amenities = ? WHERE id = ?',
      [upd.title, upd.description, upd.location, upd.price, upd.amenities, upd.id]
    );
  }

  // Update legacy inquiries
  await execute(
    'UPDATE inquiries SET subject = ?, message = ?, response = ? WHERE id = ?',
    [
      'Colombo Municipal Council rates assessment & deed history request',
      'Could you please send over the official disclosures regarding the Colombo Municipal Council rates assessment, deed history, and survey report for the Cinnamon Gardens villa?',
      'Hi Elena, Sarah here. I have compiled the 2025/2026 CMC rates assessment and the licensed surveyor plan. Sending the disclosure package to your email shortly.',
      'inq_01'
    ]
  );
  await execute(
    'UPDATE inquiries SET subject = ?, message = ?, response = ? WHERE id = ?',
    [
      'Private rooftop terrace sound ordinance and BBQ installation permission',
      'Hello Marcus, can you verify if the Havelock City management permits gas line installation for an outdoor BBQ station on the private rooftop deck?',
      'Hi Alex, the condominium management corporation has pre-approved gas line hookups for outdoor BBQ stations as long as certified technicians are utilized. I have uploaded the alteration guidelines for you.',
      'inq_02'
    ]
  );
  await execute(
    'UPDATE inquiries SET subject = ?, message = ? WHERE id = ?',
    [
      'Bolgoda canal depth and boat jetty mooring capacity',
      'What is the navigable draft and boat jetty mooring capacity along the Bolgoda Lake waterfront during dry and rainy seasons? We have a 45ft cabin cruiser with 3.8ft draft.',
      'inq_03'
    ]
  );

  // Update legacy complaints
  await execute(
    'UPDATE complaints SET subject = ?, description = ?, resolution = ? WHERE id = ?',
    [
      'Agent was 30 minutes late to scheduled property viewing',
      'I booked a private viewing for Mount Lavinia Coastal Apartment on Tuesday at 2:00 PM. The agent arrived at 2:32 PM without prior notification. My schedule was severely disrupted.',
      'We sincerely apologize for the delay. The agent encountered unexpected Galle Road congestion and failed to notify dispatch in time. A senior partner has scheduled a private VIP tour with complimentary refreshments and our brokerage service credit.',
      'cmp_01'
    ]
  );

  // Update legacy user profiles to Sri Lanka
  await execute(
    "UPDATE user_profiles SET city = 'Colombo 01', country = 'Sri Lanka', address = 'Level 34, World Trade Center, Echelon Square', areas_served = 'Colombo 07, Colombo 03, Havelock City, Galle Fort', company = 'Nexus Real Estate Sri Lanka' WHERE user_id = 'usr_admin_01'"
  );
  await execute(
    "UPDATE user_profiles SET city = 'Colombo 07', country = 'Sri Lanka', address = '45 Ward Place, Colombo 07', areas_served = 'Cinnamon Gardens, Kollupitiya, Mount Lavinia, Battaramulla', company = 'Nexus Premier Realty' WHERE user_id = 'usr_agent_01'"
  );
  await execute(
    "UPDATE user_profiles SET city = 'Galle Fort', country = 'Sri Lanka', address = '12 Light House Street, Galle Fort', areas_served = 'Colombo Fort, Rajagiriya, Kandy, Galle Fort', company = 'Nexus Commercial Partners' WHERE user_id = 'usr_agent_02'"
  );
  await execute(
    "UPDATE user_profiles SET city = 'Colombo 03', country = 'Sri Lanka', address = '18 Alfred House Gardens', areas_served = 'Colombo 07, Kandy, Nuwara Eliya', company = 'Sterling Capital Holdings Sri Lanka' WHERE user_id = 'usr_owner_01'"
  );
  await execute(
    "UPDATE user_profiles SET city = 'Galle', country = 'Sri Lanka', address = '24 Pedlar Street, Galle Fort', areas_served = 'Galle Fort, Bentota, Mount Lavinia', company = 'Oswald Heritage Residences' WHERE user_id = 'usr_owner_02'"
  );
  await execute(
    "UPDATE user_profiles SET city = 'Colombo 07', country = 'Sri Lanka', address = \"15 Gregory's Road\" WHERE user_id = 'usr_customer_01'"
  );
  await execute(
    "UPDATE user_profiles SET city = 'Kandy', country = 'Sri Lanka', address = '88 Peradeniya Road' WHERE user_id = 'usr_customer_02'"
  );
}

export async function seedSriLankanProperties(): Promise<void> {
  const now = Date.now();
  const day = 24 * 60 * 60 * 1000;

  const sriLankanProperties = [
    {
      id: 'prop_sl_01',
      ownerId: 'usr_owner_01',
      title: 'Modern 3-Bedroom Architect Residence in Nugegoda',
      description: 'Spacious three-bedroom contemporary family home located in a quiet residential avenue off Stanley Thilakarathne Mawatha, Nugegoda, Colombo District, Western Province. Built on 8.5 perches of prime dry land with 2,100 sq ft of living space, this two-story house features a master suite with private balcony, two guest bedrooms, two European-fitted bathrooms with hot water geysers, open-plan living and dining areas, granite-topped teak pantry, servant washroom, landscaped garden, covered parking for two vehicles with an automated roller gate, 5kW solar net metering, and 24/7 CCTV surveillance. Within walking distance of supermarkets, Lyceum International School, and Nugegoda junction.',
      propertyType: 'HOUSE',
      location: 'Stanley Thilakarathne Mawatha, Nugegoda, Colombo District, Western Province',
      price: 38500000,
      bedrooms: 3,
      bathrooms: 2,
      area: 2100,
      amenities: JSON.stringify(['Covered Parking', 'Roller Shutter Gate', 'Landscaped Garden', 'Hot Water System', 'CCTV', 'Solar Panels', 'Boundary Wall']),
      status: 'ACTIVE',
      createdAt: now - 21 * day,
      images: [
        { id: 'img_sl_01_1', url: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=1600&q=80', isPrimary: 1, order: 0 },
        { id: 'img_sl_01_2', url: 'https://images.unsplash.com/photo-1600566753376-12c8ab7fb75b?auto=format&fit=crop&w=1600&q=80', isPrimary: 0, order: 1 },
        { id: 'img_sl_01_3', url: 'https://images.unsplash.com/photo-1600585154526-990dced4db0d?auto=format&fit=crop&w=1600&q=80', isPrimary: 0, order: 2 }
      ]
    },
    {
      id: 'prop_sl_02',
      ownerId: 'usr_owner_02',
      title: 'Luxury Sea-View Apartment in Colombo 03',
      description: 'High-floor luxury condominium residence perched along Marine Drive in prime Kollupitiya, Colombo 03, Colombo District, Western Province. Boasting 1,850 sq ft of premium living space with unobstructed panoramic vistas of the Indian Ocean and Colombo Port City. Configured with 3 spacious bedrooms, 3 en-suite bathrooms, separate maid\'s quarters with attached bath, imported German pantry with built-in oven, double-glazed acoustic soundproof windows, and centralized inverter air conditioning. Building facilities feature a 25m infinity rooftop pool, fitness gymnasium, backup standby generator, high-speed elevators, and two dedicated basement parking bays.',
      propertyType: 'APARTMENT',
      location: 'Marine Drive, Kollupitiya, Colombo 03, Colombo District, Western Province',
      price: 95000000,
      bedrooms: 3,
      bathrooms: 3,
      area: 1850,
      amenities: JSON.stringify(['Ocean View', 'Infinity Pool', 'Gym', 'Backup Generator', 'Elevator', 'Covered Parking', 'Central AC', '24/7 Security']),
      status: 'ACTIVE',
      createdAt: now - 20 * day,
      images: [
        { id: 'img_sl_02_1', url: 'https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?auto=format&fit=crop&w=1600&q=80', isPrimary: 1, order: 0 },
        { id: 'img_sl_02_2', url: 'https://images.unsplash.com/photo-1512918728675-ed5a9ecdebfd?auto=format&fit=crop&w=1600&q=80', isPrimary: 0, order: 1 },
        { id: 'img_sl_02_3', url: 'https://images.unsplash.com/photo-1574362848149-11496d93a7c7?auto=format&fit=crop&w=1600&q=80', isPrimary: 0, order: 2 }
      ]
    },
    {
      id: 'prop_sl_03',
      ownerId: 'usr_owner_01',
      title: 'Prime Residential Land Plot in Kaduwela',
      description: 'Exceptional 12-perch square block of flat, elevated residential land situated in an exclusive residential enclave off Kaduwela-Malabe Main Road, Kaduwela, Colombo District, Western Province. Total land area measures approximately 3,267 sq ft (12 perches). Enjoys a wide 20-foot carpeted roadway, three-phase electricity connection ready, pipe-borne National Water Supply and Drainage Board line, and complete boundary masonry walls with drainage trenches. Cleared Bim Saviya First Class bank-approved title deeds. Conveniently located just 4 minutes from the Kaduwela Expressway Interchange (Outer Circular Highway) and SLIIT Campus.',
      propertyType: 'LAND',
      location: 'Malabe Road, Kaduwela, Colombo District, Western Province',
      price: 14800000,
      bedrooms: 0,
      bathrooms: 0,
      area: 3267,
      amenities: JSON.stringify(['Water Supply', 'Three-Phase Electricity', '20ft Access Road', 'Clear Deeds', 'Boundary Wall', 'Storm Drainage']),
      status: 'ACTIVE',
      createdAt: now - 19 * day,
      images: [
        { id: 'img_sl_03_1', url: 'https://images.unsplash.com/photo-1500382017468-9049fed747ef?auto=format&fit=crop&w=1600&q=80', isPrimary: 1, order: 0 },
        { id: 'img_sl_03_2', url: 'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=1600&q=80', isPrimary: 0, order: 1 }
      ]
    },
    {
      id: 'prop_sl_04',
      ownerId: 'usr_owner_02',
      title: 'Colonial Heritage Beachfront Villa in Galle Fort',
      description: 'Authentically restored 18th-century Dutch colonial villa located inside the UNESCO World Heritage ramparts of historic Galle Fort, Galle District, Southern Province. Spanning 3,800 sq ft on a 16-perch plot, the property features a traditional central cobblestone courtyard, original exposed calamander and teak timbers, terracotta roof tiling, 4 grand bedroom suites with en-suite open-air rain showers, private emerald plunge pool, breezy shaded verandahs with antique planter chairs, staff quarters, and solar hot water heating. An irreplaceable heritage trophy asset and boutique hospitality sanctuary steps from the Galle lighthouse, ocean ramparts, and artisan cafes.',
      propertyType: 'VILLA',
      location: 'Lighthouse Street, Galle Fort, Galle District, Southern Province',
      price: 145000000,
      bedrooms: 4,
      bathrooms: 4,
      area: 3800,
      amenities: JSON.stringify(['Ocean View', 'Swimming Pool', 'Courtyard Garden', 'Verandah', 'Servant Quarters', 'Solar Panels', 'CCTV']),
      status: 'ACTIVE',
      createdAt: now - 18 * day,
      images: [
        { id: 'img_sl_04_1', url: 'https://images.unsplash.com/photo-1582268611958-ebfd161ef9cf?auto=format&fit=crop&w=1600&q=80', isPrimary: 1, order: 0 },
        { id: 'img_sl_04_2', url: 'https://images.unsplash.com/photo-1576013551627-0cc20b96c2a7?auto=format&fit=crop&w=1600&q=80', isPrimary: 0, order: 1 },
        { id: 'img_sl_04_3', url: 'https://images.unsplash.com/photo-1613977257363-707ba9348227?auto=format&fit=crop&w=1600&q=80', isPrimary: 0, order: 2 }
      ]
    },
    {
      id: 'prop_sl_05',
      ownerId: 'usr_owner_01',
      title: 'Tropical Modern Family Home in Battaramulla',
      description: 'Magnificent four-bedroom architect-designed tropical modern home set on 10 perches of land in Pelawatta, Battaramulla, Colombo District, Western Province. Offers 3,200 sq ft of naturally ventilated living space with soaring double-height timber ceilings, Kumbuk wooden staircase, cut-cement titanium flooring, 4 air-conditioned bedrooms with luxury attached bathrooms, separate wet kitchen and dry pantry, driver/maid room with toilet, covered 2-vehicle garage with automated remote roller door, and landscaped inner courtyard. Situated close to Overseas School of Colombo, Parliament walking track, and ministry complexes.',
      propertyType: 'HOUSE',
      location: 'Pelawatta, Battaramulla, Colombo District, Western Province',
      price: 58000000,
      bedrooms: 4,
      bathrooms: 4,
      area: 3200,
      amenities: JSON.stringify(['Landscaped Garden', 'Covered Parking', 'Roller Shutter Gate', 'Servant Room', 'CCTV', 'Solar Panels', 'Rooftop Terrace']),
      status: 'ACTIVE',
      createdAt: now - 17 * day,
      images: [
        { id: 'img_sl_05_1', url: 'https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?auto=format&fit=crop&w=1600&q=80', isPrimary: 1, order: 0 },
        { id: 'img_sl_05_2', url: 'https://images.unsplash.com/photo-1600566753190-17f0baa2a6c3?auto=format&fit=crop&w=1600&q=80', isPrimary: 0, order: 1 },
        { id: 'img_sl_05_3', url: 'https://images.unsplash.com/photo-1600585154526-990dced4db0d?auto=format&fit=crop&w=1600&q=80', isPrimary: 0, order: 2 }
      ]
    },
    {
      id: 'prop_sl_06',
      ownerId: 'usr_owner_02',
      title: 'Panoramic Golf & Lake View Condominium in Rajagiriya',
      description: 'Prestigious 14th-floor luxury corner condominium in a landmark high-rise development in Rajagiriya, Colombo District, Western Province. Enjoys 1,480 sq ft of elegant living space with sweeping vistas of the Royal Colombo Golf Club greens and Diyawanna Lake bird sanctuary. Consists of 3 sun-filled bedrooms with engineered teak flooring, 2 contemporary bathrooms, open-concept living area extending onto a generous viewing terrace, centralized LP gas pipeline, and dedicated maid washroom. Building features include an Olympic-length swimming pool, fully equipped gymnasium, clubhouse, kids play area, 24-hour concierge, and covered parking.',
      propertyType: 'CONDO',
      location: 'Parliament Road, Rajagiriya, Colombo District, Western Province',
      price: 48500000,
      bedrooms: 3,
      bathrooms: 2,
      area: 1480,
      amenities: JSON.stringify(['Swimming Pool', 'Gym', 'Balcony', 'Elevator', 'Covered Parking', 'Backup Generator', '24/7 Security', 'Kids Play Area']),
      status: 'ACTIVE',
      createdAt: now - 16 * day,
      images: [
        { id: 'img_sl_06_1', url: 'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?auto=format&fit=crop&w=1600&q=80', isPrimary: 1, order: 0 },
        { id: 'img_sl_06_2', url: 'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?auto=format&fit=crop&w=1600&q=80', isPrimary: 0, order: 1 },
        { id: 'img_sl_06_3', url: 'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?auto=format&fit=crop&w=1600&q=80', isPrimary: 0, order: 2 }
      ]
    },
    {
      id: 'prop_sl_07',
      ownerId: 'usr_owner_01',
      title: 'Traditional Ceylon Planter\'s Bungalow in Kandy',
      description: 'Enchanting colonial tea planter\'s bungalow nestled amidst the rolling hills of Hanthana, Kandy District, Central Province. Situated on 35 perches of manicured tea garden and fruit trees with 3,600 sq ft of living area. Retains exquisite British colonial architectural features including functioning English brick fireplaces, 14-foot exposed beam ceilings, polished jackwood floors, broad colonial verandahs with panoramic mountain panoramas, 4 expansive bedrooms, 3 bathrooms, caretaker quarters, and gravity-fed pure natural mountain spring water. Ideal as an idyllic family hill-country retreat or boutique holiday bungalow just 15 minutes from Kandy town.',
      propertyType: 'HOUSE',
      location: 'Hanthana Mountain Road, Kandy, Kandy District, Central Province',
      price: 68000000,
      bedrooms: 4,
      bathrooms: 3,
      area: 3600,
      amenities: JSON.stringify(['Mountain View', 'Fireplace', 'Landscaped Garden', 'Verandah', 'Covered Parking', 'Servant Room', 'Water Supply']),
      status: 'ACTIVE',
      createdAt: now - 15 * day,
      images: [
        { id: 'img_sl_07_1', url: 'https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?auto=format&fit=crop&w=1600&q=80', isPrimary: 1, order: 0 },
        { id: 'img_sl_07_2', url: 'https://images.unsplash.com/photo-1518780664697-55e3ad937233?auto=format&fit=crop&w=1600&q=80', isPrimary: 0, order: 1 },
        { id: 'img_sl_07_3', url: 'https://images.unsplash.com/photo-1510798831971-661eb04b3739?auto=format&fit=crop&w=1600&q=80', isPrimary: 0, order: 2 }
      ]
    },
    {
      id: 'prop_sl_08',
      ownerId: 'usr_owner_02',
      title: 'Commercial Corporate Headquarters Building in Kurunegala',
      description: 'High-visibility three-story modern commercial property strategically positioned on Colombo Road in the central commercial district of Kurunegala, Kurunegala District, North Western Province. Total built-up area of 6,500 sq ft with full structural glass curtain wall facade, open column-free showroom floors, modern passenger elevator, executive boardroom, separate male and female washrooms on every floor, 3-phase industrial power (60A), commercial backup generator, and dedicated basement parking for 10 vehicles. Perfect for commercial banking branches, financial headquarters, educational institutes, or retail flagships.',
      propertyType: 'COMMERCIAL',
      location: 'Colombo Road, Kurunegala, Kurunegala District, North Western Province',
      price: 88000000,
      bedrooms: 0,
      bathrooms: 4,
      area: 6500,
      amenities: JSON.stringify(['Three-Phase Electricity', 'Elevator', 'Covered Parking', 'Backup Generator', 'CCTV', '24/7 Security']),
      status: 'ACTIVE',
      createdAt: now - 14 * day,
      images: [
        { id: 'img_sl_08_1', url: 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&w=1600&q=80', isPrimary: 1, order: 0 },
        { id: 'img_sl_08_2', url: 'https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&w=1600&q=80', isPrimary: 0, order: 1 }
      ]
    },
    {
      id: 'prop_sl_09',
      ownerId: 'usr_owner_01',
      title: 'Beachside Coastal Villa in Polhena, Matara',
      description: 'Charming two-story tropical beach villa located just 80 meters from the sheltered calm waters and coral reefs of Polhena Beach, Matara, Matara District, Southern Province. Sited on 18 perches of freehold coconut land with 2,850 sq ft of floor area. Offers four air-conditioned bedrooms, 4 attached designer bathrooms with solar hot water, open-concept living lounge leading to a private 30-foot freshwater swimming pool and timber sun deck, outdoor BBQ pavilion, staff accommodation, and high security boundary wall. Excellent location with rapid access to the Southern Expressway interchange at Godagama.',
      propertyType: 'VILLA',
      location: 'Beach Road, Polhena, Matara, Matara District, Southern Province',
      price: 52000000,
      bedrooms: 4,
      bathrooms: 4,
      area: 2850,
      amenities: JSON.stringify(['Swimming Pool', 'Ocean View', 'Landscaped Garden', 'Balcony', 'Covered Parking', 'Solar Panels', 'CCTV']),
      status: 'ACTIVE',
      createdAt: now - 13 * day,
      images: [
        { id: 'img_sl_09_1', url: 'https://images.unsplash.com/photo-1580587771525-78b9dba3b914?auto=format&fit=crop&w=1600&q=80', isPrimary: 1, order: 0 },
        { id: 'img_sl_09_2', url: 'https://images.unsplash.com/photo-1571896349842-33c89424de2d?auto=format&fit=crop&w=1600&q=80', isPrimary: 0, order: 1 }
      ]
    },
    {
      id: 'prop_sl_10',
      ownerId: 'usr_owner_02',
      title: 'Contemporary Seaside Apartment in Dehiwala',
      description: 'Modern coastal apartment unit located along Station Road on the marine drive side of Dehiwala, Colombo District, Western Province. Features 980 sq ft of well-planned living space with 2 bedrooms, 2 bathrooms with hot water, private ocean breeze balcony, fitted granite kitchen pantry, ceramic porcelain tiling throughout, reserved covered parking space, standby power generator for common amenities, and 24-hour security with intercom. Superbly located just 300 meters from Dehiwala railway station, Galle Road, and coastal seafood dining.',
      propertyType: 'APARTMENT',
      location: 'Station Road, Dehiwala, Colombo District, Western Province',
      price: 26500000,
      bedrooms: 2,
      bathrooms: 2,
      area: 980,
      amenities: JSON.stringify(['Balcony', 'Elevator', 'Covered Parking', 'Backup Generator', '24/7 Security', 'Rooftop Terrace']),
      status: 'ACTIVE',
      createdAt: now - 12 * day,
      images: [
        { id: 'img_sl_10_1', url: 'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?auto=format&fit=crop&w=1600&q=80', isPrimary: 1, order: 0 },
        { id: 'img_sl_10_2', url: 'https://images.unsplash.com/photo-1502005229762-ee1b2b80a562?auto=format&fit=crop&w=1600&q=80', isPrimary: 0, order: 1 }
      ]
    },
    {
      id: 'prop_sl_11',
      ownerId: 'usr_owner_01',
      title: 'Fertile Coconut Estate & Development Land in Negombo',
      description: 'Prime 40-perch (0.25 acre) parcel of agricultural and residential development land situated in Kochchikade, Negombo, Gampaha District, Western Province. Contains 28 mature high-yield coconut palms on fertile, well-drained sandy loam soil with 10,890 sq ft total land area. Features a 15-foot paved access road, deep tube well supplying perennial fresh water, and nearby CEB electricity connection. Located in a tranquil residential setting 12 minutes from the Negombo tourist hotel strip, 20 minutes from Bandaranaike International Airport (Katunayake), and 10 minutes from the Colombo expressway gateway.',
      propertyType: 'LAND',
      location: 'Kochchikade, Negombo, Gampaha District, Western Province',
      price: 22000000,
      bedrooms: 0,
      bathrooms: 0,
      area: 10890,
      amenities: JSON.stringify(['Water Supply', 'Three-Phase Electricity', 'Clear Deeds', 'Boundary Wall']),
      status: 'ACTIVE',
      createdAt: now - 11 * day,
      images: [
        { id: 'img_sl_11_1', url: 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=1600&q=80', isPrimary: 1, order: 0 },
        { id: 'img_sl_11_2', url: 'https://images.unsplash.com/photo-1511497584788-87676104235f?auto=format&fit=crop&w=1600&q=80', isPrimary: 0, order: 1 }
      ]
    },
    {
      id: 'prop_sl_12',
      ownerId: 'usr_owner_02',
      title: 'Colonial Heritage Residence in Chundikuli, Jaffna',
      description: 'Stately traditional northern heritage residence standing on a prime 15-perch walled estate in prestigious Chundikuli, Jaffna, Jaffna District, Northern Province. Comprises 2,400 sq ft of living area featuring authentic Jaffna architectural hallmarks including high pillared verandahs, central cooling courtyard (Muttram), fertile red soil garden planted with mature Karthacolomban mango and palmyrah trees, traditional limestone sweet water well with pump, 4 airy bedrooms, 2 bathrooms, garage, and high masonry security walls. Close to St. John\'s College, Chundikuli Girls\' College, and Jaffna Teaching Hospital with clear bank-verified title.',
      propertyType: 'HOUSE',
      location: 'Kandy Road, Chundikuli, Jaffna, Jaffna District, Northern Province',
      price: 34000000,
      bedrooms: 4,
      bathrooms: 2,
      area: 2400,
      amenities: JSON.stringify(['Water Supply', 'Landscaped Garden', 'Covered Parking', 'Solar Panels', 'Boundary Wall', 'Verandah']),
      status: 'ACTIVE',
      createdAt: now - 10 * day,
      images: [
        { id: 'img_sl_12_1', url: 'https://images.unsplash.com/photo-1568605117036-5fe5e7bab0b7?auto=format&fit=crop&w=1600&q=80', isPrimary: 1, order: 0 },
        { id: 'img_sl_12_2', url: 'https://images.unsplash.com/photo-1600573472550-8090b5e0745e?auto=format&fit=crop&w=1600&q=80', isPrimary: 0, order: 1 }
      ]
    }
  ];

  for (const p of sriLankanProperties) {
    const existing = await queryOne('SELECT id FROM properties WHERE id = ?', [p.id]);
    if (!existing) {
      await execute(
        `INSERT INTO properties (id, owner_id, title, description, property_type, location, price, bedrooms, bathrooms, area, amenities, status, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [p.id, p.ownerId, p.title, p.description, p.propertyType, p.location, p.price, p.bedrooms, p.bathrooms, p.area, p.amenities, p.status, p.createdAt, p.createdAt]
      );

      for (const img of p.images) {
        const existingImg = await queryOne('SELECT id FROM property_images WHERE id = ?', [img.id]);
        if (!existingImg) {
          await execute(
            `INSERT INTO property_images (id, property_id, url, is_primary, display_order, created_at)
             VALUES (?, ?, ?, ?, ?, ?)`,
            [img.id, p.id, img.url, img.isPrimary, img.order, p.createdAt]
          );
        }
      }
    }
  }

  // Downstream test fixtures (Ratings, Inquiry, Appointment)
  const existingRtg = await queryOne('SELECT id FROM ratings WHERE id = ?', ['rtg_sl_01']);
  if (!existingRtg) {
    await execute(
      `INSERT INTO ratings (id, property_id, customer_id, score, comment, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      ['rtg_sl_01', 'prop_sl_04', 'usr_customer_01', 5, 'Unmatched heritage charm and tranquility inside Galle Fort. Museum-grade restoration.', now - 8 * day, now - 8 * day]
    );
  }

  const existingRtg2 = await queryOne('SELECT id FROM ratings WHERE id = ?', ['rtg_sl_02']);
  if (!existingRtg2) {
    await execute(
      `INSERT INTO ratings (id, property_id, customer_id, score, comment, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      ['rtg_sl_02', 'prop_sl_02', 'usr_customer_02', 5, 'Spectacular ocean and Port City views from the balcony. Infinity pool is world-class.', now - 6 * day, now - 6 * day]
    );
  }

  const existingInq = await queryOne('SELECT id FROM inquiries WHERE ticket_id = ?', ['INQ-3001']);
  if (!existingInq) {
    await execute(
      `INSERT INTO inquiries (id, ticket_id, property_id, customer_id, assigned_agent_id, subject, message, status, response, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      ['inq_sl_01', 'INQ-3001', 'prop_sl_03', 'usr_customer_01', 'usr_agent_01', 'Bim Saviya First Class title deeds inspection', 'Could you please confirm if the 12 perches in Kaduwela have clearance for immediate mortgage approval from commercial banks?', 'RESOLVED', 'Hi Elena, yes, title deeds are First Class Bim Saviya and pre-cleared by Commercial Bank and Hatton National Bank.', now - 5 * day, now - 5 * day]
    );
  }

  const existingApt = await queryOne('SELECT id FROM appointments WHERE id = ?', ['apt_sl_01']);
  if (!existingApt) {
    await execute(
      `INSERT INTO appointments (id, property_id, customer_id, agent_id, appointment_time, duration_minutes, status, notes, cancellation_reason, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      ['apt_sl_01', 'prop_sl_02', 'usr_customer_02', 'usr_agent_02', now + 3 * day + 10 * 60 * 60 * 1000, 60, 'CONFIRMED', 'Private viewing of Colombo 03 oceanfront unit scheduled for Saturday morning.', null, now - 2 * day, now - 2 * day]
    );
  }
}



