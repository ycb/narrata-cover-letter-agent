import React, { createContext, useContext, useReducer, useEffect, ReactNode } from 'react';
import type { 
  WorkHistoryBlurb, 
  BlurbVariation 
} from '@/types/workHistory';
import type {
  HILContentMetadata,
  CustomContent,
  ContentVersion,
  MockAISuggestion,
  GapAnalysis,
  MockATSScore,
  PMAlignment,
  PMCompetency,
  AIAssistanceLevel,
  ChangeType
} from '@/types/content';

// HIL State interface
interface HILState {
  // Current editing session
  activeSection: string | null;
  editingMode: 'manual' | 'ai-assisted' | 'review';
  
  // Variations integration
  activeStory: WorkHistoryBlurb | null;
  activeVariations: BlurbVariation[];
  editingVariation: BlurbVariation | null;
  variationsHistory: VariationChange[];
  
  // Content metadata
  metadata: HILContentMetadata;
  
  // Mock AI integration
  aiSuggestions: MockAISuggestion[];
  gapAnalysis: GapAnalysis | null;
  atsScore: MockATSScore | null;
  pmAlignment: PMAlignment | null;
  
  // Content management
  contentHistory: ContentVersion[];
  pendingApprovals: CustomContent[];
  customContentLibrary: CustomContent[];
  
  // User preferences
  aiAssistanceLevel: AIAssistanceLevel;
  competencyFocus: PMCompetency[];
}

// Variation change tracking
interface VariationChange {
  id: string;
  variationId: string;
  changeType: ChangeType;
  oldContent?: string;
  newContent?: string;
  metadata: Partial<BlurbVariation>;
  timestamp: string;
  createdBy: 'user' | 'AI';
}

// HIL Actions
type HILAction =
  | { type: 'SET_ACTIVE_SECTION'; payload: string | null }
  | { type: 'SET_EDITING_MODE'; payload: 'manual' | 'ai-assisted' | 'review' }
  | { type: 'SET_ACTIVE_STORY'; payload: WorkHistoryBlurb | null }
  | { type: 'SET_ACTIVE_VARIATIONS'; payload: BlurbVariation[] }
  | { type: 'SET_EDITING_VARIATION'; payload: BlurbVariation | null }
  | { type: 'ADD_VARIATION_CHANGE'; payload: VariationChange }
  | { type: 'UPDATE_METADATA'; payload: HILContentMetadata }
  | { type: 'SET_AI_SUGGESTIONS'; payload: MockAISuggestion[] }
  | { type: 'SET_GAP_ANALYSIS'; payload: GapAnalysis | null }
  | { type: 'SET_ATS_SCORE'; payload: MockATSScore | null }
  | { type: 'SET_PM_ALIGNMENT'; payload: PMAlignment | null }
  | { type: 'ADD_CONTENT_VERSION'; payload: ContentVersion }
  | { type: 'ADD_PENDING_APPROVAL'; payload: CustomContent }
  | { type: 'REMOVE_PENDING_APPROVAL'; payload: string }
  | { type: 'ADD_CUSTOM_CONTENT'; payload: CustomContent }
  | { type: 'UPDATE_CUSTOM_CONTENT'; payload: CustomContent }
  | { type: 'DELETE_CUSTOM_CONTENT'; payload: string }
  | { type: 'SET_AI_ASSISTANCE_LEVEL'; payload: AIAssistanceLevel }
  | { type: 'SET_COMPETENCY_FOCUS'; payload: PMCompetency[] }
  | { type: 'RESET_STATE' };

