# Security Policy

## Supported Versions

We release patches for security vulnerabilities. Currently supported versions:

| Version | Supported          |
| ------- | ------------------ |
| 1.1.x   | :white_check_mark: |
| 1.0.x   | :white_check_mark: |
| < 1.0   | :x:                |

## Reporting a Vulnerability

We take the security of our Blog Backend API seriously. If you believe you have found a security vulnerability, please report it to us as described below.

### Please DO NOT:

- Open a public GitHub issue for security vulnerabilities
- Disclose the vulnerability publicly before it has been addressed

### Please DO:

**Report security vulnerabilities by emailing:**

📧 mishrashardendu22@gmail.com

### What to Include:

Please include the following information in your report:

- **Type of vulnerability** (e.g., SQL injection, XSS, authentication bypass)
- **Full paths of source file(s)** related to the vulnerability
- **Location of the affected source code** (tag/branch/commit or direct URL)
- **Step-by-step instructions** to reproduce the issue
- **Proof-of-concept or exploit code** (if possible)
- **Impact of the vulnerability** and how an attacker might exploit it
- **Any special configuration** required to reproduce the issue

### What to Expect:

1. **Acknowledgment**: We will acknowledge receipt of your vulnerability report within 48 hours
2. **Assessment**: We will assess the vulnerability and determine its impact and severity
3. **Updates**: We will keep you informed about our progress toward resolving the issue
4. **Resolution**: We will work on a fix and release a security update
5. **Credit**: We will credit you in our security advisory (unless you prefer to remain anonymous)

## Security Best Practices for Users

### Environment Variables

- Never commit `.env` files to version control
- Use strong, unique values for secrets and API keys
- Rotate secrets regularly

### Database

- Use strong database passwords
- Enable SSL/TLS for database connections
- Implement proper backup and recovery procedures
- Apply principle of least privilege for database users

### Authentication

- Use strong JWT secrets
- Implement rate limiting on authentication endpoints
- Enable email verification for new accounts
- Consider implementing 2FA for sensitive operations

### API Security

- Always use HTTPS in production
- Implement rate limiting
- Validate and sanitize all user inputs
- Use parameterized queries to prevent SQL injection
- Implement proper CORS policies

### Dependencies

- Regularly update dependencies
- Use `pnpm audit` to check for known vulnerabilities
- Review dependency changes before updating

### Production Deployment

- Never expose error stack traces in production
- Use a reverse proxy (nginx, Apache)
- Implement proper logging and monitoring
- Use environment-specific configurations
- Enable security headers (helmet.js)

## Security Features

This project implements several security measures:

- **JWT Authentication**: Secure token-based authentication
- **Password Hashing**: Bcrypt for password storage
- **Email Verification**: OTP-based email verification
- **Input Validation**: Zod schemas for request validation
- **Rate Limiting**: Protection against brute force attacks
- **SQL Injection Prevention**: Drizzle ORM with parameterized queries
- **Error Handling**: Secure error messages without sensitive information

## Known Security Considerations

- Ensure proper configuration of environment variables
- Keep all dependencies up to date
- Follow the security best practices outlined above

## Security Updates

Security updates will be released as soon as possible after a vulnerability is confirmed. Updates will be announced through:

- GitHub Security Advisories
- Release notes
- README updates

## Scope

The following are considered out of scope:

- Vulnerabilities in dependencies (report these to the respective maintainers)
- Social engineering attacks
- Physical attacks
- Denial of Service (DoS) attacks

## Bug Bounty

Currently, we do not offer a paid bug bounty program. However, we deeply appreciate all security researchers who help keep our project secure and will provide public acknowledgment for responsible disclosures.

## Contact

For non-security related issues, please use the GitHub issue tracker.

For security concerns, email: [INSERT YOUR SECURITY EMAIL HERE]

---

Thank you for helping keep our project and its users safe! 🔒
