import { useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { AppAction } from '@/types/app';

interface UseGistOperationsProps {
  dispatch: React.Dispatch<AppAction>;
  content: string;
  editorRef: React.RefObject<HTMLDivElement | null>;
  applyHighlighting: () => void;
}

export const useGistOperations = ({
  dispatch,
  content,
  editorRef,
  applyHighlighting,
}: UseGistOperationsProps) => {
  const { data: session } = useSession();

  const handleSaveGist = useCallback(async () => {
    if (!session) {
      dispatch({ type: 'SET_GIST_MESSAGE', payload: { type: 'error', text: 'Please sign in to save your note' } });
      return;
    }

    dispatch({ type: 'SET_IS_SAVING', payload: true });
    dispatch({ type: 'CLEAR_GIST_MESSAGE' });

    try {
      const currentContent = editorRef.current?.innerText || content;
      
      const response = await fetch('/api/gist', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ content: currentContent }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to save gist');
      }

      dispatch({ type: 'SET_CONTENT', payload: currentContent });
      dispatch({ type: 'SET_GIST_MESSAGE', payload: { type: 'success', text: 'Note saved to GitHub Gist successfully!' } });
      
      // Clear message after 3 seconds
      setTimeout(() => dispatch({ type: 'CLEAR_GIST_MESSAGE' }), 3000);
    } catch (error) {
      console.error('Error saving gist:', error);
      dispatch({ 
        type: 'SET_GIST_MESSAGE', 
        payload: { 
          type: 'error', 
          text: error instanceof Error ? error.message : 'Failed to save note' 
        } 
      });
      setTimeout(() => dispatch({ type: 'CLEAR_GIST_MESSAGE' }), 5000);
    } finally {
      dispatch({ type: 'SET_IS_SAVING', payload: false });
    }
  }, [session, dispatch, content, editorRef]);

  const handleLoadGist = useCallback(async () => {
    if (!session) {
      dispatch({ type: 'SET_GIST_MESSAGE', payload: { type: 'error', text: 'Please sign in to load your note' } });
      return;
    }

    dispatch({ type: 'SET_IS_LOADING', payload: true });
    dispatch({ type: 'CLEAR_GIST_MESSAGE' });

    try {
      const response = await fetch('/api/gist', {
        method: 'GET',
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to load gist');
      }

      if (result.content === null) {
        dispatch({ type: 'SET_GIST_MESSAGE', payload: { type: 'success', text: 'No saved note found. Save your note first.' } });
        setTimeout(() => dispatch({ type: 'CLEAR_GIST_MESSAGE' }), 3000);
        return;
      }

      // Update editor content
      if (editorRef.current) {
        editorRef.current.innerText = result.content;
        dispatch({ type: 'SET_CONTENT', payload: result.content });
        
        // Trigger highlighting update
        applyHighlighting();
      }

      dispatch({ type: 'SET_GIST_MESSAGE', payload: { type: 'success', text: 'Note loaded from GitHub Gist successfully!' } });
      setTimeout(() => dispatch({ type: 'CLEAR_GIST_MESSAGE' }), 3000);
    } catch (error) {
      console.error('Error loading gist:', error);
      dispatch({ 
        type: 'SET_GIST_MESSAGE', 
        payload: { 
          type: 'error', 
          text: error instanceof Error ? error.message : 'Failed to load note' 
        } 
      });
      setTimeout(() => dispatch({ type: 'CLEAR_GIST_MESSAGE' }), 5000);
    } finally {
      dispatch({ type: 'SET_IS_LOADING', payload: false });
    }
  }, [session, dispatch, editorRef, applyHighlighting]);

  return { handleSaveGist, handleLoadGist };
};

