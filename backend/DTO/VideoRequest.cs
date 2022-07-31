using Microsoft.AspNetCore.Http;

namespace backend.DTO;

public class StreamingVideoRequest
{
    public long? StartedAt { get; set; }
    public long? StoppedAt { get; set; }
    public IFormFile? File { get; set; }
}
