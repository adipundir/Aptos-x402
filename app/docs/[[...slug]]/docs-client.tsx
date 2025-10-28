'use client';

import { useState, useEffect, useMemo } from 'react';
import { ChevronLeft, ChevronRight, Menu, X, BookOpen, Code2, Rocket, Zap, ArrowUp } from 'lucide-react';
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
    if (item.children) {
      const isExpanded = expandedSections.has(item.title);
      return (
        <div key={item.title} className="mb-2">
          <button
            onClick={() => toggleSection(item.title)}
            className={`w-full text-left px-3 py-2.5 hover:bg-zinc-50 transition-all duration-200 flex items-center justify-between rounded-lg group ${
              level > 0 ? 'text-sm ml-3' : 'font-semibold text-sm'
            }`}
          >
            <div className="flex items-center gap-2">
              {level === 0 && getSectionIcon(item.title)}
              <span className={level === 0 ? 'text-zinc-900' : 'text-zinc-700'}>{item.title}</span>
              {level === 0 && item.children && (
                <Badge variant="secondary" className={`text-xs font-normal ${getSectionBadge()}`}>
                  {item.children.length}
                </Badge>
              )}
            </div>
            <ChevronRight className={`w-4 h-4 text-zinc-400 transition-transform duration-200 ${isExpanded ? 'rotate-90' : ''}`} />
          </button>
          {isExpanded && (
            <div className="mt-1 space-y-0.5 pl-3 ml-3 border-l-2 border-zinc-100">
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
        className={`w-full text-left px-3 py-2 transition-all duration-200 text-sm rounded-lg ${
          isSelected 
            ? 'bg-zinc-100 text-zinc-900 font-medium' 
            : 'text-zinc-600 hover:bg-zinc-50 hover:text-zinc-900'
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
    
    html = html.replace(/`([^`]+)`/g, '<code class="bg-zinc-100 text-zinc-600 px-1.5 py-0.5 rounded text-sm font-mono">$1</code>');
    
    html = html.replace(/^#### (.*?)$/gm, (match, text) => {
      const id = text.toLowerCase().replace(/[^\w]+/g, '-');
      return `<h4 id="${id}" class="text-xl font-semibold mb-3 mt-6 text-zinc-900 scroll-mt-20">${text}</h4>`;
    });
    html = html.replace(/^### (.*?)$/gm, (match, text) => {
      const id = text.toLowerCase().replace(/[^\w]+/g, '-');
      return `<h3 id="${id}" class="text-2xl font-semibold mb-4 mt-8 text-zinc-900 scroll-mt-20">${text}</h3>`;
    });
    html = html.replace(/^## (.*?)$/gm, (match, text) => {
      const id = text.toLowerCase().replace(/[^\w]+/g, '-');
      return `<h2 id="${id}" class="text-3xl font-bold mb-5 mt-10 text-zinc-900 scroll-mt-20">${text}</h2>`;
    });
    html = html.replace(/^# (.*?)$/gm, (match, text) => {
      const id = text.toLowerCase().replace(/[^\w]+/g, '-');
      return `<h1 id="${id}" class="text-4xl font-bold mb-6 mt-2 text-zinc-900 scroll-mt-20">${text}</h1>`;
    });
    
    html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" class="text-zinc-900 hover:text-zinc-700 underline" target="_blank" rel="noopener noreferrer">$1</a>');
    html = html.replace(/\*\*(.*?)\*\*/g, '<strong class="font-semibold text-zinc-900">$1</strong>');
    html = html.replace(/\*(.*?)\*/g, '<em class="italic text-zinc-800">$1</em>');
    
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
        listItems.push(`<li class="mb-2 text-zinc-900">${listMatch[1]}</li>`);
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
        return `<p class="mb-5 leading-relaxed text-base text-zinc-900">${trimmed}</p>`;
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
    <div className="min-h-screen bg-white flex flex-col pt-16 docs-page">
      {/* Mobile Menu Button */}
      <Button
        onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
        variant="outline"
        size="icon"
        className="fixed top-20 left-4 z-50 lg:hidden shadow-lg"
        aria-label="Toggle menu"
      >
        {isMobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
      </Button>

      {/* Mobile TOC Button */}
      <Button
        onClick={() => setIsMobileTocOpen(!isMobileTocOpen)}
        variant="outline"
        size="icon"
        className="fixed top-20 right-4 z-50 lg:hidden shadow-lg"
        aria-label="Toggle table of contents"
      >
        <BookOpen className="w-5 h-5" />
      </Button>

      <div className="flex flex-1">
        {/* Sidebar - Mobile Overlay */}
        <aside className={`fixed left-0 top-16 bottom-0 w-72 border-r border-zinc-200 bg-white overflow-y-auto shadow-sm z-40 transition-transform duration-300 lg:translate-x-0 ${
          isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'
        }`}>
          <ScrollArea className="h-[calc(100vh-4rem)]">
            <nav className="py-6 px-4">
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

        {/* Main Content */}
        <main className="flex-1 px-4 py-8 lg:ml-72 lg:mr-80 lg:px-12 lg:py-12 overflow-x-hidden">
          <article className="max-w-4xl mx-auto w-full">
            {/* Hero Section for Welcome Page */}
            {isWelcomePage && (
              <div className="mb-12">
                <Card className="border border-zinc-200">
                  <CardContent className="p-8 lg:p-12">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="p-2 rounded-lg bg-zinc-100">
                        <Zap className="w-6 h-6 text-zinc-900" />
                      </div>
                      <Badge variant="outline" className="text-zinc-600 border-zinc-300">
                        HTTP 402 Protocol
                      </Badge>
                    </div>
                    <h1 className="text-4xl lg:text-5xl font-bold mb-4 text-zinc-900">
                      Welcome to Aptos x402
                    </h1>
                    <p className="text-lg text-zinc-600 mb-8 leading-relaxed max-w-2xl">
                      A revolutionary HTTP 402 implementation for Aptos blockchain. Enable seamless micropayments and pay-per-use APIs with built-in blockchain verification.
                    </p>
                    <div className="flex flex-wrap gap-3">
                      <Button
                        onClick={() => navigateToDoc('getting-started/quickstart-sellers.md')}
                        className="bg-zinc-900 text-white hover:bg-zinc-800"
                        size="lg"
                      >
                        <Rocket className="w-4 h-4 mr-2" />
                        Get Started
                      </Button>
                      <Button
                        onClick={() => navigateToDoc('core-concepts/http-402.md')}
                        variant="outline"
                        className="border-zinc-900 text-white hover:bg-zinc-100"
                        size="lg"
                      >
                        <BookOpen className="w-4 h-4 mr-2" />
                        Learn More
                      </Button>
                    </div>
                  </CardContent>
                </Card>

                {/* Quick Links */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
                  <Card className="hover:shadow-md transition-all duration-200 cursor-pointer border border-zinc-200" onClick={() => navigateToDoc('getting-started/quickstart-sellers.md')}>
                    <CardContent className="p-6">
                      <div className="flex items-center gap-3 mb-3">
                        <div className="p-2 rounded-lg bg-zinc-100">
                          <Rocket className="w-5 h-5 text-zinc-900" />
                        </div>
                        <h3 className="font-semibold text-zinc-900">Quick Start</h3>
                      </div>
                      <p className="text-sm text-zinc-600">Get up and running in minutes with our quickstart guides</p>
                    </CardContent>
                  </Card>
                  <Card className="hover:shadow-md transition-all duration-200 cursor-pointer border border-zinc-200" onClick={() => navigateToDoc('api-reference/server-api.md')}>
                    <CardContent className="p-6">
                      <div className="flex items-center gap-3 mb-3">
                        <div className="p-2 rounded-lg bg-zinc-100">
                          <Code2 className="w-5 h-5 text-zinc-900" />
                        </div>
                        <h3 className="font-semibold text-zinc-900">API Reference</h3>
                      </div>
                      <p className="text-sm text-zinc-600">Complete API documentation and type definitions</p>
                    </CardContent>
                  </Card>
                  <Card className="hover:shadow-md transition-all duration-200 cursor-pointer border border-zinc-200" onClick={() => navigateToDoc('examples/simple-seller.md')}>
                    <CardContent className="p-6">
                      <div className="flex items-center gap-3 mb-3">
                        <div className="p-2 rounded-lg bg-zinc-100">
                          <Zap className="w-5 h-5 text-zinc-900" />
                        </div>
                        <h3 className="font-semibold text-zinc-900">Examples</h3>
                      </div>
                      <p className="text-sm text-zinc-600">Real-world examples and implementation patterns</p>
                    </CardContent>
                  </Card>
                </div>
              </div>
            )}

            {/* Breadcrumbs */}
            {!isWelcomePage && (
              <nav className="flex items-center gap-2 text-sm text-zinc-600 mb-6">
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
                      <ChevronRight className="w-4 h-4 text-zinc-400" />
                    )}
                  </div>
                ))}
              </nav>
            )}
            
            <div className="prose prose-lg max-w-none prose-headings:scroll-mt-20 prose-a:text-zinc-900 prose-a:underline hover:prose-a:text-zinc-700 prose-code:text-zinc-600 prose-code:bg-zinc-100 prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded prose-code:text-sm prose-code:font-mono prose-pre:p-0 prose-pre:bg-transparent overflow-x-hidden">
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
            <Separator className="my-12" />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-8">
              {prevDoc ? (
                <Card className="group hover:shadow-md transition-all duration-200 cursor-pointer border border-zinc-200">
                  <CardContent 
                    className="p-5"
                    onClick={() => navigateToDoc(prevDoc.path)}
                  >
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-zinc-100">
                        <ChevronLeft className="w-4 h-4 text-zinc-600" />
                      </div>
                      <div className="text-left flex-1">
                        <div className="text-xs text-zinc-500 uppercase tracking-wide font-medium mb-1">Previous</div>
                        <div className="text-sm font-semibold text-zinc-900">{prevDoc.title}</div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ) : <div className="hidden sm:block" />}
              
              {nextDoc && (
                <Card className="group hover:shadow-md transition-all duration-200 cursor-pointer border border-zinc-200">
                  <CardContent 
                    className="p-5"
                    onClick={() => navigateToDoc(nextDoc.path)}
                  >
                    <div className="flex items-center justify-end gap-3">
                      <div className="text-right flex-1">
                        <div className="text-xs text-zinc-500 uppercase tracking-wide font-medium mb-1">Next</div>
                        <div className="text-sm font-semibold text-zinc-900">{nextDoc.title}</div>
                      </div>
                      <div className="p-2 rounded-lg bg-zinc-100">
                        <ChevronRight className="w-4 h-4 text-zinc-600" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          </article>
        </main>

        {/* Table of Contents - Mobile Overlay */}
        <aside className={`fixed right-0 top-16 bottom-0 w-80 border-l border-zinc-200 bg-white overflow-y-auto shadow-sm z-40 transition-transform duration-300 lg:translate-x-0 ${
          isMobileTocOpen ? 'translate-x-0' : 'translate-x-full'
        }`}>
          <div className="p-6 border-b border-zinc-100 sticky top-0 z-10 bg-white">
            <div className="flex items-center gap-2 mb-2">
              <div className="p-1.5 rounded-md bg-zinc-100">
                <BookOpen className="w-4 h-4 text-zinc-600" />
              </div>
              <h3 className="text-sm font-bold text-zinc-900">On This Page</h3>
            </div>
          </div>
          <ScrollArea className="h-[calc(100vh-8rem)]">
            {tableOfContents.length > 0 ? (
              <nav className="p-6 space-y-1">
                {tableOfContents.map((item, idx) => (
                  <a
                    key={item.id}
                    href={`#${item.id}`}
                    className={`block text-sm hover:text-zinc-900 transition-all duration-200 py-2 rounded-lg hover:bg-zinc-50 px-3 group relative ${
                      item.level === 1 ? 'font-medium text-zinc-800' : 
                      item.level === 2 ? 'text-zinc-600 pl-6' : 
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
                        <span className="absolute -left-3 top-1/2 -translate-y-1/2 w-1.5 h-1.5 rounded-full bg-zinc-300 group-hover:bg-zinc-500" />
                      )}
                      {item.text}
                    </span>
                  </a>
                ))}
              </nav>
            ) : (
              <div className="p-6">
                <Card className="bg-zinc-50 border-dashed border-zinc-300">
                  <CardContent className="p-4 text-center">
                    <p className="text-sm text-zinc-500">No headings found on this page</p>
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

      {/* Back to Top Button */}
      {showBackToTop && (
        <Button
          onClick={scrollToTop}
          size="icon"
          className="fixed bottom-8 right-8 z-50 shadow-lg bg-zinc-900 hover:bg-zinc-800 text-white rounded-full w-12 h-12 lg:bottom-12 lg:right-12"
          aria-label="Back to top"
        >
          <ArrowUp className="w-5 h-5" />
        </Button>
      )}
    </div>
  );
}
