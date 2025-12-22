const request = require('supertest');
const app = require('../../app');

describe('Note Routes', () => {
  let token;

  const user = {
    username: 'noteuser',
    email: 'note@test.com',
    password: 'password123'
  };

  beforeEach(async () => {
    await request(app)
      .post('/api/auth/register')
      .send(user);

    const loginRes = await request(app)
      .post('/api/auth/login')
      .send({
        email: user.email,
        password: user.password
      });

    token = loginRes.body.token;
  });

  test('should create a note (authenticated)', async () => {
    const res = await request(app)
      .post('/api/notes')
      .set('Authorization', `Bearer ${token}`)
      .send({
        title: 'Integration Test Note',
        content: 'Test content'
      });

    expect(res.statusCode).toBe(201);
    expect(res.body.title).toBe('Integration Test Note');
  });
});
