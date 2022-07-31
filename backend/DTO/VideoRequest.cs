using Microsoft.AspNetCore.Http;

namespace backend.DTO;

public class StreamingVideoRequest
{
    public string? Id { get; set; }
    public long? StartedAt { get; set; }
    public long? StoppedAt { get; set; }
    public IFormFile? File { get; set; }
}
