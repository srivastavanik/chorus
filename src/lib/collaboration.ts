// Collaboration utilities for real-time canvas sharing

export const COLLABORATOR_COLORS = [
  '#ef4444', // red
  '#f97316', // orange
  '#eab308', // yellow
  '#22c55e', // green
  '#06b6d4', // cyan
  '#3b82f6', // blue
  '#8b5cf6', // violet
  '#ec4899', // pink
  '#f43f5e', // rose
  '#14b8a6', // teal
  '#6366f1', // indigo
  '#a855f7', // purple
] as const;

export type CollaboratorColor = typeof COLLABORATOR_COLORS[number];

export interface Collaborator {
  id: string;
  name: string;
  email: string;
  avatarUrl: string | null;
  color: CollaboratorColor;
  cursor?: { x: number; y: number } | null;
  activeNodeId?: string | null;
  lastSeen: number;
}

export interface PresenceState {
  odlaborators: Map<string, Collaborator>;
  myColor: CollaboratorColor;
}

/**
 * Generate a DiceBear avatar URL based on user identifier
 */
export function generateAvatarUrl(seed: string): string {
  const encodedSeed = encodeURIComponent(seed);
  return `https://api.dicebear.com/7.x/initials/svg?seed=${encodedSeed}&backgroundColor=0a0a0a&textColor=ffffff`;
}

/**
 * Get an avatar URL with fallback to generated avatar
 */
export function getAvatarUrl(avatarUrl: string | null | undefined, email: string): string {
  return avatarUrl || generateAvatarUrl(email);
}

/**
 * Assign a color to a user based on their position in the collaborators list
 */
export function assignColor(index: number): CollaboratorColor {
  return COLLABORATOR_COLORS[index % COLLABORATOR_COLORS.length];
}

/**
 * Generate a unique share token
 */
export function generateShareToken(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let token = '';
  for (let i = 0; i < 16; i++) {
    token += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return token;
}

/**
 * Get the share URL for a canvas
 */
export function getShareUrl(token: string): string {
  if (typeof window === 'undefined') return '';
  return `${window.location.origin}/canvas/share/${token}`;
}

export type SharePermission = 'view' | 'edit';

export interface CanvasShare {
  id: string;
  canvasId: string;
  shareToken: string;
  permission: SharePermission;
  isPublic: boolean;
  createdAt: string;
}

export interface CanvasVersion {
  id: string;
  canvasId: string;
  versionNumber: number;
  nodes: any[];
  edges: any[];
  createdBy: string | null;
  createdAt: string;
}

/**
 * Format a timestamp for version history display
 */
export function formatVersionTime(timestamp: string): string {
  const date = new Date(timestamp);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  
  return date.toLocaleDateString('en-US', { 
    month: 'short', 
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit'
  });
}

