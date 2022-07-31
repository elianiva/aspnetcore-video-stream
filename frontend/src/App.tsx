import { useCallback, useMemo, useRef, useState } from "react";
import { concatMap, Subject } from "rxjs";
import "./App.css";

function guidGenerator() {
  const S4 = function () {
    return (((1 + Math.random()) * 0x10000) | 0).toString(16).substring(1);
  };
  return (S4() + S4() + "-" + S4() + "-" + S4() + "-" + S4() + "-" + S4() + S4() + S4());
}

function App() {
  const videoElement = useRef<HTMLVideoElement | null>(null);
  const videoStream = useRef<MediaStream | null>(null);
  const mediaRecorder = useRef<MediaRecorder | null>(null);
  const [isStreaming, setStreaming] = useState(false);
  const [startedAt, setStartedAt] = useState<number>(new Date().getTime());
  const [id, setId] = useState<string>(guidGenerator());

  const subject$ = useMemo(() => new Subject<Blob>(), []);
  subject$
    .pipe(
      concatMap<Blob, Promise<[string, Blob]>>(async (data) => {
        const filename = "video.webm";
        const dataBuffer = await data.arrayBuffer();
        const uint8buffer = new Uint8Array(dataBuffer);
        const compressedBlob = new Blob([uint8buffer], {
          type: "video/webm;codecs=opus,vp9",
        });

        return [filename, compressedBlob];
      })
    )
    .subscribe(async ([filename, compressed]) => {
      const formData = new FormData();
      formData.append("id", id);
      formData.append("startedAt", startedAt.toString());
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
      console.log("this passed through");
      videoStream.current = stream;

      mediaRecorder.current = new MediaRecorder(stream, {
        mimeType: "video/webm;codecs=opus,vp9",
        videoBitsPerSecond: 200_000, // 0.2Mbits / sec
      });
      mediaRecorder.current.start(1000); // send blob every second
      mediaRecorder.current.onstart = () => console.log("Start recording...");
      mediaRecorder.current.ondataavailable = async (e: BlobEvent) => {
        subject$.next(e.data);
      };

      setStartedAt(new Date().getTime());
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
