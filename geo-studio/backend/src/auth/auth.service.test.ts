import { UnauthorizedException } from "@nestjs/common";
import { afterEach, describe, expect, it } from "vitest";
import { verifyJwt } from "./jwt";
import { AuthService } from "./auth.service";

describe("AuthService", () => {
  const envBackup = { ...process.env };

  afterEach(() => {
    process.env = { ...envBackup };
  });

  it("issues jwt on valid credentials", () => {
    process.env.STUDIO_USERNAME = "admin";
    process.env.STUDIO_PASSWORD = "secret";
    process.env.JWT_SECRET = "jwt-secret";
    const svc = new AuthService();
    const result = svc.login("admin", "secret");
    expect(result.username).toBe("admin");
    expect(verifyJwt(result.token, "jwt-secret")?.sub).toBe("admin");
  });

  it("rejects invalid password", () => {
    process.env.STUDIO_PASSWORD = "secret";
    const svc = new AuthService();
    expect(() => svc.login("admin", "wrong")).toThrow(UnauthorizedException);
  });
});
