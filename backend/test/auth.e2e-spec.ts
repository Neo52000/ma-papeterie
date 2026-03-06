import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { AppModule } from '../src/app.module';
import { DataSource } from 'typeorm';

/**
 * Tests e2e pour le module Auth.
 *
 * Nécessite une base PostgreSQL accessible (voir .env / docker-compose).
 * Lancer avec : npm run test:e2e
 */
describe('AuthController (e2e)', () => {
  let app: INestApplication;
  let dataSource: DataSource;

  const testUser = {
    email: `e2e-${Date.now()}@test.com`,
    password: 'TestPassword123!',
    firstName: 'E2E',
    lastName: 'Tester',
  };

  let accessToken: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api');
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );

    await app.init();
    dataSource = moduleFixture.get(DataSource);
  });

  afterAll(async () => {
    // Nettoyage de l'utilisateur de test
    if (dataSource?.isInitialized) {
      await dataSource.query('DELETE FROM users WHERE email = $1', [
        testUser.email,
      ]);
    }
    await app.close();
  });

  describe('/api/auth/register (POST)', () => {
    it('devrait inscrire un nouvel utilisateur', () => {
      return request(app.getHttpServer())
        .post('/api/auth/register')
        .send(testUser)
        .expect(201)
        .expect((res) => {
          expect(res.body).toHaveProperty('accessToken');
          expect(res.body).toHaveProperty('refreshToken');
          expect(res.body.user.email).toBe(testUser.email);
          accessToken = res.body.accessToken;
        });
    });

    it('devrait rejeter un email dupliqué (409)', () => {
      return request(app.getHttpServer())
        .post('/api/auth/register')
        .send(testUser)
        .expect(409);
    });

    it('devrait rejeter un email invalide (400)', () => {
      return request(app.getHttpServer())
        .post('/api/auth/register')
        .send({ email: 'invalid', password: 'password123' })
        .expect(400);
    });

    it('devrait rejeter un mot de passe trop court (400)', async () => {
      // Attendre que le rate limiter réinitialise son compteur
      await new Promise((resolve) => setTimeout(resolve, 1100));
      return request(app.getHttpServer())
        .post('/api/auth/register')
        .send({ email: 'short@test.com', password: '123' })
        .expect(400);
    });
  });

  describe('/api/auth/login (POST)', () => {
    it('devrait connecter un utilisateur existant', () => {
      return request(app.getHttpServer())
        .post('/api/auth/login')
        .send({ email: testUser.email, password: testUser.password })
        .expect(201)
        .expect((res) => {
          expect(res.body).toHaveProperty('accessToken');
          expect(res.body).toHaveProperty('refreshToken');
          accessToken = res.body.accessToken;
        });
    });

    it('devrait rejeter un mot de passe incorrect (401)', () => {
      return request(app.getHttpServer())
        .post('/api/auth/login')
        .send({ email: testUser.email, password: 'wrong-password' })
        .expect(401);
    });

    it('devrait rejeter un email inconnu (401)', () => {
      return request(app.getHttpServer())
        .post('/api/auth/login')
        .send({ email: 'unknown@test.com', password: 'password123' })
        .expect(401);
    });
  });

  describe('/api/auth/profile (GET)', () => {
    it('devrait retourner le profil avec un token valide', () => {
      return request(app.getHttpServer())
        .get('/api/auth/profile')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200)
        .expect((res) => {
          expect(res.body.email).toBe(testUser.email);
          expect(res.body).not.toHaveProperty('password');
        });
    });

    it('devrait rejeter sans token (401)', () => {
      return request(app.getHttpServer())
        .get('/api/auth/profile')
        .expect(401);
    });

    it('devrait rejeter avec un token invalide (401)', () => {
      return request(app.getHttpServer())
        .get('/api/auth/profile')
        .set('Authorization', 'Bearer invalid-token')
        .expect(401);
    });
  });

  describe('/api/auth/refresh (POST)', () => {
    it('devrait retourner de nouveaux tokens', () => {
      return request(app.getHttpServer())
        .post('/api/auth/refresh')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(201)
        .expect((res) => {
          expect(res.body).toHaveProperty('accessToken');
          expect(res.body).toHaveProperty('refreshToken');
        });
    });
  });
});