// Initial state
const initialState: HILState = {
  activeSection: null,
  editingMode: 'manual',
  activeStory: null,
  activeVariations: [],
  editingVariation: null,
  variationsHistory: [],
  metadata: {
    confidence: 'medium',
    relevanceScore: 75,
    impactScore: 80,
    truthScore: 90,
    usageCount: 0,
    lastVerified: new Date().toISOString(),
    changeType: 'creation',
    aiAssistanceLevel: 'moderate',
    tags: [],
    notes: ''
  },
  aiSuggestions: [],
  gapAnalysis: null,
  atsScore: null,
  pmAlignment: null,
  contentHistory: [],
  pendingApprovals: [],
  customContentLibrary: [],
  aiAssistanceLevel: 'moderate',
  competencyFocus: []
};

// Reducer function
function hilReducer(state: HILState, action: HILAction): HILState {
  switch (action.type) {
    case 'SET_ACTIVE_SECTION':
      return { ...state, activeSection: action.payload };
    
    case 'SET_EDITING_MODE':
      return { ...state, editingMode: action.payload };
    
    case 'SET_ACTIVE_STORY':
      return { ...state, activeStory: action.payload };
    
    case 'SET_ACTIVE_VARIATIONS':
      return { ...state, activeVariations: action.payload };
    
    case 'SET_EDITING_VARIATION':
      return { ...state, editingVariation: action.payload };
    
    case 'ADD_VARIATION_CHANGE':
      return { 
        ...state, 
        variationsHistory: [...state.variationsHistory, action.payload]
      };
    
    case 'UPDATE_METADATA':
      return { ...state, metadata: action.payload };
    
    case 'SET_AI_SUGGESTIONS':
      return { ...state, aiSuggestions: action.payload };
    
    case 'SET_GAP_ANALYSIS':
      return { ...state, gapAnalysis: action.payload };
    
    case 'SET_ATS_SCORE':
      return { ...state, atsScore: action.payload };
    
    case 'SET_PM_ALIGNMENT':
      return { ...state, pmAlignment: action.payload };
    
    case 'ADD_CONTENT_VERSION':
      return { 
        ...state, 
        contentHistory: [...state.contentHistory, action.payload]
      };
    
    case 'ADD_PENDING_APPROVAL':
      return { 
        ...state, 
        pendingApprovals: [...state.pendingApprovals, action.payload]
      };
    
    case 'REMOVE_PENDING_APPROVAL':
      return { 
        ...state, 
        pendingApprovals: state.pendingApprovals.filter(
          content => content.id !== action.payload
        )
      };
    
    case 'ADD_CUSTOM_CONTENT':
      return { 
        ...state, 
        customContentLibrary: [...state.customContentLibrary, action.payload]
      };
    
    case 'UPDATE_CUSTOM_CONTENT':
      return { 
        ...state, 
        customContentLibrary: state.customContentLibrary.map(
          content => content.id === action.payload.id ? action.payload : content
        )
      };
    
    case 'DELETE_CUSTOM_CONTENT':
      return { 
        ...state, 
        customContentLibrary: state.customContentLibrary.filter(
          content => content.id !== action.payload
        )
      };
    
    case 'SET_AI_ASSISTANCE_LEVEL':
      return { ...state, aiAssistanceLevel: action.payload };
    
    case 'SET_COMPETENCY_FOCUS':
      return { ...state, competencyFocus: action.payload };
    
    case 'RESET_STATE':
      return initialState;
    
    default:
      return state;
  }
}

// Context interface
interface HILContextType {
  state: HILState;
  dispatch: React.Dispatch<HILAction>;
  
  // Convenience methods
  setActiveSection: (sectionId: string | null) => void;
  setEditingMode: (mode: 'manual' | 'ai-assisted' | 'review') => void;
  setActiveStory: (story: WorkHistoryBlurb | null) => void;
  setActiveVariations: (variations: BlurbVariation[]) => void;
  addVariationChange: (change: Omit<VariationChange, 'id' | 'timestamp'>) => void;
  addContentVersion: (version: Omit<ContentVersion, 'id' | 'createdAt'>) => void;
  addCustomContent: (content: Omit<CustomContent, 'id' | 'createdAt' | 'updatedAt'>) => void;
  resetState: () => void;
}

