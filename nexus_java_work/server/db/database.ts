import initSqlJs, { Database as SqlJsDatabase } from 'sql.js';
import fs from 'fs';
import path from 'path';

let db: SqlJsDatabase | null = null;
const DB_DIR = path.resolve(process.cwd(), 'data');
const DB_FILE = path.join(DB_DIR, 'nexus.sqlite');

export async function getDb(): Promise<SqlJsDatabase> {
  if (db) return db;

  const SQL = await initSqlJs();
  
  if (!fs.existsSync(DB_DIR)) {
    fs.mkdirSync(DB_DIR, { recursive: true });
  }

  if (fs.existsSync(DB_FILE)) {
    try {
      const fileBuffer = fs.readFileSync(DB_FILE);
      db = new SQL.Database(fileBuffer);
      db.run('PRAGMA foreign_keys = ON;');
      initSchema(db);
      return db;
    } catch (e) {
      console.error('Failed to load existing SQLite database, creating new one', e);
    }
  }

  db = new SQL.Database();
  db.run('PRAGMA foreign_keys = ON;');
  initSchema(db);
  saveDb();
  return db;
}

let inTransaction = false;

export function saveDb(): void {
  if (!db || inTransaction) return;
  try {
    const data = db.export();
    const buffer = Buffer.from(data);
    fs.writeFileSync(DB_FILE, buffer);
  } catch (err) {
    console.error('Error saving SQLite database to disk:', err);
  }
}

