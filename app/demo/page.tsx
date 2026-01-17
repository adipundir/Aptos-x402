"use client";

import { useState } from "react";
import { 
  CheckCircle, 
  ArrowRight, 
  Zap, 
  ExternalLink, 
  Clock, 
  Shield, 
  Loader2,
  RotateCcw,
  Info
} from "lucide-react";
import { x402axios } from "../../lib/x402-axios";

export default function DemoPage() {
  const [loading, setLoading] = useState(false);
  const [response, setResponse] = useState<any>(null);
  const [step, setStep] = useState<"initial" | "success">("initial");
  const [timing, setTiming] = useState<any>(null);

  const DEMO_PRIVATE_KEY = process.env.NEXT_PUBLIC_DEMO_PRIVATE_KEY!;

  if (!DEMO_PRIVATE_KEY) {
    throw new Error("DEMO_PRIVATE_KEY is not set");
  }

  const API_URL = `${typeof window !== 'undefined' ? window.location.origin : ''}/api/protected/weather`;

  const makeRequest = async () => {
    setLoading(true);
    setResponse(null);
    setTiming(null);

    try {
      const startTime = performance.now();
      
      const result = await x402axios.get(API_URL, {
        privateKey: DEMO_PRIVATE_KEY,
      });
      
      const endTime = performance.now();
      const totalTime = Math.round(endTime - startTime);

      const verificationTime = result.headers['verification-time'];
      const settlementTime = result.headers['settlement-time'];

              setResponse({
                status: result.status,
                statusText: "OK",
                requestHeaders: {
                  "PAYMENT-SIGNATURE": "Automatically handled by x402Axios (v2)"
                },
                responseHeaders: result.headers,
                body: result.data,
                transactionHash: result.paymentInfo?.transactionHash,
                paymentInfo: result.paymentInfo,
              });

      setTiming({
        total: totalTime,
        verification: verificationTime ? parseInt(verificationTime) : null,
        settlement: settlementTime ? parseInt(settlementTime) : null,
      });

      if (result.status === 200) {
        setStep("success");
      }
    } catch (err: any) {
      setResponse({ 
        error: err.message || String(err),
        details: err.response?.data 
      });
    } finally {
      setLoading(false);
    }
  };

  const reset = () => {
    setStep("initial");
    setResponse(null);
    setTiming(null);
  };

  return (
    <div className="min-h-screen bg-white pt-24 pb-16">
      <div className="max-w-6xl mx-auto px-6">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-zinc-900 mb-3" style={{ fontFamily: 'Impact, "Arial Black", sans-serif' }}>
            x402 Payment Protocol Demo
          </h1>
          <p className="text-zinc-500 text-sm">
            HTTP 402 on Aptos Blockchain • v2 with Gasless Transactions
          </p>
        </div>

        {/* Main Content */}
        <div className="grid lg:grid-cols-2 gap-8">
          {/* Left Column - Controls & Info */}
          <div className="space-y-6">
            {/* Action Card */}
            <div className="rounded-xl border border-zinc-200 bg-white overflow-hidden">
              <div className="p-6 border-b border-zinc-100">
                <h2 className="text-lg font-semibold text-zinc-900">
                  {step === "initial" ? "Access Protected Weather API" : "Payment Successful"}
                </h2>
              </div>
              
              <div className="p-6">
                {step === "initial" ? (
                  <>
                    <p className="text-zinc-600 text-sm mb-4">
                      Click below to access the protected weather API. The x402axios.get() function will automatically handle the payment if required!
                    </p>
                    
                    <div className="bg-zinc-50 rounded-lg p-4 mb-6 border border-zinc-100">
                      <div className="flex items-start gap-3">
                        <Info className="w-4 h-4 text-zinc-500 mt-0.5 flex-shrink-0" />
                        <p className="text-xs text-zinc-500">
                          Open DevTools Network tab to see 2 requests: first without payment (gets 402), then with payment (gets data)
                        </p>
                      </div>
                    </div>

                    <button
                      onClick={makeRequest}
                      disabled={loading}
                      className="w-full flex items-center justify-center gap-2 px-6 py-3.5 bg-zinc-900 text-white rounded-lg font-medium hover:bg-zinc-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      {loading ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          Processing...
                        </>
                      ) : (
                        <>
                          Request Weather API
                          <ArrowRight className="w-4 h-4" />
                        </>
                      )}
                    </button>
                  </>
                ) : (
                  <>
                    <div className="flex items-center gap-3 mb-6">
                      <CheckCircle className="w-5 h-5 text-zinc-900" />
                      <div>
                        <h3 className="font-semibold text-zinc-900">Payment Verified</h3>
                        <p className="text-sm text-zinc-500">The protected resource has been delivered.</p>
                      </div>
                    </div>

                    {response?.transactionHash && (
                      <div className="bg-zinc-50 rounded-lg p-4 mb-6 border border-zinc-100">
                        <p className="text-xs font-medium text-zinc-500 uppercase tracking-wide mb-2">
                          Transaction Hash
                        </p>
                        <code className="block text-xs font-mono text-zinc-700 break-all mb-3">
                          {response.transactionHash}
                        </code>
                        <a
                          href={`https://explorer.aptoslabs.com/txn/${response.transactionHash}?network=${
                            process.env.NEXT_PUBLIC_APTOS_NETWORK === 'aptos:1' ? 'mainnet' 
                            : process.env.NEXT_PUBLIC_APTOS_NETWORK === 'aptos:2' ? 'testnet'
                            : process.env.NEXT_PUBLIC_APTOS_NETWORK?.replace('aptos-', '') || 'testnet'
                          }`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 text-xs font-medium text-zinc-900 hover:text-zinc-600 transition-colors"
                        >
                          View on Explorer
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      </div>
                    )}

                    <button
                      onClick={reset}
                      className="w-full flex items-center justify-center gap-2 px-6 py-3.5 bg-zinc-900 text-white rounded-lg font-medium hover:bg-zinc-800 transition-colors"
                    >
                      <RotateCcw className="w-4 h-4" />
                      Start Over
                    </button>
                  </>
                )}
              </div>
            </div>

            {/* Timing Card */}
            {timing && (
              <div className="rounded-xl border border-zinc-200 bg-white overflow-hidden">
                <div className="p-6 border-b border-zinc-100">
                  <h2 className="text-lg font-semibold text-zinc-900 flex items-center gap-2">
                    <Clock className="w-4 h-4 text-zinc-500" />
                    Response Time
                  </h2>
                </div>
                <div className="p-6">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-zinc-600 text-sm">Total</span>
                      <span className="text-xl font-bold text-zinc-900">{timing.total}ms</span>
                    </div>
                    
                    {timing.verification && (
                      <div className="flex items-center justify-between text-sm pl-4 border-l-2 border-zinc-200">
                        <span className="text-zinc-500">Verification</span>
                        <span className="font-mono text-zinc-600">{timing.verification}ms</span>
                      </div>
                    )}
                    {timing.settlement && (
                      <div className="flex items-center justify-between text-sm pl-4 border-l-2 border-zinc-200">
                        <span className="text-zinc-500">Settlement</span>
                        <span className="font-mono text-zinc-600">{timing.settlement}ms</span>
                      </div>
                    )}
                    {timing.verification && timing.settlement && (
                      <div className="flex items-center justify-between text-sm pl-4 border-l-2 border-zinc-200">
                        <span className="text-zinc-500">API Processing</span>
                        <span className="font-mono text-zinc-600">
                          {timing.total - timing.verification - timing.settlement}ms
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* How It Works Card */}
            <div className="rounded-xl border border-zinc-200 bg-white overflow-hidden">
              <div className="p-6 border-b border-zinc-100">
                <h2 className="text-lg font-semibold text-zinc-900 flex items-center gap-2">
                  <Zap className="w-4 h-4 text-zinc-500" />
                  How x402Axios Works
                </h2>
              </div>
              <div className="p-6">
                <ol className="space-y-3 text-sm">
                  {[
                    { title: 'Initial Request', desc: 'Tries to access resource (no payment)' },
                    { title: '402 Detection', desc: 'Server returns 402 with payment requirements' },
                    { title: 'Extract Requirements', desc: 'Gets network (aptos:2), amount, asset, sponsored flag' },
                    { title: 'Build Fee Payer Tx', desc: 'Creates sponsored transaction (gasless!)' },
                    { title: 'Retry with Payment', desc: 'Resends with PAYMENT-SIGNATURE header' },
                    { title: 'Sponsor & Settle', desc: 'Facilitator sponsors gas & submits' },
                  ].map((item, i) => (
                    <li key={i} className="flex gap-3">
                      <span className="font-semibold text-zinc-900 w-5">{i + 1}.</span>
                      <span>
                        <strong className="text-zinc-900 font-medium">{item.title}:</strong>{' '}
                        <span className="text-zinc-500">{item.desc}</span>
                      </span>
                    </li>
                  ))}
                </ol>
                <p className="text-xs text-zinc-400 mt-4 p-3 bg-zinc-50 rounded-lg border border-zinc-100">
                  Just call x402Axios(&#123; privateKey, url &#125;) - that&apos;s it!
                </p>
              </div>
            </div>
          </div>

          {/* Right Column - Response */}
          <div className="space-y-6">
            <div className="rounded-xl border border-zinc-200 bg-white overflow-hidden sticky top-24">
              <div className="p-6 border-b border-zinc-100">
                <h2 className="text-lg font-semibold text-zinc-900 flex items-center gap-2">
                  <Shield className="w-4 h-4 text-zinc-500" />
                  API Response
                </h2>
              </div>
              
              <div className="p-6">
                {response ? (
                  <div className="space-y-6">
                    {/* Status */}
                    <div>
                      <p className="text-xs font-medium text-zinc-500 uppercase tracking-wide mb-2">
                        Status
                      </p>
                      <p className="text-xl font-bold text-zinc-900">
                        {response.status} {response.statusText}
                      </p>
                    </div>

                    {/* Request Headers */}
                    {response.requestHeaders && Object.keys(response.requestHeaders).length > 0 && (
                      <div>
                        <p className="text-xs font-medium text-zinc-500 uppercase tracking-wide mb-2">
                          Request Headers
                        </p>
                        <pre className="bg-zinc-900 text-zinc-100 p-4 rounded-lg text-xs overflow-x-auto font-mono">
                          {JSON.stringify(response.requestHeaders, null, 2)}
                        </pre>
                      </div>
                    )}

                    {/* Response Headers */}
                    {response.responseHeaders && (
                      <div>
                        <p className="text-xs font-medium text-zinc-500 uppercase tracking-wide mb-2">
                          Response Headers
                        </p>
                        <pre className="bg-zinc-900 text-zinc-100 p-4 rounded-lg text-xs overflow-x-auto font-mono max-h-40">
                          {JSON.stringify(response.responseHeaders, null, 2)}
                        </pre>
                      </div>
                    )}

                    {/* Response Body */}
                    <div>
                      <p className="text-xs font-medium text-zinc-500 uppercase tracking-wide mb-2">
                        Response Body
                      </p>
                      <pre className="bg-zinc-900 text-zinc-100 p-4 rounded-lg text-xs overflow-x-auto font-mono">
                        {JSON.stringify(response.body || response.error, null, 2)}
                      </pre>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center py-16 text-center">
                    <Shield className="w-12 h-12 text-zinc-200 mb-4" />
                    <p className="text-zinc-400">
                      No response yet. Make a request to see the response here.
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