// Create context
const HILContext = createContext<HILContextType | undefined>(undefined);

// Provider component
interface HILProviderProps {
  children: ReactNode;
}

export function HILProvider({ children }: HILProviderProps) {
  const [state, dispatch] = useReducer(hilReducer, initialState);

  // Load state from localStorage on mount
  useEffect(() => {
    const savedState = localStorage.getItem('hil-state');
    if (savedState) {
      try {
        const parsedState = JSON.parse(savedState);
        // Only restore certain parts of the state
        if (parsedState.customContentLibrary) {
          parsedState.customContentLibrary.forEach((content: CustomContent) => {
            dispatch({ type: 'ADD_CUSTOM_CONTENT', payload: content });
          });
        }
        if (parsedState.aiAssistanceLevel) {
          dispatch({ type: 'SET_AI_ASSISTANCE_LEVEL', payload: parsedState.aiAssistanceLevel });
        }
        if (parsedState.competencyFocus) {
          dispatch({ type: 'SET_COMPETENCY_FOCUS', payload: parsedState.competencyFocus });
        }
      } catch (error) {
        console.error('Failed to load HIL state from localStorage:', error);
      }
    }
  }, []);

  // Save state to localStorage when it changes
  useEffect(() => {
    const stateToSave = {
      customContentLibrary: state.customContentLibrary,
      aiAssistanceLevel: state.aiAssistanceLevel,
      competencyFocus: state.competencyFocus
    };
    localStorage.setItem('hil-state', JSON.stringify(stateToSave));
  }, [state.customContentLibrary, state.aiAssistanceLevel, state.competencyFocus]);

  // Convenience methods
  const setActiveSection = (sectionId: string | null) => {
    dispatch({ type: 'SET_ACTIVE_SECTION', payload: sectionId });
  };

  const setEditingMode = (mode: 'manual' | 'ai-assisted' | 'review') => {
    dispatch({ type: 'SET_EDITING_MODE', payload: mode });
  };

  const setActiveStory = (story: WorkHistoryBlurb | null) => {
    dispatch({ type: 'SET_ACTIVE_STORY', payload: story });
  };

  const setActiveVariations = (variations: BlurbVariation[]) => {
    dispatch({ type: 'SET_ACTIVE_VARIATIONS', payload: variations });
  };

  const addVariationChange = (change: Omit<VariationChange, 'id' | 'timestamp'>) => {
    const newChange: VariationChange = {
      ...change,
      id: `change-${Date.now()}`,
      timestamp: new Date().toISOString()
    };
    dispatch({ type: 'ADD_VARIATION_CHANGE', payload: newChange });
  };

  const addContentVersion = (version: Omit<ContentVersion, 'id' | 'createdAt'>) => {
    const newVersion: ContentVersion = {
      ...version,
      id: `version-${Date.now()}`,
      createdAt: new Date().toISOString()
    };
    dispatch({ type: 'ADD_CONTENT_VERSION', payload: newVersion });
  };

  const addCustomContent = (content: Omit<CustomContent, 'id' | 'createdAt' | 'updatedAt'>) => {
    const newContent: CustomContent = {
      ...content,
      id: `content-${Date.now()}`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    dispatch({ type: 'ADD_CUSTOM_CONTENT', payload: newContent });
  };

  const resetState = () => {
    dispatch({ type: 'RESET_STATE' });
  };

  const value: HILContextType = {
    state,
    dispatch,
    setActiveSection,
    setEditingMode,
    setActiveStory,
    setActiveVariations,
    addVariationChange,
    addContentVersion,
    addCustomContent,
    resetState
  };

  return (
    <HILContext.Provider value={value}>
      {children}
    </HILContext.Provider>
  );
}

// Hook to use HIL context
export function useHIL() {
  const context = useContext(HILContext);
  if (context === undefined) {
    throw new Error('useHIL must be used within a HILProvider');
  }
  return context;
}

