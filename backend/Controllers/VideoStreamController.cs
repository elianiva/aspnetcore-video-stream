using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Hosting;
using System.IO;
using System.Threading.Tasks;
using backend.DTO;

namespace backend.Controllers;

[ApiController]
[Route("[controller]")]
public class VideoStreamController : ControllerBase
{
    private readonly IWebHostEnvironment _hostingEnvironment;

    public VideoStreamController(IWebHostEnvironment hostingEnvironment)
    {
        _hostingEnvironment = hostingEnvironment;
    }

    [HttpGet]
    public IActionResult Index()
    {
        return Ok("Hello World");
    }

    [HttpPost("upload")]
    public async Task<IActionResult> Upload([FromForm] StreamingVideoRequest request)
    {
        if (request.Id is null) return BadRequest(new { Message = "Id is required" });
        if (request.File is null) return BadRequest(new { Message = "File is required" });
        if (request.StartedAt is null) return BadRequest(new { Message = "StartedAt is required" });
        if (request.StoppedAt is null) return BadRequest(new { Message = "StoppedAt is required" });

        string basePath = _hostingEnvironment.ContentRootPath;
        string extension = Path.GetExtension(request.File.FileName);
        string filePath = Path.Combine(basePath, "Videos", request.Id, $"{request.StartedAt}_{request.StoppedAt}{extension}").ToString();
        Directory.CreateDirectory(Path.Combine(basePath, "Videos", request.Id));
        using (var fileStream = new FileStream(filePath, FileMode.Create))
        {
            await request.File.CopyToAsync(fileStream);
        }

        return Ok();
    }
}
