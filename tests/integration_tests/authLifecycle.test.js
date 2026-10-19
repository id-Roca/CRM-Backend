import { beforeAll, beforeEach, afterEach, expect, jest, test } from '@jest/globals';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';

const mockPrisma = { user: { findUnique: jest.fn(), findMany: jest.fn(), update: jest.fn() }, company: { findMany: jest.fn() } };
jest.unstable_mockModule('../../src/prisma.js', () => ({ default: mockPrisma }));
let app, user;
const secret = 'auth-lifecycle-test-secret';
const password = 'OriginalPassword123!';
beforeAll(async () => { ({ default: app } = await import('../../src/app.js')); });
beforeEach(async () => {
  jest.resetAllMocks();
  jest.replaceProperty(process, 'env', { ...process.env, JWT_SECRET: secret });
  user = { id: 1, name: 'Current User', email: 'user@example.test', role: 'ADMIN', tokenVersion: 0, passwordHash: await bcrypt.hash(password, 4) };
  mockPrisma.user.findUnique.mockImplementation(async () => user && { ...user });
  mockPrisma.user.findMany.mockResolvedValue([]);
  mockPrisma.company.findMany.mockResolvedValue([]);
  mockPrisma.user.update.mockImplementation(async ({ data, select }) => {
    for (const [key, value] of Object.entries(data)) {
      if (value !== undefined) user[key] = key === 'tokenVersion' ? user[key] + value.increment : value;
    }
    return Object.fromEntries(Object.keys(select).map(key => [key, user[key]]));
  });
});
afterEach(() => jest.restoreAllMocks());
const token = (claims = {}) => jwt.sign({ userId: 1, role: 'ADMIN', tokenVersion: 0, ...claims }, secret, { expiresIn: '1h' });
const get = (path, bearer) => request(app).get(path).set('Authorization', `Bearer ${bearer}`);

test('active user can log in and use a real signed token', async () => {
  const response = await request(app).post('/api/auth/login').send({ email: user.email, password }).expect(200);
  expect(jwt.verify(response.body.token, secret)).toMatchObject({ userId: 1, tokenVersion: 0 });
  await get('/api/users', response.body.token).expect(200);
});
test('existing token is rejected immediately after deletion', async () => {
  const bearer = token();
  await get('/api/users', bearer).expect(200);
  user = null;
  await get('/api/users', bearer).expect(401);
  expect(mockPrisma.user.findMany).toHaveBeenCalledTimes(1);
});
test('demotion removes admin access but preserves allowed access on the same token', async () => {
  const bearer = token();
  await get('/api/users', bearer).expect(200);
  await request(app).patch('/api/users/1').set('Authorization', `Bearer ${bearer}`).send({ role: 'SALES' }).expect(200);
  await get('/api/users', bearer).expect(403);
  await get('/api/companies', bearer).expect(200);
  expect(user.tokenVersion).toBe(0);
});
test('promotion grants the current database permissions despite the old token role', async () => {
  user.role = 'SALES';
  const bearer = token({ role: 'SALES' });
  await get('/api/users', bearer).expect(403);
  user.role = 'ADMIN';
  await get('/api/users', bearer).expect(200);
});
test('password update revokes all old tokens, including legacy tokens, and new login works', async () => {
  const bearer = token();
  const legacy = jwt.sign({ userId: 1, role: 'ADMIN' }, secret, { expiresIn: '1h' });
  await get('/api/users', legacy).expect(200);
  await request(app).patch('/api/users/1').set('Authorization', `Bearer ${bearer}`).send({ password: 'NewPassword123!' }).expect(200);
  expect(user.tokenVersion).toBe(1);
  expect(mockPrisma.user.update).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ passwordHash: expect.any(String), tokenVersion: { increment: 1 } }) }));
  await get('/api/users', bearer).expect(401);
  await get('/api/users', legacy).expect(401);
  const response = await request(app).post('/api/auth/login').send({ email: user.email, password: 'NewPassword123!' }).expect(200);
  expect(jwt.verify(response.body.token, secret).tokenVersion).toBe(1);
  await get('/api/users', response.body.token).expect(200);
});
test.each(['invalid', 'expired', 'wrong-secret'])('rejects %s tokens before database access', async (kind) => {
  const bearer = kind === 'invalid' ? 'not-a-token' : jwt.sign({ userId: 1 }, kind === 'wrong-secret' ? 'wrong-secret' : secret, { expiresIn: kind === 'expired' ? -1 : '1h' });
  await get('/api/users', bearer).expect(401);
  expect(mockPrisma.user.findUnique).not.toHaveBeenCalled();
  expect(mockPrisma.user.findMany).not.toHaveBeenCalled();
});
test('database failure blocks protected handlers without leaking details', async () => {
  mockPrisma.user.findUnique.mockRejectedValue(new Error('sensitive database connection details'));
  const response = await get('/api/users', token()).expect(503);
  expect(response.body).toEqual({ success: false, message: 'Authentication temporarily unavailable.' });
  expect(mockPrisma.user.findMany).not.toHaveBeenCalled();
});

test('a failed password write does not revoke the current token', async () => {
  const bearer = token();
  mockPrisma.user.update.mockRejectedValueOnce(new Error('Update failed'));
  await request(app).patch('/api/users/1')
    .set('Authorization', `Bearer ${bearer}`)
    .send({ password: 'NewPassword123!' }).expect(500);
  expect(user.tokenVersion).toBe(0);
  expect(await bcrypt.compare(password, user.passwordHash)).toBe(true);
  await get('/api/users', bearer).expect(200);
});