function initSchema(database: SqlJsDatabase): void {
  database.run(`
    -- 1. Users table
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      full_name TEXT NOT NULL,
      email TEXT NOT NULL UNIQUE COLLATE NOCASE,
      password_hash TEXT NOT NULL,
      phone TEXT,
      role TEXT NOT NULL CHECK(role IN ('CUSTOMER', 'PROPERTY_OWNER', 'AGENT', 'ADMIN')),
      enabled INTEGER NOT NULL DEFAULT 1,
      reset_token TEXT,
      reset_token_expires INTEGER,
      email_verified INTEGER NOT NULL DEFAULT 1,
      verification_token TEXT,
      verification_expires_at INTEGER,
      failed_login_attempts INTEGER NOT NULL DEFAULT 0,
      locked_until INTEGER,
      last_login_at INTEGER,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
    CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
    CREATE INDEX IF NOT EXISTS idx_users_verif ON users(verification_token);
    CREATE INDEX IF NOT EXISTS idx_users_reset ON users(reset_token);

    -- 2. Properties table
    CREATE TABLE IF NOT EXISTS properties (
      id TEXT PRIMARY KEY,
      owner_id TEXT NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
      title TEXT NOT NULL,
      description TEXT NOT NULL,
      property_type TEXT NOT NULL CHECK(property_type IN ('HOUSE', 'APARTMENT', 'CONDO', 'VILLA', 'LAND', 'COMMERCIAL')),
      location TEXT NOT NULL,
      price REAL NOT NULL CHECK(price > 0),
      bedrooms INTEGER NOT NULL DEFAULT 0 CHECK(bedrooms >= 0),
      bathrooms INTEGER NOT NULL DEFAULT 1 CHECK(bathrooms >= 0),
      area REAL NOT NULL CHECK(area > 0),
      amenities TEXT NOT NULL DEFAULT '[]',
      status TEXT NOT NULL CHECK(status IN ('DRAFT', 'PENDING_APPROVAL', 'ACTIVE', 'UNDER_CONTRACT', 'SOLD', 'RENTED', 'ARCHIVED')),
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_properties_status ON properties(status);
    CREATE INDEX IF NOT EXISTS idx_properties_price ON properties(price);
    CREATE INDEX IF NOT EXISTS idx_properties_location ON properties(location);
    CREATE INDEX IF NOT EXISTS idx_properties_type ON properties(property_type);
    CREATE INDEX IF NOT EXISTS idx_properties_owner ON properties(owner_id);

    -- 3. Property Images table
    CREATE TABLE IF NOT EXISTS property_images (
      id TEXT PRIMARY KEY,
      property_id TEXT NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
      url TEXT NOT NULL,
      is_primary INTEGER NOT NULL DEFAULT 0,
      display_order INTEGER NOT NULL DEFAULT 0,
      caption TEXT,
      category TEXT,
      created_at INTEGER NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_images_property ON property_images(property_id);

    -- 4. Ratings table
    CREATE TABLE IF NOT EXISTS ratings (
      id TEXT PRIMARY KEY,
      property_id TEXT NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
      customer_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      score INTEGER NOT NULL CHECK(score >= 1 AND score <= 5),
      comment TEXT,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL,
      CONSTRAINT uq_customer_property_rating UNIQUE(property_id, customer_id)
    );

    CREATE INDEX IF NOT EXISTS idx_ratings_property ON ratings(property_id);

    -- 5. Inquiries table
    CREATE TABLE IF NOT EXISTS inquiries (
      id TEXT PRIMARY KEY,
      ticket_id TEXT NOT NULL UNIQUE,
      property_id TEXT NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
      customer_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      assigned_agent_id TEXT REFERENCES users(id) ON DELETE SET NULL,
      subject TEXT NOT NULL,
      message TEXT NOT NULL,
      status TEXT NOT NULL CHECK(status IN ('NEW', 'IN_PROGRESS', 'RESOLVED', 'CLOSED')),
      response TEXT,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_inquiries_customer ON inquiries(customer_id);
    CREATE INDEX IF NOT EXISTS idx_inquiries_agent ON inquiries(assigned_agent_id);
    CREATE INDEX IF NOT EXISTS idx_inquiries_property ON inquiries(property_id);

    -- 6. Complaints table
    CREATE TABLE IF NOT EXISTS complaints (
      id TEXT PRIMARY KEY,
      ticket_id TEXT NOT NULL UNIQUE,
      property_id TEXT REFERENCES properties(id) ON DELETE SET NULL,
      customer_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      subject TEXT NOT NULL,
      description TEXT NOT NULL,
      status TEXT NOT NULL CHECK(status IN ('NEW', 'IN_PROGRESS', 'RESOLVED', 'CLOSED')),
      resolution TEXT,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_complaints_customer ON complaints(customer_id);

    -- 7. Appointments table
    CREATE TABLE IF NOT EXISTS appointments (
      id TEXT PRIMARY KEY,
      property_id TEXT NOT NULL REFERENCES properties(id) ON DELETE RESTRICT,
      customer_id TEXT NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
      agent_id TEXT NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
      appointment_time INTEGER NOT NULL,
      duration_minutes INTEGER NOT NULL DEFAULT 60,
      status TEXT NOT NULL CHECK(status IN ('REQUESTED', 'CONFIRMED', 'RESCHEDULED', 'CANCELLED', 'COMPLETED')),
      notes TEXT,
      cancellation_reason TEXT,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_appointments_agent_time ON appointments(agent_id, appointment_time);
    CREATE INDEX IF NOT EXISTS idx_appointments_customer ON appointments(customer_id);
    CREATE INDEX IF NOT EXISTS idx_appointments_property ON appointments(property_id);

    -- 8. Wishlists table
    CREATE TABLE IF NOT EXISTS wishlists (
      id TEXT PRIMARY KEY,
      customer_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      name TEXT NOT NULL DEFAULT 'My Saved Properties',
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_wishlists_customer ON wishlists(customer_id);

    -- 9. Wishlist Items table
    CREATE TABLE IF NOT EXISTS wishlist_items (
      id TEXT PRIMARY KEY,
      wishlist_id TEXT NOT NULL REFERENCES wishlists(id) ON DELETE CASCADE,
      property_id TEXT NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
      created_at INTEGER NOT NULL,
      CONSTRAINT uq_wishlist_property UNIQUE(wishlist_id, property_id)
    );

    CREATE INDEX IF NOT EXISTS idx_wishlist_items_prop ON wishlist_items(property_id);

    -- 10. Notifications table
    CREATE TABLE IF NOT EXISTS notifications (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      type TEXT NOT NULL,
      title TEXT NOT NULL,
      message TEXT NOT NULL,
      reference_id TEXT,
      is_read INTEGER NOT NULL DEFAULT 0,
      created_at INTEGER NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id, is_read);

    -- 11. Audit Logs table
    CREATE TABLE IF NOT EXISTS audit_logs (
      id TEXT PRIMARY KEY,
      actor_id TEXT NOT NULL,
      action TEXT NOT NULL,
      entity_type TEXT NOT NULL,
      entity_id TEXT NOT NULL,
      details TEXT,
      created_at INTEGER NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_audit_created ON audit_logs(created_at);

    -- 12. User Profiles table
    CREATE TABLE IF NOT EXISTS user_profiles (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
      profile_image_url TEXT,
      bio TEXT,
      job_title TEXT,
      company TEXT,
      years_of_experience INTEGER CHECK(years_of_experience IS NULL OR (years_of_experience >= 0 AND years_of_experience <= 70)),
      areas_served TEXT,
      languages TEXT,
      whatsapp TEXT,
      address TEXT,
      city TEXT,
      country TEXT,
      preferred_contact_method TEXT DEFAULT 'PHONE' CHECK(preferred_contact_method IN ('PHONE', 'EMAIL', 'WHATSAPP', 'SYSTEM_MESSAGE')),
      preferred_contact_time TEXT DEFAULT 'ANY_TIME' CHECK(preferred_contact_time IN ('MORNING', 'AFTERNOON', 'EVENING', 'ANY_TIME')),
      phone_visibility TEXT NOT NULL DEFAULT 'REGISTERED' CHECK(phone_visibility IN ('PUBLIC', 'REGISTERED', 'PRIVATE')),
      email_visibility TEXT NOT NULL DEFAULT 'REGISTERED' CHECK(email_visibility IN ('PUBLIC', 'REGISTERED', 'PRIVATE')),
      whatsapp_visibility TEXT NOT NULL DEFAULT 'REGISTERED' CHECK(whatsapp_visibility IN ('PUBLIC', 'REGISTERED', 'PRIVATE')),
      is_verified INTEGER NOT NULL DEFAULT 0 CHECK(is_verified IN (0, 1)),
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_user_profiles_user ON user_profiles(user_id);
    CREATE INDEX IF NOT EXISTS idx_user_profiles_verified ON user_profiles(is_verified);

    -- 13. Property Comparisons table
    CREATE TABLE IF NOT EXISTS property_comparisons (
      id TEXT PRIMARY KEY,
      customer_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_comparisons_customer ON property_comparisons(customer_id);

    -- 14. Comparison Items table
    CREATE TABLE IF NOT EXISTS comparison_items (
      id TEXT PRIMARY KEY,
      comparison_id TEXT NOT NULL REFERENCES property_comparisons(id) ON DELETE CASCADE,
      property_id TEXT NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
      position INTEGER NOT NULL DEFAULT 0,
      created_at INTEGER NOT NULL,
      CONSTRAINT uq_comparison_property UNIQUE(comparison_id, property_id)
    );

    CREATE INDEX IF NOT EXISTS idx_comparison_items_comp ON comparison_items(comparison_id);
    CREATE INDEX IF NOT EXISTS idx_comparison_items_prop ON comparison_items(property_id);

    -- 15. Recently Viewed Properties table
    CREATE TABLE IF NOT EXISTS recently_viewed_properties (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      property_id TEXT NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
      viewed_at INTEGER NOT NULL,
      CONSTRAINT uq_user_viewed_prop UNIQUE(user_id, property_id)
    );

    CREATE INDEX IF NOT EXISTS idx_recently_viewed_user ON recently_viewed_properties(user_id, viewed_at DESC);
  `);

  // Safe schema migrations for existing SQLite databases
  try { database.run('ALTER TABLE users ADD COLUMN email_verified INTEGER NOT NULL DEFAULT 1;'); } catch {}
  try { database.run('ALTER TABLE users ADD COLUMN verification_token TEXT;'); } catch {}
  try { database.run('ALTER TABLE users ADD COLUMN verification_expires_at INTEGER;'); } catch {}
  try { database.run('ALTER TABLE users ADD COLUMN failed_login_attempts INTEGER NOT NULL DEFAULT 0;'); } catch {}
  try { database.run('ALTER TABLE users ADD COLUMN locked_until INTEGER;'); } catch {}
  try { database.run('ALTER TABLE users ADD COLUMN last_login_at INTEGER;'); } catch {}
  try { database.run('ALTER TABLE property_images ADD COLUMN caption TEXT;'); } catch {}
  try { database.run('ALTER TABLE property_images ADD COLUMN category TEXT;'); } catch {}
}

