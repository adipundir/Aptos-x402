/**
 * Chat Storage
 * File-based storage for chat conversations
 */

import * as fs from 'fs';
import * as path from 'path';

export interface ChatMessage {
  id: string;
  role: 'user' | 'agent';
  content: string;
  timestamp: string;
  metadata?: {
    apiCalled?: string;
    paymentHash?: string;
    error?: string;
  };
}

export interface ChatThread {
  id: string;
  agentId: string;
  messages: ChatMessage[];
  createdAt: string;
  updatedAt: string;
}

const STORAGE_DIR = path.join(process.cwd(), '.composer-data');
const CHATS_FILE = path.join(STORAGE_DIR, 'chats.json');

// Ensure storage directory exists
function ensureStorageDir() {
  if (!fs.existsSync(STORAGE_DIR)) {
    fs.mkdirSync(STORAGE_DIR, { recursive: true });
  }
}

// Read chats from file
function readChats(): ChatThread[] {
  ensureStorageDir();
  if (!fs.existsSync(CHATS_FILE)) {
    return [];
  }
  try {
    const data = fs.readFileSync(CHATS_FILE, 'utf-8');
    return JSON.parse(data);
  } catch (error) {
    console.error('Error reading chats file:', error);
    return [];
  }
}

// Write chats to file
function writeChats(chats: ChatThread[]): void {
  ensureStorageDir();
  fs.writeFileSync(CHATS_FILE, JSON.stringify(chats, null, 2));
}

// Generate unique ID
function generateId(): string {
  return `chat_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

function generateMessageId(): string {
  return `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

export function getChatByAgentId(agentId: string): ChatThread | null {
  const chats = readChats();
  return chats.find(c => c.agentId === agentId) || null;
}

export function getOrCreateChat(agentId: string): ChatThread {
  const chats = readChats();
  let chat = chats.find(c => c.agentId === agentId);
  
  if (!chat) {
    chat = {
      id: generateId(),
      agentId,
      messages: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    chats.push(chat);
    writeChats(chats);
  }
  
  return chat;
}

export function addMessage(agentId: string, message: Omit<ChatMessage, 'id' | 'timestamp'>): ChatMessage {
  const chats = readChats();
  let chat = chats.find(c => c.agentId === agentId);
  
  if (!chat) {
    chat = {
      id: generateId(),
      agentId,
      messages: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    chats.push(chat);
  }
  
  const newMessage: ChatMessage = {
    ...message,
    id: generateMessageId(),
    timestamp: new Date().toISOString(),
  };
  
  chat.messages.push(newMessage);
  chat.updatedAt = new Date().toISOString();
  
  writeChats(chats);
  return newMessage;
}

export function clearChat(agentId: string): boolean {
  const chats = readChats();
  const chat = chats.find(c => c.agentId === agentId);
  if (!chat) {
    return false;
  }
  chat.messages = [];
  chat.updatedAt = new Date().toISOString();
  writeChats(chats);
  return true;
}


