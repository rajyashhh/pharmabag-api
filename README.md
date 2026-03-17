# PharmaBag API

B2B Pharmaceutical Marketplace — NestJS REST API backend.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Runtime | Node.js 20+ |
| Framework | NestJS 11 |
| Language | TypeScript 5 (ESM, `nodenext`) |
| Database | PostgreSQL (Neon cloud) |
| ORM | Prisma 6 |
| Cache / OTP | Redis (ioredis) |
| Auth | Phone OTP → JWT (access + refresh) |
| File Storage | AWS S3 (`@aws-sdk/client-s3`) |
| API Docs | Swagger / OpenAPI 3 (`@nestjs/swagger`) |
| Logging | Pino (structured JSON, `nestjs-pino`) |
| Rate Limiting | `@nestjs/throttler` |

## Prerequisites

- **Node.js** ≥ 20
- **Redis** running locally (default `localhost:6379`)
- **PostgreSQL** (or Neon cloud connection string)

## Getting Started

```bash
# 1. Install dependencies
npm install

# 2. Copy env template and fill values
cp .env.example .env

# 3. Run Prisma migrations
npx prisma migrate deploy

# 4. Generate Prisma client
npx prisma generate

# 5. Seed database (categories, sub-categories, test users)
npx prisma db seed

# 6. Start dev server
npm run start:dev
```

The server starts on **http://localhost:3000**.

## Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `DATABASE_URL` | **Yes** | — | PostgreSQL connection string |
| `JWT_SECRET` | **Yes** | — | Secret for JWT signing |
| `REDIS_HOST` | No | `localhost` | Redis host |
| `REDIS_PORT` | No | `6379` | Redis port |
| `AWS_ACCESS_KEY` | No | — | S3 access key |
| `AWS_SECRET_KEY` | No | — | S3 secret key |
| `AWS_REGION` | No | `ap-south-1` | AWS region |
| `AWS_BUCKET` | No | `pharmabag-images` | S3 bucket name |
| `CORS_ORIGINS` | No | `http://localhost:3000,...` | Comma-separated allowed origins |
| `PLATFORM_COMMISSION_RATE` | No | `5` | Commission % on orders |

## API Documentation

### Swagger UI
Open **http://localhost:3000/api/docs** after starting the server.

- Click **Authorize** and paste a JWT token to test authenticated endpoints.
- All 41 endpoints are documented with request/response schemas.

### Postman Collection
Import `docs/pharmabag-api.postman_collection.json` into Postman. The collection includes:
- All 62 endpoints organized into 16 folders
- Pre-configured auth tokens as collection variables
- Auto-save of `accessToken`, `productId`, `orderId`, etc. via test scripts
- Example request bodies for every POST/PATCH endpoint

## Modules

| Module | Endpoints | Description |
|--------|-----------|-------------|
| **Auth** | 4 | Phone OTP send/verify, JWT refresh, get current user |
| **Buyers** | 3 | Create/get/update buyer profile (KYC) |
| **Sellers** | 3 | Create/get/update seller profile (KYC) |
| **Products** | 7 | CRUD + search, categories, seller's own products |
| **Cart** | 5 | Add/get/update/remove items, clear cart |
| **Orders** | 5 | Checkout from cart, list orders, update status |
| **Payments** | 5 | Record payment, upload proof, admin confirm/reject |
| **Storage** | 3 | S3 file uploads (product images, payment proofs, KYC docs) |
| **Notifications** | 2 | List & mark-read (auto-created on order/payment events) |
| **Reviews** | 2 | Buyer product reviews |
| **Tickets** | 3 | Support ticket creation & messaging |
| **Settlements** | 5 | Seller payout tracking, admin mark-paid |
| **Blog (Admin)** | 15 | Blog posts CRUD, publish/unpublish, authors, categories |
| **Blog (Public)** | 6 | Published posts, trending, by tag/slug, view count, sitemap |
| **Admin** | 4 | Dashboard stats, user approval/rejection |
| **Health** | 1 | DB + Redis health check |

## Test Credentials

| Role | Phone | Notes |
|------|-------|-------|
| Buyer | `7777777777` | Pre-seeded, approved |
| Seller | `8888888888` | Pre-seeded, approved |
| Admin | `9999999999` | Pre-seeded |

**OTP in development:** logged to console. Retrieve from Redis:
```bash
redis-cli GET otp:7777777777
```

## Auth Flow

1. `POST /api/auth/send-otp` → `{ "phone": "7777777777" }`
2. Retrieve OTP from Redis (dev) or SMS (production)
3. `POST /api/auth/verify-otp` → `{ "phone": "7777777777", "otp": "123456" }`
4. Response includes `accessToken`, `refreshToken`, `user`, `isNewUser`
5. Use `Authorization: Bearer <accessToken>` for protected endpoints

