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
}) => {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [playing, setPlaying] = useState(isPlaying);
  const [currentTime, setCurrentTime] = useState(0);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [hasRecordedStream, setHasRecordedStream] = useState(false);
  const { recordStream } = useRecordStream();

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
    <div className="w-full bg-gradient-to-br from-slate-900 to-slate-800 rounded-lg p-6 text-white shadow-2xl">
      {/* Track Info */}
      <div className="flex gap-4 mb-6">
        {thumbnailUrl && (
          <img
            src={thumbnailUrl}
            alt={trackTitle}
            className="w-24 h-24 rounded-lg object-cover shadow-lg"
          />
        )}
        <div className="flex-1 flex flex-col justify-center">
          <h3 className="text-lg font-bold truncate">{trackTitle}</h3>
          <p className="text-sm text-slate-300 truncate">{artistName}</p>
          <div className="flex gap-2 mt-3">
            <button className="text-xs bg-purple-600 hover:bg-purple-700 px-3 py-1 rounded-full transition">
              <Download size={14} className="inline mr-1" />
              Download
            </button>
            <button className="text-xs bg-blue-600 hover:bg-blue-700 px-3 py-1 rounded-full transition">
              <Share2 size={14} className="inline mr-1" />
              Share
            </button>
          </div>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="mb-4">
        <div className="w-full bg-slate-700 h-1 rounded-full overflow-hidden cursor-pointer">
          <div
            className="bg-gradient-to-r from-purple-500 to-pink-500 h-full transition-all"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
        <div className="flex justify-between text-xs text-slate-300 mt-2">
          <span>{formatTime(currentTime)}</span>
          <span>{formatTime(duration)}</span>
        </div>
      </div>

      {/* Controls */}
      <div className="flex items-center justify-center gap-6 mb-6">
        <button className="hover:text-purple-400 transition" title="Previous">
          <SkipBack size={24} />
        </button>

        <button
          onClick={handlePlayPause}
          className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 p-4 rounded-full transition transform hover:scale-110"
          title={playing ? 'Pause' : 'Play'}
        >
          {playing ? <Pause size={32} fill="white" /> : <Play size={32} fill="white" />}
        </button>

        <button className="hover:text-purple-400 transition" title="Next">
          <SkipForward size={24} />
        </button>
      </div>

      {/* Volume Control */}
      <div className="flex items-center gap-3">
        <button onClick={handleMuteToggle} className="hover:text-purple-400 transition">
          {isMuted ? <VolumeX size={20} /> : <Volume2 size={20} />}
        </button>
        <input
          type="range"
          min="0"
          max="1"
          step="0.01"
          value={isMuted ? 0 : volume}
          onChange={handleVolumeChange}
          className="flex-1 h-1 bg-slate-700 rounded-full appearance-none cursor-pointer accent-purple-600"
        />
        <span className="text-xs text-slate-300 w-8">{Math.round(volume * 100)}%</span>
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
