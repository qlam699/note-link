'use client';

import { useReducer, useRef, useEffect, useCallback } from 'react';
import { Save, Download } from 'lucide-react';
import { useSession } from 'next-auth/react';
import AuthButton from '@/components/AuthButton';
import { LinkStatus } from '@/types/app';
import { appReducer, initialState } from '@/reducers/appReducer';
import { extractUrls, isUrlInProgress, getUrlStatus } from '@/utils/linkUtils';
import { applyHighlighting } from '@/utils/editorUtils';
import { useGistOperations } from '@/hooks/useGistOperations';

export default function Home() {
  const [state, dispatch] = useReducer(appReducer, initialState);
  const editorRef = useRef<HTMLDivElement>(null);
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const { data: session, status: sessionStatus } = useSession();

  // Destructure state for easier access
  const { content, linkStatuses, isChecking, isSaving, isLoading, gistMessage, hasLoadedGist } = state;

  // Create a memoized version of applyHighlighting that uses current state
  const applyHighlightingWithState = useCallback(() => {
    applyHighlighting(editorRef, linkStatuses);
  }, [linkStatuses]);

  // Check a single link
  const checkLink = useCallback(async (url: string) => {
    console.log('checkLink called for:', url);
    
    // Don't check if already in progress
    if (isUrlInProgress(url, linkStatuses)) {
      console.log('URL already in progress:', url);
      return;
    }

    console.log('Starting check for:', url);
    
    // Add to checking status
    const newStatus: LinkStatus = {
      url,
      status: 'checking',
      startIndex: content.indexOf(url),
      endIndex: content.indexOf(url) + url.length
    };

    dispatch({ type: 'ADD_LINK_STATUS', payload: newStatus });

    try {
      console.log('Making API call for:', url);
      const response = await fetch('/api/check-link', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ url }),
      });

      const result = await response.json();
      console.log('API result for', url, ':', result);
      
      dispatch({ 
        type: 'UPDATE_LINK_STATUS', 
        payload: { url, status: result.status, error: result.error } 
      });
    } catch (error) {
      dispatch({ 
        type: 'UPDATE_LINK_STATUS', 
        payload: { url, status: 'failed', error: 'Network error' } 
      });
    }
  }, [content, linkStatuses]);

  // Check all links in content
  const checkAllLinks = async () => {
    const urls = extractUrls(content);
    if (urls.length === 0) return;

    dispatch({ type: 'SET_IS_CHECKING', payload: true });
    
    for (const url of urls) {
      await checkLink(url);
      // Small delay to avoid overwhelming the server
      await new Promise(resolve => setTimeout(resolve, 300));
    }
    
    dispatch({ type: 'SET_IS_CHECKING', payload: false });
  };

  // Debounced link checking function
  const debouncedCheckLinks = useCallback((newContent: string) => {
    // Clear existing timer
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }
    
    // Set new timer
    debounceTimerRef.current = setTimeout(() => {
      const urls = extractUrls(newContent);
      console.log('Found URLs:', urls);
      
      urls.forEach(url => {
        const existingStatus = getUrlStatus(url, linkStatuses);
        console.log('URL:', url, 'existing status:', existingStatus);
        if (!existingStatus) {
          // New URL found, check it
          console.log('Scheduling check for:', url);
          checkLink(url);
        }
      });
    }, 2000); // 2000ms debounce delay
  }, [linkStatuses, checkLink]);

  // Handle content changes
  const handleContentChange = (newContent: string) => {
    console.log('Content changed:', newContent);
    dispatch({ type: 'SET_CONTENT', payload: newContent });
    
    // Debounce link checking
    debouncedCheckLinks(newContent);
  };

  // Handle paste event
  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const text = e.clipboardData.getData('text/plain');
    
    // Insert text at cursor position while preserving line breaks
    const selection = window.getSelection();
    if (selection && selection.rangeCount > 0) {
      const range = selection.getRangeAt(0);
      range.deleteContents();
      
      // Split text by newlines and insert each line as a separate text node
      // with <br> elements for line breaks
      const lines = text.split('\n');
      lines.forEach((line, i) => {
        // Insert the line text
        if (line) {
          range.insertNode(document.createTextNode(line));
        }
        
        // If not the last line, insert a line break
        if (i < lines.length - 1) {
          range.collapse(false);
          const br = document.createElement('br');
          range.insertNode(br);
        }
        
        // Move the range to the end for the next insertion
        range.collapse(false);
      });
      
      // Update content state
      if (editorRef.current) {
        const newContent = editorRef.current.innerText;
        dispatch({ type: 'SET_CONTENT', payload: newContent });
        
        // Debounce link checking
        debouncedCheckLinks(newContent);
      }
    }
  };


  // Use Gist operations hook
  const { handleSaveGist, handleLoadGist } = useGistOperations({
    dispatch,
    content,
    editorRef,
    applyHighlighting: applyHighlightingWithState,
  });

  // Effect to apply highlighting when link statuses change
  useEffect(() => {
    applyHighlightingWithState();
  }, [applyHighlightingWithState]);

  // Auto-load gist when user logs in
  useEffect(() => {
    if (sessionStatus === 'authenticated' && session && !hasLoadedGist) {
      handleLoadGist();
      dispatch({ type: 'SET_HAS_LOADED_GIST', payload: true });
    }
    
    // Reset hasLoadedGist when user signs out
    if (sessionStatus === 'unauthenticated') {
      dispatch({ type: 'RESET_GIST_STATE' });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionStatus, session]);

  // Cleanup debounce timer on unmount
  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, []);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <h1 className="text-2xl font-bold text-gray-900">
              Note Links - qlam
            </h1>
            <AuthButton />
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white rounded-lg shadow-sm border">
          {/* Editor Header */}
          <div className="px-6 py-4 border-b border-gray-200">
            <div className="flex justify-between items-center">
              <h2 className="text-lg font-semibold text-gray-900">
                Link Status Checker
              </h2>
              <div className="flex gap-2">
                {session && (
                  <>
                    <button
                      onClick={handleSaveGist}
                      disabled={isSaving || !session}
                      className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isSaving ? (
                        <>
                          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                          Saving...
                        </>
                      ) : (
                        <>
                          <Save className="w-4 h-4 mr-2" />
                          Save Note
                        </>
                      )}
                    </button>
                    <button
                      onClick={handleLoadGist}
                      disabled={isLoading || !session}
                      className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isLoading ? (
                        <>
                          <div className="w-4 h-4 border-2 border-gray-700 border-t-transparent rounded-full animate-spin mr-2" />
                          Loading...
                        </>
                      ) : (
                        <>
                          <Download className="w-4 h-4 mr-2" />
                          Load Note
                        </>
                      )}
                    </button>
                  </>
                )}
                <button
                  onClick={checkAllLinks}
                  disabled={isChecking || extractUrls(content).length === 0}
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isChecking ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                      Checking...
                    </>
                  ) : (
                    'Check All Links'
                  )}
                </button>
              </div>
            </div>
            {gistMessage && (
              <div className={`mt-3 px-4 py-2 rounded-md text-sm ${
                gistMessage.type === 'success' 
                  ? 'bg-green-50 text-green-800 border border-green-200' 
                  : 'bg-red-50 text-red-800 border border-red-200'
              }`}>
                {gistMessage.text}
              </div>
            )}
          </div>

          {/* Text Editor */}
          <div className="p-6">
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Paste or type your content with links:
              </label>
              <div
                ref={editorRef}
                contentEditable
                className="w-full min-h-[300px] p-4 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 text-black"
                onInput={(e) => handleContentChange(e.currentTarget.innerText)}
                onPaste={handlePaste}
                data-placeholder="Paste your content here with links. Links will be automatically checked and highlighted."
                suppressContentEditableWarning={true}
              />
            </div>
            
            {/* Instructions */}
            <div className="mt-4 p-4 bg-gray-50 rounded-md">
              <h3 className="text-sm font-medium text-gray-900 mb-2">How to use:</h3>
              <ul className="text-sm text-gray-600 space-y-1">
                <li>• Paste or type content containing URLs in the editor</li>
                <li>• Links are automatically detected and highlighted in real-time (with 2 second delay)</li>
                <li>• <span className="bg-green-100 text-green-800 px-1 py-0.5 rounded text-xs">Green highlight</span> = Working link</li>
                <li>• <span className="bg-red-100 text-red-800 px-1 py-0.5 rounded text-xs">Red highlight</span> = Failed link</li>
                <li>• <span className="bg-blue-100 text-blue-800 px-1 py-0.5 rounded text-xs">Blue highlight</span> = Checking</li>
                <li>• <span className="bg-gray-100 text-gray-800 px-1 py-0.5 rounded text-xs">Gray highlight</span> = Not checked</li>
                <li>• Click on any highlighted link to open it in a new tab</li>
                <li>• Use &quot;Check All Links&quot; to recheck all links</li>
                {session && (
                  <>
                    <li>• Sign in with GitHub to save your notes to a private Gist</li>
                    <li>• Use &quot;Save Note&quot; to save your content to GitHub Gist</li>
                    <li>• Use &quot;Load Note&quot; to load your saved content (auto-loads on login)</li>
                    <li>• Each user has one dedicated Gist for note storage</li>
                  </>
                )}
              </ul>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}