## Project Structure

```
src/
├── main.ts                          # Bootstrap (Swagger, Pino, CORS, filters)
├── app.module.ts                    # Root module (Joi env validation, throttle, logging)
├── common/
│   ├── decorators/                  # @Roles(), @CurrentUser()
│   ├── filters/                     # Global exception filter
│   └── guards/                      # JwtAuthGuard, RolesGuard
├── config/
│   ├── redis.config.ts              # Redis client factory
│   └── redis.module.ts              # Global Redis module
├── database/
│   └── prisma.service.ts            # Prisma client lifecycle
├── health/                          # Health check (DB + Redis)
└── modules/
    ├── auth/                        # OTP, JWT, refresh tokens
    ├── users/                       # User model (empty controller)
    ├── buyers/                      # Buyer profile & KYC
    ├── sellers/                     # Seller profile & KYC
    ├── products/                    # Product catalog
    ├── cart/                        # Shopping cart
    ├── orders/                      # Order management
    ├── payments/                    # Manual payment recording
    ├── storage/                     # S3 file uploads
    ├── notifications/               # In-app notifications
    ├── reviews/                     # Product reviews
    ├── tickets/                     # Support tickets
    ├── settlements/                 # Seller payouts
    ├── admin/                       # Admin dashboard & actions
    └── blog/                        # SEO-optimized blog CMS
prisma/
├── schema.prisma                    # 26 models, 8 enums
├── seed.ts                          # Categories + test users
└── migrations/                      # Database migrations
```

## Scripts

```bash
npm run start:dev     # Development with hot reload
npm run build         # Production build
npm run start:prod    # Start from dist/
npx prisma studio     # Visual database browser
npx prisma migrate dev  # Create new migration
```

## Blog System (SEO-Optimized CMS)

The blog module provides a full CMS for creating SEO-optimized content.

### Admin APIs (`/api/admin/blogs` — requires ADMIN role)

| Method | Route | Description |
|--------|-------|-------------|
| `POST` | `/admin/blogs` | Create blog post (auto-slug, reading time, HTML sanitization) |
| `GET` | `/admin/blogs` | List all posts (pagination, filter by status/category/search) |
| `GET` | `/admin/blogs/:id` | Get post by ID |
| `PUT` | `/admin/blogs/:id` | Update post |
| `PATCH` | `/admin/blogs/:id/status` | Publish / unpublish |
| `DELETE` | `/admin/blogs/:id` | Delete post |
| `POST` | `/admin/blogs/authors` | Create author |
| `GET` | `/admin/blogs/authors` | List authors |
| `GET` | `/admin/blogs/authors/:id` | Get author |
| `PUT` | `/admin/blogs/authors/:id` | Update author |
| `DELETE` | `/admin/blogs/authors/:id` | Delete author |
| `POST` | `/admin/blogs/categories` | Create category |
| `GET` | `/admin/blogs/categories` | List categories |
| `PUT` | `/admin/blogs/categories/:id` | Update category |
| `DELETE` | `/admin/blogs/categories/:id` | Delete category |

### Public APIs (`/api/blogs` — no auth)

| Method | Route | Description |
|--------|-------|-------------|
| `GET` | `/blogs` | Published posts (pagination, category/tag/search) |
| `GET` | `/blogs/trending` | Trending posts by views |
| `GET` | `/blogs/categories` | All blog categories |
| `GET` | `/blogs/tag/:tag` | Posts by tag |
| `GET` | `/blogs/:slug` | Single post by slug + JSON-LD structured data |
| `POST` | `/blogs/:slug/view` | Increment view count |
| `GET` | `/sitemap.xml` | Auto-generated XML sitemap |

### Key Features
- **SEO**: Slug-based URLs, meta fields (title, description, keywords, canonical, OG image), JSON-LD structured data (schema.org `BlogPosting`)
- **Sitemap**: Auto-generated `sitemap.xml` from published posts
- **XSS Prevention**: `sanitize-html` sanitizes all content (HTML & Editor.js JSON blocks)
- **Caching**: Redis caching on public endpoints (5 min posts, 2 min lists) with automatic invalidation
- **Reading Time**: Auto-calculated (`words / 200`)
- **Content Format**: Supports Editor.js JSON or HTML/Markdown

## Rate Limiting

- **Global:** 20 requests per 60 seconds per IP
- **Sensitive routes** (5 per 60s): `send-otp`, `verify-otp`, checkout, create payment, confirm payment

## Infrastructure

- **Structured logging** via Pino — JSON in production, pretty-print in development
- **Global exception filter** catches all errors with consistent `{ statusCode, message, error, timestamp, path }` shape
- **CORS** configurable via `CORS_ORIGINS` env var (comma-separated)
- **Env validation** via Joi — server won't start with missing required vars

## License

Private — Elevante Labs
