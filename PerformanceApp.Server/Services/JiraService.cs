using System.Net.Http.Headers;
using System.Text;
using Newtonsoft.Json;
using Newtonsoft.Json.Linq;

namespace PerformanceApp.Server.Services;

public class JiraService
{
    private readonly HttpClient _httpClient;
    private readonly ILogger<JiraService> _logger;

    public JiraService(HttpClient httpClient, ILogger<JiraService> logger)
    {
        _httpClient = httpClient;
        _logger = logger;
    }

    /// <summary>
    /// Create Basic Auth header value
    /// </summary>
    private string CreateBasicAuthHeader(string username, string password)
    {
        var credentials = Convert.ToBase64String(System.Text.Encoding.ASCII.GetBytes($"{username}:{password}"));
        return credentials;
    }

    /// <summary>
    /// Test Jira connection by getting current user info
    /// Uses GET /rest/api/2/myself endpoint
    /// </summary>
    public async Task<dynamic> TestConnection(string jiraUrl, string username, string password)
    {
        try
        {
            var url = $"{jiraUrl.TrimEnd('/')}/rest/api/2/myself";

            var request = new HttpRequestMessage(HttpMethod.Get, url);
            request.Headers.Authorization = new AuthenticationHeaderValue("Basic",
                CreateBasicAuthHeader(username, password));

            var response = await _httpClient.SendAsync(request);

            if (!response.IsSuccessStatusCode)
            {
                var errorContent = await response.Content.ReadAsStringAsync();
                _logger.LogError($"Jira connection test failed: {response.StatusCode} - {errorContent}");
                throw new Exception($"Failed to connect to Jira: {response.StatusCode}. {errorContent}");
            }

            var content = await response.Content.ReadAsStringAsync();
            return JsonConvert.DeserializeObject(content)!;
        }
        catch (Exception ex)
        {
            _logger.LogError($"Error testing Jira connection: {ex.Message}");
            throw new Exception("Failed to test Jira connection. Please check URL, username, and password.", ex);
        }
    }


    /// <summary>
    /// Search Jira issues using JQL
    /// Uses GET /rest/api/2/search endpoint with JQL and fields parameters
    /// Reference: https://developer.atlassian.com/server/jira/platform/jira-rest-api-examples/
    /// </summary>
    public async Task<JObject> SearchIssues(
    string jiraUrl,
    string username,
    string password,
    string jql,
    string[] fields,
    int startAt = 0,
    int maxResults = 100)
    {
        try
        {
            var url = $"{jiraUrl.TrimEnd('/')}/rest/api/2/search";

            var payload = new
            {
                jql = jql,
                startAt = startAt,
                maxResults = maxResults,
                fields = fields
            };

            var json = JsonConvert.SerializeObject(payload);

            var request = new HttpRequestMessage(
                HttpMethod.Post,
                url);

            request.Headers.Authorization =
                new AuthenticationHeaderValue(
                    "Basic",
                    CreateBasicAuthHeader(username, password));

            request.Content =
                new StringContent(
                    json,
                    Encoding.UTF8,
                    "application/json");

            var response =
                await _httpClient.SendAsync(request);

            var content =
                await response.Content.ReadAsStringAsync();

            if (!response.IsSuccessStatusCode)
            {
                _logger.LogError(
                    $"Jira search failed. Status: {response.StatusCode}, Response: {content}");

                throw new Exception(
                    $"Jira search failed: {response.StatusCode}");
            }

            var data =
                JsonConvert.DeserializeObject<JObject>(content);

            if (data == null || data["issues"] == null)
            {
                return new JObject
                {
                    ["issues"] = new JArray()
                };
            }

            return data;
        }
        catch (HttpRequestException ex)
        {
            _logger.LogError(
                $"HTTP error searching Jira issues: {ex.Message}");

            throw;
        }
        catch (Exception ex)
        {
            _logger.LogError(
                $"Unexpected error searching Jira issues: {ex.Message}");

            throw;
        }
    }
}
