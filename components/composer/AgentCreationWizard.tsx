'use client';

import { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ApiSelector } from './ApiSelector';
import { Loader2, ArrowLeft, ArrowRight, Check } from 'lucide-react';
import { useRouter } from 'next/navigation';

type Step = 1 | 2 | 3;

interface AgentFormData {
  name: string;
  description: string;
  imageUrl: string;
  visibility: 'public' | 'private';
  apiIds: string[];
}

export function AgentCreationWizard() {
  const router = useRouter();
  const [step, setStep] = useState<Step>(1);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState<AgentFormData>({
    name: '',
    description: '',
    imageUrl: '',
    visibility: 'private',
    apiIds: [],
  });

  const handleNext = () => {
    if (step === 1) {
      if (!formData.name.trim()) {
        alert('Please enter an agent name');
        return;
      }
    }
    if (step === 2) {
      if (formData.apiIds.length === 0) {
        alert('Please select at least one API');
        return;
      }
    }
    if (step < 3) {
      setStep((step + 1) as Step);
    }
  };

  const handleBack = () => {
    if (step > 1) {
      setStep((step - 1) as Step);
    } else {
      router.push('/composer');
    }
  };

  const handleCreate = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/agents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Failed to create agent');
      }

      const data = await res.json();
      router.push(`/composer/${data.agent.id}`);
    } catch (error: any) {
      alert(`Failed to create agent: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto">
      {/* Progress Indicator */}
      <div className="flex items-center justify-center gap-4 mb-8">
        <div className={`flex items-center gap-2 ${step >= 1 ? 'text-blue-600' : 'text-zinc-400'}`}>
          <div className={`w-8 h-8 rounded-full flex items-center justify-center border-2 ${
            step >= 1 ? 'border-blue-600 bg-blue-50' : 'border-zinc-300'
          }`}>
            {step > 1 ? <Check className="w-4 h-4" /> : '1'}
          </div>
          <span className="text-sm font-medium">Display</span>
        </div>
        <div className={`w-16 h-0.5 ${step >= 2 ? 'bg-blue-600' : 'bg-zinc-300'}`} />
        <div className={`flex items-center gap-2 ${step >= 2 ? 'text-blue-600' : 'text-zinc-400'}`}>
          <div className={`w-8 h-8 rounded-full flex items-center justify-center border-2 ${
            step >= 2 ? 'border-blue-600 bg-blue-50' : 'border-zinc-300'
          }`}>
            {step > 2 ? <Check className="w-4 h-4" /> : '2'}
          </div>
          <span className="text-sm font-medium">Tools</span>
        </div>
        <div className={`w-16 h-0.5 ${step >= 3 ? 'bg-blue-600' : 'bg-zinc-300'}`} />
        <div className={`flex items-center gap-2 ${step >= 3 ? 'text-blue-600' : 'text-zinc-400'}`}>
          <div className={`w-8 h-8 rounded-full flex items-center justify-center border-2 ${
            step >= 3 ? 'border-blue-600 bg-blue-50' : 'border-zinc-300'
          }`}>
            3
          </div>
          <span className="text-sm font-medium">Review</span>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>
            {step === 1 && 'Display Your Agent'}
            {step === 2 && 'Add Tools'}
            {step === 3 && 'Review & Create'}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {/* Step 1: Display Settings */}
          {step === 1 && (
            <div className="space-y-6">
              <p className="text-sm text-zinc-600">
                Choose how your agent will be displayed to you and others.
              </p>
              
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-zinc-700 mb-2 block">
                    Name (optional)
                  </label>
                  <Input
                    placeholder="Ex. Deep Research Agent"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  />
                </div>

                <div>
                  <label className="text-sm font-medium text-zinc-700 mb-2 block">
                    Description (optional)
                  </label>
                  <textarea
                    className="w-full min-h-[100px] rounded-md border border-input bg-transparent px-3 py-2 text-sm"
                    placeholder="Ex. A deep research agent with emailing capabilities"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  />
                </div>

                <div>
                  <label className="text-sm font-medium text-zinc-700 mb-2 block">
                    Image URL (optional)
                  </label>
                  <Input
                    placeholder="https://example.com/image.png"
                    value={formData.imageUrl}
                    onChange={(e) => setFormData({ ...formData, imageUrl: e.target.value })}
                  />
                </div>

                <div>
                  <label className="text-sm font-medium text-zinc-700 mb-4 block">
                    Visibility
                  </label>
                  <div className="space-y-3">
                    <label className="flex items-start gap-3 cursor-pointer">
                      <input
                        type="radio"
                        name="visibility"
                        value="public"
                        checked={formData.visibility === 'public'}
                        onChange={() => setFormData({ ...formData, visibility: 'public' })}
                        className="mt-1"
                      />
                      <div>
                        <div className="font-medium">Public</div>
                        <div className="text-sm text-zinc-600">
                          Your agent will be discoverable by other users.
                        </div>
                      </div>
                    </label>
                    <label className="flex items-start gap-3 cursor-pointer">
                      <input
                        type="radio"
                        name="visibility"
                        value="private"
                        checked={formData.visibility === 'private'}
                        onChange={() => setFormData({ ...formData, visibility: 'private' })}
                        className="mt-1"
                      />
                      <div>
                        <div className="font-medium">Private</div>
                        <div className="text-sm text-zinc-600">
                          Your agent will only be accessible to you.
                        </div>
                      </div>
                    </label>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Step 2: API Selection */}
          {step === 2 && (
            <div className="space-y-4">
              <p className="text-sm text-zinc-600">
                Select which x402 resources you want your agent to have access to.
              </p>
              <ApiSelector
                selectedApiIds={formData.apiIds}
                onSelectionChange={(apiIds) => setFormData({ ...formData, apiIds })}
              />
            </div>
          )}

          {/* Step 3: Review */}
          {step === 3 && (
            <div className="space-y-6">
              <div>
                <h3 className="font-semibold mb-2">Agent Details</h3>
                <div className="space-y-2 text-sm">
                  <div><strong>Name:</strong> {formData.name || 'Unnamed'}</div>
                  {formData.description && (
                    <div><strong>Description:</strong> {formData.description}</div>
                  )}
                  <div><strong>Visibility:</strong> <Badge>{formData.visibility}</Badge></div>
                  <div><strong>APIs:</strong> {formData.apiIds.length} selected</div>
                </div>
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <p className="text-sm text-blue-900">
                  A new Aptos wallet will be generated for this agent. You'll need to fund it with APT (testnet) 
                  before the agent can make API calls.
                </p>
              </div>
            </div>
          )}
        </CardContent>
        <CardFooter className="flex justify-between">
          <Button onClick={handleBack}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>
          {step < 3 ? (
            <Button onClick={handleNext}>
              Next
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          ) : (
            <Button onClick={handleCreate} disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Creating...
                </>
              ) : (
                <>
                  Create Agent
                  <Check className="w-4 h-4 ml-2" />
                </>
              )}
            </Button>
          )}
        </CardFooter>
      </Card>
    </div>
  );
}


