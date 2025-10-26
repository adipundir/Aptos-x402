export default function Navbar() {
  return (
    <div className="fixed top-0 left-0 right-0 h-16 border-b border-gray-200 bg-white z-50">
      <div className="max-w-full px-6 h-full flex items-center justify-between">
        <a href="/" className="text-2xl font-bold text-black hover:text-gray-700">
          Aptos x402
        </a>
        
        <div className="flex items-center gap-4">
          <a
            href="https://github.com/adipundir/aptos-x402"
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-gray-700 hover:text-black transition-colors"
          >
            GitHub
          </a>
          <a
            href="https://www.npmjs.com/package/@adipundir/aptos-x402"
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-gray-700 hover:text-black transition-colors"
          >
            NPM
          </a>
          <a
            href="/docs"
            className="bg-black text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-800 transition-colors"
          >
            Docs
          </a>
        </div>
      </div>
    </div>
  );
}

