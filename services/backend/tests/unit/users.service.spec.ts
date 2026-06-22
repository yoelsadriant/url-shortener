import { NotFoundException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { ConfigService } from '@/config/config.service';
import { User } from '@/users/entity/user';
import { UsersService } from '@/users/users.service';

const user: User = {
  userId: 'uuid-1',
  username: 'alice',
  password: 'salt:hash',
  createdAt: '2024-01-01T00:00:00.000Z',
};

describe('UsersService', () => {
  let service: UsersService;
  const ddbSend = jest.fn();

  beforeEach(async () => {
    jest.clearAllMocks();
    const module = await Test.createTestingModule({
      providers: [
        UsersService,
        {
          provide: ConfigService,
          useValue: {
            ddb: { send: ddbSend },
            env: { USER_TABLE: 'users', USER_USERNAME_INDEX: 'username-index' },
          },
        },
      ],
    }).compile();

    service = module.get(UsersService);
  });

  describe('getById', () => {
    it('returns the user when found', async () => {
      ddbSend.mockResolvedValue({ Item: user });
      expect(await service.getById('uuid-1')).toEqual(user);
    });

    it('throws NotFoundException when user does not exist', async () => {
      ddbSend.mockResolvedValue({ Item: undefined });
      await expect(service.getById('uuid-1')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('findByUsername', () => {
    it('returns the user when found', async () => {
      ddbSend.mockResolvedValue({ Items: [user] });
      expect(await service.findByUsername('alice')).toEqual(user);
    });

    it('returns null when not found', async () => {
      ddbSend.mockResolvedValue({ Items: [] });
      expect(await service.findByUsername('alice')).toBeNull();
    });

    it('returns null when Items is undefined', async () => {
      ddbSend.mockResolvedValue({ Items: undefined });
      expect(await service.findByUsername('alice')).toBeNull();
    });
  });

  describe('create', () => {
    it('creates a user with a UUID and returns it', async () => {
      ddbSend.mockResolvedValue({});
      const result = await service.create('alice', 'salt:hash');

      expect(result.username).toBe('alice');
      expect(result.password).toBe('salt:hash');
      expect(result.userId).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
      );
      expect(result.createdAt).toBeTruthy();
      expect(ddbSend).toHaveBeenCalledTimes(1);
    });
  });
});
