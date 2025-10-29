import { readFile } from 'fs/promises';
import { join } from 'path';
import { notFound } from 'next/navigation';
import DocsClient from './docs-client';

interface DocItem {
  title: string;
  path?: string;
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
      { title: 'AI IDE Integration', path: 'guides/ai-ide-integration.md' },
      { title: 'Facilitator Setup', path: 'guides/facilitator-setup.md' },
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

// Get all doc paths for static generation
function getAllDocPaths() {
  const paths: string[] = [];
  docsStructure.forEach(item => {
    if (item.path) paths.push(item.path);
    if (item.children) {
      item.children.forEach(child => {
        if (child.path) paths.push(child.path);
      });
    }
  });
  return paths;
}

export async function generateStaticParams() {
  const paths = getAllDocPaths();
  // Generate params for all docs including the root
  const params = paths.map((path) => ({
    slug: path.replace('.md', '').split('/'),
  }));
  // Add the empty slug for /docs route
  params.push({ slug: [] });
  return params;
}

export default async function DocsPage({ params }: { params: Promise<{ slug?: string[] }> }) {
  const { slug = [] } = await params;
  const docPath = slug.join('/') + '.md';
  
  // Default to README.md if no slug
  const finalPath = slug.length === 0 ? 'README.md' : docPath;
  
  try {
    const fullPath = join(process.cwd(), 'docs', finalPath);
    const content = await readFile(fullPath, 'utf-8');
    
    return <DocsClient 
      initialContent={content}
      initialDocPath={finalPath}
      docsStructure={docsStructure}
    />;
  } catch (error) {
    console.error('Error reading doc:', error);
    notFound();
  }
}
