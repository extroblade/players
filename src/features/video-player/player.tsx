import cs from './player.module.css';

import React, {ChangeEvent, useEffect, useRef, useState, VideoHTMLAttributes} from "react";
import Hls from "hls.js";

const PLAYBACK_RATES = [0.5, 1, 1.5, 2];
const SEEK_STEP = 5;

export const Player = ({ src }: {src: string}) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const previewVideoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [previewTime, setPreviewTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [showPreview, setShowPreview] = useState(false);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [availableQualities, setAvailableQualities] = useState([]);
  const [currentQuality, setCurrentQuality] = useState<number | null>(null);
  const [volume, setVolume] = useState(1);
  const hlsRef = useRef<Hls | null>(null);
  const previewHlsRef = useRef<Hls | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const video = videoRef.current as HTMLVideoElement;

    if (Hls.isSupported()) {
      const hls = new Hls();
      hlsRef.current = hls;
      hls.loadSource(src);
      hls.attachMedia(video);
      hls.on(Hls.Events.MANIFEST_PARSED, (_, data) => {
        const qualities = data.levels.map((level, index) => ({
          index,
          resolution: `${level.height}p`,
        }));
        setAvailableQualities(qualities);
        setCurrentQuality(qualities[0]?.index);
      });

      hls.on(Hls.Events.LEVEL_SWITCHED, (_, data) => {
        setCurrentQuality(data.level);
      });

      video.onloadedmetadata = () => setDuration(video.duration);
    } else {
      video.src = src;
      video.addEventListener("loadedmetadata", () =>
        setDuration(video.duration)
      );
    }

    if (Hls.isSupported() && previewVideoRef.current) {
      const previewHls = new Hls();
      previewHlsRef.current = previewHls;
      previewHls.loadSource(src);
      previewHls.attachMedia(previewVideoRef.current);
    }

    return () => {
      hlsRef.current?.destroy();
      previewHlsRef.current?.destroy();
    };
  }, [src]);

  const handlePlayPause = () => {
    const video = videoRef.current;
    setIsPlaying(!isPlaying);
    isPlaying ? video.pause() : video.play();
  };

  const handleProgress = () => {
    if (!isDragging && duration) {
      const video = videoRef.current;
      const currentTime = video.currentTime;
      setProgress((currentTime / duration) * 100);
    }
  };

  const handleSeekStart = () => {
    setIsDragging(true);
    setShowPreview(true);
  };

  const handleSeek = (event) => {
    const seekPosition = event.target.value;
    const seekTime = (seekPosition / 100) * duration;
    setPreviewTime(seekTime);
    drawPreviewFrame(seekTime);
  };

  const handleSeekEnd = (event) => {
    const seekPosition = event.target.value;
    const seekTime = (seekPosition / 100) * duration;
    const video = videoRef.current;
    video.currentTime = seekTime;
    setIsDragging(false);
    setShowPreview(false);
    setProgress(seekPosition);
    setIsLoading(true);
    video.addEventListener("canplay", () => setIsLoading(false));
  };

  const drawPreviewFrame = (seekTime) => {
    const canvas = canvasRef.current;
    const video = previewVideoRef.current;

    if (canvas && video) {
      const ctx = canvas.getContext("2d");
      if (ctx) {
        video.currentTime = seekTime;
        video.addEventListener(
          "seeked",
          () => {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
          },
          { once: true }
        );
      }
    }
  };

  const changeQuality = (qualityIndex) => {
    if(!hlsRef.current) {
      return;
    }
    const hls = hlsRef.current as Hls;
    hls.currentLevel = qualityIndex;
  };

  const changePlaybackRate = (rate) => {
    const video = videoRef.current as HTMLVideoElement;
    video.playbackRate = rate;
    setPlaybackRate(rate);
  };

  const handleKeyDown = (e: KeyboardEvent) => {
    const video = videoRef.current as HTMLVideoElement;
    switch (e.code) {
      case "Space":
        e.preventDefault();
        handlePlayPause();
        break;
      case "ArrowLeft":
        video.currentTime = Math.max(
          0,
          video.currentTime - SEEK_STEP
        );
        break;
      case "ArrowRight":
        video.currentTime = Math.min(
          duration,
          video.currentTime + SEEK_STEP
        );
        break;
      default:
        break;
    }
  };

  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isPlaying, duration]);

  const handleVolumeChange = (event) => {
    const newVolume = event.target.value;
    const video = videoRef.current as HTMLVideoElement;
    video.volume = newVolume;
    setVolume(newVolume);
  };

  return (
    <div className={cs.container}>
      <div className={cs.player} onClick={() => handlePlayPause()}>
        <video
          ref={videoRef}
          onTimeUpdate={handleProgress}
          width="100%"
          controls={false}
        >
          Your browser does not support the video tag.
        </video>
        {isLoading && (
          <div
            className={cs.loading}
          >
            Loading...
          </div>
        )}

        <video ref={previewVideoRef} style={{display: "none"}}>
          <source src={src} type="application/x-mpegURL"/>
        </video>

        <div className={`${cs.onhover} ${cs.bot}`} onClick={(e) => e.stopPropagation()}>
          <div
            className={cs.play}
          >
            <button onClick={handlePlayPause}>
              {isPlaying ? "Pause" : "Play"}
            </button>

            <input
              className={cs.range}
              type="range"
              min="0"
              max="100"
              value={isDragging ? (previewTime / duration) * 100 : progress}
              onMouseDown={handleSeekStart}
              onChange={handleSeek}
              onMouseUp={handleSeekEnd}
            />
          </div>
        </div>
        {!isPlaying && (
          <button className={cs.onpause}>
            Play
          </button>
        )}
        <div className={`${cs.onhover} ${cs.top}`} onClick={(e) => e.stopPropagation()}>
          {showPreview && (
            <canvas
              ref={canvasRef}
              width="300"
              height="150"
              className={cs.preview}
            />
          )}

          <div
            className={cs.controls}
          >
            <div>
              {availableQualities.map((quality) => (
                <button
                  key={quality.index}
                  onClick={() => changeQuality(quality.index)}
                  disabled={currentQuality === quality.index}
                >
                  {quality.resolution}
                </button>
              ))}
            </div>

            <div>
              {PLAYBACK_RATES.map((rate) => (
                <button
                  key={rate}
                  onClick={() => changePlaybackRate(rate)}
                  disabled={playbackRate === rate}
                >
                  {rate}x
                </button>
              ))}
            </div>

            <div>
              <input
                type="range"
                min="0"
                max="1"
                step="0.01"
                value={volume}
                onChange={handleVolumeChange}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
