using Newtonsoft.Json;
using Newtonsoft.Json.Linq;
using Formatting = Newtonsoft.Json.Formatting;

public static class AppSettingsHelper
{
    private static readonly string _filePath;
    private static IConfigurationRoot _configuration;

    static AppSettingsHelper()
    {
        _filePath = Path.Combine(
            AppContext.BaseDirectory,
            "appsettings.json");

        var builder = new ConfigurationBuilder()
            .SetBasePath(AppContext.BaseDirectory)
            .AddJsonFile("appsettings.json",
                optional: false,
                reloadOnChange: true);

        _configuration = builder.Build();
    }

    // GET
    public static string Get(string key)
    {
        return _configuration[key];
    }

    // SET
    public static void Set(string key, string value)
    {
        var json = File.ReadAllText(_filePath);

        var jsonObj = JObject.Parse(json);

        SetValue(jsonObj, key, value);

        File.WriteAllText(
            _filePath,
            JsonConvert.SerializeObject(jsonObj, Formatting.Indented));

        Reload();
    }

    private static void SetValue(
        JObject jsonObj,
        string key,
        string value)
    {
        var sections = key.Split(':');

        JToken current = jsonObj;

        for (int i = 0; i < sections.Length - 1; i++)
        {
            current = current[sections[i]];
        }

        current[sections[^1]] = value;
    }

    private static void Reload()
    {
        var builder = new ConfigurationBuilder()
            .SetBasePath(AppContext.BaseDirectory)
            .AddJsonFile("appsettings.json",
                optional: false,
                reloadOnChange: true);

        _configuration = builder.Build();
    }
}