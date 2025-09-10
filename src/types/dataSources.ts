export interface DataSource {
  id: string;
  name: string;
  description: string;
  status: 'connected' | 'disconnected' | 'pending' | 'error';
  lastSync?: string;
  icon: string;
  action?: 'connect' | 'disconnect' | 'configure' | 'none';
}

export const DATA_SOURCES: DataSource[] = [
  {
    id: 'linkedin',
    name: 'LinkedIn',
    description: 'Import your professional profile and work experience',
    status: 'connected',
    lastSync: '2024-01-15T10:30:00Z',
    icon: 'linkedin',
    action: 'disconnect'
  },
  {
    id: 'openai',
    name: 'OpenAI',
    description: 'API key for AI-powered content generation',
    status: 'connected',
    lastSync: '2024-01-15T10:30:00Z',
    icon: 'openai',
    action: 'configure'
  },
  {
    id: 'google-drive',
    name: 'Google Drive',
    description: 'Access and sync documents from your Google Drive',
    status: 'disconnected',
    icon: 'google-drive',
    action: 'connect'
  }
];
