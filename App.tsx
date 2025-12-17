
import React, { useState, useRef, useEffect } from 'react';
import { 
  BookOpen, 
  Video, 
  FileText, 
  BrainCircuit, 
  Search, 
  Menu, 
  X, 
  Send, 
  Youtube,
  GraduationCap,
  Lightbulb,
  Trash2,
  Folder,
  Plus,
  ArrowLeft,
  Calendar,
  MoreVertical,
  Play,
  ExternalLink
} from 'lucide-react';
import { AppSection, Message, VideoResult, QuizData, FormInput, SavedLibraryItem, QuizResult } from './types';
import * as GeminiService from './services/geminiService';
import MarkdownRenderer from './components/MarkdownRenderer';
import { CopyButton } from './components/CopyButton';
import { LoadingDots } from './components/LoadingDots';

// --- Sidebar Component ---
const Sidebar = ({ 
  currentSection, 
  setSection, 
  isOpen, 
  setIsOpen 
}: { 
  currentSection: AppSection, 
  setSection: (s: AppSection) => void,
  isOpen: boolean,
  setIsOpen: (o: boolean) => void
}) => {
  const menuItems = [
    { id: AppSection.RESEARCH, label: 'Research Chat', icon: Search },
    { id: AppSection.VIDEO, label: 'Video Lessons', icon: Video },
    { id: AppSection.NOTES, label: 'Lesson Notes', icon: FileText },
    { id: AppSection.STUDY, label: 'Study Mode', icon: BookOpen },
    { id: AppSection.QUIZ, label: 'Quiz Zone', icon: BrainCircuit },
  ];

  return (
    <>
      {/* Mobile Overlay */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-20 md:hidden"
          onClick={() => setIsOpen(false)}
        />
      )}
      
      {/* Sidebar Content */}
      <div className={`
        fixed inset-y-0 left-0 z-30 w-64 bg-white border-r border-gray-200 transform transition-transform duration-300 ease-in-out
        md:relative md:translate-x-0
        ${isOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        <div className="flex items-center justify-between p-6 border-b border-gray-100">
          <div className="flex items-center gap-2 text-indigo-600">
            <GraduationCap size={32} />
            <h1 className="text-xl font-bold tracking-tight">SKOOLIFY AI</h1>
          </div>
          <button onClick={() => setIsOpen(false)} className="md:hidden text-gray-500">
            <X size={24} />
          </button>
        </div>

        <nav className="p-4 space-y-2">
          {menuItems.map((item) => (
            <button
              key={item.id}
              onClick={() => {
                setSection(item.id);
                setIsOpen(false);
              }}
              className={`
                w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all font-medium
                ${currentSection === item.id 
                  ? 'bg-indigo-50 text-indigo-700 shadow-sm' 
                  : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'}
              `}
            >
              <item.icon size={20} />
              {item.label}
            </button>
          ))}
        </nav>

        <div className="absolute bottom-0 w-full p-6 border-t border-gray-100 bg-gray-50">
          <p className="text-xs text-center text-gray-400">
            Powered by Gemini AI<br/>Build for Students
          </p>
        </div>
      </div>
    </>
  );
};

// --- Helper: Library Storage Hook ---
function useLibrary<T>(key: string) {
  const [items, setItems] = useState<SavedLibraryItem[]>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem(key);
      return saved ? JSON.parse(saved) : [];
    }
    return [];
  });

  const saveItem = (item: SavedLibraryItem) => {
    const newItems = [item, ...items];
    setItems(newItems);
    localStorage.setItem(key, JSON.stringify(newItems));
  };

  const deleteItem = (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (window.confirm("Delete this saved item?")) {
      const newItems = items.filter(i => i.id !== id);
      setItems(newItems);
      localStorage.setItem(key, JSON.stringify(newItems));
    }
  };

  return { items, saveItem, deleteItem };
}

// --- Helper: Date Formatter ---
const formatDate = (dateStr: string) => {
  return new Date(dateStr).toLocaleDateString(undefined, {
    month: 'short', day: 'numeric', year: 'numeric'
  });
};

// --- Reusable Library View Component ---
// This handles the "Folder" grid view vs the "Content" view
const LibrarySection = ({
  title,
  icon: Icon,
  storageKey,
  renderCreate,
  renderView,
  createLabel = "Create New"
}: {
  title: string,
  icon: React.ElementType,
  storageKey: string,
  renderCreate: (onSave: (data: any, input: FormInput) => void, onCancel: () => void) => React.ReactNode,
  renderView: (item: SavedLibraryItem, onBack: () => void) => React.ReactNode,
  createLabel?: string
}) => {
  const { items, saveItem, deleteItem } = useLibrary(storageKey);
  const [viewState, setViewState] = useState<'LIST' | 'CREATE' | 'VIEW'>('LIST');
  const [activeItem, setActiveItem] = useState<SavedLibraryItem | null>(null);

  const handleSave = (data: any, input: FormInput) => {
    const newItem: SavedLibraryItem = {
      id: Date.now().toString(),
      type: 'NOTE', // Generic placeholder, specialized by section
      topic: input.topic,
      className: input.className,
      createdAt: new Date().toISOString(),
      data: data
    };
    saveItem(newItem);
    setActiveItem(newItem);
    setViewState('VIEW');
  };

  const handleOpenItem = (item: SavedLibraryItem) => {
    setActiveItem(item);
    setViewState('VIEW');
  };

  // --- RENDER: LIST VIEW (Folders) ---
  if (viewState === 'LIST') {
    return (
      <div className="h-full overflow-y-auto">
        <div className="max-w-5xl mx-auto">
          <div className="flex justify-between items-center mb-8">
            <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
              <Icon className="text-indigo-600" /> {title}
            </h2>
            <button
              onClick={() => setViewState('CREATE')}
              className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition-colors shadow-sm font-medium"
            >
              <Plus size={18} /> {createLabel}
            </button>
          </div>

          {items.length === 0 ? (
            <div className="text-center py-20 bg-white rounded-2xl border border-dashed border-gray-300">
              <div className="w-16 h-16 bg-indigo-50 text-indigo-300 rounded-full flex items-center justify-center mx-auto mb-4">
                <Folder size={32} />
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-1">No saved items yet</h3>
              <p className="text-gray-500 mb-6">Create your first {title.toLowerCase()} to save it here.</p>
              <button
                onClick={() => setViewState('CREATE')}
                className="text-indigo-600 font-medium hover:underline"
              >
                Create Now
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {items.map((item) => (
                <div 
                  key={item.id}
                  onClick={() => handleOpenItem(item)}
                  className="group bg-white p-5 rounded-2xl border border-gray-200 shadow-sm hover:shadow-md hover:border-indigo-200 transition-all cursor-pointer relative"
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="p-3 bg-indigo-50 text-indigo-600 rounded-xl group-hover:bg-indigo-600 group-hover:text-white transition-colors">
                      <Folder size={24} />
                    </div>
                    <button 
                      onClick={(e) => deleteItem(item.id, e)}
                      className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                  <h3 className="font-bold text-gray-900 truncate pr-4">{item.topic}</h3>
                  <div className="flex items-center gap-2 mt-2 text-sm text-gray-500">
                     <span className="bg-gray-100 px-2 py-0.5 rounded text-xs font-medium text-gray-600">{item.className}</span>
                     <span className="flex items-center gap-1 text-xs"><Calendar size={10} /> {formatDate(item.createdAt)}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }

  // --- RENDER: CREATE VIEW ---
  if (viewState === 'CREATE') {
    return (
      <div className="h-full overflow-y-auto">
        <div className="max-w-3xl mx-auto">
          <button 
            onClick={() => setViewState('LIST')}
            className="flex items-center gap-2 text-gray-500 hover:text-indigo-600 mb-6 font-medium"
          >
            <ArrowLeft size={18} /> Back to Library
          </button>
          <h2 className="text-2xl font-bold text-gray-800 mb-6">Create New {title}</h2>
          {renderCreate(handleSave, () => setViewState('LIST'))}
        </div>
      </div>
    );
  }

  // --- RENDER: VIEW ITEM ---
  if (viewState === 'VIEW' && activeItem) {
    return (
      <div className="h-full overflow-y-auto">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center justify-between mb-6">
            <button 
              onClick={() => setViewState('LIST')}
              className="flex items-center gap-2 text-gray-500 hover:text-indigo-600 font-medium"
            >
              <ArrowLeft size={18} /> Back to Library
            </button>
            <div className="flex items-center gap-3">
               <span className="text-sm text-gray-400">{formatDate(activeItem.createdAt)}</span>
               <button 
                onClick={(e) => { deleteItem(activeItem.id); setViewState('LIST'); }}
                className="text-red-400 hover:text-red-600 flex items-center gap-1 text-sm font-medium"
               >
                 <Trash2 size={16} /> Delete
               </button>
            </div>
          </div>
          
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
             <div className="bg-gray-50 px-8 py-6 border-b border-gray-100">
                <h1 className="text-2xl font-bold text-gray-900">{activeItem.topic}</h1>
                <p className="text-gray-500 mt-1">Class: {activeItem.className}</p>
             </div>
             <div className="p-0">
               {renderView(activeItem, () => setViewState('LIST'))}
             </div>
          </div>
        </div>
      </div>
    );
  }

  return null;
};

// --- Research Chat Section ---
const ResearchSection = () => {
  const [messages, setMessages] = useState<Message[]>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('skoolify_research_chat');
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          return parsed.map((m: any) => ({ ...m, timestamp: new Date(m.timestamp) }));
        } catch (e) {
          console.error("Failed to load chat history", e);
        }
      }
    }
    return [{
      id: 'welcome',
      role: 'ai',
      content: 'Hello! I am Skoolify AI. I can research any academic topic for you. What would you like to learn today?',
      timestamp: new Date()
    }];
  });

  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    localStorage.setItem('skoolify_research_chat', JSON.stringify(messages));
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(scrollToBottom, [messages]);

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMsg: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: input,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setIsLoading(true);

    try {
      const result = await GeminiService.searchResearch(userMsg.content);
      const aiMsg: Message = {
        id: (Date.now() + 1).toString(),
        role: 'ai',
        content: result.text,
        timestamp: new Date(),
        sources: result.sources
      };
      setMessages(prev => [...prev, aiMsg]);
    } catch (error) {
      const errorMsg: Message = {
        id: (Date.now() + 1).toString(),
        role: 'ai',
        content: "I'm sorry, I encountered an error while researching. Please check your API key or connection.",
        timestamp: new Date()
      };
      setMessages(prev => [...prev, errorMsg]);
    } finally {
      setIsLoading(false);
    }
  };

  const clearChat = () => {
    if (window.confirm("Are you sure you want to clear the chat history?")) {
      setMessages([{
        id: 'welcome',
        role: 'ai',
        content: 'Hello! I am Skoolify AI. I can research any academic topic for you. What would you like to learn today?',
        timestamp: new Date()
      }]);
    }
  };

  return (
    <div className="flex flex-col h-full bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
      <div className="flex justify-between items-center p-4 border-b border-gray-100 bg-gray-50">
        <span className="text-sm font-medium text-gray-500">Research Chat</span>
        <button onClick={clearChat} className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors" title="Clear Chat">
          <Trash2 size={18} />
        </button>
      </div>
      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        {messages.map((msg) => (
          <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[85%] rounded-2xl p-4 shadow-sm ${
              msg.role === 'user' 
                ? 'bg-indigo-600 text-white rounded-br-none' 
                : 'bg-white border border-gray-100 text-gray-800 rounded-bl-none'
            }`}>
              {msg.role === 'ai' ? (
                <div className="prose prose-sm max-w-none">
                  <MarkdownRenderer content={msg.content} />
                  {msg.sources && msg.sources.length > 0 && (
                    <div className="mt-4 pt-3 border-t border-gray-100 text-xs">
                      <p className="font-semibold text-gray-500 mb-1">Sources:</p>
                      <ul className="list-disc pl-4 space-y-1 text-indigo-600">
                        {msg.sources.map((src, idx) => (
                          <li key={idx}>
                            <a href={src.uri} target="_blank" rel="noopener noreferrer" className="hover:underline truncate block">
                              {src.title}
                            </a>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  <div className="mt-2 flex justify-end">
                    <CopyButton text={msg.content} />
                  </div>
                </div>
              ) : (
                <p className="whitespace-pre-wrap">{msg.content}</p>
              )}
            </div>
          </div>
        ))}
        {isLoading && (
          <div className="flex justify-start">
             <div className="bg-gray-100 rounded-2xl rounded-bl-none p-3">
               <LoadingDots />
             </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <div className="p-4 bg-gray-50 border-t border-gray-100">
        <div className="relative flex items-center">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
            placeholder="Ask Skoolify anything..."
            className="w-full pl-4 pr-12 py-3.5 bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all shadow-sm"
          />
          <button 
            onClick={handleSend}
            disabled={!input.trim() || isLoading}
            className="absolute right-2 p-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:hover:bg-indigo-600 transition-colors"
          >
            <Send size={18} />
          </button>
        </div>
      </div>
    </div>
  );
};

// --- Input Form Component (Reusable) ---
const InputForm = ({ 
  onSubmit, 
  isLoading, 
  buttonLabel,
  includeLevel = false 
}: { 
  onSubmit: (data: FormInput) => void, 
  isLoading: boolean,
  buttonLabel: string,
  includeLevel?: boolean
}) => {
  const [formData, setFormData] = useState<FormInput>({ topic: '', className: '', instructions: '', level: 'Intermediate' });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
  };

  return (
    <form onSubmit={handleSubmit} className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Topic</label>
          <input
            required
            type="text"
            value={formData.topic}
            onChange={e => setFormData({...formData, topic: e.target.value})}
            placeholder="e.g., Federalism, Photosynthesis"
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Class/Grade</label>
          <input
            required
            type="text"
            value={formData.className}
            onChange={e => setFormData({...formData, className: e.target.value})}
            placeholder="e.g., SS2, Grade 10"
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
          />
        </div>
      </div>
      
      {includeLevel && (
        <div className="mb-4">
           <label className="block text-sm font-medium text-gray-700 mb-1">Difficulty Level</label>
           <select
             value={formData.level}
             onChange={e => setFormData({...formData, level: e.target.value})}
             className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
           >
             <option value="Beginner">Beginner</option>
             <option value="Intermediate">Intermediate</option>
             <option value="Advanced">Advanced</option>
           </select>
        </div>
      )}

      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 mb-1">Extra Instructions (Optional)</label>
        <textarea
          rows={2}
          value={formData.instructions}
          onChange={e => setFormData({...formData, instructions: e.target.value})}
          placeholder="e.g., Focus on recent history, Include diagrams described in text..."
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-none"
        />
      </div>

      <button
        type="submit"
        disabled={isLoading}
        className="w-full flex items-center justify-center gap-2 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-medium transition-colors disabled:opacity-70"
      >
        {isLoading ? <LoadingDots /> : buttonLabel}
      </button>
    </form>
  );
};

// --- Video Component for individual cards ---
const VideoCard = ({ video }: { video: VideoResult }) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const hasEmbed = !!video.videoId;

  const handleClick = () => {
    if (hasEmbed) {
      setIsPlaying(true);
    } else {
      window.open(video.url, '_blank');
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden hover:shadow-md transition-shadow flex flex-col h-full">
      <div className="relative aspect-video w-full bg-gray-100 group cursor-pointer" onClick={handleClick}>
        {!isPlaying ? (
          <>
            {video.thumbnail ? (
              <img 
                src={video.thumbnail} 
                alt={video.title}
                className="w-full h-full object-cover opacity-90 group-hover:opacity-100 transition-opacity"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-gray-400">
                <Video size={48} />
              </div>
            )}
            
            <div className="absolute inset-0 flex items-center justify-center">
              <div className={`w-12 h-12 rounded-full flex items-center justify-center text-white shadow-lg group-hover:scale-110 transition-transform ${hasEmbed ? 'bg-red-600' : 'bg-gray-800'}`}>
                {hasEmbed ? (
                  <Play size={20} fill="currentColor" className="ml-1" />
                ) : (
                  <ExternalLink size={20} />
                )}
              </div>
            </div>
            {video.duration && (
              <div className="absolute bottom-2 right-2 bg-black/80 text-white text-xs font-medium px-2 py-1 rounded">
                {video.duration}
              </div>
            )}
          </>
        ) : (
          <iframe
            width="100%"
            height="100%"
            src={`https://www.youtube.com/embed/${video.videoId}?autoplay=1`}
            title={video.title}
            frameBorder="0"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
            className="w-full h-full"
          ></iframe>
        )}
      </div>
      <div className="p-4 flex-1 flex flex-col">
        <h3 className="font-bold text-base text-gray-900 mb-2 line-clamp-2 leading-tight" title={video.title}>{video.title}</h3>
        {video.channelTitle && (
          <p className="text-xs font-medium text-gray-500 mb-2">{video.channelTitle}</p>
        )}
        <p className="text-sm text-gray-600 mb-4 line-clamp-2 flex-1">{video.description}</p>
        <a 
          href={video.url} 
          target="_blank" 
          rel="noopener noreferrer" 
          className="text-indigo-600 text-sm font-medium hover:underline inline-flex items-center gap-1 mt-auto"
        >
          {hasEmbed ? "Watch on YouTube" : "Open Link"} {hasEmbed ? null : <ExternalLink size={14} />}
        </a>
      </div>
    </div>
  );
};

// --- Video Section Refactored to Library ---
const VideoSection = () => {
  const [loading, setLoading] = useState(false);

  return (
    <LibrarySection
      title="Video Collections"
      icon={Youtube}
      storageKey="skoolify_library_video"
      createLabel="Search Videos"
      renderCreate={(onSave) => (
        <>
          <InputForm 
            buttonLabel="Find Videos" 
            isLoading={loading}
            onSubmit={async (data) => {
              setLoading(true);
              try {
                const results = await GeminiService.findVideos(data.topic, data.className, data.instructions);
                onSave(results, data);
              } catch(e) { console.error(e) } 
              finally { setLoading(false) }
            }} 
          />
          {loading && <div className="mt-8 text-center text-gray-500"><LoadingDots /> Searching YouTube...</div>}
        </>
      )}
      renderView={(item) => (
        <div className="p-8 bg-gray-50">
           <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {(item.data as VideoResult[]).map((video, idx) => (
              <VideoCard key={idx} video={video} />
            ))}
          </div>
        </div>
      )}
    />
  );
};

// --- Notes & Study Section Refactored to Library ---
const ContentGeneratorSection = ({ type }: { type: 'NOTES' | 'STUDY' }) => {
  const [loading, setLoading] = useState(false);
  const title = type === 'NOTES' ? 'Lesson Notes' : 'Study Plans';
  const icon = type === 'NOTES' ? FileText : BookOpen;
  const storageKey = type === 'NOTES' ? 'skoolify_library_notes' : 'skoolify_library_study';

  return (
    <LibrarySection
      title={title}
      icon={icon}
      storageKey={storageKey}
      createLabel={type === 'NOTES' ? "New Note" : "New Plan"}
      renderCreate={(onSave) => (
        <>
          <InputForm 
            buttonLabel="Generate"
            isLoading={loading}
            onSubmit={async (data) => {
              setLoading(true);
              try {
                let result = '';
                if (type === 'NOTES') {
                  result = await GeminiService.generateLessonNotes(data.topic, data.className, data.instructions);
                } else {
                  result = await GeminiService.generateStudyMaterial(data.topic, data.className, data.instructions);
                }
                onSave(result, data);
              } catch(e) { console.error(e) }
              finally { setLoading(false) }
            }}
          />
          {loading && <div className="mt-8 text-center text-gray-500"><LoadingDots /> Generating content...</div>}
        </>
      )}
      renderView={(item) => (
        <div className="p-8 relative">
           <div className="absolute top-4 right-4">
              <CopyButton text={item.data} />
           </div>
           <MarkdownRenderer content={item.data as string} />
        </div>
      )}
    />
  );
};

// --- Quiz Section Refactored to Library ---
const QuizSection = () => {
  const [loading, setLoading] = useState(false);
  
  // State for active quiz taking (before saving)
  const [activeQuiz, setActiveQuiz] = useState<QuizData | null>(null);
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [score, setScore] = useState(0);
  const [finished, setFinished] = useState(false);
  
  // Handlers for taking the quiz
  const handleAnswer = (option: string) => {
    if (selectedOption) return;
    setSelectedOption(option);
    if (activeQuiz && option === activeQuiz.questions[currentQuestion].correctAnswer) {
      setScore(s => s + 1);
    }
  };

  const nextQuestion = (onFinish: (result: QuizResult) => void) => {
    if (!activeQuiz) return;
    if (currentQuestion < activeQuiz.questions.length - 1) {
      setCurrentQuestion(c => c + 1);
      setSelectedOption(null);
    } else {
      setFinished(true);
      // Auto save result
      const result: QuizResult = {
        ...activeQuiz,
        score: score + (selectedOption === activeQuiz.questions[currentQuestion].correctAnswer ? 1 : 0),
        totalQuestions: activeQuiz.questions.length,
        dateTaken: new Date().toISOString()
      };
      onFinish(result);
    }
  };

  return (
    <LibrarySection
      title="Quiz Results"
      icon={BrainCircuit}
      storageKey="skoolify_library_quiz"
      createLabel="New Quiz"
      renderCreate={(onSave) => {
        // If we are actively taking a quiz, show the quiz UI
        if (activeQuiz) {
           if (finished) {
             return (
               <div className="text-center py-10 bg-white rounded-2xl border border-gray-200">
                  <h3 className="text-2xl font-bold text-gray-800 mb-2">Quiz Completed!</h3>
                  <div className="text-5xl font-extrabold text-indigo-600 mb-4">
                     {Math.round((score / activeQuiz.questions.length) * 100)}%
                  </div>
                  <p className="text-gray-500 mb-6">Score: {score} / {activeQuiz.questions.length}</p>
                  <p className="text-sm text-gray-400 mb-8">Result saved to library.</p>
                  {/* The save happened automatically in nextQuestion, we just trigger the transition now */}
               </div>
             )
           }

           return (
            <div className="bg-white rounded-2xl shadow-lg border border-gray-200 overflow-hidden">
              <div className="w-full bg-gray-100 h-2">
                <div 
                  className="bg-indigo-600 h-2 transition-all duration-300"
                  style={{ width: `${((currentQuestion + 1) / activeQuiz.questions.length) * 100}%` }}
                ></div>
              </div>

              <div className="p-8">
                <div className="flex justify-between items-center mb-6">
                  <span className="text-sm font-bold text-indigo-600 tracking-wide uppercase">
                    Question {currentQuestion + 1} of {activeQuiz.questions.length}
                  </span>
                  <span className="text-sm text-gray-400 font-medium">{activeQuiz.topic}</span>
                </div>

                <h3 className="text-xl font-bold text-gray-900 mb-8 leading-relaxed">
                  {activeQuiz.questions[currentQuestion].question}
                </h3>

                <div className="space-y-3">
                  {activeQuiz.questions[currentQuestion].options.map((option, idx) => {
                     const isSelected = selectedOption === option;
                     const isCorrect = option === activeQuiz.questions[currentQuestion].correctAnswer;
                     const showStatus = selectedOption !== null;
                     
                     let btnClass = "border-gray-200 hover:bg-gray-50 hover:border-indigo-300";
                     if (showStatus) {
                       if (isSelected && isCorrect) btnClass = "bg-green-50 border-green-500 text-green-700";
                       else if (isSelected && !isCorrect) btnClass = "bg-red-50 border-red-500 text-red-700";
                       else if (!isSelected && isCorrect) btnClass = "bg-green-50 border-green-500 text-green-700";
                       else btnClass = "opacity-50 border-gray-200";
                     }

                     return (
                      <button
                        key={idx}
                        onClick={() => handleAnswer(option)}
                        disabled={selectedOption !== null}
                        className={`w-full text-left p-4 border-2 rounded-xl transition-all font-medium ${btnClass}`}
                      >
                        {option}
                      </button>
                     )
                  })}
                </div>

                {selectedOption && (
                  <div className="mt-8 pt-6 border-t border-gray-100 animate-fade-in">
                    <div className="bg-blue-50 border border-blue-100 rounded-xl p-5 mb-6">
                      <div className="flex items-center gap-2 mb-3 font-bold text-blue-800">
                        <Lightbulb size={20} className="text-blue-600" />
                        <span>Explanation</span>
                      </div>
                      <p className="text-blue-900 leading-relaxed">
                        {activeQuiz.questions[currentQuestion].explanation}
                      </p>
                    </div>
                    
                    <button
                      onClick={() => nextQuestion((result) => {
                         // Save result using the library handler
                         onSave(result, { topic: activeQuiz.topic, className: '', instructions: '' });
                      })}
                      className="w-full py-3 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 font-bold transition-transform active:scale-[0.98] shadow-sm"
                    >
                      {currentQuestion === activeQuiz.questions.length - 1 ? "Finish Quiz" : "Next Question"}
                    </button>
                  </div>
                )}
              </div>
            </div>
           );
        }

        // Default: Show input form to start quiz
        return (
          <>
            <InputForm 
              buttonLabel="Start Quiz"
              includeLevel
              isLoading={loading}
              onSubmit={async (data) => {
                setLoading(true);
                try {
                  const result = await GeminiService.generateQuiz(data.topic, data.className, data.level || 'Intermediate', data.instructions);
                  setActiveQuiz(result);
                  setCurrentQuestion(0);
                  setScore(0);
                  setFinished(false);
                  setSelectedOption(null);
                } catch(e) { console.error(e) }
                finally { setLoading(false) }
              }}
            />
            {loading && <div className="mt-8 text-center text-gray-500"><LoadingDots /> Generating questions...</div>}
          </>
        )
      }}
      renderView={(item) => {
        // View Past Result
        const result = item.data as QuizResult;
        const percentage = Math.round((result.score / result.totalQuestions) * 100);
        
        return (
          <div className="p-8">
             <div className="flex items-center justify-center gap-8 mb-8">
                <div className="text-center">
                   <div className="text-4xl font-extrabold text-indigo-600">{percentage}%</div>
                   <div className="text-sm text-gray-500 uppercase tracking-wide font-bold mt-1">Score</div>
                </div>
                <div className="h-12 w-px bg-gray-200"></div>
                <div className="text-center">
                   <div className="text-4xl font-extrabold text-gray-800">{result.score}/{result.totalQuestions}</div>
                   <div className="text-sm text-gray-500 uppercase tracking-wide font-bold mt-1">Questions</div>
                </div>
             </div>
             
             <h3 className="font-bold text-gray-800 mb-4">Question Review</h3>
             <div className="space-y-4">
               {result.questions.map((q, i) => (
                 <div key={i} className="p-4 bg-gray-50 rounded-xl border border-gray-100">
                    <p className="font-medium text-gray-900 mb-2">{i + 1}. {q.question}</p>
                    <div className="flex items-center gap-2 text-sm text-green-700">
                       <span className="font-bold">Answer:</span> {q.correctAnswer}
                    </div>
                    <div className="mt-2 text-sm text-gray-600 italic border-l-2 border-indigo-200 pl-3">
                       {q.explanation}
                    </div>
                 </div>
               ))}
             </div>
          </div>
        )
      }}
    />
  );
};

// --- Main App Component ---
export default function App() {
  const [section, setSection] = useState<AppSection>(AppSection.RESEARCH);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const renderSection = () => {
    switch (section) {
      case AppSection.RESEARCH: return <ResearchSection />;
      case AppSection.VIDEO: return <VideoSection />;
      case AppSection.NOTES: return <ContentGeneratorSection type="NOTES" />;
      case AppSection.STUDY: return <ContentGeneratorSection type="STUDY" />;
      case AppSection.QUIZ: return <QuizSection />;
      default: return <ResearchSection />;
    }
  };

  return (
    <div className="flex h-screen bg-gray-100 font-sans text-gray-900">
      <Sidebar 
        currentSection={section} 
        setSection={setSection} 
        isOpen={isSidebarOpen} 
        setIsOpen={setIsSidebarOpen}
      />
      
      <div className="flex-1 flex flex-col h-screen overflow-hidden relative">
        {/* Mobile Header */}
        <div className="md:hidden bg-white border-b border-gray-200 p-4 flex items-center justify-between z-10">
          <h1 className="font-bold text-indigo-600 flex items-center gap-2">
            <GraduationCap size={24} /> SKOOLIFY
          </h1>
          <button onClick={() => setIsSidebarOpen(true)} className="text-gray-600">
            <Menu size={24} />
          </button>
        </div>

        {/* Main Content Area */}
        <main className="flex-1 overflow-hidden p-4 md:p-6 relative">
          {renderSection()}
        </main>
      </div>
    </div>
  );
}
