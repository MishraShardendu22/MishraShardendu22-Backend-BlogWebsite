# Contributing to Blog Backend API

Thank you for your interest in contributing to the Blog Backend API! We welcome contributions from the community.

## Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Getting Started](#getting-started)
- [Development Setup](#development-setup)
- [How to Contribute](#how-to-contribute)
- [Pull Request Process](#pull-request-process)
- [Coding Standards](#coding-standards)
- [Commit Guidelines](#commit-guidelines)

## Code of Conduct

This project and everyone participating in it is governed by our [Code of Conduct](CODE_OF_CONDUCT.md). By participating, you are expected to uphold this code.

## Getting Started

1. Fork the repository
2. Clone your fork: `git clone https://github.com/YOUR_USERNAME/MishraShardendu22-Backend-BlogWebsite.git`
3. Create a new branch: `git checkout -b feature/your-feature-name`

## Development Setup

### Prerequisites

- Node.js (v18 or higher)
- pnpm package manager
- PostgreSQL database

### Installation

1. Install dependencies:
   ```bash
   pnpm install
   ```

2. Set up your environment variables:
   ```bash
   cp .env.example .env
   ```

3. Configure your database connection in `.env`

4. Run database migrations:
   ```bash
   pnpm drizzle-kit push
   ```

5. Start the development server:
   ```bash
   pnpm dev
   ```

## How to Contribute

### Reporting Bugs

- Use the GitHub Issues page
- Include a clear title and description
- Provide steps to reproduce the issue
- Include relevant logs, screenshots, or error messages
- Mention your environment (OS, Node version, etc.)

### Suggesting Enhancements

- Use the GitHub Issues page
- Provide a clear and detailed explanation of the feature
- Explain why this enhancement would be useful
- Include code examples if applicable

### Code Contributions

1. Check existing issues or create a new one
2. Comment on the issue to let others know you're working on it
3. Follow the development setup instructions
4. Make your changes
5. Test your changes thoroughly
6. Submit a pull request

## Pull Request Process

1. **Update Documentation**: Ensure any new features are documented
2. **Update Tests**: Add or update tests as needed
3. **Follow Coding Standards**: Ensure your code follows the project's coding style
4. **Commit Messages**: Use clear and descriptive commit messages
5. **PR Description**: Provide a clear description of what your PR does
6. **Link Issues**: Reference any related issues in your PR description
7. **Wait for Review**: A maintainer will review your PR and may request changes

### PR Checklist

- [ ] Code follows the project's style guidelines
- [ ] Self-review of code completed
- [ ] Comments added for complex logic
- [ ] Documentation updated
- [ ] No new warnings generated
- [ ] Tests added/updated and passing
- [ ] Dependent changes merged

## Coding Standards

### TypeScript

- Use TypeScript for all new code
- Define proper types and interfaces
- Avoid using `any` type unless absolutely necessary
- Use async/await instead of callbacks

### Code Style

- Use 2 spaces for indentation
- Use single quotes for strings
- Add trailing commas in objects and arrays
- Use meaningful variable and function names
- Keep functions small and focused
- Comment complex logic

### File Structure

- Place controllers in `src/controllers/`
- Place routes in `src/routes/`
- Place models/schemas in `src/models/`
- Place middleware in `src/middleware/`
- Place utilities in `src/utils/`

## Commit Guidelines

We follow the [Conventional Commits](https://www.conventionalcommits.org/) specification:

```
<type>(<scope>): <subject>

<body>

<footer>
```

### Types

- `feat`: A new feature
- `fix`: A bug fix
- `docs`: Documentation changes
- `style`: Code style changes (formatting, etc.)
- `refactor`: Code refactoring
- `test`: Adding or updating tests
- `chore`: Maintenance tasks

### Examples

```
feat(auth): add email verification system

Implemented OTP-based email verification for user registration

Closes #123
```

```
fix(blog): resolve pagination issue

Fixed bug where pagination was not working correctly for blog posts
with more than 100 records

Fixes #456
```

## Questions?

Feel free to open an issue with your question or reach out to the maintainers.

Thank you for contributing! 🎉
