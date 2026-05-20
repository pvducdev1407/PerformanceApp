using Microsoft.AspNetCore.Mvc;
using PerformanceApp.Server.Services;

namespace PerformanceApp.Server.Controllers;

[ApiController]
[Route("api/[controller]")]
public class JiraController : ControllerBase
{
    private readonly JiraService _jiraService;
    private readonly ILogger<JiraController> _logger;

    public JiraController(JiraService jiraService, ILogger<JiraController> logger)
    {
        _jiraService = jiraService;
        _logger = logger;
    }

    /// <summary>
    /// Test Jira connection
    /// </summary>
    [HttpPost("test-connection")]
    public async Task<IActionResult> TestConnection([FromBody] JiraTestConnectionRequest request)
    {
        try
        {
            var result = await _jiraService.TestConnection(request.JiraUrl!, request.Username!, request.Password!);
            return Ok(new { success = true, data = result });
        }
        catch (Exception ex)
        {
            _logger.LogError($"Jira test connection failed: {ex.Message}");
            return BadRequest(new { success = false, message = ex.Message });
        }
    }

    /// <summary>
    /// Search Jira issues with JQL
    /// </summary>
    [HttpPost("search")]
    public async Task<IActionResult> SearchIssues([FromBody] JiraSearchRequest request)
    {
        try
        {
            var result = await _jiraService.SearchIssues(
                request.JiraUrl!,
                request.Username!,
                request.Password!,
                request.Jql!,
                request.Fields ?? new[] { "key", "summary", "assignee", "created", "status", "issuetype" }
            );
            return Ok(new { success = true, data = result });
        }
        catch (Exception ex)
        {
            _logger.LogError($"Failed to search issues: {ex.Message}");
            return BadRequest(new { success = false, message = ex.Message });
        }
    }
}

// Request models
public class JiraAuthRequest
{
    public string? JiraUrl { get; set; }
    public string? Username { get; set; }
    public string? Password { get; set; }
}

public class JiraTestConnectionRequest : JiraAuthRequest
{
}

public class JiraSearchRequest : JiraAuthRequest
{
    public string? Jql { get; set; }
    public string[]? Fields { get; set; }
}
