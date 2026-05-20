import { useState, useEffect } from "react";
import PageBreadcrumb from "../components/common/PageBreadCrumb";
import PageMeta from "../components/common/PageMeta";
import DatePicker from "../components/form/date-picker";
import Input from "../components/form/input/InputField";
import Button from "../components/ui/button/Button";
import Label from "../components/form/Label";
import { Modal } from "../components/ui/modal";
import Notify from "../services/Notify";
import JiraApiService from "../services/JiraApiService";

interface JiraItem {
  fields: Record<string, any>;
}

const getCurrentDate = (): string => {
  const now = new Date();
  return `${now.getDate().toString().padStart(2, "0")}/${(now.getMonth() + 1).toString().padStart(2, "0")}/${now.getFullYear()}`;
};

const formatDate = (date: Date): string => {
  return `${date.getDate().toString().padStart(2, "0")}/${(date.getMonth() + 1).toString().padStart(2, "0")}/${date.getFullYear()}`;
};

const getDisplayValue = (value: any): string => {
  if (value == null) return "";
  if (typeof value === "string" || typeof value === "number")
    return String(value);
  if (typeof value === "object" && value.name) return value.name;
  if (typeof value === "object" && value.displayName) return value.displayName;
  return JSON.stringify(value);
};

export default function JiraWorking() {
  const [fromDate, setFromDate] = useState<string>(getCurrentDate());
  const [toDate, setToDate] = useState<string>(getCurrentDate());
  const [users, setUsers] = useState<string>("");
  const [project, setProject] = useState<string>("");
  const [status, setStatus] = useState<string>("");
  const [type, setType] = useState<string>("");
  const [jiraUrl, setJiraUrl] = useState<string>("");
  const [username, setUsername] = useState<string>("");
  const [password, setPassword] = useState<string>("");
  const [filteredData, setFilteredData] = useState<JiraItem[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [isConfigModalOpen, setIsConfigModalOpen] = useState<boolean>(false);
  const [selectedColumns, setSelectedColumns] = useState<string[]>([
    "stt",
    "employeeCode",
    "date",
    "task",
    "estimate",
    "issueRate",
  ]);
  const [availableColumns, setAvailableColumns] = useState<
    { key: string; label: string }[]
  >([]);

  useEffect(() => {
    const savedUsers = localStorage.getItem("jiraUsers");
    const savedProject = localStorage.getItem("jiraProject");
    const savedStatus = localStorage.getItem("jiraStatus");
    const savedType = localStorage.getItem("jiraType");
    const savedJiraUrl = localStorage.getItem("jiraUrl");
    const savedUsername = localStorage.getItem("jiraUsername");
    const savedPassword = localStorage.getItem("jiraPassword");
    const savedColumns = localStorage.getItem("jiraSelectedColumns");
    if (savedUsers) setUsers(savedUsers);
    if (savedProject) setProject(savedProject);
    if (savedStatus) setStatus(savedStatus);
    if (savedType) setType(savedType);
    if (savedJiraUrl) setJiraUrl(savedJiraUrl);
    if (savedUsername) setUsername(savedUsername);
    if (savedPassword) setPassword(savedPassword);
    if (savedColumns) setSelectedColumns(JSON.parse(savedColumns));
  }, []);

  // Load data from saved config
  // (No longer fetching projects/statuses/issue types from Jira API)

  const handleUpdateConfig = async () => {
    try {
      const config = { jiraUrl, username, password };
      await JiraApiService.testConnection(config);
      JiraApiService.saveConfig(config);
      setIsConfigModalOpen(false);
      Notify.Success("Config updated successfully");
    } catch (error) {
      Notify.Error("Config failed: Invalid credentials or URL");
    }
  };

  const handleSearch = async () => {
    if (!jiraUrl || !username || !password) {
      Notify.Error("Vui lòng nhập Jira URL, Username và Password");
      return;
    }
    setLoading(true);
    localStorage.setItem("jiraUsers", users);
    localStorage.setItem("jiraProject", project);
    localStorage.setItem("jiraStatus", status);
    localStorage.setItem("jiraType", type);
    localStorage.setItem(
      "jiraSelectedColumns",
      JSON.stringify(selectedColumns),
    );

    try {
      let jql = "";
      if (project) jql += `project = "${project}" AND `;
      if (users) {
        const userList = users
          .split(",")
          .map((u) => `"${u.trim()}"`)
          .join(",");
        jql += `assignee in (${userList}) AND `;
      }
      if (status) {
        const statusList = status
          .split(",")
          .map((s) => `"${s.trim()}"`)
          .join(",");
        jql += `status in (${statusList}) AND `;
      }
      if (type) {
        const typeList = type
          .split(",")
          .map((t) => `"${t.trim()}"`)
          .join(",");
        jql += `issuetype in (${typeList}) AND `;
      }
      const from = fromDate.split("/").reverse().join("-");
      const to = toDate.split("/").reverse().join("-");
      jql += `Deadline >= "${from}" AND Deadline <= "${to}"`;

      const config = { jiraUrl, username, password };
      const response = await JiraApiService.searchIssues(
        jql,
        ["key", "summary", "assignee", "Deadline", "status", "issuetype"],
        config,
      );

      const items: JiraItem[] = response.issues.map((issue: any) => ({
        fields: issue.fields,
      }));
      if (items.length > 0) {
        const allKeys = Object.keys(items[0].fields);
        setAvailableColumns(allKeys.map((key) => ({ key, label: key })));
        setSelectedColumns(allKeys);
      }
      setFilteredData(items);
      Notify.Success("Tìm kiếm thành công");
    } catch (error: any) {
      console.error(error);
      Notify.Error("Lỗi khi tìm kiếm: " + (error.message || "Unknown error"));
      setFilteredData([]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <PageMeta title="Jira Working" description="Jira Working Report" />
      <PageBreadcrumb pageTitle="Jira Working" />
      <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03] lg:p-6">
        <div className="mb-5">
          <Button onClick={() => setIsConfigModalOpen(true)}>
            Configure Jira
          </Button>
        </div>
        <h3 className="mb-5 text-lg font-semibold text-gray-800 dark:text-white/90">
          Filters
        </h3>
        <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
          <div className="space-y-4">
            <Label htmlFor="fromDate">Deadline từ ngày</Label>
            <DatePicker
              id="fromDate"
              mode="single"
              dateFormat="d/m/Y"
              defaultDate={fromDate}
              onChange={(selectedDates) => {
                if (selectedDates && selectedDates.length > 0) {
                  setFromDate(formatDate(selectedDates[0]));
                }
              }}
            />
          </div>
          <div className="space-y-4">
            <Label htmlFor="toDate">Deadline đến ngày</Label>
            <DatePicker
              id="toDate"
              mode="single"
              dateFormat="d/m/Y"
              defaultDate={toDate}
              onChange={(selectedDates) => {
                if (selectedDates && selectedDates.length > 0) {
                  setToDate(formatDate(selectedDates[0]));
                }
              }}
            />
          </div>
          <div className="space-y-4">
            <Label htmlFor="users">Assignee</Label>
            <Input
              type="text"
              id="users"
              value={users}
              onChange={(e) => setUsers(e.target.value)}
              placeholder="Nhập assignee, cách nhau bằng dấu phẩy"
            />
          </div>
        </div>
        <div className="grid grid-cols-1 gap-6 md:grid-cols-3 mt-6">
          <div className="space-y-4">
            <Label htmlFor="project">Project</Label>
            <Input
              type="text"
              id="project"
              value={project}
              onChange={(e) => setProject(e.target.value)}
              placeholder="Nhập project key"
            />
          </div>
          <div className="space-y-4">
            <Label htmlFor="status">Status</Label>
            <Input
              type="text"
              id="status"
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              placeholder="Nhập status"
            />
          </div>
          <div className="space-y-4">
            <Label htmlFor="type">Issue Type</Label>
            <Input
              type="text"
              id="type"
              value={type}
              onChange={(e) => setType(e.target.value)}
              placeholder="Nhập issue type"
            />
          </div>
        </div>
        <div className="mt-6">
          <Button
            size="sm"
            variant="primary"
            onClick={handleSearch}
            disabled={loading}
          >
            {loading ? "Đang tìm..." : "Tìm kiếm"}
          </Button>
        </div>
        <h3 className="mb-5 mt-6 text-lg font-semibold text-gray-800 dark:text-white/90">
          Columns to Display
        </h3>
        <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-6">
          {availableColumns.map((col) => (
            <label key={col.key} className="flex items-center">
              <input
                type="checkbox"
                checked={selectedColumns.includes(col.key)}
                onChange={(e) => {
                  if (e.target.checked) {
                    setSelectedColumns([...selectedColumns, col.key]);
                  } else {
                    setSelectedColumns(
                      selectedColumns.filter((c) => c !== col.key),
                    );
                  }
                }}
                className="mr-2"
              />
              {col.label}
            </label>
          ))}
        </div>
        <h3 className="mb-5 mt-6 text-lg font-semibold text-gray-800 dark:text-white/90">
          Danh sách chi tiết
        </h3>
        <div className="overflow-auto border rounded">
          <table className="min-w-full table-auto border-collapse border border-gray-300">
            <thead className="bg-gray-100">
              <tr>
                {availableColumns
                  .filter((col) => selectedColumns.includes(col.key))
                  .map((col) => (
                    <th key={col.key} className="border px-4 py-2 text-center">
                      {col.label}
                    </th>
                  ))}
              </tr>
            </thead>
            <tbody>
              {filteredData.map((item, index) => (
                <tr key={index} className="odd:bg-white even:bg-gray-50">
                  {availableColumns
                    .filter((col) => selectedColumns.includes(col.key))
                    .map((col) => (
                      <td
                        key={col.key}
                        className="border px-4 py-2 text-center"
                      >
                        {getDisplayValue(item.fields[col.key])}
                      </td>
                    ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      <Modal
        isOpen={isConfigModalOpen}
        onClose={() => setIsConfigModalOpen(false)}
        className="max-w-md mx-h-screen overflow-y-auto p-6"
      >
        <h2 className="text-xl font-semibold mb-4">Configure Jira</h2>
        <div className="space-y-4">
          <div>
            <Label htmlFor="modalJiraUrl">Jira URL</Label>
            <Input
              type="text"
              id="modalJiraUrl"
              value={jiraUrl}
              onChange={(e) => setJiraUrl(e.target.value)}
              placeholder="e.g. https://your-jira.atlassian.net"
            />
          </div>
          <div>
            <Label htmlFor="modalUsername">Username</Label>
            <Input
              type="text"
              id="modalUsername"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Jira username or email"
            />
          </div>
          <div>
            <Label htmlFor="modalPassword">Password / API Token</Label>
            <Input
              type="password"
              id="modalPassword"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Password or API token"
            />
          </div>
          <div className="flex justify-end space-x-2">
            <Button onClick={handleUpdateConfig}>Update Config</Button>
            <Button onClick={() => setIsConfigModalOpen(false)}>Cancel</Button>
          </div>
        </div>
      </Modal>
    </>
  );
}
