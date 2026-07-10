import { Body, Controller, Get, Post, Req, UnauthorizedException } from "@nestjs/common";
import { Public } from "../common/public.decorator";
import { AuthService } from "./auth.service";
import { LoginDto } from "./dto/login.dto";

@Controller("auth")
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Public()
  @Post("login")
  login(@Body() dto: LoginDto) {
    return this.auth.login(dto.username, dto.password);
  }

  @Get("me")
  me(@Req() req: { authUser?: string }) {
    if (!req.authUser) {
      throw new UnauthorizedException("not authenticated");
    }
    return { username: req.authUser };
  }
}
