import { Controller, Get } from "@nestjs/common";
import { Public } from "../common/public.decorator";

export interface HealthStatus {
  status: "ok";
  service: string;
}

@Controller("health")
export class HealthController {
  @Get()
  @Public()
  check(): HealthStatus {
    return { status: "ok", service: "geo-studio-backend" };
  }
}
