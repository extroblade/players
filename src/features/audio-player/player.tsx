import cs from './player.module.css';

import React, { useEffect, useRef, useState } from "react";

const DEFAULT_OPTIONS = {
  canvasWidth: 600,
  canvasHeight: 300,
  barColor: "rgb(100, 100, 255)",
  listenedBarColor: "rgb(0, 255, 0)",
  samplesDivider: 1,
  mergeAmount: 5,
};

type IOptions = typeof DEFAULT_OPTIONS;

export const Player = ({ src, options = {} as IOptions }: {src: string, options?: IOptions }) => {
  const {
    canvasWidth,
    canvasHeight,
    barColor,
    listenedBarColor,
    samplesDivider,
    mergeAmount,
  } = { ...DEFAULT_OPTIONS, ...options };

  const audioRef = useRef(null);
  const canvasRef = useRef(null);
  const containerRef = useRef(null);

  const [isPlaying, setIsPlaying] = useState(false);
  const [duration, setDuration] = useState(0);
  const [progress, setProgress] = useState(0);
  const [waveform, setWaveform] = useState([]);
  const audioContextRef = useRef(null);

  useEffect(() => {
    if(!canvasRef.current || containerRef.current) {
      return;
    }
    canvasRef.current.width = containerRef.current.offsetWidth;
    canvasRef.current.height = containerRef.current.offsetHeight;
  }, []);

  useEffect(() => {
    const audio = audioRef.current;

    const handleMetadataLoaded = () => {
      setDuration(audio.duration);
    };

    const createWaveform = async () => {
      const response = await fetch(src);
      const arrayBuffer = await response.arrayBuffer();

      if (!audioContextRef.current) {
        audioContextRef.current = new (window.AudioContext ||
          window?.webkitAudioContext)();
      }

      const audioBuffer = await audioContextRef.current.decodeAudioData(
        arrayBuffer
      );

      const rawData = audioBuffer.getChannelData(0);
      const width = canvasRef.current.width;
      const samples = width / (samplesDivider < 2 ? 2 : samplesDivider);
      const blockSize = Math.floor(rawData.length / samples);

      const filteredData = [];

      for (let i = 0; i < samples; i++) {
        const blockStart = blockSize * i;
        let sum = 0;

        for (let j = 0; j < blockSize; j++) {
          sum += Math.abs(rawData[blockStart + j]);
        }
        filteredData.push(sum / blockSize);
      }

      setWaveform(filteredData);
    };

    audio.addEventListener("loadedmetadata", handleMetadataLoaded);
    createWaveform();

    return () => {
      audio.removeEventListener("loadedmetadata", handleMetadataLoaded);
    };
  }, [src, samplesDivider]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const canvasContext = canvas.getContext("2d");
    const width = canvas.width;
    const height = canvas.height;

    const drawWaveform = () => {
      canvasContext.clearRect(0, 0, width, height);
      const barWidth = width / waveform.length;
      let x = 0;

      for (let i = 0; i < waveform.length; i++) {
        const offset = mergeAmount - i % mergeAmount;
        const barHeight = waveform[i + offset] * height;
        const currentPosition = Math.floor((progress / 100) * waveform.length);
        const isCurrentPositionListened = i < currentPosition;

        canvasContext.fillStyle = isCurrentPositionListened
          ? listenedBarColor
          : barColor;
        const barOffset = offset - 1 ? 0 : 1;

        canvasContext.fillRect(
          x,
          height - barHeight,
          barWidth - barOffset,
          barHeight
        );
        x += barWidth;
      }
    };

    if (waveform.length > 0) {
      drawWaveform();
    }
  }, [waveform, progress, barColor, listenedBarColor]);

  const handlePlayPause = () => {
    const audio = audioRef.current;
    if (isPlaying) {
      audio.pause();
    } else {
      audio.play();
    }
    setIsPlaying(!isPlaying);
  };

  const handleTimeUpdate = () => {
    const audio = audioRef.current;
    setProgress((audio.currentTime / duration) * 100);
  };

  const handleCanvasClick = (event) => {
    const canvas = canvasRef.current;
    const clickX = event.nativeEvent.offsetX;
    const seekTime = (clickX / canvas.width) * duration;
    audioRef.current.currentTime = seekTime;
  };

  return (
    <div className={cs.container}>
      <button onClick={handlePlayPause}>
        {isPlaying ? "Pause" : "Play"}
      </button>
      <div
        ref={containerRef}
        className={cs.waveform}
        style={{
          width: canvasWidth,
          height: canvasHeight,
        }}
      >
        <audio
          ref={audioRef}
          src={src}
          onTimeUpdate={handleTimeUpdate}
          crossOrigin="anonymous"
        />
        <canvas
          ref={canvasRef}
          className={cs.canvas}
          onClick={handleCanvasClick}
        />
      </div>
    </div>
  );
};
