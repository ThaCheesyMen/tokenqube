import { create } from 'zustand';

// Types
export interface SceneSource {
  id: string;
  type: 'camera' | 'screen' | 'image' | 'text' | 'browser' | 'audio';
  name: string;
  visible: boolean;
  locked: boolean;
  position: { x: number; y: number };
  size: { width: number; height: number };
  rotation?: number;
  opacity?: number;
  volume?: number;
  deviceId?: string;
  imageUrl?: string;
  text?: string;
  fontSize?: number;
  color?: string;
  url?: string;
  videoElement?: HTMLVideoElement;
}

export interface Scene {
  id: string;
  name: string;
  sources: SceneSource[];
  thumbnail?: string;
}

export interface StreamSettings {
  quality: '720p' | '1080p' | '4k';
  fps: 30 | 60;
  bitrate: number;
  encoder: 'software' | 'hardware';
  keyframeInterval: number;
}

export interface StreamStats {
  viewerCount: number;
  duration: number;
  bitrate: number;
  fps: number;
  droppedFrames: number;
  cpuUsage: number;
}

export interface StreamEffect {
  id: string;
  name: string;
  type: 'blur' | 'grayscale' | 'sepia' | 'brightness' | 'contrast' | 'saturation';
  value: number;
}

// Store Interface
interface StreamStore {
  // State
  isStreaming: boolean;
  streamTitle: string;
  streamDescription: string;
  settings: StreamSettings;
  stats: StreamStats;
  scenes: Scene[];
  activeSceneId: string;
  sceneSources: SceneSource[];
  selectedSourceId: string | null;
  activeEffects: StreamEffect[];
  isRecording: boolean;
  recordingDuration: number;
  replayBufferEnabled: boolean;
  
  // Actions
  setIsStreaming: (value: boolean) => void;
  setStreamTitle: (title: string) => void;
  setStreamDescription: (description: string) => void;
  updateSettings: (settings: Partial<StreamSettings>) => void;
  updateStats: (stats: Partial<StreamStats>) => void;
  
  // Scene Management
  setScenes: (scenes: Scene[]) => void;
  addScene: (scene: Scene) => void;
  deleteScene: (sceneId: string) => void;
  duplicateScene: (sceneId: string) => void;
  setActiveSceneId: (sceneId: string) => void;
  updateScene: (sceneId: string, updates: Partial<Scene>) => void;
  
  // Source Management
  setSceneSources: (sources: SceneSource[]) => void;
  addSource: (source: SceneSource) => void;
  removeSource: (sourceId: string) => void;
  updateSource: (sourceId: string, updates: Partial<SceneSource>) => void;
  moveSourceLayer: (sourceId: string, direction: 'up' | 'down') => void;
  setSelectedSourceId: (sourceId: string | null) => void;
  
  // Effects Management
  addEffect: (effect: StreamEffect) => void;
  updateEffect: (effectId: string, value: number) => void;
  removeEffect: (effectId: string) => void;
  
  // Recording
  setIsRecording: (value: boolean) => void;
  setRecordingDuration: (duration: number) => void;
  setReplayBufferEnabled: (enabled: boolean) => void;
}

// Create Store
export const useStreamStore = create<StreamStore>((set, get) => ({
  // Initial State
  isStreaming: false,
  streamTitle: '',
  streamDescription: '',
  settings: {
    quality: '1080p',
    fps: 60,
    bitrate: 6000,
    encoder: 'software',
    keyframeInterval: 2
  },
  stats: {
    viewerCount: 0,
    duration: 0,
    bitrate: 0,
    fps: 0,
    droppedFrames: 0,
    cpuUsage: 0
  },
  scenes: [
    { id: 'main', name: 'Main Scene', sources: [] },
    { id: 'gaming', name: 'Gaming Scene', sources: [] },
    { id: 'chatting', name: 'Chatting Scene', sources: [] },
  ],
  activeSceneId: 'main',
  sceneSources: [],
  selectedSourceId: null,
  activeEffects: [],
  isRecording: false,
  recordingDuration: 0,
  replayBufferEnabled: false,

  // Actions
  setIsStreaming: (value) => set({ isStreaming: value }),
  setStreamTitle: (title) => set({ streamTitle: title }),
  setStreamDescription: (description) => set({ streamDescription: description }),
  updateSettings: (newSettings) => set((state) => ({
    settings: { ...state.settings, ...newSettings }
  })),
  updateStats: (newStats) => set((state) => ({
    stats: { ...state.stats, ...newStats }
  })),

  // Scene Management
  setScenes: (scenes) => set({ scenes }),
  addScene: (scene) => set((state) => ({
    scenes: [...state.scenes, scene]
  })),
  deleteScene: (sceneId) => set((state) => {
    const newScenes = state.scenes.filter(s => s.id !== sceneId);
    const newActiveId = state.activeSceneId === sceneId ? newScenes[0]?.id : state.activeSceneId;
    return { scenes: newScenes, activeSceneId: newActiveId };
  }),
  duplicateScene: (sceneId) => set((state) => {
    const scene = state.scenes.find(s => s.id === sceneId);
    if (!scene) return state;
    
    const newScene: Scene = {
      ...scene,
      id: `scene-${Date.now()}`,
      name: `${scene.name} (Copy)`,
      sources: scene.sources.map(s => ({ ...s, id: `source-${Date.now()}-${Math.random()}` }))
    };
    return { scenes: [...state.scenes, newScene] };
  }),
  setActiveSceneId: (sceneId) => set({ activeSceneId: sceneId }),
  updateScene: (sceneId, updates) => set((state) => ({
    scenes: state.scenes.map(scene =>
      scene.id === sceneId ? { ...scene, ...updates } : scene
    )
  })),

  // Source Management
  setSceneSources: (sources) => set({ sceneSources: sources }),
  addSource: (source) => set((state) => ({
    sceneSources: [...state.sceneSources, source]
  })),
  removeSource: (sourceId) => set((state) => ({
    sceneSources: state.sceneSources.filter(s => s.id !== sourceId),
    selectedSourceId: state.selectedSourceId === sourceId ? null : state.selectedSourceId
  })),
  updateSource: (sourceId, updates) => set((state) => ({
    sceneSources: state.sceneSources.map(source =>
      source.id === sourceId ? { ...source, ...updates } : source
    )
  })),
  moveSourceLayer: (sourceId, direction) => set((state) => {
    const index = state.sceneSources.findIndex(s => s.id === sourceId);
    if (index === -1) return state;
    
    const newSources = [...state.sceneSources];
    if (direction === 'up' && index < newSources.length - 1) {
      [newSources[index], newSources[index + 1]] = [newSources[index + 1], newSources[index]];
    } else if (direction === 'down' && index > 0) {
      [newSources[index], newSources[index - 1]] = [newSources[index - 1], newSources[index]];
    }
    return { sceneSources: newSources };
  }),
  setSelectedSourceId: (sourceId) => set({ selectedSourceId: sourceId }),

  // Effects Management
  addEffect: (effect) => set((state) => ({
    activeEffects: [...state.activeEffects, effect]
  })),
  updateEffect: (effectId, value) => set((state) => ({
    activeEffects: state.activeEffects.map(effect =>
      effect.id === effectId ? { ...effect, value } : effect
    )
  })),
  removeEffect: (effectId) => set((state) => ({
    activeEffects: state.activeEffects.filter(e => e.id !== effectId)
  })),

  // Recording
  setIsRecording: (value) => set({ isRecording: value }),
  setRecordingDuration: (duration) => set({ recordingDuration: duration }),
  setReplayBufferEnabled: (enabled) => set({ replayBufferEnabled: enabled }),
}));

