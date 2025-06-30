const TAVUS_API_URL = 'https://tavusapi.com/v2';
const TAVUS_API_KEY = process.env.EXPO_PUBLIC_TAVUS_API_KEY;

// Log API key status (without exposing the key)
console.log('Tavus API Key Status:', TAVUS_API_KEY ? 'Present' : 'Missing');

// Default replica ID for the app
export const DEFAULT_REPLICA_ID = 'r4c41453d2';

export class TavusAPI {
  private apiKey: string;

  constructor(apiKey?: string) {
    this.apiKey = apiKey || TAVUS_API_KEY || '';
    if (!this.apiKey) {
      console.warn('Tavus API key not found. Make sure EXPO_PUBLIC_TAVUS_API_KEY is set in your .env file and you have restarted your Expo development server.');
    }
  }

  private async makeRequest(endpoint: string, options: RequestInit = {}) {
    if (!this.apiKey) {
      throw new Error('Tavus API key is not configured. Please set EXPO_PUBLIC_TAVUS_API_KEY in your .env file.');
    }
    
    const url = `${TAVUS_API_URL}${endpoint}`;
    
    const response = await fetch(url, {
      ...options,
      headers: {
        'x-api-key': this.apiKey,
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Tavus API error: ${response.status} - ${error}`);
    }

    return response.json();
  }

  async getReplicas() {
    return await this.makeRequest('/replicas');
  }

  async getVideoStatus(video_id: string) {
    return await this.makeRequest(`/videos/${video_id}`, {
      method: 'GET',
    });
  }

  async generateVideo(request: {
    replica_id: string;
    script: string;
    background?: string;
    properties?: any;
  }) {
    return await this.makeRequest('/videos', {
      method: 'POST',
      body: JSON.stringify(request),
    });
  }

  async getVideo(videoId: string) {
    return await this.makeRequest(`/videos/${videoId}`);
  }

  async deleteVideo(videoId: string) {
    return await this.makeRequest(`/videos/${videoId}`, {
      method: 'DELETE',
    });
  }

  // Mock video generation for demo purposes when API is not available
  async mockGenerateVideo(script: string): Promise<any> {
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve({
          video_id: `mock_${Date.now()}`,
          status: 'queued',
          created_at: new Date().toISOString()
        });
      }, 1000);
    });
  }

  // Mock video status for demo purposes
  async mockGetVideoStatus(videoId: string, attempt: number = 0): Promise<any> {
    return new Promise((resolve) => {
      setTimeout(() => {
        if (attempt < 3) {
          resolve({
            video_id: videoId,
            status: 'generating',
            created_at: new Date().toISOString()
          });
        } else {
          resolve({
            video_id: videoId,
            status: 'completed',
            download_url: 'https://sample-videos.com/zip/10/mp4/SampleVideo_1280x720_1mb.mp4',
            thumbnail_url: 'https://images.pexels.com/photos/1181671/pexels-photo-1181671.jpeg',
            duration: 30,
            created_at: new Date().toISOString()
          });
        }
      }, 2000);
    });
  }

  // Conversation API
  async createConversation({ replica_id }: { replica_id: string }) {
    return await this.makeRequest('/conversations', {
      method: 'POST',
      body: JSON.stringify({
        replica_id,
      }),
    });
  }

  async getConversation(conversation_id: string) {
    return await this.makeRequest(`/conversations/${conversation_id}`);
  }

  async sendConversationMessage(conversation_id: string, message: string) {
    return await this.makeRequest(`/conversations/${conversation_id}/messages`, {
      method: 'POST',
      body: JSON.stringify({ message }),
    });
  }
}

// Create the instance with error handling in class methods
export const tavusAPI = new TavusAPI();