"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.hashPassword = hashPassword;
exports.generateToken = generateToken;
exports.createSession = createSession;
exports.validateSession = validateSession;
exports.deleteSession = deleteSession;
exports.register = register;
exports.login = login;
const db_1 = require("./db");
const schema_1 = require("@shared/schema");
const drizzle_orm_1 = require("drizzle-orm");
const crypto_1 = require("crypto");
function hashPassword(password) {
    return (0, crypto_1.createHash)('sha256').update(password).digest('hex');
}
function generateToken() {
    return (0, crypto_1.randomBytes)(32).toString('hex');
}
async function createSession(userId) {
    const token = generateToken();
    const expiresAt = Date.now() + 30 * 24 * 60 * 60 * 1000;
    await db_1.db.insert(schema_1.sessions).values({
        userId,
        token,
        expiresAt,
    });
    return token;
}
async function validateSession(token) {
    const [session] = await db_1.db
        .select()
        .from(schema_1.sessions)
        .where((0, drizzle_orm_1.eq)(schema_1.sessions.token, token));
    if (!session || session.expiresAt < Date.now()) {
        return null;
    }
    const [user] = await db_1.db
        .select()
        .from(schema_1.users)
        .where((0, drizzle_orm_1.eq)(schema_1.users.id, session.userId));
    if (!user || !user.isActive) {
        return null;
    }
    const [org] = await db_1.db
        .select()
        .from(schema_1.organizations)
        .where((0, drizzle_orm_1.eq)(schema_1.organizations.id, user.organizationId));
    return { user, session, organization: org };
}
async function deleteSession(token) {
    await db_1.db.delete(schema_1.sessions).where((0, drizzle_orm_1.eq)(schema_1.sessions.token, token));
}
async function register(email, password, name, orgName) {
    const [existingUser] = await db_1.db
        .select()
        .from(schema_1.users)
        .where((0, drizzle_orm_1.eq)(schema_1.users.email, email.toLowerCase()));
    if (existingUser) {
        throw new Error('Email already registered');
    }
    const [organization] = await db_1.db
        .insert(schema_1.organizations)
        .values({ name: orgName })
        .returning();
    const [user] = await db_1.db
        .insert(schema_1.users)
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
async function login(email, password) {
    const [user] = await db_1.db
        .select()
        .from(schema_1.users)
        .where((0, drizzle_orm_1.eq)(schema_1.users.email, email.toLowerCase()));
    if (!user || user.password !== hashPassword(password)) {
        throw new Error('Invalid email or password');
    }
    if (!user.isActive) {
        throw new Error('Account is deactivated');
    }
    const token = await createSession(user.id);
    const [org] = await db_1.db
        .select()
        .from(schema_1.organizations)
        .where((0, drizzle_orm_1.eq)(schema_1.organizations.id, user.organizationId));
    return { user, organization: org, token };
}
