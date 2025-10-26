'use client';

import { useState, useEffect, useMemo } from 'react';
import { ChevronLeft, ChevronRight, Search } from 'lucide-react';

interface DocItem {
  title: string;
  path: string;
  children?: DocItem[];
}

const docsStructure: DocItem[] = [
  { title: 'Welcome to x402', path: 'README.md' },
  {
    title: 'Getting Started',
    children: [
      { title: 'Quickstart for Sellers', path: 'getting-started/quickstart-sellers.md' },
      { title: 'Quickstart for Buyers', path: 'getting-started/quickstart-buyers.md' },
    ],
  },
  {
    title: 'Core Concepts',
    children: [
      { title: 'HTTP 402 Protocol', path: 'core-concepts/http-402.md' },
      { title: 'Facilitator', path: 'core-concepts/facilitator.md' },
      { title: 'Client / Server', path: 'core-concepts/client-server.md' },
    ],
  },
  {
    title: 'Guides',
    children: [
      { title: 'Facilitator Setup', path: 'guides/facilitator-setup.md' },
      { title: 'Testing', path: 'guides/testing.md' },
    ],
  },
  {
    title: 'API Reference',
    children: [
      { title: 'Server API', path: 'api-reference/server-api.md' },
      { title: 'Types', path: 'api-reference/types.md' },
    ],
  },
  {
    title: 'Examples',
    children: [
      { title: 'Simple Seller', path: 'examples/simple-seller.md' },
    ],
  },
  { title: 'FAQ', path: 'faq.md' },
];

