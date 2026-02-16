import { db } from "./db";
import { users, sessions, organizations } from "@shared/schema";
import { eq, and } from "drizzle-orm";
import { randomBytes, createHash } from "crypto";

export function hashPassword(password: string): string {
  return createHash('sha256').update(password).digest('hex');
}

export function generateToken(): string {
  return randomBytes(32).toString('hex');
}

export async function createSession(userId: string): Promise<string> {
  const token = generateToken();
  const expiresAt = Date.now() + 30 * 24 * 60 * 60 * 1000;
  
  await db.insert(sessions).values({
    userId,
    token,
    expiresAt,
  });
  
  return token;
}

export async function validateSession(token: string) {
  const [session] = await db
    .select()
    .from(sessions)
    .where(eq(sessions.token, token));
  
  if (!session || session.expiresAt < Date.now()) {
    return null;
  }
  
  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.id, session.userId));
  
  if (!user || !user.isActive) {
    return null;
  }
  
  const [org] = await db
    .select()
    .from(organizations)
    .where(eq(organizations.id, user.organizationId));
  
  return { user, session, organization: org };
}

export async function deleteSession(token: string) {
  await db.delete(sessions).where(eq(sessions.token, token));
}

export async function register(email: string, password: string, name: string, orgName: string) {
  const [existingUser] = await db
    .select()
    .from(users)
    .where(eq(users.email, email.toLowerCase()));
  
  if (existingUser) {
    throw new Error('Email already registered');
  }
  
  const [organization] = await db
    .insert(organizations)
    .values({ name: orgName })
    .returning();
  
  const [user] = await db
    .insert(users)
    .values({
      organizationId: organization.id,
      email: email.toLowerCase(),
      password: hashPassword(password),
      plainPassword: password,
      name,
      role: 'OWNER',
    })
    .returning();
  
  const token = await createSession(user.id);
  
  return { user, organization, token };
}

export async function login(email: string, password: string) {
  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.email, email.toLowerCase()));
  
  if (!user || user.password !== hashPassword(password)) {
    throw new Error('Invalid email or password');
  }
  
  if (!user.isActive) {
    throw new Error('Account is deactivated');
  }
  
  const token = await createSession(user.id);
  
  const [org] = await db
    .select()
    .from(organizations)
    .where(eq(organizations.id, user.organizationId));
  
  return { user, organization: org, token };
}
