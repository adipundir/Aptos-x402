'use client';

import { useState, useEffect, useMemo } from 'react';
import { ChevronLeft, ChevronRight, Menu, X, BookOpen, Code2, Rocket, Zap, ArrowUp, Sparkles } from 'lucide-react';
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
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';

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
  const [showBackToTop, setShowBackToTop] = useState(false);
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

  useEffect(() => {
    // Handle scroll for back to top button
    const handleScroll = () => {
      setShowBackToTop(window.scrollY > 400);
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

  const getSectionIcon = (title: string) => {
    switch(title) {
      case 'Getting Started': return <Rocket className="w-4 h-4" />;
      case 'Core Concepts': return <BookOpen className="w-4 h-4" />;
      case 'API Reference': return <Code2 className="w-4 h-4" />;
      case 'Guides': return <Zap className="w-4 h-4" />;
      default: return null;
    }
  };

  const getSectionBadge = () => {
    return 'bg-zinc-100 text-zinc-600 border-zinc-200';
  };

  const renderSidebarItem = (item: DocItem, level = 0) => {
    const isParent = !!item.children;
    const isLink = !!item.path;
    const isExpanded = expandedSections.has(item.title);
    if (isParent) {
      return (
        <div key={item.title} className="mb-2">
          <button
            onClick={() => {
              if (isLink) {
                navigateToDoc(item.path!);
              } else {
                toggleSection(item.title);
              }
            }}
            className={`w-full text-left px-3 py-2.5 hover:bg-zinc-50 transition-all duration-200 flex items-center justify-between rounded-lg group ${
              level > 0 ? 'text-sm ml-2' : 'font-bold text-sm shadow-sm border border-zinc-200'
            } ${isLink ? 'cursor-pointer text-zinc-900' : ''}`}
          >
            <div className="flex items-center gap-2">
              {level === 0 && getSectionIcon(item.title)}
              <span className={level === 0 ? 'text-zinc-900' : 'text-zinc-700 font-medium'}>{item.title}</span>
              {level === 0 && item.children && (
                <Badge variant="secondary" className={`text-xs font-semibold ${getSectionBadge()}`}>{item.children.length}</Badge>
              )}
            </div>
            <ChevronRight className={`w-4 h-4 text-zinc-400 transition-transform duration-200 ${isExpanded ? 'rotate-90' : ''}`} />
          </button>
          {isExpanded && item.children && (
            <div className="mt-1.5 space-y-0.5 pl-3 ml-2 border-l-2 border-zinc-200">
              {item.children.map((child) => renderSidebarItem(child, level + 1))}
            </div>
          )}
        </div>
      );
    }
    if (isLink) {
      const isSelected = selectedDoc === item.path;
      return (
        <button
          key={item.path}
          onClick={() => navigateToDoc(item.path!)}
          className={`w-full text-left px-3 py-2 mb-1 transition-all duration-200 text-sm rounded-lg ${
            isSelected 
              ? 'bg-zinc-900 text-white font-semibold shadow-md' 
              : 'text-zinc-600 hover:bg-zinc-50 hover:text-zinc-900 font-medium'
          } ${level > 0 ? 'ml-2' : ''}`}
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

    // Inline code, links, emphasis (outside of code blocks only)
    html = html.replace(/`([^`]+)`/g, '<code class="bg-zinc-100 text-zinc-800 px-2 py-1 rounded-md text-[0.875em] font-mono border border-zinc-200">$1</code>');

    // Headings with anchor ids and enhanced styling
    html = html.replace(/^#### (.*?)$/gm, (match, text) => {
      const id = text.toLowerCase().replace(/[^\w]+/g, '-');
      return `<h4 id="${id}" class="text-lg font-semibold mb-3 mt-8 text-zinc-900 scroll-mt-24 border-l-2 border-zinc-300 pl-3">${text}</h4>`;
    });
    html = html.replace(/^### (.*?)$/gm, (match, text) => {
      const id = text.toLowerCase().replace(/[^\w]+/g, '-');
      return `<h3 id="${id}" class="text-xl font-semibold mb-4 mt-10 text-zinc-900 scroll-mt-24 border-l-3 border-zinc-400 pl-4">${text}</h3>`;
    });
    html = html.replace(/^## (.*?)$/gm, (match, text) => {
      const id = text.toLowerCase().replace(/[^\w]+/g, '-');
      return `<h2 id="${id}" class="text-2xl font-bold mb-6 mt-12 pb-2 text-zinc-900 scroll-mt-24 border-b border-zinc-200">${text}</h2>`;
    });
    html = html.replace(/^# (.*?)$/gm, (match, text) => {
      const id = text.toLowerCase().replace(/[^\w]+/g, '-');
      return `<h1 id="${id}" class="text-4xl font-bold mb-8 mt-2 pb-4 text-zinc-900 scroll-mt-24 border-b-2 border-zinc-900">${text}</h1>`;
    });

    // Links and emphasis with better styling
    html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" class="text-zinc-900 hover:text-zinc-700 underline decoration-2 underline-offset-2 font-medium transition-colors" target="_blank" rel="noopener noreferrer">$1</a>');
    html = html.replace(/\*\*(.*?)\*\*/g, '<strong class="font-semibold text-zinc-900">$1</strong>');
    html = html.replace(/\*(.*?)\*/g, '<em class="italic text-zinc-700">$1</em>');

    // Line-by-line block parsing for lists, tables, and blockquotes
    const lines = html.split('\n');
    const processed: string[] = [];

    let inUl = false; let ulItems: string[] = [];
    let inOl = false; let olItems: string[] = [];

    const flushUl = () => {
      if (inUl) {
        processed.push(`<ul class="list-disc pl-6 mb-6 space-y-3 marker:text-zinc-400">${ulItems.join('\n')}</ul>`);
        inUl = false; ulItems = [];
      }
    };
    const flushOl = () => {
      if (inOl) {
        processed.push(`<ol class="list-decimal pl-6 mb-6 space-y-3 marker:text-zinc-400 marker:font-medium">${olItems.join('\n')}</ol>`);
        inOl = false; olItems = [];
      }
    };

    const isTableSep = (line: string) => /^(\s*\|\s*)?:?-{3,}:?(\s*\|\s*:?-{3,}:?)*(\s*\|\s*)?$/.test(line.trim());
    const splitTableRow = (line: string) => line.trim().replace(/^\|/, '').replace(/\|$/, '').split('|').map(c => c.trim());

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];

      // Handle tables: header | sep | rows
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
        // Step back one because the for-loop will i++
        i--;
        const thead = `<thead class="border-b border-zinc-200"><tr>${headers.map((h, idx) => `<th class="px-3 py-2 text-sm font-semibold text-zinc-900 text-${aligns[idx] || 'left'}">${h}</th>`).join('')}</tr></thead>`;
        const tbody = `<tbody>${rows.map(r => `<tr class="border-b last:border-0 border-zinc-100">${r.map((c, idx) => `<td class="px-3 py-2 text-zinc-800 align-top text-${aligns[idx] || 'left'}">${c}</td>`).join('')}</tr>`).join('')}</tbody>`;
        processed.push(`<div class="overflow-x-auto my-6"><table class="w-full text-sm border-collapse">${thead}${tbody}</table></div>`);
        continue;
      }

      // Unordered list
      const ulMatch = line.match(/^[-*]\s+(.+)$/);
      if (ulMatch) {
        flushOl();
        if (!inUl) { inUl = true; ulItems = []; }
        ulItems.push(`<li class="text-zinc-800 leading-relaxed">${ulMatch[1]}</li>`);
        continue;
      }

      // Ordered list
      const olMatch = line.match(/^(\d+)\.\s+(.+)$/);
      if (olMatch) {
        flushUl();
        if (!inOl) { inOl = true; olItems = []; }
        olItems.push(`<li class="text-zinc-800 leading-relaxed">${olMatch[2]}</li>`);
        continue;
      }

      // Blockquotes with improved styling
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
        processed.push(`<blockquote class="border-l-4 border-zinc-300 bg-zinc-50 pl-6 pr-4 py-4 my-6 rounded-r-lg text-zinc-700 italic"><p class="leading-relaxed">${quote.join(' ')}</p></blockquote>`);
        continue;
      }

      // Flush any open lists before pushing a normal line
      if (line.trim() === '') {
        flushUl(); flushOl();
        processed.push('');
      } else {
        processed.push(line);
      }
    }

    // Flush at end
    flushUl(); flushOl();

    html = processed.join('\n');

    // Wrap plain text blocks in paragraphs with better styling
    html = html.split('\n\n').map(block => {
      const trimmed = block.trim();
      if (trimmed && !trimmed.startsWith('<') && !trimmed.match(/^#+\s/)) {
        return `<p class="mb-6 leading-relaxed text-[1.0625rem] text-zinc-800">${trimmed}</p>`;
      }
      return trimmed;
    }).join('\n\n');

    return html;
  };

  const getBreadcrumbs = () => {
    const breadcrumbs: Array<{title: string; path?: string}> = [
      { title: 'Documentation', path: 'README.md' }
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
    <div className="min-h-screen bg-gradient-to-b from-white to-zinc-50 flex flex-col pt-16 docs-page">
      {/* Mobile Menu Button */}
      <Button
        onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
        variant="outline"
        size="icon"
        className="fixed top-20 left-4 z-50 lg:hidden shadow-lg bg-white hover:bg-zinc-50 border-zinc-200"
        aria-label="Toggle menu"
      >
        {isMobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
      </Button>

      {/* Mobile TOC Button */}
      <Button
        onClick={() => setIsMobileTocOpen(!isMobileTocOpen)}
        variant="outline"
        size="icon"
        className="fixed top-20 right-4 z-50 lg:hidden shadow-lg bg-white hover:bg-zinc-50 border-zinc-200"
        aria-label="Toggle table of contents"
      >
        <BookOpen className="w-5 h-5" />
      </Button>

      <div className="flex flex-1">
        {/* Sidebar - Mobile Overlay with enhanced styling */}
        <aside className={`fixed left-0 top-16 bottom-0 w-72 border-r border-zinc-200 bg-white overflow-y-auto shadow-xl z-40 transition-transform duration-300 lg:translate-x-0 ${
          isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'
        }`}>
          <ScrollArea className="h-[calc(100vh-4rem)]">
            <nav className="py-8 px-5">
              {docsStructure.map((item) => renderSidebarItem(item))}
            </nav>
          </ScrollArea>
        </aside>

        {/* Overlay for mobile menu */}
        {isMobileMenuOpen && (
          <div
            className="fixed inset-0 bg-black/50 z-30 lg:hidden backdrop-blur-sm"
            onClick={() => setIsMobileMenuOpen(false)}
          />
        )}

        {/* Main Content with enhanced spacing */}
        <main className="flex-1 px-4 py-8 lg:ml-72 lg:mr-80 lg:px-16 lg:py-16 overflow-x-hidden">
          <article className="max-w-4xl mx-auto w-full">
            {/* Hero Section for Welcome Page */}
            {isWelcomePage && (
              <div className="mb-16">
                <Card className="border-2 border-zinc-200 shadow-lg hover:shadow-xl transition-shadow duration-300">
                  <CardContent className="p-8 lg:p-14">
                    <div className="flex items-center gap-3 mb-6">
                      <div className="p-2.5 rounded-xl bg-gradient-to-br from-zinc-100 to-zinc-200 shadow-sm">
                        <Zap className="w-7 h-7 text-zinc-900" />
                      </div>
                      <Badge variant="outline" className="text-zinc-700 border-zinc-400 font-medium px-3 py-1">
                        HTTP 402 Protocol
                      </Badge>
                    </div>
                    <h1 className="text-4xl lg:text-5xl font-bold mb-5 text-zinc-900 leading-tight">
                      Welcome to Aptos x402
                    </h1>
                    <p className="text-lg text-zinc-600 mb-10 leading-relaxed max-w-2xl">
                      A revolutionary HTTP 402 implementation for Aptos blockchain. Enable seamless micropayments and pay-per-use APIs with built-in blockchain verification.
                    </p>
                    <div className="flex flex-wrap gap-4">
                      <Button
                        onClick={() => navigateToDoc('getting-started/quickstart-sellers.md')}
                        className="bg-zinc-900 text-white hover:bg-zinc-800 shadow-md hover:shadow-lg transition-all"
                        size="lg"
                      >
                        <Rocket className="w-4 h-4 mr-2" />
                        Get Started
                      </Button>
                      <Button
                        onClick={() => navigateToDoc('core-concepts/http-402.md')}
                        className="bg-zinc-900 text-white hover:bg-zinc-800 shadow-md hover:shadow-lg transition-all"
                        size="lg"
                      >
                        <BookOpen className="w-4 h-4 mr-2" />
                        Learn More
                      </Button>
                    </div>
                  </CardContent>
                </Card>

                {/* Feature Cards Section with professional structure */}
                <div className="mt-16">
                  <div className="text-center mb-10">
                    <h2 className="text-2xl font-bold text-zinc-900 mb-3">Everything you need to get started</h2>
                    <p className="text-base text-zinc-600 max-w-2xl mx-auto">
                      Explore our comprehensive resources to integrate blockchain payments into your APIs
                    </p>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-6">
                    <Card className="hover:shadow-lg hover:-translate-y-1 transition-all duration-300 cursor-pointer border-2 border-zinc-200" onClick={() => navigateToDoc('getting-started/quickstart-sellers.md')}>
                      <CardContent className="p-7">
                        <div className="flex items-center gap-3 mb-3">
                          <div className="p-2.5 rounded-xl bg-gradient-to-br from-zinc-100 to-zinc-200 shadow-sm">
                            <Rocket className="w-5 h-5 text-zinc-900" />
                          </div>
                          <h3 className="font-bold text-zinc-900 text-lg">Quick Start</h3>
                        </div>
                        <p className="text-sm text-zinc-600 leading-relaxed">Get up and running in minutes with our quickstart guides</p>
                      </CardContent>
                    </Card>
                    
                    <Card className="hover:shadow-lg hover:-translate-y-1 transition-all duration-300 cursor-pointer border-2 border-zinc-200" onClick={() => navigateToDoc('guides/ai-ide-integration.md')}>
                      <CardContent className="p-7">
                        <div className="flex items-center gap-3 mb-3">
                          <div className="p-2.5 rounded-xl bg-gradient-to-br from-zinc-100 to-zinc-200 shadow-sm">
                            <Sparkles className="w-5 h-5 text-zinc-900" />
                          </div>
                          <h3 className="font-bold text-zinc-900 text-lg">AI Setup</h3>
                        </div>
                        <p className="text-sm text-zinc-600 leading-relaxed">One prompt = complete setup with Cursor or GitHub Copilot</p>
                      </CardContent>
                    </Card>
                    
                    <Card className="hover:shadow-lg hover:-translate-y-1 transition-all duration-300 cursor-pointer border-2 border-zinc-200" onClick={() => navigateToDoc('api-reference/server-api.md')}>
                      <CardContent className="p-7">
                        <div className="flex items-center gap-3 mb-3">
                          <div className="p-2.5 rounded-xl bg-gradient-to-br from-zinc-100 to-zinc-200 shadow-sm">
                            <Code2 className="w-5 h-5 text-zinc-900" />
                          </div>
                          <h3 className="font-bold text-zinc-900 text-lg">API Reference</h3>
                        </div>
                        <p className="text-sm text-zinc-600 leading-relaxed">Complete API documentation and type definitions</p>
                      </CardContent>
                    </Card>
                    
                    <Card className="hover:shadow-lg hover:-translate-y-1 transition-all duration-300 cursor-pointer border-2 border-zinc-200" onClick={() => navigateToDoc('examples/simple-seller.md')}>
                      <CardContent className="p-7">
                        <div className="flex items-center gap-3 mb-3">
                          <div className="p-2.5 rounded-xl bg-gradient-to-br from-zinc-100 to-zinc-200 shadow-sm">
                            <Zap className="w-5 h-5 text-zinc-900" />
                          </div>
                          <h3 className="font-bold text-zinc-900 text-lg">Examples</h3>
                        </div>
                        <p className="text-sm text-zinc-600 leading-relaxed">Real-world examples and implementation patterns</p>
                      </CardContent>
                    </Card>
                    
                    <Card className="hover:shadow-lg hover:-translate-y-1 transition-all duration-300 cursor-pointer border-2 border-zinc-200 md:col-span-2" onClick={() => navigateToDoc('core-concepts/facilitator.md')}>
                      <CardContent className="p-7">
                        <div className="flex items-center gap-3 mb-3">
                          <div className="p-2.5 rounded-xl bg-gradient-to-br from-zinc-100 to-zinc-200 shadow-sm">
                            <BookOpen className="w-5 h-5 text-zinc-900" />
                          </div>
                          <h3 className="font-bold text-zinc-900 text-lg">Core Concepts</h3>
                        </div>
                        <p className="text-sm text-zinc-600 leading-relaxed">Understand the architecture, facilitator, and HTTP 402 protocol fundamentals</p>
                      </CardContent>
                    </Card>
                  </div>
                </div>
              </div>
            )}

            {/* Breadcrumbs with enhanced styling */}
            {!isWelcomePage && (
              <nav className="flex items-center gap-2 text-sm text-zinc-600 mb-8 bg-white px-4 py-3 rounded-lg border border-zinc-200 shadow-sm">
                {getBreadcrumbs().map((crumb, idx, arr) => (
                  <div key={idx} className="flex items-center gap-2">
                    {crumb.path ? (
                      <button
                        onClick={() => navigateToDoc(crumb.path!)}
                        className="hover:text-zinc-900 transition-colors font-medium"
                      >
                        {crumb.title}
                      </button>
                    ) : (
                      <span className="text-zinc-900 font-semibold">{crumb.title}</span>
                    )}
                    {idx < arr.length - 1 && (
                      <ChevronRight className="w-4 h-4 text-zinc-400" />
                    )}
                  </div>
                ))}
              </nav>
            )}
            
            <div className="prose prose-lg max-w-none prose-headings:scroll-mt-24 prose-a:text-zinc-900 prose-a:underline prose-a:decoration-2 prose-a:underline-offset-2 hover:prose-a:text-zinc-700 prose-code:text-zinc-800 prose-code:bg-zinc-100 prose-code:px-2 prose-code:py-1 prose-code:rounded-md prose-code:text-[0.875em] prose-code:font-mono prose-code:border prose-code:border-zinc-200 prose-pre:p-0 prose-pre:bg-transparent overflow-x-hidden">
              {parseMarkdownWithCodeBlocks(content).map((part, idx) => {
                if (part.type === 'code') {
                  const codeData = [{
                    language: part.language || 'text',
                    filename: part.filename || 'code',
                    code: part.content,
                  }];
                  
                  return (
                    <div key={idx} className="my-8 overflow-hidden max-w-full shadow-lg rounded-xl border-2 border-zinc-200 hover:shadow-xl transition-shadow duration-300">
                      <CodeBlock data={codeData} defaultValue={part.language || 'text'}>
                        <CodeBlockHeader>
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
            </div>
            
            {/* Navigation Buttons with enhanced styling */}
            <Separator className="my-14" />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 mt-10">
              {prevDoc ? (
                <Card className="group hover:shadow-lg hover:-translate-y-1 transition-all duration-300 cursor-pointer border-2 border-zinc-200">
                  <CardContent 
                    className="p-6"
                    onClick={() => navigateToDoc(prevDoc.path)}
                  >
                    <div className="flex items-center gap-4">
                      <div className="p-2.5 rounded-lg bg-zinc-100 group-hover:bg-zinc-200 transition-colors">
                        <ChevronLeft className="w-5 h-5 text-zinc-600" />
                      </div>
                      <div className="text-left flex-1">
                        <div className="text-xs text-zinc-500 uppercase tracking-wide font-semibold mb-1.5">Previous</div>
                        <div className="text-sm font-bold text-zinc-900">{prevDoc.title}</div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ) : <div className="hidden sm:block" />}
              
              {nextDoc && (
                <Card className="group hover:shadow-lg hover:-translate-y-1 transition-all duration-300 cursor-pointer border-2 border-zinc-200">
                  <CardContent 
                    className="p-6"
                    onClick={() => navigateToDoc(nextDoc.path)}
                  >
                    <div className="flex items-center justify-end gap-4">
                      <div className="text-right flex-1">
                        <div className="text-xs text-zinc-500 uppercase tracking-wide font-semibold mb-1.5">Next</div>
                        <div className="text-sm font-bold text-zinc-900">{nextDoc.title}</div>
                      </div>
                      <div className="p-2.5 rounded-lg bg-zinc-100 group-hover:bg-zinc-200 transition-colors">
                        <ChevronRight className="w-5 h-5 text-zinc-600" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          </article>
        </main>

        {/* Table of Contents - Mobile Overlay with enhanced styling */}
        <aside className={`fixed right-0 top-16 bottom-0 w-80 border-l border-zinc-200 bg-white overflow-y-auto shadow-xl z-40 transition-transform duration-300 lg:translate-x-0 ${
          isMobileTocOpen ? 'translate-x-0' : 'translate-x-full'
        }`}>
          <div className="p-6 border-b border-zinc-100 sticky top-0 z-10 bg-gradient-to-b from-white to-zinc-50">
            <div className="flex items-center gap-2.5 mb-2">
              <div className="p-2 rounded-lg bg-gradient-to-br from-zinc-100 to-zinc-200 shadow-sm">
                <BookOpen className="w-4 h-4 text-zinc-700" />
              </div>
              <h3 className="text-sm font-bold text-zinc-900 tracking-wide">On This Page</h3>
            </div>
          </div>
          <ScrollArea className="h-[calc(100vh-8rem)]">
            {tableOfContents.length > 0 ? (
              <nav className="p-6 space-y-1">
                {tableOfContents.map((item, idx) => (
                  <a
                    key={item.id}
                    href={`#${item.id}`}
                    className={`block text-sm hover:text-zinc-900 transition-all duration-200 py-2.5 rounded-lg hover:bg-zinc-50 px-3 group relative ${
                      item.level === 1 ? 'font-semibold text-zinc-800' : 
                      item.level === 2 ? 'text-zinc-600 pl-6 font-medium' : 
                      'text-zinc-500 pl-9 text-xs'
                    }`}
                    onClick={(e) => {
                      e.preventDefault();
                      document.getElementById(item.id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                      setIsMobileTocOpen(false);
                    }}
                  >
                    <span className="relative">
                      {item.level > 1 && (
                        <span className="absolute -left-3 top-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-zinc-300 group-hover:bg-zinc-500 transition-colors" />
                      )}
                      {item.text}
                    </span>
                  </a>
                ))}
              </nav>
            ) : (
              <div className="p-6">
                <Card className="bg-gradient-to-br from-zinc-50 to-zinc-100 border-2 border-dashed border-zinc-300">
                  <CardContent className="p-5 text-center">
                    <BookOpen className="w-8 h-8 text-zinc-400 mx-auto mb-2" />
                    <p className="text-sm text-zinc-500 font-medium">No headings found on this page</p>
                  </CardContent>
                </Card>
              </div>
            )}
          </ScrollArea>
        </aside>

        {/* Overlay for mobile TOC */}
        {isMobileTocOpen && (
          <div
            className="fixed inset-0 bg-black/50 z-30 lg:hidden backdrop-blur-sm"
            onClick={() => setIsMobileTocOpen(false)}
          />
        )}
      </div>

      {/* Back to Top Button with enhanced styling */}
      {showBackToTop && (
        <Button
          onClick={scrollToTop}
          size="icon"
          className="fixed bottom-8 right-8 z-50 shadow-xl hover:shadow-2xl bg-zinc-900 hover:bg-zinc-800 text-white rounded-full w-14 h-14 lg:bottom-12 lg:right-12 transition-all hover:scale-110"
          aria-label="Back to top"
        >
          <ArrowUp className="w-6 h-6" />
        </Button>
      )}
    </div>
  );
}
