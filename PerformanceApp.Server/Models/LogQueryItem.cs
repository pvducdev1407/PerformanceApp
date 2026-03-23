using System.Text.Json;

namespace PerformanceApp.Server.Models
{
    public class LogQueryItem
    {
        public string Query { get; set; }
        public string NoiDungText { get; set; }
        public string Type { get; set; }
        public string QueryResult { get; set; }
    }
    public static class LogParserHelper
    {
        /// <summary>
        /// Xử lý rawOutput từ LogParser theo type, trả thẳng ra string:
        /// - Number → "12345"
        /// - Csv → JSON string
        /// </summary>
        public static string ProcessLogResult(LogQueryItem item, string rawOutput)
        {
            if (item.Type.Equals("Number", StringComparison.OrdinalIgnoreCase))
            {
                return ExtractNumber(rawOutput);
            }
            else if (item.Type.Equals("Csv", StringComparison.OrdinalIgnoreCase))
            {
                var list = CsvToJson(rawOutput);
                // serialize sang JSON string
                return JsonSerializer.Serialize(list);
            }
            else
            {
                // fallback: trả nguyên text
                return rawOutput;
            }
        }

        // ----- helper -----
        private static string ExtractNumber(string rawOutput)
        {
            if (string.IsNullOrWhiteSpace(rawOutput))
                return "";

            var lines = rawOutput.Split(new[] { '\r', '\n' }, StringSplitOptions.RemoveEmptyEntries)
                                 .Select(l => l.Trim())
                                 .Where(l => !string.IsNullOrEmpty(l)
                                             && !l.StartsWith("COUNT")
                                             && !l.StartsWith("-"))
                                 .ToList();

            return lines.FirstOrDefault() ?? "";
        }

        private static List<Dictionary<string, string>> CsvToJson(string rawCsv)
        {
            var result = new List<Dictionary<string, string>>();
            if (string.IsNullOrWhiteSpace(rawCsv))
                return result;

            var lines = rawCsv.Split(new[] { '\r', '\n' }, StringSplitOptions.RemoveEmptyEntries);
            if (lines.Length < 2)
                return result;

            var headers = lines[0].Split(',').Select(h => h.Trim()).ToArray();

            for (int i = 1; i < lines.Length; i++)
            {
                var values = lines[i].Split(',').Select(v => v.Trim()).ToArray();
                var dict = new Dictionary<string, string>();
                for (int j = 0; j < headers.Length && j < values.Length; j++)
                {
                    dict[headers[j]] = values[j];
                }
                result.Add(dict);
            }

            return result;
        }
    }
}
