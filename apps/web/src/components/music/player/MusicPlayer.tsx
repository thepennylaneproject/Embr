import React, { useState, useRef, useEffect } from 'react';
import { Play, Pause, Volume2, VolumeX, SkipBack, SkipForward, Download, Share2 } from 'lucide-react';
import { useRecordStream } from '../hooks/useMusic';

interface MusicPlayerProps {
  trackId: string;
  trackTitle: string;
  artistName: string;
  audioUrl: string;
  duration: number;
  thumbnailUrl?: string;
  isPlaying?: boolean;
  onPlayStatusChange?: (isPlaying: boolean) => void;
  licensingModel?: 'free' | 'commercial' | 'exclusive' | 'restricted';
  creatorId?: string;
  onDownloadClick?: () => void;
}

/**
 * Music Player Component
 * Plays audio, tracks streams, shows playback controls
 */
export const MusicPlayer: React.FC<MusicPlayerProps> = ({
  trackId,
  trackTitle,
  artistName,
  audioUrl,
  duration,
  thumbnailUrl,
  isPlaying = false,
  onPlayStatusChange,
  licensingModel = 'free',
  creatorId,
  onDownloadClick,
}) => {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [playing, setPlaying] = useState(isPlaying);
  const [currentTime, setCurrentTime] = useState(0);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [hasRecordedStream, setHasRecordedStream] = useState(false);
  const [downloadMessage, setDownloadMessage] = useState<string | null>(null);
  const { recordStream } = useRecordStream();

  // Check if download is allowed based on licensing
  const canDownload = licensingModel !== 'restricted';

  const handleDownloadClick = () => {
    if (!canDownload) {
      setDownloadMessage('This track cannot be downloaded due to licensing restrictions');
      setTimeout(() => setDownloadMessage(null), 3000);
      return;
    }

    if (onDownloadClick) {
      onDownloadClick();
    } else {
      // Default: create a download link
      const link = document.createElement('a');
      link.href = audioUrl;
      link.download = `${artistName} - ${trackTitle}.mp3`;
      link.click();
    }
  };

  // Handle play/pause
  const handlePlayPause = () => {
    if (audioRef.current) {
      if (playing) {
        audioRef.current.pause();
      } else {
        audioRef.current.play();
      }
      setPlaying(!playing);
      onPlayStatusChange?.(!playing);
    }
  };

  // Record stream when play reaches 30 seconds or more
  useEffect(() => {
    if (playing && currentTime >= 30 && !hasRecordedStream) {
      recordStream(trackId, Math.floor(currentTime));
      setHasRecordedStream(true);
    }
  }, [currentTime, playing, trackId, hasRecordedStream, recordStream]);

  // Update current time
  const handleTimeUpdate = () => {
    if (audioRef.current) {
      setCurrentTime(audioRef.current.currentTime);
    }
  };

  // Handle volume change
  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newVolume = parseFloat(e.target.value);
    setVolume(newVolume);
    if (audioRef.current) {
      audioRef.current.volume = newVolume;
    }
  };

  // Toggle mute
  const handleMuteToggle = () => {
    if (audioRef.current) {
      if (isMuted) {
        audioRef.current.volume = volume;
      } else {
        audioRef.current.volume = 0;
      }
      setIsMuted(!isMuted);
    }
  };

  // Format time
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const progressPercent = (currentTime / duration) * 100;

  return (
    <div className="w-full bg-gradient-to-br from-embr-neutral-50 to-embr-neutral-100 rounded-lg p-6 text-embr-accent-900 shadow-lg border border-embr-neutral-200">
      {/* Track Info */}
      <div className="flex gap-4 mb-6">
        {thumbnailUrl && (
          <img
            src={thumbnailUrl}
            alt={trackTitle}
            className="w-24 h-24 rounded-lg object-cover shadow-md border border-embr-primary-200"
          />
        )}
        <div className="flex-1 flex flex-col justify-center">
          <h3 className="text-lg font-bold truncate text-embr-accent-900">{trackTitle}</h3>
          <p className="text-sm text-embr-accent-600 truncate">{artistName}</p>
          <div className="flex gap-2 mt-3">
            <button
              onClick={handleDownloadClick}
              disabled={!canDownload}
              className={`text-xs px-3 py-1 rounded-full transition flex items-center ${
                canDownload
                  ? 'bg-embr-primary-400 hover:bg-embr-primary-500 text-white cursor-pointer'
                  : 'bg-embr-neutral-400 text-embr-neutral-600 cursor-not-allowed opacity-50'
              }`}
              title={canDownload ? 'Download track' : 'Download not allowed for this track'}
            >
              <Download size={14} className="inline mr-1" />
              Download
            </button>
            <button className="text-xs bg-embr-secondary-400 hover:bg-embr-secondary-500 text-white px-3 py-1 rounded-full transition">
              <Share2 size={14} className="inline mr-1" />
              Share
            </button>
          </div>
          {downloadMessage && (
            <p className="text-xs text-embr-alert-500 mt-2">{downloadMessage}</p>
          )}
        </div>
      </div>

      {/* Progress Bar */}
      <div className="mb-4">
        <div className="w-full bg-embr-neutral-300 h-1 rounded-full overflow-hidden cursor-pointer">
          <div
            className="bg-gradient-to-r from-embr-primary-400 to-embr-primary-300 h-full transition-all"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
        <div className="flex justify-between text-xs text-embr-accent-600 mt-2">
          <span>{formatTime(currentTime)}</span>
          <span>{formatTime(duration)}</span>
        </div>
      </div>

      {/* Controls */}
      <div className="flex items-center justify-center gap-6 mb-6">
        <button className="hover:text-embr-primary-400 transition" title="Previous">
          <SkipBack size={24} className="text-embr-accent-700" />
        </button>

        <button
          onClick={handlePlayPause}
          className="bg-gradient-to-br from-embr-primary-400 to-embr-primary-500 hover:from-embr-primary-500 hover:to-embr-primary-600 p-4 rounded-full transition transform hover:scale-110 shadow-lg"
          title={playing ? 'Pause' : 'Play'}
        >
          {playing ? <Pause size={32} fill="white" /> : <Play size={32} fill="white" />}
        </button>

        <button className="hover:text-embr-primary-400 transition" title="Next">
          <SkipForward size={24} className="text-embr-accent-700" />
        </button>
      </div>

      {/* Volume Control */}
      <div className="flex items-center gap-3">
        <button onClick={handleMuteToggle} className="hover:text-embr-primary-400 transition text-embr-accent-700">
          {isMuted ? <VolumeX size={20} /> : <Volume2 size={20} />}
        </button>
        <input
          type="range"
          min="0"
          max="1"
          step="0.01"
          value={isMuted ? 0 : volume}
          onChange={handleVolumeChange}
          className="flex-1 h-1 bg-embr-neutral-300 rounded-full appearance-none cursor-pointer"
          style={{
            background: `linear-gradient(to right, rgb(196, 151, 125) 0%, rgb(196, 151, 125) ${volume * 100}%, rgb(218, 206, 192) ${volume * 100}%, rgb(218, 206, 192) 100%)`
          }}
        />
        <span className="text-xs text-embr-accent-600 w-8">{Math.round(volume * 100)}%</span>
      </div>

      {/* Hidden Audio Element */}
      <audio
        ref={audioRef}
        src={audioUrl}
        onTimeUpdate={handleTimeUpdate}
        onEnded={() => {
          setPlaying(false);
          onPlayStatusChange?.(false);
        }}
      />
    </div>
  );
};

export default MusicPlayer;
