# AGENTS.md - Marketplace Residencia

Guidelines for agentic coding agents operating in this repository.

---

## Project Structure

```
marketplace-monorepo/
├── apps/
│   ├── api/          # NestJS backend API
│   └── web/          # Next.js 16 frontend (next-auth, shadcn/ui, TailwindCSS)
├── packages/
│   └── database/     # Prisma schema and client
└── packages/database/prisma/
    └── migrations/   # Database migrations
```

- `apps/api` and `apps/web` import `@prisma/client` from `packages/database`

---

## Build / Lint / Test Commands

### Root (turbo monorepo)

```bash
npm run build           # Build all packages
npm run build:web      # Build web only
npm run build:api      # Build API only
npm run start:web     # Start web
npm run start:api      # Start API (production)
npm run lint           # Lint all packages
npm run test           # Test all packages
npm run db:generate    # Generate Prisma client
```

### API (apps/api)

```bash
npm run start:dev      # Watch mode
npm run start:debug    # Debug with watch
npm run build          # Compile to dist/
npm run start:prod     # Run compiled
npm run test           # Run all tests
npm run test:watch    # Watch mode
npm run test:cov       # Coverage report
npm run test:e2e      # E2E tests
npm run format        # Prettier write
npm run lint           # ESLint fix
```

### Web (apps/web)

```bash
npm run dev           # Development
npm run build         # Production build
npm run start         # Start production
npm run lint          # Lint
```

### Database (packages/database)

```bash
npm run db:generate   # Generate Prisma client
npm run db:push       # Push schema to DB
npm run db:migrate    # Run migrations
npm run db:studio    # Open Prisma Studio
```

### Running a Single Test (API)

```bash
# By file pattern
npm run test -- --testPathPattern="usuarios.service.spec"

# By test name
npm run test -- --testNamePattern="should find one usuario"

# With coverage for single file
npm run test:cov -- --testPathPattern="usuarios.service"

# Watch mode
npm run test:watch -- --testPathPattern="usuarios"
```

---

## Code Style Guidelines

### General

- **TypeScript strict mode** enabled
- **No magic numbers** - use constants or enums
- **Error messages** in Spanish
- **No console.log** - use structured logging

### Naming Conventions

| Type | Convention | Example |
|------|------------|---------|
| Files | kebab-case | `usuarios.controller.ts` |
| Classes | PascalCase | `UsuariosController` |
| Interfaces/DTOs | PascalCase | `CreateUsuarioDto` |
| Enums | PascalCase | `EstadoPedido` |
| Enum values | UPPER_SNAKE_CASE | `PENDIENTE` |
| Constants | UPPER_SNAKE_CASE | `MAX_FILE_SIZE` |
| Services | `<Entity>Service` | `UsuariosService` |

### Imports

```typescript
// Order: @nestjs/*, external libs, internal modules, DTOs, services
import { Controller, Get, Post, Body, Param, ParseUUIDPipe } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { UsuariosService } from './usuarios.service';
import { CreateUsuarioDto } from './dto/usuarios.dto';
```

### DTOs

- Use `class-validator` decorators
- Use `class-transformer` for transformation
- Explicit types, avoid `any`

```typescript
export class CreateUsuarioDto {
  @IsString()
  @MaxLength(100)
  nombre: string;

  @IsEmail()
  email: string;
}
```

### Services

- Constructor injection
- Typed return responses
- Handle `Prisma.PrismaClientKnownRequestError` for unique constraints (code P2002)
- Use transactions for multi-table ops

```typescript
async create(dto: CreateUsuarioDto): Promise<Usuario> {
  try {
    return await this.prisma.usuario.create({ data: dto });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      throw new ConflictException('Email ya existe');
    }
    throw error;
  }
}
```

### Controllers

- Use HTTP decorators (`@Get`, `@Post`, `@Patch`, `@Delete`)
- Use `ParseUUIDPipe` for UUID params
- Return typed responses

```typescript
@Controller('usuarios')
export class UsuariosController {
  constructor(private readonly service: UsuariosService) {}

  @Get()
  findAll() {
    return this.service.findAll();
  }

  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.service.findOne(id);
  }
}
```

### Error Handling

- Use NestJS built-in exceptions with Spanish messages
- NotFoundException, BadRequestException, UnauthorizedException, ForbiddenException, ConflictException, InternalServerErrorException

### File Structure

```
src/
├── main.ts
├── app.module.ts
├── prisma/
│   ├── prisma.service.ts
│   └── prisma.module.ts
└── modules/
    └── <entity>/
        ├── <entity>.module.ts
        ├── <entity>.controller.ts
        ├── <entity>.service.ts
        └── dto/
            └── <entity>.dto.ts
```

### Git Conventions

- Commit messages in English
- Conventional commits: `feat:`, `fix:`, `refactor:`, `docs:`, `test:`
- Test files: `*.spec.ts`

---

## Environment Variables

Create `.env` in `apps/api/`:

```
DATABASE_URL="postgresql://user:pass@localhost:5432/marketplace"
JWT_SECRET="your-secret"
NEXT_PUBLIC_API_URL="http://localhost:3001"
```

---

## Common Tasks

### Create new module

```bash
cd apps/api
npx nest g module modules/<name>
npx nest g controller modules/<name>
npx nest g service modules/<name>
```

### Create migration

```bash
cd packages/database
npm run db:migrate -- --name add_new_field
```

### Seed database

```bash
cd apps/api
npm run seed:usuarios
npm run seed:productos
npm run seed:tiendas
```