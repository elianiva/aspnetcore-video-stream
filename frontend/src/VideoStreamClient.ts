import {
  HubConnection,
  HubConnectionBuilder,
  HubConnectionState,
  LogLevel,
  Subject,
} from "@microsoft/signalr";
import { MessagePackHubProtocol } from "@microsoft/signalr-protocol-msgpack";

export class VideoStreamClient {
  private readonly _hubConnection: HubConnection;
  private _isStreamActive = false;

  constructor(url: string) {
    this._hubConnection = new HubConnectionBuilder()
      .withUrl(url)
      .withHubProtocol(new MessagePackHubProtocol())
      .configureLogging(LogLevel.Information)
      .build();
  }

  public async streamVideo(data: Blob) {
    if (this._hubConnection.state === HubConnectionState.Disconnected) {
      await this._start();
    }

    await this._hubConnection.invoke("UploadVideoStreamAsync", data);
    console.log("SENT", data)
  }

  private async _start() {
    await this._hubConnection.start();
  }
}

export const videoStreamClient = new VideoStreamClient(
  "http://localhost:5000/video"
);
