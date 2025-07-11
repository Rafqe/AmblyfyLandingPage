# Security Guidelines

## Overview

This document outlines the security measures implemented in the Amblyfy application and provides guidelines for maintaining security standards.

## Authentication & Authorization

### Password Requirements

- Minimum 8 characters
- Must contain at least one number (0-9)

### Rate Limiting

- Login attempts: 5 attempts per 15 minutes per email
- Registration attempts: 3 attempts per 5 minutes globally
- Password changes require current password verification

### Session Management

- Sessions are managed by Supabase Auth with JWT tokens
- Automatic session refresh
- Secure session storage

## Database Security

### Row Level Security (RLS)

All tables have RLS enabled with policies ensuring:

- Users can only access their own data
- Doctors can only access their assigned patients' data
- Proper audit trails with created/updated timestamps

### Input Validation

- All user inputs are sanitized and validated
- Text fields have maximum length limits
- Date fields are restricted to valid ranges
- Numeric fields have appropriate bounds

## Frontend Security

### Content Security Policy (CSP)

Strict CSP implemented to prevent XSS attacks:

- No unsafe-inline or unsafe-eval for scripts
- Restricted sources for all content types
- Frame ancestors blocked to prevent clickjacking

### Input Sanitization

- All user inputs are sanitized before processing
- HTML tags are stripped from text inputs
- Length limits enforced to prevent DoS attacks

### Error Handling

- Production error messages are sanitized
- Sensitive information is not exposed in error messages
- Detailed errors only shown in development mode

## Environment Variables

### Required Environment Variables

Create a `.env.local` file with:

```bash
REACT_APP_SUPABASE_URL=your_supabase_project_url
REACT_APP_SUPABASE_ANON_KEY=your_supabase_anon_key
```

### Security Notes

- Never commit environment files to version control
- Use different credentials for different environments
- Regularly rotate API keys and credentials

## Security Headers

The following security headers are implemented:

- `X-Content-Type-Options: nosniff`
- `X-Frame-Options: DENY`
- `X-XSS-Protection: 1; mode=block`
- `Referrer-Policy: strict-origin-when-cross-origin`
- Content Security Policy (see above)

## Data Protection

### Encryption

- All data transmission is encrypted using HTTPS
- Database encryption at rest provided by Supabase
- Password hashing handled by Supabase Auth

### Data Retention

- User data is deleted when account is deleted
- Audit logs are maintained for security purposes
- Personal data is minimized and purpose-limited

## Security Monitoring

### Recommended Monitoring

- Failed authentication attempts
- Unusual access patterns
- Error rates and types
- Database query patterns

### Incident Response

1. Identify and contain the issue
2. Assess the impact and scope
3. Notify relevant stakeholders
4. Implement fixes and recovery
5. Document lessons learned

## Deployment Security

### Production Checklist

- [ ] Environment variables are properly set
- [ ] CSP headers are configured
- [ ] HTTPS is enforced
- [ ] Error logging is configured
- [ ] Database backups are enabled
- [ ] Rate limiting is active

### Regular Security Tasks

- Update dependencies monthly
- Review security logs weekly
- Rotate credentials quarterly
- Conduct security audits annually

## Reporting Security Issues

If you discover a security vulnerability, please:

1. Do NOT open a public issue
2. Email security concerns to: [security@amblyfy.com]
3. Include steps to reproduce the issue
4. Allow reasonable time for response before disclosure

## Compliance

This application implements security measures to comply with:

- GDPR data protection requirements
- Healthcare data privacy standards
- Industry security best practices

## Security Utilities

The application includes security utilities in `src/utils/security.ts`:

- Input sanitization functions
- Password validation
- Email validation
- Error message sanitization
- Rate limiting helpers

## Additional Resources

- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [Supabase Security Guide](https://supabase.com/docs/guides/auth)
- [React Security Best Practices](https://snyk.io/blog/10-react-security-best-practices/)
