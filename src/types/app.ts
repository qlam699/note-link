export interface LinkStatus {
  url: string;
  status: 'idle' | 'checking' | 'working' | 'failed';
  error?: string;
  startIndex: number;
  endIndex: number;
}

export interface AppState {
  content: string;
  linkStatuses: LinkStatus[];
  isChecking: boolean;
  isSaving: boolean;
  isLoading: boolean;
  gistMessage: { type: 'success' | 'error'; text: string } | null;
  hasLoadedGist: boolean;
}

export type AppAction =
  | { type: 'SET_CONTENT'; payload: string }
  | { type: 'SET_LINK_STATUSES'; payload: LinkStatus[] }
  | { type: 'UPDATE_LINK_STATUS'; payload: { url: string; status: LinkStatus['status']; error?: string } }
  | { type: 'ADD_LINK_STATUS'; payload: LinkStatus }
  | { type: 'SET_IS_CHECKING'; payload: boolean }
  | { type: 'SET_IS_SAVING'; payload: boolean }
  | { type: 'SET_IS_LOADING'; payload: boolean }
  | { type: 'SET_GIST_MESSAGE'; payload: { type: 'success' | 'error'; text: string } | null }
  | { type: 'CLEAR_GIST_MESSAGE' }
  | { type: 'SET_HAS_LOADED_GIST'; payload: boolean }
  | { type: 'RESET_GIST_STATE' };

