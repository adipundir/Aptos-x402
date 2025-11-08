'use client';

import { useState, useEffect, useRef, useMemo, Fragment } from 'react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Send, Loader2, Wallet, AlertCircle, Zap, Bot, Clock, ArrowLeft } from 'lucide-react';
import { FundingModal } from './FundingModal';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { getUserIdHeaders } from '@/lib/utils/user-id';
import Link from 'next/link';
import { ChatInterfaceSkeleton } from './ChatInterfaceSkeleton';

interface ChatMessage {
  id: string;
  role: 'user' | 'agent';
  content: string;
  timestamp: string;
  metadata?: {
    apiCalled?: string;
    paymentHash?: string;
    paymentAmount?: string;
    error?: string;
    llmUsed?: string;
  };
}

interface ChatInterfaceProps {
  agentId: string;
  agentName: string;
  walletAddress: string;
  agentApiIds?: string[];
}

const AVAILABLE_LLMS = [
  // GitHub Models (less token consuming)
  { id: 'gpt-5-mini', name: 'GPT-5 Mini', enabled: true },
  { id: 'gpt-5-nano', name: 'GPT-5 Nano', enabled: true },
  { id: 'grok-3-mini', name: 'Grok 3 Mini', enabled: true },
  { id: 'gpt-4.1-mini', name: 'GPT-4.1 Mini', enabled: true },
  { id: 'gpt-4.1-nano', name: 'GPT-4.1 Nano', enabled: true },
  { id: 'phi-4-mini-reasoning', name: 'Phi-4 Mini Reasoning', enabled: true },
  { id: 'o4-mini', name: 'O4 Mini', enabled: true },
  // Gemini Models
  { id: 'gemini-2.5-flash', name: 'Gemini 2.5 Flash', enabled: true },
  // Other
  { id: 'claude-sonnet-4', name: 'Claude Sonnet 4', enabled: false },
  { id: 'keyword', name: 'Keyword Matching (No LLM)', enabled: true },
];

const formatDateHeading = (timestamp: string) => {
  const date = new Date(timestamp);
  if (Number.isNaN(date.getTime())) return 'Recent';
  const options: Intl.DateTimeFormatOptions = {
    month: 'long',
    day: 'numeric',
  };
  if (date.getFullYear() !== new Date().getFullYear()) {
    options.year = 'numeric';
  }
  return new Intl.DateTimeFormat('en-US', options).format(date);
};

const formatTimestamp = (timestamp: string) => {
  const date = new Date(timestamp);
  if (Number.isNaN(date.getTime())) return '';
  return new Intl.DateTimeFormat('en-US', {
    hour: 'numeric',
    minute: '2-digit',
  }).format(date);
};

const truncateAddress = (address: string | undefined) => {
  if (!address) return 'Not provisioned';
  if (address.length <= 12) return address;
  return `${address.slice(0, 6)}…${address.slice(-4)}`;
};

