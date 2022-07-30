import { createFFmpeg } from "@ffmpeg/ffmpeg";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { concatMap, Subject } from "rxjs";
import "./App.css";

function App() {
  const videoElement = useRef<HTMLVideoElement | null>(null);
  const videoStream = useRef<MediaStream | null>(null);
  const mediaRecorder = useRef<MediaRecorder | null>(null);
  const [isStreaming, setStreaming] = useState(false);
  const [getStartedAt, setStartedAt] = useState<Date>(new Date());

  const ffmpeg = useMemo(() => {
    const ffmpeg = createFFmpeg({
      corePath: "../node_modules/@ffmpeg/core/dist/ffmpeg-core.js",
      log: true,
    });
    return ffmpeg;
  }, []);

  const subject$ = useMemo(() => new Subject<Blob>(), []);
  subject$
    .pipe(
      concatMap<Blob, Promise<[string, Blob]>>(async (data) => {
        const filename = "video.webm";
        const dataBuffer = await data.arrayBuffer();
        const uint8buffer = new Uint8Array(dataBuffer);
        // ffmpeg.FS("writeFile", filename, uint8buffer);
        // await ffmpeg.run(
        //   "-i",
        //   filename,
        //   "-crf",
        //   "1",
        //   "-c:v",
        //   "libx264",
        //   "output.mp4"
        // );
        // const compressed = ffmpeg.FS("readFile", "output.mp4");
        const compressedBlob = new Blob([uint8buffer], { type: "video/webm;codecs=opus,vp8" });

        return [filename, compressedBlob];
      })
    )
    .subscribe(async ([filename, compressed]) => {
      const formData = new FormData();
      formData.append("id", "79bd0a65-eaa3-4bd6-8e69-052d8ac56129");
      formData.append("startedAt", getStartedAt.toString());
      formData.append("stoppedAt", Date.now().toString());
      formData.append("file", compressed, filename);
      await fetch("http://localhost:5000/videostream/upload", {
        method: "POST",
        headers: {
          "Content-Length": compressed.size.toString(),
        },
        body: formData,
      });
    });

  useEffect(() => {
    (async () => {
      await ffmpeg.load();
    })();
  }, []);

  const startStreamHandler = useCallback(async () => {
    try {
      console.log("this is called");
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: false,
        video: {
          width: 640,
          height: 360,
        },
      });
      console.log("this passed through")
      videoStream.current = stream;

      mediaRecorder.current = new MediaRecorder(stream, {
        mimeType: "video/webm;codecs=opus,vp8",
        videoBitsPerSecond: 200_000, // 0.2Mbits / sec
      });
      mediaRecorder.current.start(1000); // send blob every second
      mediaRecorder.current.onstart = () => console.log("Start recording...");
      mediaRecorder.current.ondataavailable = async (e: BlobEvent) => {
        subject$.next(e.data);
      };

      setStartedAt(new Date());
      setStreaming(true);

      if (videoElement.current === null) {
        return;
      }

      videoElement.current.srcObject = stream;
    } catch (err) {
      if (err instanceof Error) {
        console.error(err.message);
      }

      console.error(err);
    }
  }, []);

  const stopStreamHandler = useCallback(() => {
    if (
      videoElement.current === null ||
      videoStream.current === null ||
      mediaRecorder.current === null
    ) {
      return;
    }

    const videoTracks = videoStream.current.getVideoTracks();
    videoTracks[0].stop();

    mediaRecorder.current.stop();
    videoElement.current.srcObject = null;
    setStreaming(false);
  }, []);

  return (
    <div className="App">
      <video
        className="video"
        ref={videoElement}
        controls
        autoPlay
        width={640}
        height={360}
      ></video>
      {isStreaming ? (
        <button className="stop button" onClick={stopStreamHandler}>
          Stop Stream
        </button>
      ) : (
        <button className="start button" onClick={startStreamHandler}>
          Start Stream
        </button>
      )}
    </div>
  );
}

export default App;
