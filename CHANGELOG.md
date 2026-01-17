# Changelog

All notable changes to this project will be documented in this file.

## [2.3.2] - 2026-01-18

### 📚 Documentation
- Updated landing page hero to highlight x402 v2 compliance

## [2.3.1] - 2026-01-18

### 📚 Documentation
- Updated facilitator URL to use the official public one: `https://aptos-x402.org/api/facilitator`

## [2.3.0] - 2026-01-17

### 🔴 Breaking Change (V2 Protocol Compliance)
- **402 Response Format**: Payment requirements now sent via `PAYMENT-REQUIRED` header (base64 JSON) instead of response body
- **Header Constants**: Added `PAYMENT_REQUIRED_HEADER` export

### ✨ Improvements
- **Backward Compatibility**: Client (`x402axios`) still reads from body if header is missing (V1 fallback)
- **Protocol Compliance**: Now fully compliant with official x402 V2 specification

## [2.2.4] - 2026-01-17

### 🐛 Bug Fixes
- Fixed npm package missing README and CHANGELOG

## [2.2.3] - 2026-01-17

### 🐛 Bug Fixes
- Fixed minor typo in CHANGELOG

## [2.2.2] - 2026-01-17

### 📚 Documentation
- Removed v1 deprecation warning from README

## [2.2.1] - 2026-01-17

### 📚 Documentation
- Fixed README examples: Removed non-existent `x402axios.create()` references
- Clarified v2 protocol changes: Header-based architecture, standard headers (no "X-" prefix), fungible assets
- Updated "What's new" section with accurate v2.2.0 features

## [2.2.0] - 2026-01-17

### 🌟 New Features (v2 Protocol)
- **Protocol Standards**: Removed "X-" prefix from headers (now `PAYMENT-SIGNATURE`).
- **Header-Based Architecture**: Moved payment specifications and proofs to headers.
- **Fungible Assets**: Native support for USDC transfers on Aptos (via `primary_fungible_store`).
- **Geomi Gas Sponsorship**: Facilitator-sponsored gas fees for better UX.
- **ARC-8004**: Added Agent Trust Layer (Identity, Reputation, Validation).

### ⚡ Improvements
- **Performance**: Faster settlement times and bug fixes.
- **Bug Fixes**: Resolved performance bottlenecks and improved type safety.

## [1.0.2] - 2025-01-10

### ⚡ Performance Optimizations
- **Hex Encoding**: Replaced base64 encoding with hex for transaction/signature (faster, more compact)
  - Direct JSON payment header (no outer base64 encoding)
  - ~1-2ms improvement per request
- **Removed Verification Caching**: Eliminated middleware verification cache overhead (~5ms saved)
- **Skipped Middleware Validation**: Removed redundant validation checks in middleware (~2-5ms saved)
  - Single source of truth: facilitator handles all validation
- **HTTP/2 Keep-Alive**: Added persistent connections for facilitator calls
  - ~50-100ms improvement on subsequent requests
  - Connection pooling and multiplexing support

### 📊 Performance Impact
- **First call**: ~8-12ms faster
- **Subsequent calls**: ~58-112ms faster (with HTTP/2 keep-alive)
- **Total improvement**: Combined with previous optimizations (async confirmation, simulation-only verification)

### 🔧 Technical Changes
- Updated all components to use consistent hex + JSON format
  - Client (`x402axios`): Hex encoding for transaction/signature
  - Middleware: Direct JSON parsing (no base64 decode)
  - Facilitator endpoints: Hex decoding for transaction/signature
- Improved code consistency across client, middleware, and facilitator
- Better debugging with hex encoding (more human-readable)

### 🐛 Bug Fixes
- Fixed TypeScript build error in middleware (type assertion for SettleResponse)
- Ensured all components use the same encoding format

### ⚠️ Breaking Changes
- **Not backward compatible**: Old clients sending base64 will fail
- All components must be updated together (client, middleware, facilitator)

## [0.2.0] - 2024-12-19

### 🚀 Major Features
- **Axios-Compatible Interface**: Complete rewrite of x402axios to work exactly like axios
  - Support for all axios methods: `.get()`, `.post()`, `.put()`, `.patch()`, `.delete()`, `.head()`, `.options()`
  - Full axios configuration support: `timeout`, `headers`, `baseURL`, `params`, etc.
  - `x402axios.create()` for creating instances with default configs
  - Backward compatible with existing API

### 🔧 Improvements
- **Zero Fallbacks Policy**: Removed all silent fallbacks to testnet
  - Throws clear errors when environment variables are missing
  - No more silent defaults that could cause confusion
- **Dynamic Explorer Links**: Explorer URLs now correctly reflect the network used
  - Mainnet transactions show `?network=mainnet`
  - Testnet transactions show `?network=testnet`
  - No more hardcoded testnet links
- **Enhanced Error Handling**: Better error messages and validation
  - Clear indication when network configuration is missing
  - Proper error propagation throughout the payment flow

### 🛠️ Technical Changes
- **Type Safety**: Full TypeScript support with proper interfaces
  - `AxiosRequestConfig` interface for request configuration
  - `AxiosResponse` interface for response handling
  - Backward compatible `X402Response` alias
- **Network Detection**: Automatic network detection from 402 responses
  - No hardcoded network assumptions
  - Proper network mapping and validation
- **Documentation**: Comprehensive updates to all documentation
  - Updated examples to use new axios interface
  - Enhanced API reference with new types
  - Improved quickstart guides

### 🐛 Bug Fixes
- Fixed recipient/sender address mismatch issue
- Corrected network configuration handling
- Fixed explorer URL generation for different networks
- Resolved environment variable loading issues

### 📚 Documentation
- Updated all code examples to use new axios interface
- Enhanced README with axios compatibility section
- Updated API reference with new types and methods
- Improved quickstart guides and troubleshooting

## [0.1.3] - 2024-12-18

### Features
- Initial release with basic x402 payment functionality
- Next.js middleware for payment protection
- Basic x402axios wrapper for payment handling
- Facilitator service for payment verification and settlement
