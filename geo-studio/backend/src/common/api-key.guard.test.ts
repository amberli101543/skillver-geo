import { InternalServerErrorException, UnauthorizedException } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { describe, expect, it, vi } from "vitest";
import { AuthService } from "../auth/auth.service";
import { signJwt } from "../auth/jwt";
import { ApiKeyGuard } from "./api-key.guard";

function makeContext(headers: Record<string, string | string[] | undefined> = {}) {
  return {
    getHandler: () => "handler",
    getClass: () => "class",
    switchToHttp: () => ({
      getRequest: () => ({ headers }),
    }),
  } as any;
}

function makeGuard(reflector: Reflector): ApiKeyGuard {
  return new ApiKeyGuard(reflector, new AuthService());
}

describe("ApiKeyGuard", () => {
  it("allows public routes", () => {
    const reflector = { getAllAndOverride: vi.fn(() => true) } as unknown as Reflector;
    const guard = makeGuard(reflector);
    expect(guard.canActivate(makeContext())).toBe(true);
  });

  it("allows requests when token is not configured outside production", () => {
    const prevToken = process.env.API_AUTH_TOKEN;
    const prevNodeEnv = process.env.NODE_ENV;
    delete process.env.API_AUTH_TOKEN;
    process.env.NODE_ENV = "development";
    const reflector = { getAllAndOverride: vi.fn(() => false) } as unknown as Reflector;
    const guard = makeGuard(reflector);
    expect(guard.canActivate(makeContext())).toBe(true);
    process.env.API_AUTH_TOKEN = prevToken;
    process.env.NODE_ENV = prevNodeEnv;
  });

  it("rejects request with invalid token", () => {
    const prevToken = process.env.API_AUTH_TOKEN;
    process.env.API_AUTH_TOKEN = "expected";
    const reflector = { getAllAndOverride: vi.fn(() => false) } as unknown as Reflector;
    const guard = makeGuard(reflector);
    expect(() => guard.canActivate(makeContext({ "x-api-key": "wrong" }))).toThrow(UnauthorizedException);
    process.env.API_AUTH_TOKEN = prevToken;
  });

  it("accepts array-form header token", () => {
    const prevToken = process.env.API_AUTH_TOKEN;
    process.env.API_AUTH_TOKEN = "expected";
    const reflector = { getAllAndOverride: vi.fn(() => false) } as unknown as Reflector;
    const guard = makeGuard(reflector);
    expect(guard.canActivate(makeContext({ "x-api-key": ["expected", "ignored"] }))).toBe(true);
    process.env.API_AUTH_TOKEN = prevToken;
  });

  it("fails fast in production without API_AUTH_TOKEN", () => {
    const prevToken = process.env.API_AUTH_TOKEN;
    const prevNodeEnv = process.env.NODE_ENV;
    delete process.env.API_AUTH_TOKEN;
    process.env.NODE_ENV = "production";
    const reflector = { getAllAndOverride: vi.fn(() => false) } as unknown as Reflector;
    const guard = makeGuard(reflector);
    expect(() => guard.canActivate(makeContext())).toThrow(InternalServerErrorException);
    process.env.API_AUTH_TOKEN = prevToken;
    process.env.NODE_ENV = prevNodeEnv;
  });

  it("accepts valid bearer jwt", () => {
    const prevToken = process.env.API_AUTH_TOKEN;
    process.env.API_AUTH_TOKEN = "expected";
    const reflector = { getAllAndOverride: vi.fn(() => false) } as unknown as Reflector;
    const guard = makeGuard(reflector);
    const jwt = signJwt({ sub: "admin" }, "expected", 3600);
    expect(guard.canActivate(makeContext({ authorization: `Bearer ${jwt}` }))).toBe(true);
    process.env.API_AUTH_TOKEN = prevToken;
  });
});
