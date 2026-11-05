const { app, request, connectTestDb, clearTestDb, closeTestDb, createUserAndLogin } = require('./helpers');
const User = require('../src/models/User');

beforeAll(connectTestDb, 120000); // the first run downloads MongoDB, which takes a while
afterEach(clearTestDb);
afterAll(closeTestDb);

const validUser = { name: 'Ada', email: 'ada@test.com', password: 'Password123' };

describe('POST /api/auth/register', () => {
  it('creates a student by default and returns a token', async () => {
    const res = await request(app).post('/api/auth/register').send(validUser);

    expect(res.status).toBe(201);
    expect(res.body.token).toEqual(expect.any(String));
    expect(res.body.user.role).toBe('student');
    expect(res.body.user.password).toBeUndefined();
  });

  it('stores a hash, not the plain-text password', async () => {
    await request(app).post('/api/auth/register').send(validUser);
    const stored = await User.findOne({ email: validUser.email }).select('+password');

    expect(stored.password).not.toBe(validUser.password);
    expect(await stored.comparePassword(validUser.password)).toBe(true);
  });

  it('refuses to create an admin through registration', async () => {
    const res = await request(app).post('/api/auth/register').send({ ...validUser, role: 'admin' });

    expect(res.status).toBe(400);
    expect(await User.countDocuments()).toBe(0);
  });

  it('rejects a duplicate email regardless of letter case', async () => {
    await request(app).post('/api/auth/register').send(validUser);
    const res = await request(app)
      .post('/api/auth/register')
      .send({ ...validUser, email: 'ADA@test.com' });

    expect(res.status).toBe(409);
  });

  it('reports each invalid field', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ name: '', email: 'nope', password: 'short' });

    expect(res.status).toBe(400);
    expect(res.body.errors.map((error) => error.field).sort()).toEqual(['email', 'name', 'password']);
  });
});

describe('POST /api/auth/login', () => {
  beforeEach(() => request(app).post('/api/auth/register').send(validUser));

  it('logs in with the correct password', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: validUser.email, password: validUser.password });

    expect(res.status).toBe(200);
    expect(res.body.token).toEqual(expect.any(String));
    expect(res.body.user.password).toBeUndefined();
  });

  it('gives the same error for a wrong password and an unknown email', async () => {
    const wrongPassword = await request(app)
      .post('/api/auth/login')
      .send({ email: validUser.email, password: 'WrongPassword1' });
    const unknownEmail = await request(app)
      .post('/api/auth/login')
      .send({ email: 'nobody@test.com', password: 'WrongPassword1' });

    expect(wrongPassword.status).toBe(401);
    expect(unknownEmail.status).toBe(401);
    expect(wrongPassword.body.message).toBe(unknownEmail.body.message);
  });

  it('rejects a query object sent in place of an email (NoSQL injection)', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: { $ne: null }, password: validUser.password });

    expect(res.status).toBe(400);
  });
});

describe('GET /api/auth/me and route protection', () => {
  it('returns the current user for a valid token', async () => {
    const { auth, user } = await createUserAndLogin();
    const res = await request(app).get('/api/auth/me').set('Authorization', auth);

    expect(res.status).toBe(200);
    expect(res.body.user.email).toBe(user.email);
  });

  it('rejects a missing or invalid token', async () => {
    const missing = await request(app).get('/api/auth/me');
    const invalid = await request(app).get('/api/auth/me').set('Authorization', 'Bearer not-a-token');

    expect(missing.status).toBe(401);
    expect(invalid.status).toBe(401);
  });

  it('rejects the token of a user who has since been deleted', async () => {
    const { auth, user } = await createUserAndLogin();
    await User.findByIdAndDelete(user._id);
    const res = await request(app).get('/api/auth/me').set('Authorization', auth);

    expect(res.status).toBe(401);
  });

  it('blocks students from admin and instructor routes', async () => {
    const { auth } = await createUserAndLogin('student');

    const users = await request(app).get('/api/users').set('Authorization', auth);
    const create = await request(app)
      .post('/api/courses')
      .set('Authorization', auth)
      .send({ title: 'T', description: 'D', category: 'C' });

    expect(users.status).toBe(403);
    expect(create.status).toBe(403);
  });
});
