import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  NotFoundException,
  Param,
  Post,
  Put,
} from "@nestjs/common";
import { type Brand } from "./brand";
import { BrandService, BrandNotFoundError, BrandValidationError } from "./brand-service";
import { CreateBrandDto } from "./dto/create-brand.dto";
import { UpdateBrandDto } from "./dto/update-brand.dto";

@Controller("brands")
export class BrandController {
  constructor(private readonly brands: BrandService) {}

  @Post()
  async create(@Body() dto: CreateBrandDto): Promise<Brand> {
    try {
      return await this.brands.create({
        name: dto.name,
        definition: dto.definition,
        ...(dto.positioning !== undefined ? { positioning: dto.positioning } : {}),
      });
    } catch (err) {
      if (err instanceof BrandValidationError) {
        throw new BadRequestException(err.errors);
      }
      throw err;
    }
  }

  @Get()
  async list(): Promise<Brand[]> {
    return this.brands.list();
  }

  @Get(":id")
  async get(@Param("id") id: string): Promise<Brand> {
    const brand = await this.brands.get(id);
    if (!brand) {
      throw new NotFoundException(`brand ${id} not found`);
    }
    return brand;
  }

  @Put(":id")
  async update(@Param("id") id: string, @Body() dto: UpdateBrandDto): Promise<Brand> {
    try {
      return await this.brands.update(id, {
        ...(dto.name !== undefined ? { name: dto.name } : {}),
        ...(dto.definition !== undefined ? { definition: dto.definition } : {}),
        ...(dto.positioning !== undefined ? { positioning: dto.positioning } : {}),
      });
    } catch (err) {
      if (err instanceof BrandValidationError) {
        throw new BadRequestException(err.errors);
      }
      if (err instanceof BrandNotFoundError) {
        throw new NotFoundException(err.message);
      }
      throw err;
    }
  }

  @Delete(":id")
  async remove(@Param("id") id: string): Promise<{ ok: true }> {
    try {
      await this.brands.delete(id);
      return { ok: true };
    } catch (err) {
      if (err instanceof BrandNotFoundError) {
        throw new NotFoundException(err.message);
      }
      throw err;
    }
  }
}
