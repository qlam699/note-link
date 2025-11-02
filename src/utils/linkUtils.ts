import { LinkStatus } from '@/types/app';

// URL regex pattern - more robust
export const urlRegex = /https?:\/\/[^\s<>"']+/g;

// Extract URLs from content
export const extractUrls = (text: string): string[] => {
  const matches = text.match(urlRegex);
  return matches || [];
};

// Check if URL is already being checked or has been checked
export const isUrlInProgress = (url: string, linkStatuses: LinkStatus[]): boolean => {
  return linkStatuses.some(status => status.url === url && status.status === 'checking');
};

// Check if URL has been checked
export const getUrlStatus = (url: string, linkStatuses: LinkStatus[]): LinkStatus | undefined => {
  return linkStatuses.find(status => status.url === url);
};