export function ChatInterface({ agentId, agentName, walletAddress, agentApiIds = [] }: ChatInterfaceProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [showFunding, setShowFunding] = useState(false);
  const [balance, setBalance] = useState<string>('0.00000000');
  const [selectedLLM, setSelectedLLM] = useState<string>('gemini-2.5-flash');
  const [selectedAPI, setSelectedAPI] = useState<string>('auto');
  const [availableApis, setAvailableApis] = useState<any[]>([]);
  const [walletInfo, setWalletInfo] = useState<{address: string; type: 'agent' | 'user'; isOwner: boolean}>({
    address: walletAddress,
    type: 'agent',
    isOwner: true,
  });
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const sortedMessages = useMemo(() => {
    return [...messages].sort(
      (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime(),
    );
  }, [messages]);

  useEffect(() => {
    const loadData = async () => {
      setInitialLoading(true);
      try {
        await Promise.all([
          fetchChat(),
          fetchBalance(),
          fetchApis(),
        ]);
      } finally {
        setInitialLoading(false);
      }
    };
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [agentId]);

  const fetchApis = async () => {
    try {
      const res = await fetch('/api/apis');
      const data = await res.json();
      // Filter APIs to only show those available to this agent
      const allApis = data.apis || [];
      const filteredApis = agentApiIds.length > 0
        ? allApis.filter((api: any) => agentApiIds.includes(api.id))
        : allApis;
      setAvailableApis(filteredApis);
    } catch (error) {
      console.error('Failed to fetch APIs:', error);
    }
  };

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    if (!inputRef.current) return;
    inputRef.current.style.height = 'auto';
    inputRef.current.style.height = `${Math.min(inputRef.current.scrollHeight, 160)}px`;
  }, [input]);

  const fetchChat = async () => {
    try {
      const res = await fetch(`/api/agents/${agentId}/chat`, {
        headers: getUserIdHeaders(),
      });
      const data = await res.json();
      if (data.chat?.messages) {
        setMessages(data.chat.messages);
      }
    } catch (error) {
      console.error('Failed to fetch chat:', error);
    }
  };

  const fetchBalance = async () => {
    try {
      const res = await fetch(`/api/agents/${agentId}/balance`, {
        headers: getUserIdHeaders(),
      });
      const data = await res.json();
      if (data.balanceAPT) {
        setBalance(data.balanceAPT);
      }
      // Update wallet info (which wallet is being used and who owns it)
      if (data.address && data.walletType && data.isOwner !== undefined) {
        setWalletInfo({
          address: data.address,
          type: data.walletType,
          isOwner: data.isOwner,
        });
      }
    } catch (error) {
      console.error('Failed to fetch balance:', error);
    }
  };

  const handleSend = async () => {
    if (!input.trim() || loading) return;

    // Check if selected LLM is enabled
    const selectedLLMConfig = AVAILABLE_LLMS.find(llm => llm.id === selectedLLM);
    if (selectedLLMConfig && !selectedLLMConfig.enabled) {
      alert('This LLM is not yet available. Please select an enabled LLM.');
      return;
    }

    const userMessage: ChatMessage = {
      id: `user_${Date.now()}`,
      role: 'user',
      content: input,
      timestamp: new Date().toISOString(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setLoading(true);

    try {
      const res = await fetch(`/api/agents/${agentId}/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...getUserIdHeaders(),
        },
        body: JSON.stringify({ 
          message: input,
          llm: selectedLLM,
          apiId: selectedAPI === 'auto' ? null : selectedAPI,
        }),
      });

      const data = await res.json();

      // Handle insufficient balance errors
      if (data.error && (
        data.error.includes('INSUFFICIENT_BALANCE') || 
        data.error.includes('INSUFFICIENT_FUNDS') ||
        data.error.includes('insufficient')
      )) {
        setShowFunding(true);
        // Refresh balance to show current state
        fetchBalance();
        // Add error message to chat
        const errorMessage: ChatMessage = {
          id: `error_${Date.now()}`,
          role: 'agent',
          content: data.message || 'Insufficient balance. Please fund your wallet.',
          timestamp: new Date().toISOString(),
          metadata: { error: data.error },
        };
        setMessages(prev => [...prev, errorMessage]);
        return;
      }

      // Handle successful response - add agent message directly from response
      if (data.success && data.message) {
        const agentMessage: ChatMessage = {
          id: `agent_${Date.now()}`,
          role: 'agent',
          content: data.message,
          timestamp: new Date().toISOString(),
          metadata: {
            apiCalled: data.apiCalled,
            paymentHash: data.paymentHash,
            paymentAmount: data.paymentAmount,
            llmUsed: data.llmUsed,
          },
        };
        setMessages(prev => [...prev, agentMessage]);
      } else if (data.chat?.messages) {
        // Fallback: if chat history is returned, use it
        setMessages(data.chat.messages);
      } else if (data.message) {
        // Handle error messages
        const errorMessage: ChatMessage = {
          id: `error_${Date.now()}`,
          role: 'agent',
          content: data.message,
          timestamp: new Date().toISOString(),
          metadata: { error: data.error },
        };
        setMessages(prev => [...prev, errorMessage]);
      }

      // Refresh balance after API call
      fetchBalance();
    } catch (error) {
      console.error('Failed to send message:', error);
      const errorMessage: ChatMessage = {
        id: `error_${Date.now()}`,
        role: 'agent',
        content: 'Sorry, I encountered an error. Please try again.',
        timestamp: new Date().toISOString(),
        metadata: { error: 'NETWORK_ERROR' },
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setLoading(false);
    }
  };

  // Show skeleton while initial data is loading
  if (initialLoading) {
    return <ChatInterfaceSkeleton />;
  }

  const walletLabel = walletInfo.isOwner ? 'Primary Agent Wallet' : 'Delegated Wallet';
  const walletDisplay = truncateAddress(walletInfo.address);

  return (
    <>
  <div className="grid h-full min-h-0 grid-cols-1 overflow-hidden bg-zinc-50 lg:grid-cols-[240px_minmax(0,1fr)]">
        <aside className="hidden flex-col overflow-y-auto border-r border-zinc-200 bg-white px-3 py-3 lg:flex">
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <div className="relative flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl bg-zinc-900 text-sm font-semibold text-white">
                {agentName.charAt(0).toUpperCase()}
                <span className="absolute -bottom-0.5 -right-0.5 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-emerald-500 text-[7px] font-semibold uppercase tracking-wide text-white">
                  AI
                </span>
              </div>
              <div className="min-w-0 flex-1">
                <h2 className="truncate text-xs font-semibold leading-tight text-zinc-900">{agentName}</h2>
                <p className="text-[10px] text-zinc-500">Operational</p>
              </div>
            </div>

            <Badge className="inline-flex items-center gap-1 rounded-full border border-emerald-100 bg-emerald-50 px-2 py-0.5 text-[8px] font-medium uppercase tracking-wide text-emerald-600">
              <span className="relative flex h-1.5 w-1.5">
                <span className="absolute inset-0 rounded-full bg-emerald-400" />
              </span>
              Live
            </Badge>

            <div className="space-y-2.5 text-sm">
              <div className="space-y-1 rounded-lg border border-zinc-200 bg-zinc-50 px-2.5 py-2">
                <span className="text-[8px] font-semibold uppercase tracking-wide text-zinc-400">Balance</span>
                <div className="flex items-center gap-1 text-xs font-medium text-zinc-900">
                  <Wallet className="h-3 w-3" />
                  {balance} APT
                </div>
              </div>
              <div className="space-y-1 rounded-lg border border-zinc-200 bg-white px-2.5 py-2">
                <span className="text-[8px] font-semibold uppercase tracking-wide text-zinc-400">{walletLabel}</span>
                <div className="truncate text-[11px] text-zinc-700" title={walletInfo.address}>
                  {walletDisplay}
                </div>
              </div>
              <Button
                type="button"
                size="sm"
                onClick={() => setShowFunding(true)}
                className="w-full justify-center rounded-lg bg-zinc-900 py-1.5 text-[11px] font-medium text-white transition hover:bg-zinc-800"
              >
                <Wallet className="h-3 w-3" />
                Fund
              </Button>
            </div>

            <div className="space-y-2.5 text-sm">
              <div className="space-y-1">
                <span className="text-[8px] font-semibold uppercase tracking-wide text-zinc-400">Model</span>
                <div className="flex items-center gap-1.5 rounded-lg border border-zinc-200 bg-zinc-50 px-2 py-1.5">
                  <Bot className="h-3 w-3 text-zinc-500" />
                  <Select value={selectedLLM} onValueChange={setSelectedLLM}>
                    <SelectTrigger className="h-6 w-full border-0 bg-transparent px-0 text-[11px] font-medium text-zinc-900 placeholder:text-zinc-400 focus:ring-0 focus:ring-offset-0">
                      <SelectValue placeholder="Select" />
                    </SelectTrigger>
                    <SelectContent className="border border-zinc-200 bg-white">
                      {AVAILABLE_LLMS.map(llm => (
                        <SelectItem
                          key={llm.id}
                          value={llm.id}
                          disabled={!llm.enabled}
                          className={`text-xs text-zinc-900 ${!llm.enabled ? 'cursor-not-allowed opacity-50' : ''}`}
                        >
                          {llm.name}
                          {!llm.enabled && ' (Soon)'}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-1">
                <span className="text-[8px] font-semibold uppercase tracking-wide text-zinc-400">API</span>
                <div className="flex items-center gap-1.5 rounded-lg border border-zinc-200 bg-zinc-50 px-2 py-1.5">
                  <Zap className="h-3 w-3 text-zinc-500" />
                  <Select value={selectedAPI} onValueChange={setSelectedAPI}>
                    <SelectTrigger className="h-6 w-full border-0 bg-transparent px-0 text-[11px] font-medium text-zinc-900 placeholder:text-zinc-400 focus:ring-0 focus:ring-offset-0">
                      <SelectValue placeholder="Select" />
                    </SelectTrigger>
                    <SelectContent className="border border-zinc-200 bg-white">
                      <SelectItem value="auto" className="text-xs text-zinc-900">
                        Auto
                      </SelectItem>
                      {availableApis.map(api => (
                        <SelectItem key={api.id} value={api.id} className="text-xs text-zinc-900">
                          {api.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          </div>
        </aside>

          <section className="flex h-full min-h-0 flex-col overflow-hidden bg-white">
            <div className="flex flex-shrink-0 items-center justify-between border-b border-zinc-200 px-4 py-2.5">
              <div className="flex items-center gap-3">
                <Link href="/composer">
                  <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900">
                    <ArrowLeft className="h-4 w-4" />
                  </Button>
                </Link>
                <div>
                  <h2 className="text-sm font-semibold text-zinc-900">Conversation</h2>
                  <p className="text-xs text-zinc-500">Direct exchange with {agentName}</p>
                </div>
              </div>
              <Badge className="rounded-full border border-zinc-200 bg-zinc-50 px-3 py-1 text-[10px] font-medium uppercase tracking-wide text-zinc-600">
                Live Session
              </Badge>
            </div>

            <div className="flex-1 min-h-0 overflow-hidden bg-zinc-50">
              <ScrollArea className="h-full w-full">
              <div className="mx-auto w-full max-w-4xl px-4 py-4 sm:px-8 sm:py-6">
                  {sortedMessages.length === 0 ? (
                    <div className="flex flex-col items-center justify-center rounded-3xl border border-dashed border-zinc-200 bg-zinc-50 px-6 py-16 text-center">
                      <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-white text-zinc-400">
                        <Bot className="h-8 w-8" />
                      </div>
                      <h4 className="mb-2 text-lg font-semibold text-zinc-900">Chat with {agentName}</h4>
                      <p className="text-sm text-zinc-500">
                        Ask for data, trigger workflows, or connect external APIs. Your agent orchestrates the right tools automatically.
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {(() => {
                        let previousDateLabel: string | null = null;
                        return sortedMessages.map(message => {
                          const dateLabel = formatDateHeading(message.timestamp);
                          const showDateSeparator = dateLabel && dateLabel !== previousDateLabel;
                          previousDateLabel = dateLabel;
                          const isUser = message.role === 'user';

                          return (
                            <Fragment key={message.id}>
                              {showDateSeparator && (
                                <div className="flex items-center gap-3 text-[10px] font-semibold uppercase tracking-[0.2em] text-zinc-400">
                                  <span className="h-px flex-1 bg-zinc-200/70" />
                                  <span>{dateLabel}</span>
                                  <span className="h-px flex-1 bg-zinc-200/70" />
                                </div>
                              )}
                              <div className="group">
                                {isUser ? (
                                  <div className="flex justify-end gap-3 sm:gap-4">
                                    <div className="flex max-w-[80%] flex-col items-end gap-1 sm:max-w-[60%]">
                                      <div className="rounded-3xl bg-zinc-900 px-5 py-3 text-sm text-white shadow-sm">
                                        <p className="whitespace-pre-wrap leading-relaxed">{message.content}</p>
                                      </div>
                                      <div className="flex items-center gap-1 text-[10px] text-zinc-400">
                                        <Clock className="h-3 w-3" />
                                        <span>{formatTimestamp(message.timestamp)}</span>
                                      </div>
                                    </div>
                                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-zinc-900 text-[11px] font-semibold text-white">
                                      U
                                    </div>
                                  </div>
                                ) : (
                                  <div className="flex gap-3 sm:gap-4">
                                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-zinc-100 text-zinc-600">
                                      <Bot className="h-4 w-4" />
                                    </div>
                                    <div className="max-w-[85%] flex-1 space-y-2.5 sm:max-w-[70%]">
                                      {(message.metadata?.llmUsed || message.metadata?.apiCalled) && (
                                        <div className="flex flex-wrap items-center gap-1.5">
                                          {message.metadata?.llmUsed && (
                                            <span className="inline-flex items-center gap-1 rounded-full bg-zinc-100 px-2.5 py-1 text-[10px] font-medium text-zinc-600">
                                              <Bot className="h-3 w-3" />
                                              {message.metadata.llmUsed}
                                            </span>
                                          )}
                                          {message.metadata?.apiCalled && (
                                            <span className="inline-flex items-center gap-1 rounded-full bg-zinc-100 px-2.5 py-1 text-[10px] font-medium text-zinc-600">
                                              <Zap className="h-3 w-3" />
                                              {message.metadata.apiCalled}
                                            </span>
                                          )}
                                        </div>
                                      )}
                                      <div className="rounded-3xl border border-zinc-200 bg-white px-4 py-3 text-sm text-zinc-900 shadow-sm">
                                        <p className="whitespace-pre-wrap leading-relaxed">{message.content}</p>
                                      </div>
                                      {message.metadata?.error && (
                                        <div className="flex items-center gap-2 rounded-lg border border-red-100 bg-red-50 px-3 py-2 text-[11px] text-red-600">
                                          <AlertCircle className="h-4 w-4" />
                                          <span>{message.metadata.error}</span>
                                        </div>
                                      )}
                                      {message.metadata?.paymentHash && (() => {
                                        const network = process.env.NEXT_PUBLIC_APTOS_NETWORK || 'aptos-testnet';
                                        const explorerNetwork = network.replace('aptos-', '');
                                        const explorerUrl = `https://explorer.aptoslabs.com/txn/${message.metadata.paymentHash}?network=${explorerNetwork}`;
                                        return (
                                          <a
                                            href={explorerUrl}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="inline-flex items-center gap-2 rounded-lg border border-emerald-100 bg-emerald-50 px-3 py-1.5 text-[11px] font-medium text-emerald-600 transition-colors hover:bg-emerald-100 hover:border-emerald-200 cursor-pointer"
                                          >
                                            <Wallet className="h-4 w-4" />
                                            <span>Txn {message.metadata.paymentHash.slice(0, 12)}…</span>
                                          </a>
                                        );
                                      })()}
                                      <div className="flex items-center gap-1 text-[10px] text-zinc-500">
                                        <Clock className="h-3 w-3" />
                                        <span>{formatTimestamp(message.timestamp)}</span>
                                      </div>
                                    </div>
                                  </div>
                                )}
                              </div>
                            </Fragment>
                          );
                        });
                      })()}
                      {loading && (
                        <div className="flex gap-3 sm:gap-4">
                          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-zinc-100 text-zinc-600">
                            <Bot className="h-4 w-4" />
                          </div>
                          <div className="flex-1 pt-1 sm:pt-2">
                            <div className="flex items-center gap-2 rounded-xl border border-zinc-200 bg-white px-4 py-3 text-sm text-zinc-500">
                              <Loader2 className="h-4 w-4 animate-spin" />
                              Thinking…
                            </div>
                          </div>
                        </div>
                      )}
                      <div ref={messagesEndRef} />
                    </div>
                  )}
                </div>
              </ScrollArea>
            </div>

            <div className="flex-shrink-0 border-t border-zinc-200 bg-white px-4 py-3">
            <div className="mx-auto w-full max-w-4xl">
              <form
                onSubmit={(event) => {
                  event.preventDefault();
                  handleSend();
                }}
              >
                <div className="relative flex items-end gap-2 rounded-2xl border border-zinc-200 bg-white px-3 py-2 focus-within:border-zinc-300">
                  <textarea
                    ref={inputRef}
                    rows={1}
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        handleSend();
                      }
                    }}
                    placeholder="Send a message or use Shift+Enter for a new line"
                    disabled={loading}
                    className="w-full resize-none border-0 bg-transparent px-1 py-1.5 text-sm leading-relaxed text-zinc-900 placeholder:text-zinc-400 focus:outline-none sm:text-[15px]"
                  />
                  <Button
                    type="submit"
                    disabled={!input.trim() || loading}
                    size="icon"
                    className="mb-0.5 flex h-8 w-8 items-center justify-center rounded-lg bg-zinc-900 text-white transition hover:bg-zinc-800"
                  >
                    {loading ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Send className="h-3.5 w-3.5" />
                    )}
                  </Button>
                </div>
              </form>
              <p className="mt-1.5 text-center text-[10px] text-zinc-500">
                Powered by x402 · Messages may incur blockchain transaction costs
              </p>
            </div>
            </div>
        </section>
      </div>

      {showFunding && (
        <FundingModal
          agentId={agentId}
          walletAddress={walletInfo.address}
          walletType={walletInfo.type}
          isOwner={walletInfo.isOwner}
          onClose={() => {
            setShowFunding(false);
            fetchBalance();
          }}
        />
      )}
    </>
  );
}

