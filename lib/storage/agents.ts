/**
 * Agent Storage
 * File-based storage for agent configurations
 */

import * as fs from 'fs';
import * as path from 'path';

export interface Agent {
  id: string;
  name: string;
  description?: string;
  imageUrl?: string;
  visibility: 'public' | 'private';
  walletAddress: string;
  privateKey: string; // Stored server-side only, never exposed to client
  apiIds: string[]; // IDs of APIs this agent can use
  createdAt: string;
  updatedAt: string;
}

const STORAGE_DIR = path.join(process.cwd(), '.composer-data');
const AGENTS_FILE = path.join(STORAGE_DIR, 'agents.json');

// Ensure storage directory exists
function ensureStorageDir() {
  if (!fs.existsSync(STORAGE_DIR)) {
    fs.mkdirSync(STORAGE_DIR, { recursive: true });
  }
}

// Read agents from file
function readAgents(): Agent[] {
  ensureStorageDir();
  if (!fs.existsSync(AGENTS_FILE)) {
    return [];
  }
  try {
    const data = fs.readFileSync(AGENTS_FILE, 'utf-8');
    return JSON.parse(data);
  } catch (error) {
    console.error('Error reading agents file:', error);
    return [];
  }
}

// Write agents to file
function writeAgents(agents: Agent[]): void {
  ensureStorageDir();
  fs.writeFileSync(AGENTS_FILE, JSON.stringify(agents, null, 2));
}

// Generate unique ID
function generateId(): string {
  return `agent_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

export function getAllAgents(): Agent[] {
  return readAgents();
}

export function getAgentById(id: string): Agent | null {
  const agents = readAgents();
  return agents.find(a => a.id === id) || null;
}

export function createAgent(agentData: Omit<Agent, 'id' | 'createdAt' | 'updatedAt'>): Agent {
  const agents = readAgents();
  const newAgent: Agent = {
    ...agentData,
    id: generateId(),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  agents.push(newAgent);
  writeAgents(agents);
  return newAgent;
}

export function updateAgent(id: string, updates: Partial<Omit<Agent, 'id' | 'createdAt' | 'walletAddress' | 'privateKey'>>): Agent | null {
  const agents = readAgents();
  const index = agents.findIndex(a => a.id === id);
  if (index === -1) {
    return null;
  }
  agents[index] = {
    ...agents[index],
    ...updates,
    updatedAt: new Date().toISOString(),
  };
  writeAgents(agents);
  return agents[index];
}

export function deleteAgent(id: string): boolean {
  const agents = readAgents();
  const filtered = agents.filter(a => a.id !== id);
  if (filtered.length === agents.length) {
    return false; // Agent not found
  }
  writeAgents(filtered);
  return true;
}

// Client-safe version (without private key)
export function getAgentForClient(agent: Agent): Omit<Agent, 'privateKey'> {
  const { privateKey, ...clientSafe } = agent;
  return clientSafe;
}


