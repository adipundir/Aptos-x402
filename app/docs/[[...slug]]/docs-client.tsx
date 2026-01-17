'use client';

import { useState, useEffect, useMemo } from 'react';
import { 
  ChevronLeft, 
  ChevronRight, 
  ChevronDown,
  Menu, 
  X, 
  BookOpen, 
  Code2, 
  Rocket, 
  Zap, 
  ArrowUp, 
  FileText,
  Lightbulb
} from 'lucide-react';
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
import { ScrollArea } from '@/components/ui/scroll-area';

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
  const [content] = useState(initialContent);
  const [selectedDoc, setSelectedDoc] = useState(initialDocPath);
  const [tableOfContents, setTableOfContents] = useState<{id: string; text: string; level: number}[]>([]);
  const [expandedSections, setExpandedSections] = useState<Set<string>>(
    new Set(['Core Concepts', 'Getting Started', 'API Reference', 'Guides', 'Examples'])
  );
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [showBackToTop, setShowBackToTop] = useState(false);
  const [activeHeading, setActiveHeading] = useState<string>('');
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
    const headings = content.match(/^#{1,3} .+$/gm) || [];
    const toc = headings.map((heading) => {
      const level = heading.match(/^#+/)?.[0].length || 1;
      const text = heading.replace(/^#+\s/, '');
      const id = text.toLowerCase().replace(/[^\w]+/g, '-');
      return { id, text, level };
    });
    setTableOfContents(toc);
  }, [content]);

  useEffect(() => {
    const handleScroll = () => {
      setShowBackToTop(window.scrollY > 400);
      
      const headings = document.querySelectorAll('h1[id], h2[id], h3[id]');
      let currentActive = '';
      headings.forEach((heading) => {
        const rect = heading.getBoundingClientRect();
        if (rect.top <= 120) {
          currentActive = heading.id;
        }
      });
      setActiveHeading(currentActive);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const navigateToDoc = (docPath: string) => {
    const urlPath = docPath.replace('.md', '');
    router.push(`/docs/${urlPath}`);
    setIsMobileMenuOpen(false);
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

  const getSectionIcon = (title: string) => {
    switch(title) {
      case 'Getting Started': return <Rocket className="w-4 h-4" />;
      case 'Core Concepts': return <BookOpen className="w-4 h-4" />;
      case 'API Reference': return <Code2 className="w-4 h-4" />;
      case 'Guides': return <Lightbulb className="w-4 h-4" />;
      case 'Examples': return <FileText className="w-4 h-4" />;
      default: return <FileText className="w-4 h-4" />;
    }
  };

  const renderSidebarItem = (item: DocItem, level = 0) => {
    const isParent = !!item.children;
    const isLink = !!item.path;
    const isExpanded = expandedSections.has(item.title);
    const isSelected = selectedDoc === item.path;

    if (isParent) {
      return (
        <div key={item.title} className="mb-1">
          <button
            onClick={() => {
              toggleSection(item.title);
              if (isLink) navigateToDoc(item.path!);
            }}
            className={`
              w-full flex items-center justify-between px-3 py-2 rounded-lg text-left
              transition-colors group
              ${level === 0 
                ? 'font-semibold text-sm text-zinc-900 hover:bg-zinc-100' 
                : 'text-sm text-zinc-800 hover:text-zinc-900 hover:bg-zinc-50'
              }
            `}
          >
            <div className="flex items-center gap-2">
              <span className="text-zinc-500">
                {getSectionIcon(item.title)}
              </span>
              <span>{item.title}</span>
            </div>
            <ChevronDown 
              className={`w-4 h-4 text-zinc-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`} 
            />
          </button>
          {isExpanded && item.children && (
            <div className="mt-1 ml-3 pl-3 border-l border-zinc-200 space-y-0.5">
              {item.children.map((child) => renderSidebarItem(child, level + 1))}
            </div>
          )}
        </div>
      );
    }

    if (isLink) {
      return (
        <button
          key={item.path}
          onClick={() => navigateToDoc(item.path!)}
          className={`
            w-full text-left px-3 py-2 rounded-lg text-sm transition-colors
            ${isSelected 
              ? 'bg-zinc-900 text-white font-medium' 
              : 'text-zinc-800 hover:text-zinc-900 hover:bg-zinc-100'
            }
          `}
        >
          {item.title}
        </button>
      );
    }
    return null;
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
          filename = 'example.js';
          break;
        case 'bash':
        case 'sh':
          filename = 'Terminal';
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

    // Inline code
    html = html.replace(/`([^`]+)`/g, '<code class="bg-zinc-100 text-zinc-800 px-1.5 py-0.5 rounded text-sm font-mono border border-zinc-200">$1</code>');

    // Headings
    html = html.replace(/^#### (.*?)$/gm, (_, text) => {
      const id = text.toLowerCase().replace(/[^\w]+/g, '-');
      return `<h4 id="${id}" class="text-base font-semibold text-zinc-900 mt-6 mb-2">${text}</h4>`;
    });
    html = html.replace(/^### (.*?)$/gm, (_, text) => {
      const id = text.toLowerCase().replace(/[^\w]+/g, '-');
      return `<h3 id="${id}" class="text-lg font-semibold text-zinc-900 mt-8 mb-3">${text}</h3>`;
    });
    html = html.replace(/^## (.*?)$/gm, (_, text) => {
      const id = text.toLowerCase().replace(/[^\w]+/g, '-');
      return `<h2 id="${id}" class="text-2xl font-bold text-zinc-900 mt-10 mb-4 pb-2 border-b border-zinc-200">${text}</h2>`;
    });
    html = html.replace(/^# (.*?)$/gm, (_, text) => {
      const id = text.toLowerCase().replace(/[^\w]+/g, '-');
      return `<h1 id="${id}" class="text-3xl font-bold text-zinc-900 mb-6">${text}</h1>`;
    });

    // Links and emphasis
    html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" class="text-zinc-900 underline underline-offset-2 hover:text-zinc-600 transition-colors" target="_blank" rel="noopener noreferrer">$1</a>');
    html = html.replace(/\*\*(.*?)\*\*/g, '<strong class="font-semibold text-zinc-900">$1</strong>');
    html = html.replace(/\*(.*?)\*/g, '<em class="italic">$1</em>');

    // Line-by-line parsing
    const lines = html.split('\n');
    const processed: string[] = [];

    let inUl = false; let ulItems: string[] = [];
    let inOl = false; let olItems: string[] = [];

    const flushUl = () => {
      if (inUl) {
        processed.push(`<ul class="list-disc pl-6 mb-4 space-y-1.5 text-zinc-600">${ulItems.join('\n')}</ul>`);
        inUl = false; ulItems = [];
      }
    };
    const flushOl = () => {
      if (inOl) {
        processed.push(`<ol class="list-decimal pl-6 mb-4 space-y-1.5 text-zinc-600">${olItems.join('\n')}</ol>`);
        inOl = false; olItems = [];
      }
    };

    const isTableSep = (line: string) => /^(\s*\|\s*)?:?-{3,}:?(\s*\|\s*:?-{3,}:?)*(\s*\|\s*)?$/.test(line.trim());
    const splitTableRow = (line: string) => line.trim().replace(/^\|/, '').replace(/\|$/, '').split('|').map(c => c.trim());

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];

      // Tables
      const next = lines[i + 1] ?? '';
      if (line.includes('|') && isTableSep(next)) {
        flushUl(); flushOl();
        const headers = splitTableRow(line);
        const alignTokens = splitTableRow(next).map(t => t.replace(/\s+/g, ''));
        const aligns = alignTokens.map(t => (t.startsWith(':-') && t.endsWith('-:')) ? 'center' : (t.endsWith('-:') ? 'right' : 'left'));
        i += 2;
        const rows: string[][] = [];
        while (i < lines.length && lines[i].includes('|') && !/^\s*$/.test(lines[i])) {
          rows.push(splitTableRow(lines[i]));
          i++;
        }
        i--;
        const thead = `<thead class="bg-zinc-50"><tr>${headers.map((h, idx) => `<th class="px-4 py-2 text-left text-xs font-semibold text-zinc-600 uppercase tracking-wide" style="text-align:${aligns[idx] || 'left'}">${h}</th>`).join('')}</tr></thead>`;
        const tbody = `<tbody>${rows.map(r => `<tr class="border-t border-zinc-100">${r.map((c, idx) => `<td class="px-4 py-2 text-sm text-zinc-600" style="text-align:${aligns[idx] || 'left'}">${c}</td>`).join('')}</tr>`).join('')}</tbody>`;
        processed.push(`<div class="overflow-x-auto my-4 rounded-lg border border-zinc-200"><table class="w-full">${thead}${tbody}</table></div>`);
        continue;
      }

      // Unordered list
      const ulMatch = line.match(/^[-*]\s+(.+)$/);
      if (ulMatch) {
        flushOl();
        if (!inUl) { inUl = true; ulItems = []; }
        ulItems.push(`<li class="leading-relaxed">${ulMatch[1]}</li>`);
        continue;
      }

      // Ordered list
      const olMatch = line.match(/^(\d+)\.\s+(.+)$/);
      if (olMatch) {
        flushUl();
        if (!inOl) { inOl = true; olItems = []; }
        olItems.push(`<li class="leading-relaxed">${olMatch[2]}</li>`);
        continue;
      }

      // Blockquotes
      const bqMatch = line.match(/^>\s?(.*)$/);
      if (bqMatch) {
        flushUl(); flushOl();
        const quote: string[] = [bqMatch[1]];
        let j = i + 1;
        while (j < lines.length) {
          const m = lines[j].match(/^>\s?(.*)$/);
          if (m) { quote.push(m[1]); j++; } else { break; }
        }
        i = j - 1;
        processed.push(`<blockquote class="border-l-4 border-zinc-300 bg-zinc-50 pl-4 py-3 my-4 text-zinc-800 dark:text-zinc-200 italic rounded-r-lg"><p>${quote.join(' ')}</p></blockquote>`);
        continue;
      }

      if (line.trim() === '') {
        flushUl(); flushOl();
        processed.push('');
      } else {
        processed.push(line);
      }
    }

    flushUl(); flushOl();

    html = processed.join('\n');

    // Paragraphs
    html = html.split('\n\n').map(block => {
      const trimmed = block.trim();
      if (trimmed && !trimmed.startsWith('<') && !trimmed.match(/^#+\s/)) {
        return `<p class="mb-4 leading-relaxed text-zinc-800">${trimmed}</p>`;
      }
      return trimmed;
    }).join('\n\n');

    return html;
  };

  const getBreadcrumbs = () => {
    const breadcrumbs: Array<{title: string; path?: string}> = [
      { title: 'Docs', path: 'README.md' }
    ];
    
    for (const section of docsStructure) {
      if (section.path === selectedDoc) {
        breadcrumbs.push({ title: section.title });
        break;
      }
      if (section.children) {
        const child = section.children.find(c => c.path === selectedDoc);
        if (child) {
          breadcrumbs.push({ title: section.title });
          breadcrumbs.push({ title: child.title });
          break;
        }
      }
    }
    
    return breadcrumbs;
  };

  const isWelcomePage = selectedDoc === 'README.md';

  return (
    <div className="min-h-screen bg-white pt-16 docs-page">
      {/* Mobile Menu Toggle */}
      <button
        onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
        className="fixed top-20 left-4 z-50 lg:hidden w-10 h-10 rounded-lg bg-white border border-zinc-200 shadow-sm flex items-center justify-center text-zinc-600 hover:text-zinc-900 hover:bg-zinc-50 transition-colors"
        aria-label="Toggle menu"
      >
        {isMobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
      </button>

      <div className="flex">
        {/* Sidebar */}
        <aside className={`
          fixed left-0 top-16 bottom-0 w-64 bg-zinc-50 border-r border-zinc-200 z-40
          transition-transform lg:translate-x-0
          ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'}
        `}>
          <ScrollArea className="h-full">
            <div className="p-4">
              {/* Navigation */}
              <nav className="space-y-1">
                {/* Welcome link */}
                <button
                  onClick={() => navigateToDoc('README.md')}
                  className={`
                    w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors
                    ${selectedDoc === 'README.md' 
                      ? 'bg-zinc-900 text-white font-medium' 
                      : 'text-zinc-800 hover:text-zinc-900 hover:bg-zinc-100'
                    }
                  `}
                >
                  <Zap className="w-4 h-4" />
                  Welcome
                </button>
                
                <div className="h-px bg-zinc-200 my-3" />
                
                {docsStructure.filter(item => item.path !== 'README.md').map((item) => renderSidebarItem(item))}
              </nav>
            </div>
          </ScrollArea>
        </aside>

        {/* Overlay */}
        {isMobileMenuOpen && (
          <div
            className="fixed inset-0 bg-black/20 z-30 lg:hidden"
            onClick={() => setIsMobileMenuOpen(false)}
          />
        )}

        {/* Main Content */}
        <main className="flex-1 lg:ml-64 lg:mr-56 min-h-screen">
          <div className="max-w-3xl mx-auto px-6 py-8">
            {/* Breadcrumbs */}
            {!isWelcomePage && (
              <nav className="flex items-center gap-2 text-sm text-zinc-500 mb-6">
                {getBreadcrumbs().map((crumb, idx, arr) => (
                  <div key={idx} className="flex items-center gap-2">
                    {crumb.path ? (
                      <button
                        onClick={() => navigateToDoc(crumb.path!)}
                        className="hover:text-zinc-900 transition-colors"
                      >
                        {crumb.title}
                      </button>
                    ) : (
                      <span className="text-zinc-900 font-medium">{crumb.title}</span>
                    )}
                    {idx < arr.length - 1 && (
                      <ChevronRight className="w-4 h-4 text-zinc-300" />
                    )}
                  </div>
                ))}
              </nav>
            )}

            {/* Welcome Page Hero */}
            {isWelcomePage && (
              <div className="mb-10">
                <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-8">
                  <div className="flex items-center gap-2 text-sm text-zinc-600 mb-4">
                    <Zap className="w-4 h-4" />
                    HTTP 402 Payment Protocol
                  </div>
                  <h1 className="text-3xl font-bold text-zinc-900 mb-3">
                    Aptos x402 Documentation
                  </h1>
                  <p className="text-zinc-600">
                    Learn how to add blockchain micropayments to your APIs with simple middleware configuration.
                  </p>
                </div>

                {/* Quick links */}
                <div className="grid md:grid-cols-2 gap-4 mt-6">
                  {[
                    { title: 'Quickstart for Sellers', desc: 'Monetize your APIs in minutes', path: 'getting-started/quickstart-sellers.md', icon: Rocket },
                    { title: 'Core Concepts', desc: 'Understand the HTTP 402 protocol', path: 'core-concepts/http-402.md', icon: BookOpen },
                    { title: 'API Reference', desc: 'Complete SDK documentation', path: 'api-reference/server-api.md', icon: Code2 },
                    { title: 'Examples', desc: 'Real-world implementation patterns', path: 'examples/simple-seller.md', icon: FileText },
                  ].map((item) => {
                    const Icon = item.icon;
                    return (
                      <button
                        key={item.path}
                        onClick={() => navigateToDoc(item.path)}
                        className="flex items-start gap-3 p-4 rounded-lg border border-zinc-200 bg-white hover:border-zinc-300 hover:bg-zinc-50 transition-colors text-left"
                      >
                        <div className="w-8 h-8 rounded-lg bg-zinc-100 flex items-center justify-center text-zinc-600">
                          <Icon className="w-4 h-4" />
                        </div>
                        <div>
                          <h3 className="font-semibold text-zinc-900 text-sm mb-0.5">
                            {item.title}
                          </h3>
                          <p className="text-xs text-zinc-500">{item.desc}</p>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
            
            {/* Content */}
            <article>
              {parseMarkdownWithCodeBlocks(content).map((part, idx) => {
                if (part.type === 'code') {
                  const codeData = [{
                    language: part.language || 'text',
                    filename: part.filename || 'code',
                    code: part.content,
                  }];
                  
                  return (
                    <div key={idx} className="my-4 rounded-lg overflow-hidden border border-zinc-200">
                      <CodeBlock data={codeData} defaultValue={part.language || 'text'}>
                        <CodeBlockHeader className="bg-zinc-100 border-b border-zinc-200">
                          <CodeBlockFilename value={part.language || 'text'}>
                            {part.filename}
                          </CodeBlockFilename>
                          <CodeBlockCopyButton />
                        </CodeBlockHeader>
                        <CodeBlockBody>
                          {(item) => (
                            <CodeBlockItem key={item.language} value={item.language}>
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
            </article>
            
            {/* Navigation */}
            <div className="mt-12 pt-6 border-t border-zinc-200">
              <div className="grid grid-cols-2 gap-4">
                {prevDoc && (
                  <button
                    onClick={() => navigateToDoc(prevDoc.path)}
                    className="flex items-center gap-3 p-4 rounded-lg border border-zinc-200 hover:border-zinc-300 hover:bg-zinc-50 transition-colors text-left"
                  >
                    <ChevronLeft className="w-5 h-5 text-zinc-400" />
                    <div>
                      <div className="text-xs text-zinc-500 mb-0.5">Previous</div>
                      <div className="font-medium text-zinc-900 text-sm">{prevDoc.title}</div>
                    </div>
                  </button>
                )}
                
                {nextDoc && (
                  <button
                    onClick={() => navigateToDoc(nextDoc.path)}
                    className="flex items-center justify-end gap-3 p-4 rounded-lg border border-zinc-200 hover:border-zinc-300 hover:bg-zinc-50 transition-colors text-right col-start-2"
                  >
                    <div>
                      <div className="text-xs text-zinc-500 mb-0.5">Next</div>
                      <div className="font-medium text-zinc-900 text-sm">{nextDoc.title}</div>
                    </div>
                    <ChevronRight className="w-5 h-5 text-zinc-400" />
                  </button>
                )}
              </div>
            </div>
          </div>
        </main>

        {/* Table of Contents */}
        <aside className="hidden xl:block fixed right-0 top-16 bottom-0 w-56 border-l border-zinc-200 bg-white">
          <ScrollArea className="h-full">
            <div className="p-6">
              <h3 className="text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-4">
                On this page
              </h3>
              {tableOfContents.length > 0 ? (
                <nav className="space-y-1.5">
                  {tableOfContents.map((item) => (
                    <a
                      key={item.id}
                      href={`#${item.id}`}
                      onClick={(e) => {
                        e.preventDefault();
                        document.getElementById(item.id)?.scrollIntoView({ behavior: 'smooth' });
                      }}
                      className={`
                        block text-sm py-1.5 transition-colors no-underline
                        ${item.level === 1 ? 'font-semibold text-zinc-900' : ''}
                        ${item.level === 2 ? 'pl-3 text-zinc-700' : ''}
                        ${item.level === 3 ? 'pl-5 text-xs text-zinc-600' : ''}
                        ${activeHeading === item.id 
                          ? 'text-zinc-900 font-medium' 
                          : item.level === 1 ? 'text-zinc-900' : 'text-zinc-700 hover:text-zinc-900'
                        }
                      `}
                    >
                      {item.text}
                    </a>
                  ))}
                </nav>
              ) : (
                <p className="text-sm text-zinc-400">No headings found</p>
              )}
            </div>
          </ScrollArea>
        </aside>
      </div>

      {/* Back to Top */}
      {showBackToTop && (
        <button
          onClick={scrollToTop}
          className="fixed bottom-6 right-6 z-50 w-10 h-10 rounded-full bg-zinc-900 text-white shadow-lg hover:bg-zinc-800 transition-colors flex items-center justify-center"
          aria-label="Back to top"
        >
          <ArrowUp className="w-4 h-4" />
        </button>
      )}
    </div>
  );
}
