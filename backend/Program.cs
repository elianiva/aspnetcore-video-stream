using Microsoft.AspNetCore.Http.Features;
using Microsoft.AspNetCore.Builder;
using Microsoft.Extensions.DependencyInjection;

var builder = WebApplication.CreateBuilder(args);

// Add services to the container.
builder.Services.AddControllers();
// builder.Services.AddSignalR().AddMessagePackProtocol();

builder.Services.Configure<FormOptions>(options =>
{
    options.ValueLengthLimit = 5 * 1024 * 1024; // 5 MB
    options.MultipartBodyLengthLimit = 5 * 1024 * 1024;; // 5 MB 
    options.MemoryBufferThreshold = int.MaxValue;
});

var app = builder.Build();

app.UseCors(builder =>
{
    builder.WithOrigins("http://localhost:3000")
           .AllowAnyMethod()
           .AllowAnyHeader()
           .AllowCredentials();
});

// app.UseHttpsRedirection();

app.MapControllers();
// app.MapHub<VideoStreamHub>("/video");

app.Run();
