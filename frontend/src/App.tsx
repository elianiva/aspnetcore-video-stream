import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { concatMap, Subject } from "rxjs";
import "./App.css";

function guidGenerator() {
  const S4 = function () {
    return (((1 + Math.random()) * 0x10000) | 0).toString(16).substring(1);
  };
  return (
    S4() +
    S4() +
    "-" +
    S4() +
    "-" +
    S4() +
    "-" +
    S4() +
    "-" +
    S4() +
    S4() +
    S4()
  );
}

function App() {
  const id = guidGenerator();
  const videoElement = useRef<HTMLVideoElement | null>(null);
  const [videoStream, setVideoStream] = useState<MediaStream | null>(null);
  const mediaRecorder = useRef<MediaRecorder | null>(null);
  const [isStreaming, setStreaming] = useState(false);
  const [startedAt, setStartedAt] = useState<number>(new Date().getTime());
  const [videoSources, setVideoSources] = useState<InputDeviceInfo[]>([]);
  const [isAllowed, setAllowed] = useState(false);

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

  async function getUserMedia(deviceId?: string) {
    return await navigator.mediaDevices.getUserMedia({
      audio: false,
      video: {
        deviceId: deviceId ? { exact: deviceId } : undefined,
        width: 640,
        height: 360,
      },
    });
  }

  async function acquirePermission() {
    console.log("Checking permission...");
    // this is using the old way of checking permission since firefox doesn't support permissions API for camera
    try {
      const _ = await getUserMedia();
      setAllowed(true);
    } catch (err: unknown) {
      setAllowed(false);
      alert("Please allow camera permission and refresh the page.");
    }
  }

  async function startStreamHandler() {
    try {
      console.log("this is called");
      const stream = await getUserMedia();
      console.log("this passed through");
      setVideoStream(stream);

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
        if (err.message === "Permission denied") {
          alert("Please allow camera access");
        }

        console.error(err.message);
      }
    }
  }

  function stopStreamHandler() {
    if (
      videoElement.current === null ||
      videoStream === null ||
      mediaRecorder.current === null
    ) {
      return;
    }

    const videoTracks = videoStream.getVideoTracks();
    videoTracks[0].stop();

    mediaRecorder.current.stop();
    videoElement.current.srcObject = null;
    setStreaming(false);
  }

  async function changeVideoSource(deviceId: string) {
    const newStream = await getUserMedia(deviceId);
    setVideoStream(newStream);
  }

  useEffect(() => {
    (async () => {
      const sources = await navigator.mediaDevices.enumerateDevices();
      setVideoSources(
        sources.filter(
          (source): source is InputDeviceInfo =>
            source instanceof InputDeviceInfo && source.kind === "videoinput"
        )
      );
    })();
  }, [isAllowed]);

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
      <div className="buttons">
        {isAllowed ? (
          <>
            {isStreaming ? (
              <button className="button stop" onClick={stopStreamHandler}>
                Stop Stream
              </button>
            ) : (
              <button className="button start" onClick={startStreamHandler}>
                Start Stream
              </button>
            )}
            <select
              className="source-selection"
              placeholder="Select Source"
              onChange={(e) => changeVideoSource(e.currentTarget.value)}
            >
              {videoSources.map((source) => (
                <option key={source.groupId} value={source.deviceId}>
                  {source.label}
                </option>
              ))}
            </select>
          </>
        ) : (
          <button className="button start" onClick={acquirePermission}>
            Allow Permission
          </button>
        )}
      </div>
    </div>
  );
}

export default App;
