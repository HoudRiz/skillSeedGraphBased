
import React, { useState, useEffect, useRef, FormEvent, ChangeEvent, KeyboardEvent } from 'react';
import { Node, Tag, Difficulty, NodeFormData } from '../types';
import { DIFFICULTY_LEVELS } from '../constants';

interface NodeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (nodeData: NodeFormData, id?: string) => void;
  onDelete: (id: string) => void;
  nodeToEdit: Node | null;
  allTags: Tag[];
  allNodes: Node[];
}

const initialFormData: NodeFormData = {
  title: 'Untitled',
  description: '',
  tags: [],
  difficulty: Difficulty.Easy,
};

// Helper to find caret coordinates
const getCaretCoordinates = (element: HTMLTextAreaElement, position: number) => {
    const div = document.createElement('div');
    const style = window.getComputedStyle(element);
    
    Array.from(style).forEach((prop) => {
        div.style.setProperty(prop, style.getPropertyValue(prop));
    });

    div.style.position = 'absolute';
    div.style.visibility = 'hidden';
    div.style.whiteSpace = 'pre-wrap';
    div.style.wordWrap = 'break-word';
    div.style.top = '0';
    div.style.left = '0';
    
    // We create a span to mark the caret position
    const textContent = element.value.substring(0, position);
    div.textContent = textContent;
    const span = document.createElement('span');
    span.textContent = element.value.substring(position) || '.'; // Add something so it has height
    div.appendChild(span);
    
    document.body.appendChild(div);
    const { offsetLeft: spanLeft, offsetTop: spanTop } = span;
    document.body.removeChild(div);
    
    // Adjust for scroll and element position relative to viewport
    return { top: spanTop, left: spanLeft };
};

// Simple inline parser for bold, italic, and wiki-links
const parseInline = (text: string): React.ReactNode[] => {
    // Regex matches: **bold**, *italic*, [[link]]
    const parts = text.split(/(\*\*.*?\*\*|\*.*?\*|\[\[.*?\]\])/g);
    return parts.map((part, i) => {
        if (part.startsWith('**') && part.endsWith('**')) {
            return <strong key={i} className="text-white font-bold">{part.slice(2, -2)}</strong>;
        }
        if (part.startsWith('*') && part.endsWith('*')) {
            return <em key={i} className="italic text-gray-300">{part.slice(1, -1)}</em>;
        }
        if (part.startsWith('[[') && part.endsWith(']]')) {
            return <span key={i} className="text-indigo-400 font-medium hover:underline cursor-pointer bg-indigo-500/10 px-1 rounded">{part}</span>;
        }
        return part;
    });
};

