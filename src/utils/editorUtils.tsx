import { LinkStatus } from '@/types/app';
import { extractUrls, getUrlStatus } from './linkUtils';

// Apply highlighting to the editor content
export const applyHighlighting = (
  editorRef: React.RefObject<HTMLDivElement | null>,
  linkStatuses: LinkStatus[]
) => {
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
      
      const status = getUrlStatus(url, linkStatuses);
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
    } catch {
      // Ignore errors in restoring selection
    }
  }
};

