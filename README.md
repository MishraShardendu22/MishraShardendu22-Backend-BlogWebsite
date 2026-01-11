# Blog Backend API with OTP Email Verification

A robust Express.js backend API for a blog platform with email verification using OTP (One-Time Password).

## Features

- 🔐 **JWT Authentication** - Secure user authentication with JSON Web Tokens
- 📧 **Email Verification** - OTP-based email verification system
- ✍️ **Blog Management** - Create, read, update, and delete blog posts
- 💬 **Comment System** - Verified users can comment on blog posts
- 👤 **User Profiles** - Extended user profile information
- 🧹 **Auto Cleanup** - Automatic removal of expired OTPs and unverified users
- 📊 **Statistics** - Blog and comment statistics

## Tech Stack

- **Runtime**: Node.js with TypeScript
- **Framework**: Express.js
- **Database**: PostgreSQL (Neon)
- **ORM**: Drizzle ORM
- **Authentication**: JWT + bcrypt
- **Email**: Nodemailer (Gmail)
- **Validation**: Input validation and sanitization

## Prerequisites

- Node.js 18+ or pnpm
- PostgreSQL database (Neon recommended)
- Gmail account with App Password

## Environment Variables

Create a `.env` file in the root directory:

```env
# Database
DATABASE_URL="postgresql://user:password@host/database?sslmode=require"

# Email Configuration (SendGrid)
MAIL_ID="your-verified-sender-email@example.com"
SENDGRID_API_KEY="your-sendgrid-api-key"

# JWT Secret (change this in production!)
JWT_SECRET="your-super-secret-jwt-key-change-this-in-production"

# Owner Email (has special privileges)
OWNER_EMAIL="mishrashardendu22@gmail.com"

# Frontend URL (comma-separated for multiple URLs)
# Include all domains that will access your API
# For production: Add your deployed frontend URLs
# Example: https://blog.example.com,https://admin.example.com
FRONTEND_URL="http://localhost:5173,http://localhost:3000,https://admin.mishrashardendu22.is-a.dev,https://mishrashardendu22.is-a.dev"

# Server Port
PORT=3000

# OTP Configuration
OTP_EXPIRY_MINUTES=10
```

### Setting Up SendGrid Email

1. Sign up for a free SendGrid account at [https://sendgrid.com](https://sendgrid.com)
2. Create an API key in the SendGrid dashboard (Settings → API Keys → Create API Key)
3. Verify your sender email address in SendGrid (Settings → Sender Authentication → Verify a Single Sender)
4. Copy your API key to `SENDGRID_API_KEY` in your `.env` file
5. Use your verified sender email in `MAIL_ID`

**Note:** This project uses the official `@sendgrid/mail` library for better integration and reliability.

## Installation

```bash
# Install dependencies
pnpm install

# Generate database migrations
pnpm db:generate

# Push schema to database
pnpm db:push

# Run development server
pnpm dev

# Build for production
pnpm build

# Run production server
pnpm start
```

## API Endpoints

### Authentication

#### Register User
```http
POST /api/auth/register
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "securePassword123",
  "name": "John Doe"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Registration successful. Please verify your email with the OTP sent.",
  "data": {
    "token": "jwt-token",
    "user": {
      "id": 1,
      "email": "user@example.com",
      "name": "John Doe",
      "isVerified": false,
      "isOwner": false
    }
  }
}
```

#### Login
```http
POST /api/auth/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "securePassword123"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "token": "jwt-token",
    "user": {
      "id": 1,
      "email": "user@example.com",
      "name": "John Doe",
      "isVerified": true,
      "isOwner": false
    }
  }
}
```

#### Verify OTP
```http
POST /api/auth/verify-otp
Content-Type: application/json

{
  "email": "user@example.com",
  "otp": "123456"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Email verified successfully",
  "data": {
    "user": {
      "id": 1,
      "email": "user@example.com",
      "name": "John Doe",
      "isVerified": true,
      "isOwner": false
    }
  }
}
```

#### Resend OTP
```http
POST /api/auth/resend-otp
Content-Type: application/json

{
  "email": "user@example.com"
}
```

**Response:**
```json
{
  "success": true,
  "message": "OTP sent successfully"
}
```

#### Get Current User
```http
GET /api/auth/me
Authorization: Bearer <jwt-token>
```

**Response:**
```json
{
  "success": true,
  "data": {
    "user": {
      "id": 1,
      "email": "user@example.com",
      "name": "John Doe",
      "isVerified": true,
      "isOwner": false
    }
  }
}
```

### Blog Posts

#### Get All Blogs
```http
GET /api/blogs?page=1&limit=10&search=keyword
```

#### Get Single Blog
```http
GET /api/blogs/:id
```

#### Create Blog (Owner Only)
```http
POST /api/blogs
Authorization: Bearer <jwt-token>
Content-Type: application/json

{
  "title": "My Blog Post",
  "content": "Blog content here...",
  "tags": ["technology", "programming"]
}
```

#### Update Blog (Owner Only)
```http
PUT /api/blogs/:id
Authorization: Bearer <jwt-token>
Content-Type: application/json

{
  "title": "Updated Title",
  "content": "Updated content...",
  "tags": ["updated", "tags"]
}
```

#### Delete Blog (Owner Only)
```http
DELETE /api/blogs/:id
Authorization: Bearer <jwt-token>
```

### Comments

#### Get Comments for a Blog
```http
GET /api/blogs/:id/comments?page=1&limit=10
```

**Response includes user verification status:**
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "content": "Great post!",
      "userId": 2,
      "blogId": 1,
      "createdAt": "2024-01-01T00:00:00Z",
      "user": {
        "id": 2,
        "email": "commenter@example.com",
        "name": "Jane Doe",
        "isVerified": true
      },
      "userProfile": {
        "firstName": "Jane",
        "lastName": "Doe",
        "avatar": "https://example.com/avatar.jpg"
      }
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 25,
    "totalPages": 3
  }
}
```

#### Create Comment (Verified Users Only)
```http
POST /api/blogs/:id/comments
Authorization: Bearer <jwt-token>
Content-Type: application/json

