using Microsoft.AspNetCore.Mvc;
using System.Diagnostics;
using System.Text.Json;
using System.Text;
using PerformanceApp.Server.Models;
using System.Collections;

namespace PerformanceApp.Server.Controllers
{
    [ApiController]
    [Route("api/[controller]/[action]")]
    public class LogParserController : ControllerBase
    {

        private readonly ILogger<LogParserController> _logger;

        public LogParserController(ILogger<LogParserController> logger)
        {
            _logger = logger;
        }
        [HttpGet]
        public async Task<IActionResult> GetLogAsync(string url_path, string folder_path)
        {
            try
            {
                // đọc file JSON

                string json = System.IO.File.ReadAllText("Content/JSON/QueryParser.json");

                List<LogQueryItem> logQueryItems = JsonSerializer.Deserialize<List<LogQueryItem>>(json);

                string logFilePath = Path.Combine(
                            folder_path,
                            "*.log"
                        );

                var tasks = logQueryItems.Select(async item =>
                {
                    string query = item.Query.Replace("[LOGFILEPATH]", logFilePath);

                    string rawOutput = RunLogParser(url_path, query, item.Type);

                    // trả thẳng ra string (Number hoặc JSON)
                    item.QueryResult = LogParserHelper.ProcessLogResult(item, rawOutput);
                    item.Query = string.Empty; // xóa query gốc nếu không cần thiết
                    return item; // trả về object (không bắt buộc nếu không cần mảng)
                }).ToArray();

                // chờ tất cả xong
                await Task.WhenAll(tasks);
                return Ok(new
                {
                    success = true,
                    result = logQueryItems
                });
            }
            catch (Exception ex)
            {
                return BadRequest(ex.Message);
            }
        }
        private string RunLogParser(string logParserPath, string query, string type, int timeoutMs = 120000)
        {
            var process = new Process();

            process.StartInfo.FileName =
                logParserPath;
            if (type.Equals("CSV"))
            {
                process.StartInfo.Arguments = $"\"{query}\" -i:IISW3C -o:CSV";
            }
            else
            {
                process.StartInfo.Arguments =  $"\"{query}\" -i:IISW3C";
            }
           

            process.StartInfo.UseShellExecute = false;
            process.StartInfo.CreateNoWindow = true;
            process.StartInfo.RedirectStandardOutput = true; // đọc stdout
            process.StartInfo.RedirectStandardError = true;  // đọc stderr

            process.Start();

            bool exited = process.WaitForExit(timeoutMs);
            if (!exited)
            {
                process.Kill();
                return "Timeout - Task aborted";
            }

            string output = process.StandardOutput.ReadToEnd();
            string error = process.StandardError.ReadToEnd();

            if (!string.IsNullOrEmpty(error))
                return error;
            // Lọc bỏ phần Statistics (từ dòng chứa "Statistics:")
            var lines = output.Split('\n', StringSplitOptions.RemoveEmptyEntries);
            var filteredLines = lines.TakeWhile(line => !line.TrimStart().StartsWith("Statistics:")).ToArray();

            return string.Join(Environment.NewLine, filteredLines);
        }

    }

}
