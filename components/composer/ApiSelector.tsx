'use client';

import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Check, Search } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';

interface ApiMetadata {
  id: string;
  url: string;
  name: string;
  description: string;
  category: string;
  cost: string;
  method: string;
}

interface ApiSelectorProps {
  selectedApiIds: string[];
  onSelectionChange: (apiIds: string[]) => void;
}

export function ApiSelector({ selectedApiIds, onSelectionChange }: ApiSelectorProps) {
  const [apis, setApis] = useState<ApiMetadata[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/apis')
      .then(res => res.json())
      .then(data => {
        setApis(data.apis || []);
        setLoading(false);
      })
      .catch(err => {
        console.error('Failed to fetch APIs:', err);
        setLoading(false);
      });
  }, []);

  const categories = Array.from(new Set(apis.map(api => api.category)));

  const filteredApis = apis.filter(api => {
    const matchesSearch = !searchQuery || 
      api.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      api.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = !selectedCategory || api.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const toggleApi = (apiId: string) => {
    if (selectedApiIds.includes(apiId)) {
      onSelectionChange(selectedApiIds.filter(id => id !== apiId));
    } else {
      onSelectionChange([...selectedApiIds, apiId]);
    }
  };

  const selectAll = () => {
    // Select all currently visible/filtered APIs
    const filteredIds = filteredApis.map(api => api.id);
    const newSelection = [...new Set([...selectedApiIds, ...filteredIds])];
    onSelectionChange(newSelection);
  };

  const clearAll = () => {
    onSelectionChange([]);
  };

  const allFilteredSelected = filteredApis.length > 0 && 
    filteredApis.every(api => selectedApiIds.includes(api.id));

  const formatCost = (cost: string) => {
    const costNum = BigInt(cost);
    const apt = Number(costNum) / 100_000_000;
    if (apt < 0.000001) {
      return '< $0.01';
    }
    return `$${apt.toFixed(4)}`;
  };

  if (loading) {
    return <div className="text-center py-8 text-zinc-600">Loading APIs...</div>;
  }

  return (
    <div className="space-y-4">
      {/* Search and Quick Actions */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-zinc-400 w-4 h-4" />
          <Input
            placeholder="Search tools..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={selectAll}
            disabled={allFilteredSelected || filteredApis.length === 0}
            className="text-xs whitespace-nowrap border-zinc-300 text-zinc-700 hover:bg-zinc-50 hover:text-zinc-900 disabled:opacity-50"
          >
            Select All {filteredApis.length > 0 && `(${filteredApis.length})`}
          </Button>
          {selectedApiIds.length > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={clearAll}
              className="text-xs text-zinc-600 hover:text-zinc-900 hover:bg-zinc-100"
            >
              Clear
            </Button>
          )}
        </div>
      </div>

      {/* Categories */}
      <div className="flex flex-wrap gap-2">
        <Button
          variant={selectedCategory === null ? 'default' : 'ghost'}
          size="sm"
          onClick={() => setSelectedCategory(null)}
          className={`text-xs sm:text-sm ${selectedCategory === null ? 'bg-zinc-900 hover:bg-zinc-800 text-white' : 'text-zinc-700 hover:bg-zinc-100'}`}
        >
          All
        </Button>
        {categories.map(category => (
          <Button
            key={category}
            variant={selectedCategory === category ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setSelectedCategory(category)}
            className={`text-xs sm:text-sm ${selectedCategory === category ? 'bg-zinc-900 hover:bg-zinc-800 text-white' : 'text-zinc-700 hover:bg-zinc-100'}`}
          >
            {category}
          </Button>
        ))}
      </div>

      {/* API List */}
      <ScrollArea className="h-[400px] sm:h-[500px]">
        <div className="space-y-3 sm:space-y-4 pr-2 sm:pr-4">
          {filteredApis.length === 0 ? (
            <div className="text-center py-12 text-zinc-500 text-sm sm:text-base">
              No APIs found matching your search.
            </div>
          ) : (
            filteredApis.map(api => {
              const isSelected = selectedApiIds.includes(api.id);
              return (
                <Card
                  key={api.id}
                  className={`p-4 sm:p-6 cursor-pointer transition-all hover:shadow-lg border-2 ${
                    isSelected 
                      ? 'border-zinc-900 bg-zinc-50' 
                      : 'border-zinc-200 hover:border-zinc-300'
                  }`}
                  onClick={() => toggleApi(api.id)}
                >
                  <div className="flex items-start gap-3 sm:gap-4">
                    <div className={`w-5 h-5 sm:w-6 sm:h-6 rounded border-2 flex items-center justify-center flex-shrink-0 mt-0.5 sm:mt-1 ${
                      isSelected ? 'bg-zinc-900 border-zinc-900' : 'border-zinc-300'
                    }`}>
                      {isSelected && <Check className="w-3 h-3 sm:w-4 sm:h-4 text-white" />}
                    </div>
                    <div className="flex-1 min-w-0 space-y-2 sm:space-y-3">
                      <div>
                        <h4 className="text-base sm:text-lg font-semibold text-zinc-900 mb-1 sm:mb-2">{api.name}</h4>
                        <p className="text-xs sm:text-sm text-zinc-600 leading-relaxed">{api.description}</p>
                      </div>
                      
                      <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
                        <Badge variant="outline" className="text-[10px] sm:text-xs px-1.5 sm:px-2 py-0.5 sm:py-1 border-zinc-300">
                          {api.method}
                        </Badge>
                        <Badge variant="outline" className="text-[10px] sm:text-xs px-1.5 sm:px-2 py-0.5 sm:py-1 border-zinc-300">
                          {api.category}
                        </Badge>
                        <span className="text-xs sm:text-sm font-medium text-zinc-700">
                          {formatCost(api.cost)}
                        </span>
                      </div>
                      
                      <div className="pt-2 border-t border-zinc-200">
                        <p className="text-[10px] sm:text-xs text-zinc-500 font-mono break-all">
                          {api.url}
                        </p>
                      </div>
                    </div>
                  </div>
                </Card>
              );
            })
          )}
        </div>
      </ScrollArea>

      {/* Selection Summary */}
      {selectedApiIds.length > 0 && (
        <div className="pt-4 border-t border-zinc-200">
          <p className="text-sm text-zinc-600">
            {selectedApiIds.length} API{selectedApiIds.length !== 1 ? 's' : ''} selected
          </p>
        </div>
      )}
    </div>
  );
}


