'use client';

import { useState, useEffect, useMemo } from 'react';
import { ChevronLeft, ChevronRight, Menu, X } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { 
  CodeBlock,
  CodeBlockHeader,
  CodeBlockFilename,
  CodeBlockCopyButton,
  CodeBlockBody,
  CodeBlockItem,
  CodeBlockContent 
} from '@/src/components/ui/shadcn-io/code-block';

interface DocItem {
  title: string;
  path?: string;
  children?: DocItem[];
}

interface DocsClientProps {
  initialContent: string;
  initialDocPath: string;
  docsStructure: DocItem[];
}

export default function DocsClient({ initialContent, initialDocPath, docsStructure }: DocsClientProps) {
  const [content, setContent] = useState(initialContent);
  const [selectedDoc, setSelectedDoc] = useState(initialDocPath);
  const [tableOfContents, setTableOfContents] = useState<{id: string; text: string; level: number}[]>([]);
  const [expandedSections, setExpandedSections] = useState<Set<string>>(
    new Set(['Core Concepts', 'Getting Started'])
  );
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isMobileTocOpen, setIsMobileTocOpen] = useState(false);
  const router = useRouter();

  const allDocs = useMemo(() => {
    const docs: Array<{title: string; path: string}> = [];
    docsStructure.forEach(item => {
      if (item.path) docs.push({ title: item.title, path: item.path });
      if (item.children) {
        item.children.forEach(child => {
          if (child.path) docs.push({ title: child.title, path: child.path });
        });
      }
    });
    return docs;
  }, [docsStructure]);

  const currentIndex = allDocs.findIndex(doc => doc.path === selectedDoc);
  const prevDoc = currentIndex > 0 ? allDocs[currentIndex - 1] : null;
  const nextDoc = currentIndex < allDocs.length - 1 ? allDocs[currentIndex + 1] : null;

  useEffect(() => {
    // Extract table of contents from content
    const headings = content.match(/^#{1,3} .+$/gm) || [];
    const toc = headings.map((heading) => {
      const level = heading.match(/^#+/)?.[0].length || 1;
      const text = heading.replace(/^#+\s/, '');
      const id = text.toLowerCase().replace(/[^\w]+/g, '-');
      return { id, text, level };
    });
    setTableOfContents(toc);
  }, [content]);

  const navigateToDoc = (docPath: string) => {
    const urlPath = docPath.replace('.md', '');
    router.push(`/docs/${urlPath}`);
    setIsMobileMenuOpen(false); // Close mobile menu on navigation
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
        <div key={item.title} className="mb-1">
          <button
            onClick={() => toggleSection(item.title)}
            className={`w-full text-left px-3 py-2.5 hover:bg-gray-100/80 transition-all duration-200 flex items-center justify-between rounded-md ${
              level > 0 ? 'text-sm ml-3' : 'font-semibold text-sm uppercase tracking-wide text-gray-700'
            }`}
          >
            <span>{item.title}</span>
            <span className={`text-xs text-gray-400 transition-transform duration-200 ${isExpanded ? 'rotate-90' : ''}`}>▶</span>
          </button>
          {isExpanded && (
            <div className="mt-1 space-y-0.5">
              {item.children.map((child) => renderSidebarItem(child, level + 1))}
            </div>
          )}
        </div>
      );
    }
    if (!item.path) return null;
    
    const isSelected = selectedDoc === item.path;
    return (
      <button
        key={item.path}
        onClick={() => navigateToDoc(item.path!)}
        className={`w-full text-left px-3 py-2 transition-all duration-200 text-sm rounded-md ${
          isSelected 
            ? 'bg-blue-50 text-blue-700 font-medium shadow-sm border-l-2 border-blue-600 pl-3' 
            : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
        } ${level > 0 ? 'ml-3' : ''}`}
      >
        {item.title}
      </button>
    );
  };

  const parseMarkdownWithCodeBlocks = (md: string) => {
    const parts: Array<{ type: 'code' | 'markdown'; content: string; language?: string; filename?: string }> = [];
    const codeBlockRegex = /```(\w+)?\n([\s\S]*?)```/g;
    let lastIndex = 0;
    let match;

    while ((match = codeBlockRegex.exec(md)) !== null) {
      if (match.index > lastIndex) {
        parts.push({
          type: 'markdown',
          content: md.substring(lastIndex, match.index),
        });
      }
      
      const language = match[1] || 'text';
      let filename = 'code';
      switch(language.toLowerCase()) {
        case 'typescript':
        case 'tsx':
          filename = 'example.tsx';
          break;
        case 'javascript':
        case 'jsx':
          filename = 'example.jsx';
          break;
        case 'bash':
        case 'sh':
          filename = 'terminal';
          break;
        case 'json':
          filename = 'config.json';
          break;
        case 'env':
          filename = '.env';
          break;
        default:
          filename = `code.${language}`;
      }
      
      parts.push({
        type: 'code',
        content: match[2],
        language: language,
        filename: filename,
      });
      
      lastIndex = match.index + match[0].length;
    }
    
    if (lastIndex < md.length) {
      parts.push({
        type: 'markdown',
        content: md.substring(lastIndex),
      });
    }
    
    return parts;
  };

  const convertMarkdownToHTML = (md: string) => {
    let html = md;
    
    html = html.replace(/`([^`]+)`/g, '<code class="bg-gray-100 text-pink-600 px-1.5 py-0.5 rounded text-sm font-mono">$1</code>');
    
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
    
    html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" class="text-blue-600 hover:text-blue-800 underline" target="_blank" rel="noopener noreferrer">$1</a>');
    html = html.replace(/\*\*(.*?)\*\*/g, '<strong class="font-semibold text-gray-900">$1</strong>');
    html = html.replace(/\*(.*?)\*/g, '<em class="italic text-gray-800">$1</em>');
    
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
        listItems.push(`<li class="mb-2 text-gray-900">${listMatch[1]}</li>`);
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
    
    html = html.split('\n\n').map(block => {
      const trimmed = block.trim();
      if (trimmed && !trimmed.startsWith('<') && !trimmed.match(/^#+\s/)) {
        return `<p class="mb-5 leading-relaxed text-base" style="color: #111827;">${trimmed}</p>`;
      }
      return trimmed;
    }).join('\n\n');
    
    return html;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-white flex flex-col pt-16 docs-page">
      {/* Mobile Menu Button */}
      <button
        onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
        className="fixed top-20 left-4 z-50 lg:hidden bg-white p-2 rounded-lg shadow-md border border-gray-200"
        aria-label="Toggle menu"
      >
        {isMobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
      </button>

      {/* Mobile TOC Button */}
      <button
        onClick={() => setIsMobileTocOpen(!isMobileTocOpen)}
        className="fixed top-20 right-4 z-50 lg:hidden bg-white p-2 rounded-lg shadow-md border border-gray-200 text-xs font-medium"
        aria-label="Toggle table of contents"
      >
        TOC
      </button>

      <div className="flex flex-1">
        {/* Sidebar - Mobile Overlay */}
        <aside className={`fixed left-0 top-16 bottom-0 w-64 border-r border-gray-200/80 bg-white backdrop-blur-sm overflow-y-auto shadow-lg z-40 transition-transform duration-300 lg:translate-x-0 lg:shadow-sm lg:bg-white/95 ${
          isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'
        }`}>
          <nav className="py-8 px-3">
            {docsStructure.map((item) => renderSidebarItem(item))}
          </nav>
        </aside>

        {/* Overlay for mobile menu */}
        {isMobileMenuOpen && (
          <div
            className="fixed inset-0 bg-black/50 z-30 lg:hidden"
            onClick={() => setIsMobileMenuOpen(false)}
          />
        )}

        {/* Main Content */}
        <main className="flex-1 px-4 py-8 lg:ml-64 lg:mr-72 lg:px-16 lg:py-12 overflow-x-hidden">
          <article className="max-w-4xl mx-auto w-full">
            <div className="prose prose-lg max-w-none prose-headings:scroll-mt-20 prose-a:text-blue-600 prose-a:no-underline hover:prose-a:underline prose-code:text-pink-600 prose-code:bg-pink-50 prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded prose-code:text-sm prose-code:font-mono prose-pre:p-0 prose-pre:bg-transparent overflow-x-hidden">
              {parseMarkdownWithCodeBlocks(content).map((part, idx) => {
                if (part.type === 'code') {
                  const codeData = [{
                    language: part.language || 'text',
                    filename: part.filename || 'code',
                    code: part.content,
                  }];
                  
                  return (
                    <div key={idx} className="my-6 overflow-hidden max-w-full">
                      <CodeBlock data={codeData} defaultValue={part.language || 'text'}>
                        <CodeBlockHeader>
                          <CodeBlockFilename value={part.language || 'text'}>
                            {part.filename}
                          </CodeBlockFilename>
                          <CodeBlockCopyButton />
                        </CodeBlockHeader>
                        <CodeBlockBody>
                          {(item) => (
                            <CodeBlockItem value={item.language}>
                              <CodeBlockContent
                                language={item.language as any}
                                themes={{
                                  light: 'github-light',
                                  dark: 'github-light',
                                }}
                              >
                                {item.code}
                              </CodeBlockContent>
                            </CodeBlockItem>
                          )}
                        </CodeBlockBody>
                      </CodeBlock>
                    </div>
                  );
                }
                return (
                  <div
                    key={idx}
                    dangerouslySetInnerHTML={{
                      __html: convertMarkdownToHTML(part.content),
                    }}
                  />
                );
              })}
            </div>
            
            {/* Navigation Buttons */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-16 pt-8 border-t border-gray-200">
              {prevDoc ? (
                <button
                  onClick={() => navigateToDoc(prevDoc.path)}
                  className="flex items-center gap-3 p-4 lg:p-5 border border-gray-200 rounded-xl hover:border-blue-300 hover:bg-blue-50/50 transition-all duration-200 group shadow-sm hover:shadow-md"
                >
                  <ChevronLeft className="w-5 h-5 text-gray-400 group-hover:text-blue-600 transition-colors flex-shrink-0" />
                  <div className="text-left">
                    <div className="text-xs text-gray-500 uppercase tracking-wide font-medium mb-1">Previous</div>
                    <div className="text-sm font-semibold text-gray-900 group-hover:text-blue-700">{prevDoc.title}</div>
                  </div>
                </button>
              ) : <div className="hidden sm:block" />}
              
              {nextDoc && (
                <button
                  onClick={() => navigateToDoc(nextDoc.path)}
                  className="flex items-center justify-end gap-3 p-4 lg:p-5 border border-gray-200 rounded-xl hover:border-blue-300 hover:bg-blue-50/50 transition-all duration-200 group shadow-sm hover:shadow-md"
                >
                  <div className="text-right">
                    <div className="text-xs text-gray-500 uppercase tracking-wide font-medium mb-1">Next</div>
                    <div className="text-sm font-semibold text-gray-900 group-hover:text-blue-700">{nextDoc.title}</div>
                  </div>
                  <ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-blue-600 transition-colors flex-shrink-0" />
                </button>
              )}
            </div>
          </article>
        </main>

        {/* Table of Contents - Mobile Overlay */}
        <aside className={`fixed right-0 top-16 bottom-0 w-72 border-l border-gray-200/80 bg-white backdrop-blur-sm overflow-y-auto p-8 shadow-lg z-40 transition-transform duration-300 lg:translate-x-0 lg:shadow-sm lg:bg-white/95 ${
          isMobileTocOpen ? 'translate-x-0' : 'translate-x-full'
        }`}>
          <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-4 pb-2 border-b border-gray-200">On This Page</h3>
          {tableOfContents.length > 0 ? (
            <nav className="space-y-1">
              {tableOfContents.map((item) => (
                <a
                  key={item.id}
                  href={`#${item.id}`}
                  className={`block text-sm hover:text-blue-600 transition-all duration-200 py-1.5 rounded-md hover:bg-blue-50 px-2 -mx-2 ${
                    item.level === 1 ? 'font-medium text-gray-800' : 
                    item.level === 2 ? 'text-gray-600 pl-4' : 
                    'text-gray-500 pl-6 text-xs'
                  }`}
                  onClick={(e) => {
                    e.preventDefault();
                    document.getElementById(item.id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                    setIsMobileTocOpen(false); // Close TOC on mobile after clicking
                  }}
                >
                  {item.text}
                </a>
              ))}
            </nav>
          ) : (
            <p className="text-sm text-gray-400 italic">No headings found</p>
          )}
        </aside>

        {/* Overlay for mobile TOC */}
        {isMobileTocOpen && (
          <div
            className="fixed inset-0 bg-black/50 z-30 lg:hidden"
            onClick={() => setIsMobileTocOpen(false)}
          />
        )}
      </div>
    </div>
  );
}
