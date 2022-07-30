using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Hosting;
using System;
using System.IO;
using System.Threading.Tasks;

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
    public async Task<IActionResult> Upload([FromForm] IFormFile file, [FromForm] string id)
    {
        string basePath = _hostingEnvironment.ContentRootPath;
        string extension = Path.GetExtension(file.FileName);
        string filePath = Path.Combine(basePath, "Videos", $"{id}{extension}").ToString();
        using (var fileStream = new FileStream(filePath, FileMode.Append))
        {
            await file.CopyToAsync(fileStream);
        }

        return Ok();
    }
}