export default function DocsPage() {
  const [selectedDoc, setSelectedDoc] = useState<string>('README.md');
  const [content, setContent] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [tableOfContents, setTableOfContents] = useState<{id: string; text: string; level: number}[]>([]);
  const [expandedSections, setExpandedSections] = useState<Set<string>>(
    new Set(['Core Concepts', 'Getting Started'])
  );

  const allDocs = useMemo(() => {
    const docs: Array<{title: string; path: string}> = [];
    docsStructure.forEach(item => {
      if (item.path) docs.push(item);
      if (item.children) {
        item.children.forEach(child => docs.push(child));
      }
    });
    return docs;
  }, []);

  const currentIndex = allDocs.findIndex(doc => doc.path === selectedDoc);
  const prevDoc = currentIndex > 0 ? allDocs[currentIndex - 1] : null;
  const nextDoc = currentIndex < allDocs.length - 1 ? allDocs[currentIndex + 1] : null;

  useEffect(() => {
    fetchDoc(selectedDoc);
  }, [selectedDoc]);

  useEffect(() => {
    // Extract table of contents from content
    const headings = content.match(/^#{1,3} .+$/gm) || [];
    const toc = headings.map((heading, index) => {
      const level = heading.match(/^#+/)?.[0].length || 1;
      const text = heading.replace(/^#+\s/, '');
      const id = text.toLowerCase().replace(/[^\w]+/g, '-');
      return { id, text, level };
    });
    setTableOfContents(toc);
  }, [content]);

  const fetchDoc = async (docPath: string) => {
    setLoading(true);
    try {
      const response = await fetch(`/api/docs?path=${encodeURIComponent(docPath)}`);
      const data = await response.json();
      setContent(data.content);
    } catch (error) {
      setContent('# Error\n\nFailed to load documentation.');
    } finally {
      setLoading(false);
    }
  };

  const toggleSection = (sectionTitle: string) => {
    setExpandedSections((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(sectionTitle)) {
        newSet.delete(sectionTitle);
      } else {
        newSet.add(sectionTitle);
      }
      return newSet;
    });
  };

  const renderSidebarItem = (item: DocItem, level = 0) => {
    if (item.children) {
      const isExpanded = expandedSections.has(item.title);
      return (
        <div key={item.title}>
          <button
            onClick={() => toggleSection(item.title)}
            className={`w-full text-left px-4 py-2 hover:bg-gray-100 transition-colors flex items-center justify-between text-gray-900 ${
              level > 0 ? 'text-sm ml-4' : 'font-semibold text-sm mt-4'
            }`}
          >
            <span>{item.title}</span>
            <span className="text-xs text-gray-500">{isExpanded ? '▼' : '▶'}</span>
          </button>
          {isExpanded && (
            <div>
              {item.children.map((child) => renderSidebarItem(child, level + 1))}
            </div>
          )}
        </div>
      );
    }
    return (
      <button
        key={item.path}
        onClick={() => setSelectedDoc(item.path)}
        className={`w-full text-left px-4 py-2 hover:bg-gray-50 transition-colors text-sm ${
          selectedDoc === item.path ? 'bg-blue-50 text-blue-600 font-medium border-l-2 border-blue-600' : 'text-gray-700'
        } ${level > 0 ? 'ml-4' : ''}`}
      >
        {item.title}
      </button>
    );
  };

  const convertMarkdownToHTML = (md: string) => {
    let html = md;
    
    // Code blocks first
    html = html.replace(/```typescript\n([\s\S]*?)```/g, '<pre class="bg-gray-900 text-green-400 p-4 rounded-lg my-6 overflow-x-auto font-mono text-sm"><code>$1</code></pre>');
    html = html.replace(/```javascript\n([\s\S]*?)```/g, '<pre class="bg-gray-900 text-green-400 p-4 rounded-lg my-6 overflow-x-auto font-mono text-sm"><code>$1</code></pre>');
    html = html.replace(/```bash\n([\s\S]*?)```/g, '<pre class="bg-gray-900 text-green-400 p-4 rounded-lg my-6 overflow-x-auto font-mono text-sm"><code>$1</code></pre>');
    html = html.replace(/```env\n([\s\S]*?)```/g, '<pre class="bg-gray-100 text-gray-900 p-4 rounded-lg my-6 overflow-x-auto font-mono text-sm"><code>$1</code></pre>');
    html = html.replace(/```json\n([\s\S]*?)```/g, '<pre class="bg-gray-900 text-blue-400 p-4 rounded-lg my-6 overflow-x-auto font-mono text-sm"><code>$1</code></pre>');
    html = html.replace(/```([\s\S]*?)```/g, '<pre class="bg-gray-100 text-gray-900 p-4 rounded-lg my-6 overflow-x-auto font-mono text-sm"><code>$1</code></pre>');
    
    // Inline code
    html = html.replace(/`([^`]+)`/g, '<code class="bg-gray-100 text-pink-600 px-1.5 py-0.5 rounded text-sm font-mono">$1</code>');
    
    // Headers with IDs
    html = html.replace(/^#### (.*?)$/gm, (match, text) => {
      const id = text.toLowerCase().replace(/[^\w]+/g, '-');
      return `<h4 id="${id}" class="text-xl font-semibold mb-3 mt-6 text-gray-900 scroll-mt-20">${text}</h4>`;
    });
    html = html.replace(/^### (.*?)$/gm, (match, text) => {
      const id = text.toLowerCase().replace(/[^\w]+/g, '-');
      return `<h3 id="${id}" class="text-2xl font-semibold mb-4 mt-8 text-gray-900 scroll-mt-20">${text}</h3>`;
    });
    html = html.replace(/^## (.*?)$/gm, (match, text) => {
      const id = text.toLowerCase().replace(/[^\w]+/g, '-');
      return `<h2 id="${id}" class="text-3xl font-bold mb-5 mt-10 text-gray-900 scroll-mt-20">${text}</h2>`;
    });
    html = html.replace(/^# (.*?)$/gm, (match, text) => {
      const id = text.toLowerCase().replace(/[^\w]+/g, '-');
      return `<h1 id="${id}" class="text-4xl font-bold mb-6 mt-2 text-gray-900 scroll-mt-20">${text}</h1>`;
    });
    
    // Links
    html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" class="text-blue-600 hover:text-blue-800 underline" target="_blank" rel="noopener noreferrer">$1</a>');
    
    // Bold and italic
    html = html.replace(/\*\*(.*?)\*\*/g, '<strong class="font-semibold text-gray-900">$1</strong>');
    html = html.replace(/\*(.*?)\*/g, '<em class="italic text-gray-800">$1</em>');
    
    // Process lists properly
    const lines = html.split('\n');
    const processed: string[] = [];
    let inList = false;
    let listItems: string[] = [];
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const listMatch = line.match(/^[-*]\s+(.+)$/);
      
      if (listMatch) {
        if (!inList) {
          inList = true;
          listItems = [];
        }
        listItems.push(`<li class="mb-2 text-gray-700">${listMatch[1]}</li>`);
      } else {
        if (inList) {
          processed.push(`<ul class="list-disc pl-6 mb-6 space-y-2">${listItems.join('\n')}</ul>`);
          inList = false;
          listItems = [];
        }
        processed.push(line);
      }
    }
    
    if (inList && listItems.length > 0) {
      processed.push(`<ul class="list-disc pl-6 mb-6 space-y-2">${listItems.join('\n')}</ul>`);
    }
    
    html = processed.join('\n');
    
    // Convert paragraphs
    html = html.split('\n\n').map(block => {
      const trimmed = block.trim();
      if (trimmed && !trimmed.startsWith('<') && !trimmed.match(/^#+\s/)) {
        return `<p class="mb-5 text-gray-700 leading-relaxed text-base">${trimmed}</p>`;
      }
      return trimmed;
    }).join('\n\n');
    
    return html;
  };

  return (
    <div className="min-h-screen bg-white flex flex-col">
      {/* Navbar */}
      <div className="fixed top-0 left-0 right-0 h-16 border-b border-gray-200 bg-white z-50">
        <div className="max-w-full px-6 h-full flex items-center justify-between">
          <a href="/" className="text-2xl font-bold text-black hover:text-gray-700">
            Aptos x402
          </a>
          
          {/* Search Bar */}
          <div className="flex-1 max-w-xl mx-8">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="text"
                placeholder="Search..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
              />
              <kbd className="absolute right-3 top-1/2 transform -translate-y-1/2 px-2 py-1 text-xs bg-gray-100 border border-gray-300 rounded">
                ⌘K
              </kbd>
            </div>
          </div>
          
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
              href="/"
              className="bg-black text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-800 transition-colors"
            >
              Home
            </a>
          </div>
        </div>
      </div>

      <div className="flex flex-1 pt-16">
        {/* Sidebar */}
        <aside className="fixed left-0 top-16 bottom-0 w-72 border-r border-gray-200 bg-white overflow-y-auto">
          <nav className="py-6">
            {docsStructure.map((item) => renderSidebarItem(item))}
          </nav>
        </aside>

        {/* Main Content */}
        <main className="ml-72 mr-64 flex-1 px-12 py-8">
          <article className="max-w-4xl">
            {loading ? (
              <div className="text-center py-12">
                <div className="text-gray-500">Loading...</div>
              </div>
            ) : (
              <>
                <div
                  className="prose prose-lg max-w-none"
                  dangerouslySetInnerHTML={{ __html: convertMarkdownToHTML(content) }}
                />
                
                {/* Navigation Buttons */}
                <div className="grid grid-cols-2 gap-4 mt-12 pt-8 border-t border-gray-200">
                  {prevDoc ? (
                    <a
                      onClick={() => setSelectedDoc(prevDoc.path)}
                      className="flex items-center gap-2 p-4 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer transition-colors group"
                    >
                      <ChevronLeft className="w-5 h-5 text-gray-400 group-hover:text-gray-600" />
                      <div className="text-left">
                        <div className="text-xs text-gray-500 uppercase tracking-wide">Previous</div>
                        <div className="text-sm font-medium text-gray-900">{prevDoc.title}</div>
                      </div>
                    </a>
                  ) : <div />}
                  
                  {nextDoc && (
                    <a
                      onClick={() => setSelectedDoc(nextDoc.path)}
                      className="flex items-center justify-end gap-2 p-4 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer transition-colors group"
                    >
                      <div className="text-right">
                        <div className="text-xs text-gray-500 uppercase tracking-wide">Next</div>
                        <div className="text-sm font-medium text-gray-900">{nextDoc.title}</div>
                      </div>
                      <ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-gray-600" />
                    </a>
                  )}
                </div>
              </>
            )}
          </article>
        </main>

        {/* Table of Contents */}
        <aside className="fixed right-0 top-16 bottom-0 w-64 border-l border-gray-200 bg-white overflow-y-auto p-6">
          <h3 className="text-sm font-semibold text-gray-900 mb-4">On This Page</h3>
          {tableOfContents.length > 0 ? (
            <nav className="space-y-2">
              {tableOfContents.map((item) => (
                <a
                  key={item.id}
                  href={`#${item.id}`}
                  className={`block text-sm hover:text-blue-600 transition-colors ${
                    item.level === 1 ? 'font-medium text-gray-900' : 
                    item.level === 2 ? 'text-gray-700 pl-3' : 
                    'text-gray-600 pl-6'
                  }`}
                  onClick={(e) => {
                    e.preventDefault();
                    document.getElementById(item.id)?.scrollIntoView({ behavior: 'smooth' });
                  }}
                >
                  {item.text}
                </a>
              ))}
            </nav>
          ) : (
            <p className="text-sm text-gray-500">No headings found</p>
          )}
        </aside>
      </div>
    </div>
  );
}
