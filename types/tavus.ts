export interface TavusVideoRequest {
    replica_id: string;
    script: string;
    background?: string;
    properties?: {
      voice_settings?: {
        stability?: number;
        similarity_boost?: number;
      };
      max_clip_duration?: number;
    };
  }
  
  export interface TavusVideoResponse {
    video_id: string;
    status: 'queued' | 'generating' | 'completed' | 'failed';
    download_url?: string;
    thumbnail_url?: string;
    duration?: number;
    created_at: string;
  }
  
  export type TavusReplica = {
    replica_id: string;
    replica_name: string;
    status: string;
    thumbnail_url?: string;
    created_at: string;
    model_name?: string;
    thumbnail_video_url?: string;
  };
  
  export interface VideoGeneration {
    id: string;
    prompt_id: string;
    user_id: string;
    tavus_video_id: string;
    status: 'generating' | 'completed' | 'failed';
    video_url?: string;
    thumbnail_url?: string;
    duration?: number;
    script: string;
    replica_id: string;
    created_at: string;
    updated_at: string;
    generation_progress?: string;
  }