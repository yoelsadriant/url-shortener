import {
  ConflictException,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Test } from '@nestjs/testing';
import { ConfigService } from '@/config/config.service';
import { User } from '@/users/entity/user';
import { UsersService } from '@/users/users.service';
import { AuthService } from '@/auth/auth.service';
import { JwtStrategy } from '@/auth/strategy/jwt.strategy';
import { LocalStrategy } from '@/auth/strategy/local.strategy';

const mockUser: User = {
  userId: 'uuid-1',
  username: 'alice',
  password: 'placeholder',
  createdAt: '2024-01-01T00:00:00.000Z',
};

describe('AuthService', () => {
  let service: AuthService;
  let users: jest.Mocked<UsersService>;
  let jwtService: jest.Mocked<JwtService>;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: UsersService,
          useValue: { findByUsername: jest.fn(), create: jest.fn() },
        },
        {
          provide: JwtService,
          useValue: { sign: jest.fn().mockReturnValue('jwt-token') },
        },
        {
          provide: ConfigService,
          useValue: { jwt: { secret: 'secret', expiresIn: '7d' } },
        },
      ],
    }).compile();

    service = module.get(AuthService);
    users = module.get(UsersService);
    jwtService = module.get(JwtService);
  });

  describe('register', () => {
    it('hashes password, creates user, and returns a token', async () => {
      users.findByUsername.mockResolvedValue(null);
      users.create.mockResolvedValue(mockUser);

      const token = await service.register('alice', 'Password1');

      expect(users.create).toHaveBeenCalledWith(
        'alice',
        expect.stringMatching(/^[a-f0-9]{32}:[a-f0-9]{64}$/),
      );
      expect(token).toBe('jwt-token');
    });

    it('throws ConflictException when username is already taken', async () => {
      users.findByUsername.mockResolvedValue(mockUser);

      await expect(service.register('alice', 'Password1')).rejects.toThrow(
        ConflictException,
      );
      expect(users.create).not.toHaveBeenCalled();
    });
  });

  describe('validateUser', () => {
    it('returns null when user does not exist', async () => {
      users.findByUsername.mockResolvedValue(null);
      expect(await service.validateUser('alice', 'Password1')).toBeNull();
    });

    it('returns null when password is wrong', async () => {
      users.findByUsername.mockResolvedValue({
        ...mockUser,
        password: 'badhash:badhash',
      });
      expect(await service.validateUser('alice', 'WrongPassword')).toBeNull();
    });

    it('returns user when credentials are correct', async () => {
      let storedHash = '';
      users.findByUsername.mockResolvedValueOnce(null);
      users.create.mockImplementation((_u, hash) => {
        storedHash = hash;
        return Promise.resolve({ ...mockUser, password: hash });
      });
      await service.register('alice', 'Password1');

      users.findByUsername.mockResolvedValue({
        ...mockUser,
        password: storedHash,
      });
      const result = await service.validateUser('alice', 'Password1');
      expect(result).not.toBeNull();
      expect(result?.username).toBe('alice');
    });
  });

  describe('login', () => {
    it('signs a token with userId as sub', () => {
      const token = service.login(mockUser);
      expect(jwtService.sign).toHaveBeenCalledWith(
        { sub: mockUser.userId },
        { secret: 'secret', expiresIn: '7d' },
      );
      expect(token).toBe('jwt-token');
    });
  });

  describe('strategy', () => {
    const user: User = {
      userId: 'uuid-1',
      username: 'alice',
      password: 'salt:hash',
      createdAt: '2024-01-01T00:00:00.000Z',
    };

    describe('JwtStrategy', () => {
      let strategy: JwtStrategy;
      let usersService: jest.Mocked<UsersService>;

      beforeEach(async () => {
        const module = await Test.createTestingModule({
          providers: [
            JwtStrategy,
            { provide: UsersService, useValue: { getById: jest.fn() } },
            {
              provide: ConfigService,
              useValue: { jwt: { secret: 'secret', expiresIn: '7d' } },
            },
          ],
        }).compile();

        strategy = module.get(JwtStrategy);
        usersService = module.get(UsersService);
      });

      it('returns the user for a valid JWT payload', async () => {
        usersService.getById.mockResolvedValue(user);
        expect(await strategy.validate({ sub: 'uuid-1' })).toEqual(user);
        expect(usersService.getById).toHaveBeenCalledWith('uuid-1');
      });

      it('propagates NotFoundException for an unknown userId', async () => {
        usersService.getById.mockRejectedValue(new NotFoundException());
        await expect(strategy.validate({ sub: 'unknown' })).rejects.toThrow(
          NotFoundException,
        );
      });
    });

    describe('LocalStrategy', () => {
      let strategy: LocalStrategy;
      let authService: jest.Mocked<AuthService>;

      beforeEach(async () => {
        const module = await Test.createTestingModule({
          providers: [
            LocalStrategy,
            { provide: AuthService, useValue: { validateUser: jest.fn() } },
          ],
        }).compile();

        strategy = module.get(LocalStrategy);
        authService = module.get(AuthService);
      });

      it('returns the user on valid credentials', async () => {
        authService.validateUser.mockResolvedValue(user);
        expect(await strategy.validate('alice', 'Password1')).toEqual(user);
        expect(authService.validateUser).toHaveBeenCalledWith(
          'alice',
          'Password1',
        );
      });

      it('throws UnauthorizedException when credentials are invalid', async () => {
        authService.validateUser.mockResolvedValue(null);
        await expect(strategy.validate('alice', 'wrong')).rejects.toThrow(
          UnauthorizedException,
        );
      });
    });
  });
});
