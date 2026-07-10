import { Controller, Get } from "@nestjs/common";
import { EngineRegistry, type EngineConnectorCapability } from "./engine-registry";

@Controller("engines")
export class EngineRegistryController {
  constructor(private readonly registry: EngineRegistry) {}

  @Get()
  list(): EngineConnectorCapability[] {
    return this.registry.listCapabilities();
  }
}
