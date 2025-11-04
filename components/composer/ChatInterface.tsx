'use client';

import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Send, Loader2, Wallet, AlertCircle, Zap, Bot } from 'lucide-react';
import { FundingModal } from './FundingModal';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { getUserIdHeaders } from '@/lib/utils/user-id';
import { ChatInterfaceSkeleton } from './ChatInterfaceSkeleton';

interface ChatMessage {
  id: string;
  role: 'user' | 'agent';
  content: string;
  timestamp: string;
  metadata?: {
    apiCalled?: string;
    paymentHash?: string;
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
  { id: 'gemini-2.5-flash', name: 'Gemini 2.5 Flash', enabled: true },
  { id: 'gemini-1.5-pro', name: 'Gemini 1.5 Pro', enabled: true },
  { id: 'gemini-1.5-flash', name: 'Gemini 1.5 Flash', enabled: true },
  { id: 'claude-sonnet-4', name: 'Claude Sonnet 4', enabled: false },
  { id: 'gpt-5', name: 'GPT-5', enabled: false },
  { id: 'keyword', name: 'Keyword Matching (No LLM)', enabled: true },
];

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

  return (
    <>
      <div className="flex flex-col h-[calc(100vh-120px)] sm:h-[calc(100vh-200px)] bg-white rounded-lg border border-zinc-200 shadow-sm">
        {/* Header - Sticky */}
        <div className="border-b border-zinc-200 px-4 sm:px-6 py-3 sm:py-4 bg-white rounded-t-lg flex-shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
              <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-zinc-900 flex items-center justify-center text-white text-sm sm:text-base font-semibold flex-shrink-0">
                {agentName.charAt(0).toUpperCase()}
              </div>
              <div className="min-w-0 flex-1">
                <h3 className="font-semibold text-sm sm:text-base text-zinc-900 truncate">{agentName}</h3>
                <div className="flex items-center gap-2 text-xs text-zinc-500">
                  <Wallet className="w-3 h-3" />
                  <span>{balance} APT</span>
                </div>
              </div>
            </div>
            <Button
              size="sm"
              onClick={() => setShowFunding(true)}
              className="bg-zinc-900 hover:bg-zinc-800 text-white flex-shrink-0"
            >
              <Wallet className="w-4 h-4 sm:mr-2" />
              <span className="hidden sm:inline">Fund</span>
            </Button>
          </div>
        </div>

        {/* Settings Bar */}
        <div className="border-b border-zinc-100 px-4 sm:px-6 py-2 sm:py-3 bg-zinc-50 flex-shrink-0 overflow-x-auto">
          <div className="flex items-center gap-3 sm:gap-4 min-w-max">
            <div className="flex items-center gap-2">
              <Bot className="w-4 h-4 text-zinc-600 flex-shrink-0" />
              <Select value={selectedLLM} onValueChange={setSelectedLLM}>
                <SelectTrigger className="h-8 sm:h-9 w-[160px] sm:w-[200px] bg-white border-zinc-300 text-zinc-900 text-xs sm:text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-white">
                  {AVAILABLE_LLMS.map(llm => (
                    <SelectItem 
                      key={llm.id} 
                      value={llm.id}
                      disabled={!llm.enabled}
                      className={`text-zinc-900 text-xs sm:text-sm ${!llm.enabled ? 'opacity-50 cursor-not-allowed' : ''}`}
                    >
                      {llm.name}
                      {!llm.enabled && ' (Coming Soon)'}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="flex items-center gap-2">
              <Zap className="w-4 h-4 text-zinc-600 flex-shrink-0" />
              <Select value={selectedAPI} onValueChange={setSelectedAPI}>
                <SelectTrigger className="h-8 sm:h-9 w-[140px] sm:w-[180px] bg-white border-zinc-300 text-zinc-900 text-xs sm:text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-white">
                  <SelectItem value="auto" className="text-zinc-900 text-xs sm:text-sm">Auto Select</SelectItem>
                  {availableApis.map(api => (
                    <SelectItem key={api.id} value={api.id} className="text-zinc-900 text-xs sm:text-sm">
                      {api.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        {/* Messages Area */}
        <div className="flex-1 overflow-hidden bg-white">
          <ScrollArea className="h-full">
            <div className="max-w-3xl mx-auto px-4 sm:px-6 py-4 sm:py-8">
              {messages.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 sm:py-16 text-center px-4">
                  <div className="w-12 h-12 sm:w-16 sm:h-16 rounded-full bg-zinc-100 flex items-center justify-center mb-4">
                    <Bot className="w-6 h-6 sm:w-8 sm:h-8 text-zinc-400" />
                  </div>
                  <h4 className="text-base sm:text-lg font-semibold text-zinc-900 mb-2">
                    Chat with {agentName}
                  </h4>
                  <p className="text-xs sm:text-sm text-zinc-500 max-w-md">
                    Start a conversation by asking questions or requesting information. 
                    Your agent can access various APIs to help you.
                  </p>
                </div>
              ) : (
                <div className="space-y-4 sm:space-y-6">
                  {[...messages].sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()).map((message) => (
                    <div key={message.id} className="group">
                      {message.role === 'user' ? (
                        /* User Message - Right Aligned */
                        <div className="flex gap-2 sm:gap-4 justify-end">
                          <div className="flex-1 max-w-[85%] sm:max-w-[70%] pt-1">
                            <div className="bg-zinc-900 text-white rounded-2xl px-3 sm:px-5 py-2 sm:py-3 ml-auto">
                              <p className="text-sm sm:text-[15px] leading-relaxed whitespace-pre-wrap">
                                {message.content}
                              </p>
                            </div>
                          </div>
                          <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-zinc-900 flex items-center justify-center text-white text-xs sm:text-sm font-semibold flex-shrink-0">
                            U
                          </div>
                        </div>
                      ) : (
                        /* Agent Message */
                        <div className="flex gap-2 sm:gap-4">
                          <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-gradient-to-br from-zinc-700 to-zinc-900 flex items-center justify-center text-white flex-shrink-0">
                            <Bot className="w-3 h-3 sm:w-4 sm:h-4" />
                          </div>
                          <div className="flex-1 space-y-2 sm:space-y-3">
                            {/* Metadata Badges */}
                            {(message.metadata?.llmUsed || message.metadata?.apiCalled) && (
                              <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
                                {message.metadata?.llmUsed && (
                                  <Badge variant="outline" className="text-[10px] sm:text-xs bg-zinc-50 border-zinc-300 px-1.5 sm:px-2 py-0.5">
                                    <Bot className="w-2.5 h-2.5 sm:w-3 sm:h-3 mr-0.5 sm:mr-1 text-zinc-600" />
                                    <span className="text-zinc-700">{message.metadata.llmUsed}</span>
                                  </Badge>
                                )}
                                {message.metadata?.apiCalled && (
                                  <Badge variant="outline" className="text-[10px] sm:text-xs bg-zinc-50 border-zinc-300 px-1.5 sm:px-2 py-0.5">
                                    <Zap className="w-2.5 h-2.5 sm:w-3 sm:h-3 mr-0.5 sm:mr-1 text-zinc-600" />
                                    <span className="text-zinc-700">{message.metadata.apiCalled}</span>
                                  </Badge>
                                )}
                              </div>
                            )}
                            {/* Message Content */}
                            <div className="prose prose-sm max-w-none">
                              <p className="text-zinc-900 text-sm sm:text-[15px] leading-relaxed whitespace-pre-wrap m-0">
                                {message.content}
                              </p>
                            </div>
                            {/* Error or Payment Info */}
                            {message.metadata?.error && (
                              <div className="flex items-center gap-2 text-xs text-red-600 bg-red-50 px-2 sm:px-3 py-1.5 sm:py-2 rounded-md">
                                <AlertCircle className="w-3 h-3" />
                                <span>{message.metadata.error}</span>
                              </div>
                            )}
                            {message.metadata?.paymentHash && (
                              <div className="text-xs text-zinc-500">
                                Payment: {message.metadata.paymentHash.slice(0, 8)}...
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                  {loading && (
                    <div className="flex gap-2 sm:gap-4">
                      <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-gradient-to-br from-zinc-700 to-zinc-900 flex items-center justify-center text-white flex-shrink-0">
                        <Bot className="w-3 h-3 sm:w-4 sm:h-4" />
                      </div>
                      <div className="flex-1 pt-1 sm:pt-2">
                        <div className="flex items-center gap-2 text-zinc-500">
                          <Loader2 className="w-3 h-3 sm:w-4 sm:h-4 animate-spin" />
                          <span className="text-xs sm:text-sm">Thinking...</span>
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

        {/* Input Area - Sticky Bottom */}
        <div className="border-t border-zinc-200 px-4 sm:px-6 py-3 sm:py-4 bg-white rounded-b-lg flex-shrink-0">
          <div className="max-w-3xl mx-auto">
            <div className="relative flex items-center gap-2">
              <div className="relative flex-1">
                <Input
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && !e.shiftKey && handleSend()}
                  placeholder="Message..."
                  disabled={loading}
                  className="pr-10 sm:pr-12 py-4 sm:py-6 text-sm sm:text-[15px] text-zinc-900 placeholder:text-zinc-400 border-zinc-300 focus:border-zinc-400 rounded-xl resize-none bg-white"
                />
                <Button
                  onClick={handleSend}
                  disabled={!input.trim() || loading}
                  size="icon"
                  className="absolute right-2 top-1/2 -translate-y-1/2 bg-zinc-900 hover:bg-zinc-800 text-white rounded-lg h-7 w-7 sm:h-8 sm:w-8"
                >
                  {loading ? (
                    <Loader2 className="w-3.5 h-3.5 sm:w-4 sm:h-4 animate-spin" />
                  ) : (
                    <Send className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                  )}
                </Button>
              </div>
            </div>
            <p className="text-[10px] sm:text-xs text-zinc-500 text-center mt-1.5 sm:mt-2 px-2">
              Powered by x402 • Messages may incur blockchain transaction costs
            </p>
          </div>
        </div>
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

