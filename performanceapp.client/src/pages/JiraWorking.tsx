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

// interface JiraItem {
//   fields: Record<string, any>;
// }

interface DetailGridItem {
  id: number;
  employee: string;
  taskJira: string;
  issueRate: string;
  estimate: number;
  estimateToday: number;
  actualTime: number;
  completed: boolean;
  systotal?: number;
}

const getCurrentDate = (): string => {
  const now = new Date();
  return `${now.getDate().toString().padStart(2, "0")}/${(now.getMonth() + 1).toString().padStart(2, "0")}/${now.getFullYear()}`;
};

const formatDate = (date: Date): string => {
  return `${date.getDate().toString().padStart(2, "0")}/${(date.getMonth() + 1).toString().padStart(2, "0")}/${date.getFullYear()}`;
};

// const getDisplayValue = (value: any): string => {
//   if (value == null) return "";
//   if (typeof value === "string" || typeof value === "number")
//     return String(value);
//   if (typeof value === "object" && value.name) return value.name;
//   if (typeof value === "object" && value.displayName) return value.displayName;
//   return JSON.stringify(value);
// };

export default function JiraWorking() {
  const [fromDate, setFromDate] = useState<string>(getCurrentDate());
  const [toDate, setToDate] = useState<string>(getCurrentDate());
  const [users, setUsers] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(false);
  const [selectedColumns, setSelectedColumns] = useState<string[]>([
    "stt",
    "employeeCode",
    "date",
    "task",
    "estimate",
    "issueRate",
  ]);
  const [availableColumns] = useState<
    { key: string; label: string }[]
  >([]);
  const [detailGridData, setDetailGridData] = useState<DetailGridItem[]>([]);
  const [showFilters, setShowFilters] = useState<boolean>(true);

  // Convert dd/mm/yyyy to yyyy-MM-dd
  const convertDateFormat = (dateStr: string): string => {
    const [day, month, year] = dateStr.split("/");
    return `${year}-${month}-${day}`;
  };



  // Parse HR API response to DetailGridItem[]
  const parseHRReportData = (reportData: any[]): DetailGridItem[] => {
    return reportData.map((item: any, index: number) => ({
      id: item.stt || index + 1,
      employee: item._ten_nv || item._developer || item._responsible || "",
      taskJira: item._issue_key || item._cong_viec || "",
      issueRate: item._issuetype || "P3",
      estimate: parseFloat(item._estimate) || 0,
      estimateToday: parseFloat(item.estimate_today) || 0,
      actualTime: parseFloat(item.thoi_gian_dev_tt) || parseFloat(item._cv_ht) || 0,
      completed: item.systotal === 1 ? true : false,
      systotal: item.systotal || 0,
    }));
  };



  useEffect(() => {
    const savedUsers = localStorage.getItem("jiraUsers");
    const savedColumns = localStorage.getItem("jiraSelectedColumns");
    if (savedUsers) setUsers(savedUsers);
    if (savedColumns) setSelectedColumns(JSON.parse(savedColumns));
  }, []);

  // Load data from saved config
  // (No longer fetching projects/statuses/issue types from Jira API)


  const handleToggleCompleted = (id: number) => {
    setDetailGridData((prevData) =>
      prevData.map((item) =>
        item.id === id ? { ...item, completed: !item.completed } : item
      )
    );
  };

  const handleSearch = async () => {
    setLoading(true);
    localStorage.setItem("jiraUsers", users);
    localStorage.setItem(
      "jiraSelectedColumns",
      JSON.stringify(selectedColumns),
    );

    try {
      // Convert dates to yyyy-MM-dd format for API
      const dfrom = convertDateFormat(fromDate);
      const dto = convertDateFormat(toDate);
      
      // Call HR API to get report data
      const reportData = await JiraApiService.getHRJiraDetailReport(
        dfrom,
        dto,
        users || undefined
      );

      // Parse the response to DetailGridItem format
      const parsedData = parseHRReportData(reportData);
      console.log("HR Report Data:", parsedData);
      
      setDetailGridData(parsedData);
      Notify.Success("Tìm kiếm thành công");
    } catch (error: any) {
      console.error(error);
      Notify.Error("Lỗi khi tìm kiếm: " + (error.message || "Unknown error"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <PageMeta title="Jira Working" description="Jira Working Report" />
      <PageBreadcrumb pageTitle="Jira Working" />
      <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03] lg:p-6">
        {/* Toggle Filter Button - Icon Only */}
        <div className="mb-4 flex items-center gap-2">
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="inline-flex items-center justify-center w-8 h-8 p-0 bg-blue-600 hover:bg-blue-700 dark:bg-blue-700 dark:hover:bg-blue-600 text-white rounded transition-all"
            title={showFilters ? "Ẩn điều kiện lọc" : "Hiện điều kiện lọc"}
          >
            <span className="text-lg leading-none">{showFilters ? "▼" : "▶"}</span>
          </button>
          <span className="text-sm font-medium text-gray-600 dark:text-gray-400">Bộ lọc</span>
        </div>

        {/* Filter Section with Animation */}
        <div
          className={`overflow-hidden transition-all duration-300 ease-in-out ${
            showFilters ? "max-h-96 opacity-100 mb-6" : "max-h-0 opacity-0"
          }`}
        >
          <div className="space-y-4">
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
            <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
              <div className="flex gap-2 items-end">
                <Button
                  size="sm"
                  variant="primary"
                  onClick={handleSearch}
                  disabled={loading}
                >
                  {loading ? "Đang tìm..." : "Tìm kiếm"}
                </Button>
              </div>
            </div>
          </div>
        </div>
        
        <h3 className="mb-5 mt-6 text-lg font-semibold text-gray-800 dark:text-white/90">
          Danh sách chi tiết
        </h3>

        <div className="overflow-auto border rounded">
          {detailGridData.length === 0 ? (
            <div className="text-center py-8 text-gray-500 dark:text-gray-400">
              Không có dữ liệu. Vui lòng thực hiện tìm kiếm.
            </div>
          ) : (
            <table className="min-w-full table-auto border-collapse border border-gray-300">
              <thead className="bg-gray-100 dark:bg-gray-700">
                <tr>
                  <th className="border px-4 py-2 text-center text-sm font-semibold">Nhân viên</th>
                  <th className="border px-4 py-2 text-center text-sm font-semibold">Task Jira</th>
                  <th className="border px-4 py-2 text-center text-sm font-semibold">Issue Rate</th>
                  <th className="border px-4 py-2 text-center text-sm font-semibold">Estimate</th>
                  <th className="border px-4 py-2 text-center text-sm font-semibold">Estimate Today</th>
                  <th className="border px-4 py-2 text-center text-sm font-semibold">Thời gian thực tế</th>
                  <th className="border px-4 py-2 text-center text-sm font-semibold">Hoàn thành</th>
                </tr>
              </thead>
              <tbody>
                {detailGridData.map((item) => (
                  <tr
                    key={item.id}
                    className={`${
                      item.systotal === 1
                        ? "bg-yellow-100 dark:bg-yellow-900/20 hover:bg-yellow-200 dark:hover:bg-yellow-900/30"
                        : item.completed
                        ? "bg-green-100 dark:bg-green-900/20 hover:bg-green-200 dark:hover:bg-green-900/30"
                        : "odd:bg-white even:bg-gray-50 dark:odd:bg-white/[0.02] dark:even:bg-white/[0.05] hover:bg-gray-100 dark:hover:bg-white/[0.08]"
                    } border-b transition-colors`}
                  >
                    <td className="border px-4 py-3 text-center">{item.employee}</td>
                    <td className="border px-4 py-3 text-center font-medium text-blue-600 dark:text-blue-400">
                      {item.taskJira}
                    </td>
                    <td className="border px-4 py-3 text-center">
                      <span
                        className={`inline-block px-2 py-1 rounded text-white text-sm font-semibold ${
                          item.issueRate === "P1"
                            ? "bg-red-500"
                            : item.issueRate === "P2"
                            ? "bg-orange-500"
                            : "bg-gray-500"
                        }`}
                      >
                        {item.issueRate}
                      </span>
                    </td>
                    <td className="border px-4 py-3 text-center">{item.estimate}h</td>
                    <td className="border px-4 py-3 text-center">{item.estimateToday}h</td>
                    <td className="border px-4 py-3 text-center font-semibold">
                      {item.actualTime}h
                    </td>
                    <td className="border px-4 py-3 text-center">
                      <input
                        type="checkbox"
                        checked={item.completed}
                        onChange={() => handleToggleCompleted(item.id)}
                        className="w-5 h-5 cursor-pointer"
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </>
  );
}