{
  "content": "This is my comment!"
}
```

**Note**: Returns 403 if user is not verified:
```json
{
  "success": false,
  "error": "Please verify your email to post comments",
  "requiresVerification": true
}
```

#### Delete Comment
```http
DELETE /api/blogs/:id/comments/:commentId
Authorization: Bearer <jwt-token>
```

### Statistics

#### Get Blog Stats
```http
GET /api/blogs/:id/stats
```

## Database Schema

### Users Table
- `id` - Serial primary key
- `email` - Unique email address
- `password` - Bcrypt hashed password
- `name` - User's full name
- `is_verified` - Email verification status (default: false)
- `created_at` - Account creation timestamp
- `updated_at` - Last update timestamp

### OTP Verification Table
- `email` - Primary key (email address)
- `otp_hash` - Bcrypt hashed OTP
- `expires_at` - Expiration timestamp
- `created_at` - Creation timestamp

### Blog Table
- `id` - Serial primary key
- `title` - Blog title
- `content` - Blog content (markdown supported)
- `tags` - Array of tags
- `author_id` - Foreign key to users table
- `created_at` - Creation timestamp
- `updated_at` - Last update timestamp

### Comments Table
- `id` - Serial primary key
- `user_id` - Foreign key to users table
- `blog_id` - Foreign key to blog table
- `content` - Comment text (max 500 chars)
- `created_at` - Creation timestamp

### User Profiles Table
- `id` - Serial primary key
- `user_id` - Unique foreign key to users table
- `first_name` - First name
- `last_name` - Last name
- `bio` - User biography
- `avatar` - Avatar URL
- `website` - Personal website
- `location` - User location
- `date_of_birth` - Date of birth
- `created_at` - Profile creation timestamp
- `updated_at` - Last update timestamp

## Security Features

### Email Verification Flow

1. **Registration**: User registers → OTP generated → Email sent
2. **Verification**: User submits OTP → Validated → Account verified
3. **Access Control**: Unverified users can login and view content but cannot post comments
4. **Cleanup**: Unverified accounts older than 24 hours are automatically deleted

### Password Security
- Passwords hashed using bcrypt (salt rounds: 10)
- Minimum password requirements enforced

### JWT Tokens
- Signed with HS256 algorithm
- Includes user ID, email, name, and owner status
- Should be stored securely on client side

### Rate Limiting
Recommended to implement rate limiting for:
- Login attempts
- OTP requests
- Registration

## Automated Maintenance

### Cleanup Job
Runs every hour (configurable):
- Deletes expired OTPs
- Removes unverified users older than 24 hours

To change cleanup interval, edit `src/index.ts`:
```typescript
startCleanupJob(60) // 60 minutes
```

## Error Handling

All endpoints return consistent error responses:

```json
{
  "success": false,
  "error": "Error message here"
}
```

HTTP Status Codes:
- `200` - Success
- `201` - Created
- `400` - Bad Request (validation errors)
- `401` - Unauthorized (invalid/missing token)
- `403` - Forbidden (insufficient permissions or not verified)
- `404` - Not Found
- `500` - Internal Server Error

## Development

### Project Structure
```
src/
├── config/
│   ├── auth.ts           # JWT configuration
│   └── database.ts       # Database connection
├── controllers/
│   ├── blogController.ts
│   ├── commentController.ts
│   └── statsController.ts
├── middleware/
│   ├── auth.ts           # Authentication middleware
│   └── errorHandler.ts
├── models/
│   ├── authSchema.ts     # User and OTP schemas
│   └── schema.ts         # Blog, comments, profiles
├── routes/
│   ├── auth.ts           # Auth endpoints
│   └── blogs.ts          # Blog and comment endpoints
├── utils/
│   ├── emailService.ts   # Email sending logic
│   ├── emailTemplate.ts  # Email HTML template
│   ├── otpService.ts     # OTP generation and verification
│   └── scheduledJobs.ts  # Cleanup jobs
└── index.ts              # Main application entry
```

### Running Migrations

```bash
# Generate migrations from schema
pnpm db:generate

