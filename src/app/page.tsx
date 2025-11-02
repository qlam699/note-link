'use client';

import { useState, useRef, useEffect } from 'react';
import { CheckCircle, XCircle, Wifi } from 'lucide-react';
import AuthButton from '@/components/AuthButton';

interface LinkStatus {
  url: string;
  status: 'idle' | 'checking' | 'working' | 'failed';
  error?: string;
  startIndex: number;
  endIndex: number;
}

export default function Home() {
  const [content, setContent] = useState('');
  const [linkStatuses, setLinkStatuses] = useState<LinkStatus[]>([]);
  const [isChecking, setIsChecking] = useState(false);
  const editorRef = useRef<HTMLDivElement>(null);
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

  // URL regex pattern - more robust
  const urlRegex = /https?:\/\/[^\s<>"']+/g;

  // Extract URLs from content
  const extractUrls = (text: string): string[] => {
    const matches = text.match(urlRegex);
    return matches || [];
  };

  // Check if URL is already being checked or has been checked
  const isUrlInProgress = (url: string) => {
    return linkStatuses.some(status => status.url === url && status.status === 'checking');
  };

  // Check if URL has been checked
  const getUrlStatus = (url: string) => {
    return linkStatuses.find(status => status.url === url);
  };

  // Check a single link
  const checkLink = async (url: string) => {
    console.log('checkLink called for:', url);
    
    // Don't check if already in progress
    if (isUrlInProgress(url)) {
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

    setLinkStatuses(prev => [...prev.filter(s => s.url !== url), newStatus]);

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
      
      setLinkStatuses(prev => 
        prev.map(status => 
          status.url === url 
            ? { ...status, status: result.status, error: result.error }
            : status
        )
      );
    } catch (error) {
      setLinkStatuses(prev => 
        prev.map(status => 
          status.url === url 
            ? { ...status, status: 'failed', error: 'Network error' }
            : status
        )
      );
    }
  };

  // Check all links in content
  const checkAllLinks = async () => {
    const urls = extractUrls(content);
    if (urls.length === 0) return;

    setIsChecking(true);
    
    for (const url of urls) {
      await checkLink(url);
      // Small delay to avoid overwhelming the server
      await new Promise(resolve => setTimeout(resolve, 300));
    }
    
    setIsChecking(false);
  };

  // Debounced link checking function
  const debouncedCheckLinks = (newContent: string) => {
    // Clear existing timer
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }
    
    // Set new timer
    debounceTimerRef.current = setTimeout(() => {
      const urls = extractUrls(newContent);
      console.log('Found URLs:', urls);
      
      urls.forEach(url => {
        const existingStatus = getUrlStatus(url);
        console.log('URL:', url, 'existing status:', existingStatus);
        if (!existingStatus) {
          // New URL found, check it
          console.log('Scheduling check for:', url);
          checkLink(url);
        }
      });
    }, 2000); // 2000ms debounce delay
  };

  // Handle content changes
  const handleContentChange = (newContent: string) => {
    console.log('Content changed:', newContent);
    setContent(newContent);
    
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
        setContent(newContent);
        
        // Debounce link checking
        debouncedCheckLinks(newContent);
      }
    }
  };

  // Get status icon
  const getStatusIcon = (url: string) => {
    const status = getUrlStatus(url);
    
    if (!status) {
      return <Wifi className="w-4 h-4 text-gray-400 inline ml-1" />;
    }
    
    switch (status.status) {
      case 'working':
        return <CheckCircle className="w-4 h-4 text-green-500 inline ml-1" />;
      case 'failed':
        return <XCircle className="w-4 h-4 text-red-500 inline ml-1" />;
      case 'checking':
        return <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin inline ml-1" />;
      default:
        return <Wifi className="w-4 h-4 text-gray-400 inline ml-1" />;
    }
  };

  // Apply highlighting to the editor content
  const applyHighlighting = () => {
    if (!editorRef.current) return;
    
    // Get the current selection to preserve cursor position
    const selection = window.getSelection();
    let savedRange: Range | null = null;
    if (selection && selection.rangeCount > 0) {
      savedRange = selection.getRangeAt(0).cloneRange();
    }
    
    // Get the text content
    const textContent = editorRef.current.innerText;
    
    // Clear the editor
    editorRef.current.innerHTML = '';
    
    // Split content by newlines to preserve line breaks
    const lines = textContent.split('\n');
    
    lines.forEach((line, lineIndex) => {
      // Process each line for URL highlighting
      const urls = extractUrls(line);
      let lastIndex = 0;
      
      // Create a document fragment to build the line
      const fragment = document.createDocumentFragment();
      
      urls.forEach(url => {
        // Find URL position within the current line
        const urlIndex = line.indexOf(url, lastIndex);
        if (urlIndex > lastIndex) {
          fragment.appendChild(document.createTextNode(line.slice(lastIndex, urlIndex)));
        }
        
        const status = getUrlStatus(url);
        let highlightClass = 'bg-gray-100 text-gray-800'; // Default gray
        
        if (status) {
          switch (status.status) {
            case 'working':
              highlightClass = 'bg-green-100 text-green-800 border border-green-200';
              break;
            case 'failed':
              highlightClass = 'bg-red-100 text-red-800 border border-red-200';
              break;
            case 'checking':
              highlightClass = 'bg-blue-100 text-blue-800 border border-blue-200';
              break;
          }
        }
        
        // Create span for the URL with highlighting
        const span = document.createElement('span');
        span.className = `inline-block px-1 py-0.5 rounded font-medium ${highlightClass} cursor-pointer hover:opacity-80 transition-opacity`;
        span.textContent = url;
        span.addEventListener('click', () => {
          window.open(url, '_blank', 'noopener,noreferrer');
        });
        span.title = `Click to open ${url}`;
        
        fragment.appendChild(span);
        
        lastIndex = urlIndex + url.length;
      });
      
      if (lastIndex < line.length) {
        fragment.appendChild(document.createTextNode(line.slice(lastIndex)));
      }
      
      // Add the processed line to the editor
      if (editorRef.current) {
        editorRef.current.appendChild(fragment);
      }
      
      // Add line break if not the last line
      if (lineIndex < lines.length - 1 && editorRef.current) {
        editorRef.current.appendChild(document.createElement('br'));
      }
    });
    
    // Restore cursor position if we had one
    if (savedRange && selection) {
      try {
        selection.removeAllRanges();
        selection.addRange(savedRange);
      } catch (e) {
        // Ignore errors in restoring selection
      }
    }
  };

  // Effect to apply highlighting when link statuses change
  useEffect(() => {
    applyHighlighting();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [linkStatuses]);

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
              Check Link - qlam
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
                <button
                  onClick={() => {
                    console.log('Current content:', content);
                    console.log('Current link statuses:', linkStatuses);
                    console.log('Extracted URLs:', extractUrls(content));
                  }}
                  className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  Debug
                </button>
              </div>
            </div>
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
              </ul>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}