import {
  CanActivate,
  ExecutionContext,
  Injectable,
  InternalServerErrorException,
  UnauthorizedException,
} from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { AuthService } from "../auth/auth.service";
import { verifyJwt } from "../auth/jwt";
import { IS_PUBLIC_KEY } from "./public.decorator";

@Injectable()
export class ApiKeyGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly auth: AuthService,
  ) {}

  canActivate(context: ExecutionContext): boolean {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) {
      return true;
    }

    const req = context.switchToHttp().getRequest<{
      headers?: Record<string, string | string[] | undefined>;
      authUser?: string;
    }>();

    const bearer = normalizeBearer(req.headers?.authorization);
    if (bearer) {
      const payload = verifyJwt(bearer, this.auth.jwtSecret());
      if (payload) {
        req.authUser = payload.sub;
        return true;
      }
    }

    const configuredToken = process.env.API_AUTH_TOKEN?.trim();
    if (!configuredToken) {
      if (process.env.NODE_ENV === "production") {
        throw new InternalServerErrorException("API_AUTH_TOKEN is required in production");
      }
      return true;
    }

    const providedToken = normalizeHeaderToken(req.headers?.["x-api-key"]);
    if (!providedToken || providedToken !== configuredToken) {
      throw new UnauthorizedException("invalid api key");
    }
    return true;
  }
}

function normalizeHeaderToken(value: string | string[] | undefined): string | undefined {
  if (Array.isArray(value)) {
    return value[0]?.trim();
  }
  return value?.trim();
}

function normalizeBearer(value: string | string[] | undefined): string | undefined {
  const raw = Array.isArray(value) ? value[0] : value;
  if (!raw) return undefined;
  const match = /^Bearer\s+(.+)$/i.exec(raw.trim());
  return match?.[1]?.trim();
}
