export interface ShortenResult {
  shortUrl: string;
}

export interface UrlRecord {
  code: string;
  originUrl: string;
  userId: string;
  createdAt: string;
}

export interface AuthUser {
  userId: string;
  username: string;
  createdAt: string;
}
