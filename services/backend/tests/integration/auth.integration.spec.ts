import { ConflictException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Test } from '@nestjs/testing';
import { ConfigService } from '@/config/config.service';
import { AuthModule } from '@/auth/auth.module';
import { AuthService } from '@/auth/auth.service';

describe('Auth (integration)', () => {
  let authService: AuthService;
  let jwtService: JwtService;
  const ddbSend = jest.fn();

  const mockConfig = {
    ddb: { send: ddbSend },
    userTable: 'users',
    userUsernameIndex: 'username-index',
    jwt: { secret: 'integration-secret', expiresIn: '7d' },
  };

  beforeAll(async () => {
    const module = await Test.createTestingModule({ imports: [AuthModule] })
      .overrideProvider(ConfigService)
      .useValue(mockConfig)
      .compile();

    authService = module.get(AuthService);
    jwtService = module.get(JwtService);
  });

  beforeEach(() => jest.clearAllMocks());

  it('module compiles and resolves all providers', () => {
    expect(authService).toBeDefined();
  });

  describe('register', () => {
    it('returns a valid JWT containing the userId', async () => {
      ddbSend
        .mockResolvedValueOnce({ Items: [] }) // findByUsername: not found
        .mockResolvedValueOnce({}); // create: PutCommand

      const token = await authService.register('dave', 'Password1');
      const payload = jwtService.verify<{ sub: string }>(token, {
        secret: 'integration-secret',
      });
      expect(payload.sub).toBeTruthy();
    });

    it('throws ConflictException when username is taken', async () => {
      ddbSend.mockResolvedValueOnce({
        Items: [
          {
            userId: 'existing',
            username: 'dave',
            password: 'hash',
            createdAt: '',
          },
        ],
      });
      await expect(authService.register('dave', 'Password1')).rejects.toThrow(
        ConflictException,
      );
    });
  });

  describe('register → validateUser round-trip', () => {
    it('validates the password after registration', async () => {
      let storedHash = '';
      ddbSend
        .mockResolvedValueOnce({ Items: [] })
        .mockImplementationOnce(
          (cmd: { input: { Item: { password: string } } }) => {
            storedHash = cmd.input.Item.password;
            return Promise.resolve({});
          },
        );

      await authService.register('eve', 'SuperSecret1');

      ddbSend.mockResolvedValueOnce({
        Items: [
          {
            userId: 'uuid-2',
            username: 'eve',
            password: storedHash,
            createdAt: '',
          },
        ],
      });

      const user = await authService.validateUser('eve', 'SuperSecret1');
      expect(user).not.toBeNull();
      expect(user?.username).toBe('eve');
    });

    it('returns null for a wrong password after registration', async () => {
      ddbSend.mockResolvedValueOnce({
        Items: [
          {
            userId: 'uuid-3',
            username: 'frank',
            password: 'salt:wronghash',
            createdAt: '',
          },
        ],
      });
      expect(await authService.validateUser('frank', 'Password1')).toBeNull();
    });
  });
});