# Push schema directly to database (development)
pnpm db:push

# Open Drizzle Studio (database GUI)
pnpm db:studio
```

## Production Deployment

### Checklist
- [ ] Change `JWT_SECRET` to a strong random value
- [ ] Configure `OWNER_EMAIL` to your email
- [ ] Set up proper CORS origins in `FRONTEND_URL`
- [ ] Enable rate limiting
- [ ] Set up logging (Winston, Pino, etc.)
- [ ] Configure environment-specific database
- [ ] Set up monitoring and error tracking
- [ ] Enable HTTPS
- [ ] Configure backup strategy for database

### Deployment Platforms
- **Vercel** - Serverless deployment
- **Railway** - Easy deployment with PostgreSQL
- **Render** - Full-stack deployment
- **AWS/GCP/Azure** - Traditional cloud deployment

## 🧪 API Testing

Complete Postman collection and testing documentation is provided! 

### Quick Start
1. Import `Blog-Backend-API.postman_collection.json` into Postman
2. Import `Blog-Backend-API.postman_environment.json` for environment variables
3. Start testing with automated tests and auto-saved tokens!

### Documentation Files
- **`TESTING_README.md`** - Complete overview of all testing resources
- **`POSTMAN_TESTING_GUIDE.md`** - Step-by-step Postman testing guide
- **`API_QUICK_REFERENCE.md`** - Quick reference for all endpoints
- **`API_VISUAL_GUIDE.md`** - Visual diagrams and flow charts
- **`NEWMAN_TESTING_GUIDE.md`** - CLI testing and CI/CD integration

### Features
✅ All endpoints covered (Auth, Blogs, Comments, Stats)  
✅ Automated tests for each request  
✅ Auto-save tokens and IDs  
✅ Sample payloads included  
✅ Newman CLI support for automation  

📖 **Get Started**: See `TESTING_README.md` for complete testing documentation!

## Troubleshooting

### Email Not Sending
1. Check SendGrid API key is correct
2. Verify your sender email is verified in SendGrid
3. Check `MAIL_ID` and `SENDGRID_API_KEY` in `.env`
4. Review console logs for email errors
5. Ensure SendGrid account is active and not suspended

### Database Connection Issues
1. Verify `DATABASE_URL` is correct
2. Check database is accessible
3. Ensure SSL mode is properly configured
4. Test connection using `pnpm db:studio`

### OTP Not Working
1. Check OTP expiry time (default: 10 minutes)
2. Verify database has `otp_verification` table
3. Check cleanup job isn't running too frequently
4. Review console logs for OTP generation/verification

## License

MIT

## Author

Shardendu Mishra (mishrashardendu22@gmail.com)

---

**Note**: This is a production-ready backend API. Remember to follow security best practices and keep dependencies updated.
