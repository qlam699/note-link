import { AppState, AppAction } from '@/types/app';

export const initialState: AppState = {
  content: '',
  linkStatuses: [],
  isChecking: false,
  isSaving: false,
  isLoading: false,
  gistMessage: null,
  hasLoadedGist: false,
};

export const appReducer = (state: AppState, action: AppAction): AppState => {
  switch (action.type) {
    case 'SET_CONTENT':
      return { ...state, content: action.payload };
    
    case 'SET_LINK_STATUSES':
      return { ...state, linkStatuses: action.payload };
    
    case 'UPDATE_LINK_STATUS':
      return {
        ...state,
        linkStatuses: state.linkStatuses.map(status =>
          status.url === action.payload.url
            ? { ...status, status: action.payload.status, error: action.payload.error }
            : status
        ),
      };
    
    case 'ADD_LINK_STATUS':
      return {
        ...state,
        linkStatuses: [...state.linkStatuses.filter(s => s.url !== action.payload.url), action.payload],
      };
    
    case 'SET_IS_CHECKING':
      return { ...state, isChecking: action.payload };
    
    case 'SET_IS_SAVING':
      return { ...state, isSaving: action.payload };
    
    case 'SET_IS_LOADING':
      return { ...state, isLoading: action.payload };
    
    case 'SET_GIST_MESSAGE':
      return { ...state, gistMessage: action.payload };
    
    case 'CLEAR_GIST_MESSAGE':
      return { ...state, gistMessage: null };
    
    case 'SET_HAS_LOADED_GIST':
      return { ...state, hasLoadedGist: action.payload };
    
    case 'RESET_GIST_STATE':
      return {
        ...state,
        hasLoadedGist: false,
        gistMessage: null,
      };
    
    default:
      return state;
  }
};