const NodeModal: React.FC<NodeModalProps> = ({
  isOpen,
  onClose,
  onSave,
  onDelete,
  nodeToEdit,
  allTags,
  allNodes,
}) => {
  const [formData, setFormData] = useState<NodeFormData>(initialFormData);
  const [lastValidTitle, setLastValidTitle] = useState('Untitled');
  const [tagInput, setTagInput] = useState('');
  const [showTagDropdown, setShowTagDropdown] = useState(false);
  const [isPreview, setIsPreview] = useState(false);
  
  const tagInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const titleInputRef = useRef<HTMLInputElement>(null);

  // Link Autocomplete State
  const [showLinkSuggestions, setShowLinkSuggestions] = useState(false);
  const [linkSearchTerm, setLinkSearchTerm] = useState('');
  const [suggestionIndex, setSuggestionIndex] = useState(0);
  const [caretPos, setCaretPos] = useState({ top: 0, left: 0 });
  const [matchStart, setMatchStart] = useState(0);

  useEffect(() => {
    if (isOpen) {
      if (nodeToEdit) {
        setFormData({
          title: nodeToEdit.title,
          description: nodeToEdit.description || '',
          tags: [...nodeToEdit.tags],
          difficulty: nodeToEdit.difficulty,
        });
        setLastValidTitle(nodeToEdit.title);
      } else {
        setFormData(initialFormData);
        setLastValidTitle('Untitled');
      }
      setTagInput('');
      setShowTagDropdown(false);
      setShowLinkSuggestions(false);
      setIsPreview(false); // Default to edit mode

      // Focus logic
      setTimeout(() => {
        // Only focus and select title for NEW notes
        if (!nodeToEdit && titleInputRef.current) {
            titleInputRef.current.focus();
            titleInputRef.current.select();
        } 
      }, 50);
    }
  }, [nodeToEdit, isOpen]);

  // Global ESC handler
  useEffect(() => {
    const handleEsc = (event: globalThis.KeyboardEvent) => {
      if (event.key === 'Escape') {
          if (showLinkSuggestions) {
              setShowLinkSuggestions(false);
          } else if (showTagDropdown) {
              setShowTagDropdown(false);
          } else {
              onClose();
          }
      }
    };
    if (isOpen) {
      window.addEventListener('keydown', handleEsc);
    }
    return () => {
      window.removeEventListener('keydown', handleEsc);
    };
  }, [isOpen, onClose, showLinkSuggestions, showTagDropdown]);

  // Title Logic
  const handleTitleChange = (e: ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setFormData(prev => ({ ...prev, title: val }));
    // If the new title is not empty, update our restore point
    if (val.trim().length > 0) {
        setLastValidTitle(val);
    }
  };

  const handleTitleBlur = () => {
      // If title is empty on blur, revert to the last valid title
      if (formData.title.trim().length === 0) {
          setFormData(prev => ({ ...prev, title: lastValidTitle }));
      }
  };

  // --- Tag Handling ---
  const handleTagInputKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Enter') {
          e.preventDefault();
          if (tagInput.trim()) {
              addTag(tagInput.trim());
          }
      } else if (e.key === 'Backspace' && !tagInput && formData.tags.length > 0) {
          removeTag(formData.tags[formData.tags.length - 1]);
      }
  };

  const addTag = (tagName: string) => {
      if (!formData.tags.includes(tagName)) {
          setFormData(prev => ({ ...prev, tags: [...prev.tags, tagName] }));
      }
      setTagInput('');
      setShowTagDropdown(false);
  };

  const removeTag = (tagName: string) => {
      setFormData(prev => ({ ...prev, tags: prev.tags.filter(t => t !== tagName) }));
  };

  const filteredTags = allTags
    .filter(t => t.name.toLowerCase().includes(tagInput.toLowerCase()) && !formData.tags.includes(t.name));

  // --- Description / Markdown / Wiki-Link Handling ---
  const handleDescriptionChange = (e: ChangeEvent<HTMLTextAreaElement>) => {
      const val = e.target.value;
      const cursorPosition = e.target.selectionStart;
      setFormData(prev => ({ ...prev, description: val }));

      // Check for [[
      // We look backwards from cursor
      const textBeforeCursor = val.substring(0, cursorPosition);
      const triggerIdx = textBeforeCursor.lastIndexOf('[[');

      if (triggerIdx !== -1) {
          // Check if there is a closing ]] before the cursor
          const closingIdx = textBeforeCursor.lastIndexOf(']]');
          if (closingIdx > triggerIdx) {
              setShowLinkSuggestions(false);
              return;
          }

          // Check for new lines which break links in most wikis
          const textInBetween = textBeforeCursor.substring(triggerIdx + 2);
          if (textInBetween.includes('\n')) {
             setShowLinkSuggestions(false);
             return;
          }
          
          setMatchStart(triggerIdx);
          setLinkSearchTerm(textInBetween);
          setShowLinkSuggestions(true);
          setSuggestionIndex(0);

          // Calculate caret position for popup
          if (textareaRef.current) {
              const coords = getCaretCoordinates(textareaRef.current, triggerIdx);
              setCaretPos({ 
                  top: coords.top - textareaRef.current.scrollTop, 
                  left: coords.left - textareaRef.current.scrollLeft 
              });
          }
      } else {
          setShowLinkSuggestions(false);
      }
  };

  const handleDescriptionKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
      if (!showLinkSuggestions) return;

      if (e.key === 'ArrowDown') {
          e.preventDefault();
          setSuggestionIndex(prev => (prev + 1) % filteredNodes.length);
      } else if (e.key === 'ArrowUp') {
          e.preventDefault();
          setSuggestionIndex(prev => (prev - 1 + filteredNodes.length) % filteredNodes.length);
      } else if (e.key === 'Enter' || e.key === 'Tab') {
          e.preventDefault();
          if (filteredNodes.length > 0) {
              selectLinkSuggestion(filteredNodes[suggestionIndex]);
          }
      } else if (e.key === 'Escape') {
          setShowLinkSuggestions(false);
      }
  };

  const selectLinkSuggestion = (node: Node) => {
      const beforeLink = formData.description.substring(0, matchStart);
      const cursor = textareaRef.current?.selectionStart || formData.description.length;
      const afterCursor = formData.description.substring(cursor);
      
      const newText = beforeLink + `[[${node.title}]] ` + afterCursor;
      
      setFormData(prev => ({ ...prev, description: newText }));
      setShowLinkSuggestions(false);
      
      setTimeout(() => {
          if (textareaRef.current) {
              const newCursorPos = beforeLink.length + node.title.length + 5; 
              textareaRef.current.selectionStart = newCursorPos;
              textareaRef.current.selectionEnd = newCursorPos;
              textareaRef.current.focus();
          }
      }, 0);
  };

  const filteredNodes = allNodes.filter(n => 
      n.title.toLowerCase().includes(linkSearchTerm.toLowerCase()) && 
      n.id !== nodeToEdit?.id // Don't link to self
  ).slice(0, 5); 


  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    
    // Ensure title is valid before saving
    let finalTitle = formData.title.trim();
    if (finalTitle.length === 0) {
        finalTitle = lastValidTitle;
        // Update state to reflect what we are saving
        setFormData(prev => ({ ...prev, title: finalTitle }));
    }

    const dataToSave = { ...formData, title: finalTitle };

    if (dataToSave.tags.length === 0) {
      alert('At least one tag is required.');
      return;
    }
    onSave(dataToSave, nodeToEdit?.id);
  };

  const handleDelete = () => {
    if (nodeToEdit) {
      onDelete(nodeToEdit.id);
    }
  };

  // Render Preview Logic
  const renderPreviewContent = (content: string) => {
      if (!content) return <p className="text-gray-500 italic">No content.</p>;

      return content.split('\n').map((line, idx) => {
          const trimmed = line.trim();
          
          if (line.startsWith('# ')) {
              return <h1 key={idx} className="text-3xl font-bold text-white mb-4 mt-2 border-b border-gray-700 pb-2">{parseInline(line.slice(2))}</h1>;
          }
          if (line.startsWith('## ')) {
              return <h2 key={idx} className="text-2xl font-semibold text-gray-200 mb-3 mt-4">{parseInline(line.slice(3))}</h2>;
          }
          if (line.startsWith('### ')) {
              return <h3 key={idx} className="text-xl font-medium text-gray-300 mb-2 mt-3">{parseInline(line.slice(4))}</h3>;
          }
          if (trimmed.startsWith('- ')) {
              return (
                  <div key={idx} className="flex gap-2 ml-4 mb-1">
                      <span className="text-gray-500">•</span>
                      <span className="text-gray-300">{parseInline(trimmed.slice(2))}</span>
                  </div>
              );
          }
          if (!trimmed) {
              return <div key={idx} className="h-4" />;
          }

          return <p key={idx} className="text-gray-300 mb-2 leading-relaxed">{parseInline(line)}</p>;
      });
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-80 z-50 flex items-center justify-center p-0 sm:p-4 transition-opacity duration-300"
      onClick={onClose}
    >
      <div
        className="bg-gray-900 w-full h-full sm:h-[85vh] sm:max-w-4xl sm:rounded-lg shadow-2xl flex flex-col border border-gray-800"
        onClick={e => e.stopPropagation()}
      >
        <form onSubmit={handleSubmit} className="flex flex-col h-full relative">
          
          {/* Top Bar: Title, Meta controls */}
          <div className="flex-none p-6 border-b border-gray-800 space-y-4">
              {/* Title Input */}
              <input 
                  ref={titleInputRef}
                  type="text" 
                  value={formData.title} 
                  onChange={handleTitleChange} 
                  onBlur={handleTitleBlur}
                  className="w-full bg-transparent text-3xl sm:text-4xl font-bold text-white focus:outline-none"
              />

              {/* Meta Row: Tags and Difficulty */}
              <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center text-sm">
                  
                  {/* Tags Input Area */}
                  <div className="flex-1 flex flex-wrap gap-2 items-center bg-gray-800 px-3 py-2 rounded-md border border-gray-700 focus-within:ring-1 focus-within:ring-indigo-500 w-full sm:w-auto relative">
                      <span className="text-gray-400 mr-1 select-none">#</span>
                      {formData.tags.map(tag => (
                          <span key={tag} className="flex items-center gap-1 bg-indigo-900 text-indigo-100 px-2 py-0.5 rounded text-xs">
                              {tag}
                              <button 
                                type="button" 
                                onClick={() => removeTag(tag)}
                                className="hover:text-white"
                              >&times;</button>
                          </span>
                      ))}
                      <div className="relative flex-1 min-w-[80px]">
                          <input 
                              ref={tagInputRef}
                              type="text" 
                              value={tagInput}
                              onChange={(e) => {
                                  setTagInput(e.target.value);
                                  setShowTagDropdown(true);
                              }}
                              onFocus={() => setShowTagDropdown(true)}
                              onKeyDown={handleTagInputKeyDown}
                              placeholder={formData.tags.length === 0 ? "Add tags..." : ""}
                              className="bg-transparent text-gray-200 w-full focus:outline-none text-sm"
                          />
                          {/* Tags Dropdown */}
                          {showTagDropdown && tagInput && (
                              <div className="absolute top-full left-0 mt-2 w-48 bg-gray-800 border border-gray-700 rounded-md shadow-xl z-50 max-h-40 overflow-y-auto">
                                  {filteredTags.length > 0 ? (
                                      filteredTags.map(tag => (
                                          <button
                                              key={tag.name}
                                              type="button"
                                              className="block w-full text-left px-3 py-2 text-gray-300 hover:bg-gray-700 hover:text-white text-xs"
                                              onClick={() => addTag(tag.name)}
                                          >
                                              {tag.name}
                                          </button>
                                      ))
                                  ) : (
                                      <div className="px-3 py-2 text-gray-500 text-xs italic">
                                          Press Enter to create "{tagInput}"
                                      </div>
                                  )}
                              </div>
                          )}
                      </div>
                  </div>

                  {/* Group Difficulty and Toggle for layout flexibility */}
                  <div className="flex items-center gap-4 w-full sm:w-auto">
                      {/* Difficulty Selector */}
                      <div className="flex items-center gap-2 bg-gray-800 px-3 py-2 rounded-md border border-gray-700 flex-1 sm:flex-none sm:min-w-[140px]">
                            <label htmlFor="difficulty" className="text-gray-400 text-xs uppercase font-semibold">Diff:</label>
                            <select 
                                name="difficulty" 
                                id="difficulty" 
                                value={formData.difficulty} 
                                onChange={(e) => setFormData(prev => ({ ...prev, difficulty: e.target.value as Difficulty }))} 
                                className="bg-transparent text-gray-200 text-sm focus:outline-none w-full cursor-pointer"
                            >
                            {DIFFICULTY_LEVELS.map(level => (
                                <option key={level} value={level} className="bg-gray-800">{level}</option>
                            ))}
                            </select>
                      </div>

                      {/* View Toggle (Edit/Preview) */}
                      <div className="flex items-center bg-gray-800 p-1 rounded-md border border-gray-700 shrink-0 select-none">
                          <button
                              type="button"
                              onClick={() => setIsPreview(false)}
                              className={`p-1.5 rounded transition-all ${!isPreview ? 'bg-indigo-600 text-white shadow-sm' : 'text-gray-400 hover:text-gray-200'}`}
                              title="Edit"
                          >
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                                  <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
                              </svg>
                          </button>
                          <button
                              type="button"
                              onClick={() => setIsPreview(true)}
                              className={`p-1.5 rounded transition-all ${isPreview ? 'bg-indigo-600 text-white shadow-sm' : 'text-gray-400 hover:text-gray-200'}`}
                              title="Preview"
                          >
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                                  <path d="M10 12a2 2 0 100-4 2 2 0 000 4z" />
                                  <path fillRule="evenodd" d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clipRule="evenodd" />
                              </svg>
                          </button>
                      </div>
                  </div>
              </div>
          </div>

          {/* Main Content Area: Markdown Editor / Preview */}
          <div className="flex-1 relative bg-gray-900 overflow-hidden flex flex-col">
              {isPreview ? (
                  <div className="w-full h-full overflow-y-auto custom-scrollbar p-6">
                      <div className="max-w-none">
                          {renderPreviewContent(formData.description)}
                      </div>
                  </div>
              ) : (
                  <textarea
                      ref={textareaRef}
                      value={formData.description}
                      onChange={handleDescriptionChange}
                      onKeyDown={handleDescriptionKeyDown}
                      onBlur={() => {
                          // Small delay to allow clicking on suggestions
                          setTimeout(() => setShowLinkSuggestions(false), 200);
                      }}
                      className="w-full h-full bg-transparent text-gray-300 resize-none focus:outline-none custom-scrollbar leading-relaxed font-mono text-base p-6"
                      placeholder="Start typing... Use [[ to link to other skills."
                  />
              )}
              
              {/* Link Autocomplete Popup */}
              {showLinkSuggestions && !isPreview && (
                  <div 
                      className="absolute bg-gray-800 border border-gray-700 rounded-md shadow-2xl z-50 w-64 overflow-hidden"
                      style={{ 
                          top: Math.min(caretPos.top + 40, (textareaRef.current?.clientHeight || 500) - 150), 
                          left: Math.min(caretPos.left + 20, (textareaRef.current?.clientWidth || 500) - 250)
                      }}
                  >
                      <div className="bg-gray-900 px-3 py-1 text-xs text-gray-500 border-b border-gray-700">
                          Link to:
                      </div>
                      {filteredNodes.length > 0 ? (
                          filteredNodes.map((node, idx) => (
                              <button
                                  key={node.id}
                                  type="button"
                                  className={`block w-full text-left px-3 py-2 text-sm border-l-2 ${
                                      idx === suggestionIndex 
                                      ? 'bg-gray-700 text-white border-indigo-500' 
                                      : 'text-gray-400 border-transparent hover:bg-gray-700'
                                  }`}
                                  onMouseDown={(e) => {
                                      e.preventDefault(); // Prevent blur
                                      selectLinkSuggestion(node);
                                  }}
                                  onMouseEnter={() => setSuggestionIndex(idx)}
                              >
                                  <div className="font-medium">{node.title}</div>
                                  <div className="text-xs text-gray-500 truncate">{node.tags[0]} / {node.difficulty}</div>
                              </button>
                          ))
                      ) : (
                          <div className="px-3 py-2 text-gray-500 text-sm italic">
                              No matching skills found
                          </div>
                      )}
                  </div>
              )}
          </div>

          {/* Footer Actions */}
          <div className="flex-none bg-gray-900 border-t border-gray-800 p-4 flex justify-between items-center">
                {nodeToEdit ? (
                    <button type="button" onClick={handleDelete} className="text-red-500 hover:text-red-400 text-sm font-medium transition-colors">
                        Delete File
                    </button>
                ) : <div></div>}
                
                <div className="flex gap-3">
                    <button type="button" onClick={onClose} className="px-4 py-2 text-gray-400 hover:text-white transition-colors">
                        Cancel
                    </button>
                    <button type="submit" className="px-6 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-md font-medium shadow-lg transition-all transform hover:scale-105">
                        Save
                    </button>
                </div>
          </div>

        </form>
      </div>
    </div>
  );
};

export default NodeModal;
