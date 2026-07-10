import { Injectable, UnauthorizedException } from "@nestjs/common";
import { timingSafeEqual } from "crypto";
import { signJwt, verifyJwt } from "./jwt";

export interface LoginResult {
  token: string;
  username: string;
  expiresAt: string;
}

@Injectable()
export class AuthService {
  private readonly tokenTtlSec = 60 * 60 * 12;

  login(username: string, password: string): LoginResult {
    const expectedUser = process.env.STUDIO_USERNAME?.trim() || "admin";
    const expectedPassword = process.env.STUDIO_PASSWORD?.trim();
    if (!expectedPassword) {
      if (process.env.NODE_ENV === "production") {
        throw new UnauthorizedException("STUDIO_PASSWORD is not configured");
      }
      if (!safeEqual(username, expectedUser)) {
        throw new UnauthorizedException("invalid username or password");
      }
    } else if (!safeEqual(username, expectedUser) || !safeEqual(password, expectedPassword)) {
      throw new UnauthorizedException("invalid username or password");
    }

    const secret = this.jwtSecret();
    const expiresAt = new Date(Date.now() + this.tokenTtlSec * 1000).toISOString();
    const token = signJwt({ sub: expectedUser }, secret, this.tokenTtlSec);
    return { token, username: expectedUser, expiresAt };
  }

  verifyBearerToken(token: string | undefined): boolean {
    if (!token) return false;
    return verifyJwt(token, this.jwtSecret()) !== null;
  }

  jwtSecret(): string {
    return (
      process.env.JWT_SECRET?.trim() ||
      process.env.API_AUTH_TOKEN?.trim() ||
      "geo-studio-dev-secret"
    );
  }
}

function safeEqual(a: string, b: string): boolean {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  if (left.length !== right.length) return false;
  return timingSafeEqual(left, right);
}
