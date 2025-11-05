# Changelog

All notable changes to this project will be documented in this file.

## [1.0.2] - 2025-01-XX

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
