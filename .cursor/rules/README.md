# Aptos x402 Cursor IDE Integration

This directory contains Cursor IDE-specific rules and type hints for the Aptos x402 SDK, similar to how Reown provides integration for their AppKit.

## What is this?

The `aptos-x402.mdc` file contains comprehensive rules and examples that help AI-powered IDEs like Cursor understand how to integrate the Aptos x402 payment protocol into projects. This makes it much easier for developers to implement blockchain micropayments with proper guidance.

## How to Use

### For Users of aptos-x402:

1. **Copy the MDC file** to your project:
   ```bash
   # Copy the entire .cursor directory
   cp -r /path/to/aptos-x402/.cursor /path/to/your-project/
   
   # Or just the rules directory
   mkdir -p .cursor/rules
   cp /path/to/aptos-x402/.cursor/rules/aptos-x402.mdc .cursor/rules/
   ```

2. **Start using Cursor** - The AI will now understand how to integrate aptos-x402 into your project with proper examples and best practices.

### For Contributors:

The MDC file should be updated whenever:
- New features are added to the SDK
- API changes are made
- New integration patterns are discovered
- Common issues are identified

## What's Included

The MDC file provides guidance for:

- **Installation** and setup
- **Environment configuration**
- **Next.js middleware** setup
- **API route protection** (zero payment logic)
- **Client integration** (axios-compatible)
- **TypeScript configuration**
- **Non-Next.js frameworks** (Express, Fastify, etc.)
- **Common issues** and troubleshooting
- **Best practices** and security considerations

## Benefits

- **Faster Integration**: AI can help implement x402 payments quickly
- **Best Practices**: Ensures proper configuration and security
- **Type Safety**: Provides TypeScript guidance
- **Error Prevention**: Highlights common pitfalls
- **Comprehensive Examples**: Covers all major use cases

## Contributing

If you find issues with the MDC file or want to add new patterns, please:

1. Update the `aptos-x402.mdc` file
2. Test the changes with Cursor IDE
3. Submit a pull request with your improvements

## Related

- [Aptos x402 Documentation](https://aptos-x402.vercel.app/docs)
- [NPM Package](https://www.npmjs.com/package/aptos-x402)
- [GitHub Repository](https://github.com/adipundir/aptos-x402)