// Database helper functions with prepared statement execution
export async function queryAll<T = Record<string, unknown>>(sql: string, params: (string | number | null | undefined)[] = []): Promise<T[]> {
  const database = await getDb();
  const stmt = database.prepare(sql);
  try {
    stmt.bind(params as (number | string | null)[]);
    const results: T[] = [];
    while (stmt.step()) {
      results.push(stmt.getAsObject() as unknown as T);
    }
    return results;
  } finally {
    stmt.free();
  }
}

export async function queryOne<T = Record<string, unknown>>(sql: string, params: (string | number | null | undefined)[] = []): Promise<T | null> {
  const results = await queryAll<T>(sql, params);
  return results.length > 0 ? results[0] : null;
}

export async function execute(sql: string, params: (string | number | null | undefined)[] = []): Promise<void> {
  const database = await getDb();
  database.run(sql, params as (number | string | null)[]);
  saveDb();
}

export async function executeTransaction<T>(work: () => Promise<T>): Promise<T> {
  const database = await getDb();
  if (inTransaction) {
    return await work();
  }
  inTransaction = true;
  database.run('BEGIN TRANSACTION;');
  try {
    const result = await work();
    database.run('COMMIT;');
    inTransaction = false;
    saveDb();
    return result;
  } catch (err) {
    try {
      database.run('ROLLBACK;');
    } catch (rbErr) {
      // Ignore
    }
    inTransaction = false;
    throw err;
  }
}
