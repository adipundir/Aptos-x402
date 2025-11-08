/**
 * Agent Icon Generator
 * 
 * Generates consistent icon assignments for agents based on their ID.
 * Uses Lucide React icons for professional, recognizable symbols.
 */

import type { LucideIcon } from 'lucide-react';
import {
  Bot, Zap, Rocket, Code, Globe, Shield, Database,
  Cpu, Cloud, Server, Terminal, FileCode, Layers,
  Box, Package, Circle, Square, Hexagon, Triangle,
  Star, Heart, Flame, Droplet, Sun, Moon, Target,
  Compass, Map, Navigation, Plane, Car, Ship, Train,
  Building, Home, Store, Factory, GraduationCap, Landmark,
  Music, Video, Image, Film, Camera, Mic, Headphones,
  Book, BookOpen, Briefcase, Wallet, CreditCard,
  ShoppingCart, Gift, Trophy, Medal, Award, Crown,
  Coffee, Utensils, Apple, Cake,
  Gamepad2, Puzzle, Dice1, Palette, Paintbrush,
  Scissors, Wrench, Hammer, Key, Lock,
  Bell, Radio, Phone, Mail, MessageSquare,
  Users, User, UserPlus, UserCheck, UserX, UserCircle,
  Settings, Cog, Sliders, ToggleLeft, ToggleRight,
  Search, Filter, List, Grid, Layout, Columns,
  BarChart, LineChart, PieChart, TrendingUp, TrendingDown,
  Calendar, Clock, Timer, Hourglass,
  Folder, FolderOpen, File, FileText, FileImage, FileVideo,
  Download, Upload, Share, Link, ExternalLink,
  Eye, EyeOff, Unlock,
  Check, X, Plus, Minus, Edit, Trash, Save,
  ArrowRight, ArrowLeft, ArrowUp, ArrowDown,
  ChevronRight, ChevronLeft, ChevronUp, ChevronDown,
  Play, Pause, SkipForward, SkipBack,
  Volume, Volume2, VolumeX,
  Lightbulb, Flashlight, Lamp,
  Trees, Flower, Leaf, Bug, Fish, Bird, Cat, Dog,
  Mountain, Waves,
} from 'lucide-react';

// Collection of verified Lucide icons
const ICONS: LucideIcon[] = [
  Bot, Zap, Rocket, Code, Globe, Shield, Database,
  Cpu, Cloud, Server, Terminal, FileCode, Layers,
  Box, Package, Circle, Square, Hexagon, Triangle,
  Star, Heart, Flame, Droplet, Sun, Moon, Target,
  Compass, Map, Navigation, Plane, Car, Ship, Train,
  Building, Home, Store, Factory, GraduationCap, Landmark,
  Music, Video, Image, Film, Camera, Mic, Headphones,
  Book, BookOpen, Briefcase, Wallet, CreditCard,
  ShoppingCart, Gift, Trophy, Medal, Award, Crown,
  Coffee, Utensils, Apple, Cake,
  Gamepad2, Puzzle, Dice1, Palette, Paintbrush,
  Scissors, Wrench, Hammer, Key, Lock,
  Bell, Radio, Phone, Mail, MessageSquare,
  Users, User, UserPlus, UserCheck, UserX, UserCircle,
  Settings, Cog, Sliders, ToggleLeft, ToggleRight,
  Search, Filter, List, Grid, Layout, Columns,
  BarChart, LineChart, PieChart, TrendingUp, TrendingDown,
  Calendar, Clock, Timer, Hourglass,
  Folder, FolderOpen, File, FileText, FileImage, FileVideo,
  Download, Upload, Share, Link, ExternalLink,
  Eye, EyeOff, Unlock,
  Check, X, Plus, Minus, Edit, Trash, Save,
  ArrowRight, ArrowLeft, ArrowUp, ArrowDown,
  ChevronRight, ChevronLeft, ChevronUp, ChevronDown,
  Play, Pause, SkipForward, SkipBack,
  Volume, Volume2, VolumeX,
  Lightbulb, Flashlight, Lamp,
  Trees, Flower, Leaf, Bug, Fish, Bird, Cat, Dog,
  Mountain, Waves,
];

/**
 * Generate a consistent icon component for an agent based on its ID
 * @param agentId - The agent's unique ID
 * @returns A Lucide icon component
 */
export function getAgentIcon(agentId: string): LucideIcon {
  // Use a simple hash function to convert agentId to a number
  let hash = 0;
  for (let i = 0; i < agentId.length; i++) {
    const char = agentId.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  
  // Ensure positive number and get index
  const index = Math.abs(hash) % ICONS.length;
  return ICONS[index];
}

/**
 * Get a color gradient class based on agent ID
 * @param agentId - The agent's unique ID
 * @returns A Tailwind gradient class
 */
export function getAgentGradient(agentId: string): string {
  const gradients = [
    'from-blue-500 to-blue-600',
    'from-purple-500 to-purple-600',
    'from-green-500 to-green-600',
    'from-red-500 to-red-600',
    'from-yellow-500 to-yellow-600',
    'from-indigo-500 to-indigo-600',
    'from-pink-500 to-pink-600',
    'from-cyan-500 to-cyan-600',
    'from-orange-500 to-orange-600',
    'from-teal-500 to-teal-600',
    'from-violet-500 to-violet-600',
    'from-rose-500 to-rose-600',
  ];
  
  let hash = 0;
  for (let i = 0; i < agentId.length; i++) {
    const char = agentId.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  
  const index = Math.abs(hash) % gradients.length;
  return gradients[index];
}
