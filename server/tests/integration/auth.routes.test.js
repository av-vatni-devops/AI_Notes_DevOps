const request = require('supertest');
const app = require('../../app');

describe('Auth Routes', () => {
  const user = {
    username: 'testuser',
    email: 'test@example.com',
    password: 'password123'
  };

  beforeEach(async () => {
    await request(app)
      .post('/api/auth/register')
      .send(user);
  });

  test('should login an existing user', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({
        email: user.email,
        password: user.password
      });

    expect(res.statusCode).toBe(200);
    expect(res.body.token).toBeDefined();
  });
});
