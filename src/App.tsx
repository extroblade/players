import './App.css';
import {VideoPlayer} from "./features/video-player";
import {AudioPlayer} from "./features/audio-player";

const App = () => {
  return (
    <div className="content">
      <VideoPlayer src={"https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8"} />
      {/* <AudioPlayer
        src={"https://cdn.freesound.org/previews/753/753874_12880153-lq.mp3"}
      /> */}
      <AudioPlayer
        src={"https://cdn.freesound.org/previews/753/753874_12880153-lq.mp3"}
      />
    </div>
  );
};

export default App;
