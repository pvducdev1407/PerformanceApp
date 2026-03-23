import PageBreadcrumb from "../components/common/PageBreadCrumb";
import PageMeta from "../components/common/PageMeta";
import Select from "../components/form/Select";
import Label from "../components/form/Label";
import Input from "../components/form/input/InputField";
import Button from "../components/ui/button/Button";
import { BoxIcon } from "../icons";
import CRUDServices from "../services/CRUDServices";
import { useState } from "react";
import Notify from "../services/Notify";

interface LogResultItem {
  noiDungText: string;
  type: "Number" | "CSV";
  queryResult: string;
}

export default function UserProfiles() {
  const [viewLogObject, setViewLogObject] = useState({
    url_path: "C:\\Program Files (x86)\\Log Parser 2.2\\LogParser.exe",
    folder_path: "D:\\ITG\\LOG",
  });
  const [logResults, setLogResults] = useState<LogResultItem[]>([]);
  const [clickSave, setclickSave] = useState(false);
  const options = [
    { value: "VIETTRAN", label: "Việt Trần" },
    { value: "DOTHANH", label: "Đô Thành" },
    { value: "MEDITEC", label: "Meditec" },
  ];
  const handleSelectChange = async (value: string) => {};
  const ViewLog = async () => {
    setclickSave(true);
    const response = await CRUDServices.getData("/LogParser/GetLog", {
      url_path: viewLogObject.url_path,
      folder_path: viewLogObject.folder_path,
    });
    if (response) {
      // Ép kiểu cho TypeScript
      Notify.Success("Đăng nhập thành công");
      setclickSave(false);
      setLogResults(response.result as LogResultItem[]);
    } else {
      setclickSave(false);
      setLogResults([
        {
          noiDungText: "Error",
          queryResult: "Error fetching log data",
          type: "CSV",
        },
      ]);
    }
  };
  const handleChange = (
    event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
  ) => {
    const { name, value } = event.target;
    setViewLogObject({
      ...viewLogObject,
      [name]: value,
    });
  };

  const renderCSVTable = (queryResult: string) => {
    try {
      const data = JSON.parse(queryResult);
      if (!Array.isArray(data) || data.length === 0) return <p>No data</p>;
      const headers = Object.keys(data[0]);
      return (
        <div className="overflow-auto border rounded">
          <table className="min-w-full table-auto border-collapse border border-gray-300">
            <thead className="bg-gray-100">
              <tr>
                {headers.map((h) => (
                  <th key={h} className="border px-2 py-1 text-center">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data.map((row, i) => (
                <tr key={i} className="odd:bg-white even:bg-gray-50">
                  {headers.map((h) => (
                    <td key={h} className="border px-2 py-1">
                      {row[h]}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
    } catch {
      return <p>Error parsing CSV data</p>;
    }
  };

  return (
    <>
      <PageMeta
        title="Performance Application"
        description="Performance Application"
      />
      <PageBreadcrumb pageTitle="Performance Application" />
      <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03] lg:p-6">
        <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
          <div className="space-y-4">
            <Label htmlFor="input">Log Parser Path</Label>
            <Input
              type="text"
              id="input"
              value={viewLogObject.url_path}
              name="url_path"
              onChange={handleChange}
            />
          </div>

          <div className="space-y-4">
            <Label>Folder Address</Label>
            <Input
              type="text"
              id="input"
              value={viewLogObject.folder_path}
              name="folder_path"
              onChange={handleChange}
            />
          </div>
          <div className="grid grid-cols-2 space-y-4">
            <div>
              <Label htmlFor="input">Project</Label>
              <Select
                options={options}
                onChange={handleSelectChange}
                className="dark:bg-dark-900"
              />
            </div>
            <div className="flex justify-center items-center">
              <Button
                size="sm"
                variant="primary"
                onClick={ViewLog}
                startIcon={<BoxIcon className="size-5" />}
                className="mt-2"
                disabled={clickSave}
              >
                View Log
              </Button>
            </div>
          </div>
        </div>
        {clickSave ? (
          <i className="text-error-500">Loadding Result ....</i>
        ) : (
          ""
        )}
        <h3 className="mb-5 text-lg font-semibold text-gray-800 dark:text-white/90 lg:mb-7">
          Result
        </h3>
        <div className="grid grid-cols-3 gap-4">
          {logResults.map((item, idx) =>
            item.type === "Number" ? (
              <div key={idx} className="mb-3">
                <label className="mb-1">{item.noiDungText}: </label>
                <label className="font-semibold">{item.queryResult}</label>
              </div>
            ) : null,
          )}
        </div>
        <div>
          {logResults.map((item, idx) =>
            item.type === "CSV" ? (
              <div key={idx} className="mb-5">
                <label className="mb-5">{item.noiDungText}: </label>
                {renderCSVTable(item.queryResult)}
              </div>
            ) : null,
          )}
        </div>
      </div>
    </>
  );
}
