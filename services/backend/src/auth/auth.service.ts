import { createHash, randomBytes } from 'node:crypto';
import { ConflictException, Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@/config/config.service';
import { UsersService } from '@/users/users.service';
import { User } from '@/users/entity/user';
import { JwtPayload } from './strategy/jwt.strategy';

@Injectable()
export class AuthService {
  constructor(
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
    private readonly users: UsersService,
  ) {}

  async register(username: string, password: string): Promise<string> {
    const existing = await this.users.findByUsername(username);
    if (existing) throw new ConflictException('Username already taken');
    const hashed = this.hashNew(password);
    const user = await this.users.create(username, hashed);
    return this.signToken(user);
  }

  async validateUser(username: string, password: string): Promise<User | null> {
    const user = await this.users.findByUsername(username);
    if (!user || !this.verifyHash(password, user.password)) return null;
    return user;
  }

  login(user: User): string {
    return this.signToken(user);
  }

  private signToken(user: User): string {
    const payload: JwtPayload = { sub: user.userId };
    return this.jwt.sign(payload, {
      secret: this.config.jwt.secret,
      expiresIn: this.config.jwt.expiresIn as unknown as number,
    });
  }

  private hashNew(password: string): string {
    const salt = randomBytes(16).toString('hex');
    const hash = createHash('sha256')
      .update(salt + password)
      .digest('hex');
    return `${salt}:${hash}`;
  }

  private verifyHash(password: string, stored: string): boolean {
    const [salt, hash] = stored.split(':');
    return (
      createHash('sha256')
        .update(salt + password)
        .digest('hex') === hash
    );
  }
}
