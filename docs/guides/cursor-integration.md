# Cursor IDE Integration

Enhance your development experience with AI-powered IDE integration for aptos-x402.

## Overview

Aptos x402 provides a comprehensive MDC (Model Development Context) file that enables seamless integration with AI-powered IDEs like Cursor. This integration provides intelligent code suggestions, automatic setup guidance, and best practices for implementing blockchain micropayments.

## Features

- **🤖 AI-Powered Setup**: Get intelligent guidance for implementing x402 payments
- **📝 Code Examples**: Comprehensive examples for all major frameworks
- **🛡️ Best Practices**: Built-in security and configuration guidance
- **⚡ Zero Configuration**: Works out of the box with Cursor IDE
- **🔧 Type Safety**: Full TypeScript support and type hints

## Quick Setup

### 1. Copy the MDC File

Copy the aptos-x402 MDC file to your project:

```bash
# Create the .cursor/rules directory
mkdir -p .cursor/rules

# Copy the MDC file from the aptos-x402 repository
cp /path/to/aptos-x402/.cursor/rules/aptos-x402.mdc .cursor/rules/
```

### 2. Start Using Cursor

Once the MDC file is in place, Cursor will automatically understand how to integrate aptos-x402 into your project. You can:

- Ask Cursor to "Add x402 payment protection to my API routes"
- Request "Set up aptos-x402 middleware for Next.js"
- Get help with "Configure environment variables for aptos-x402"

## What the MDC File Provides

### Installation & Setup
- Complete package installation instructions
- Environment variable configuration
- Framework-specific setup guides

### Code Examples
- **Next.js**: Middleware setup and API route protection
- **Express.js**: Server-side payment handling
- **React**: Client-side payment integration
- **TypeScript**: Type declarations and configuration

### Best Practices
- Security guidelines for private key handling
- Network configuration (testnet/mainnet)
- Error handling patterns
- Performance optimization tips

### Common Issues
- Troubleshooting network mismatches
- Environment variable problems
- Private key format issues
- Middleware configuration errors

## Supported Frameworks

The MDC file includes guidance for:

- **Next.js** (App Router & Pages Router)
- **Express.js**
- **Fastify**
- **React** (any framework)
- **Node.js** (vanilla)

## Example Usage

Once integrated, you can ask Cursor questions like:

```
"Help me add x402 payment protection to my /api/premium route"
```

Cursor will provide:
- Complete middleware configuration
- Environment variable setup
- Client-side integration code
- TypeScript type definitions

## Advanced Features

### Automatic Type Detection
The MDC file includes TypeScript declarations that help Cursor understand:
- Request/response types
- Configuration options
- Error handling patterns

### Framework Detection
Cursor can automatically detect your framework and provide appropriate examples:
- Next.js App Router patterns
- Express.js middleware setup
- React component integration

### Security Guidance
Built-in security best practices:
- Private key handling
- Environment variable management
- Network configuration validation

## Troubleshooting

### MDC File Not Working
1. Ensure the file is in `.cursor/rules/aptos-x402.mdc`
2. Restart Cursor IDE
3. Check file permissions

### Missing Examples
The MDC file includes comprehensive examples for all major use cases. If you need something specific, check the [API Reference](/docs/api-reference) or [Examples](/docs/examples).

### Type Errors
Make sure you have TypeScript configured in your project and the aptos-x402 types are properly imported.

## Contributing

If you find issues with the MDC file or want to add new patterns:

1. Update the `.cursor/rules/aptos-x402.mdc` file
2. Test the changes with Cursor IDE
3. Submit a pull request with your improvements

## Related Resources

- [Quick Start Guide](/docs/getting-started/quickstart-buyers)
- [API Reference](/docs/api-reference)
- [Examples](/docs/examples)
- [GitHub Repository](https://github.com/adipundir/aptos-x402)

## Support

For issues with the Cursor integration:
- Check the [FAQ](/docs/faq)
- Open an issue on [GitHub](https://github.com/adipundir/aptos-x402/issues)
- Join our community discussions
