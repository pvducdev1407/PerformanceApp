import { useState, useMemo, useRef, useEffect } from "react";
import PageMeta from "../components/common/PageMeta";
import Button from "../components/ui/button/Button";

const defaultJson = ``;

export default function JsonEditor() {
  const [rawJson, setRawJson] = useState<string>(defaultJson);
  const [error, setError] = useState<string>("");
  const [iisLog, setIisLog] = useState<string>("");
  const [iisParseError, setIisParseError] = useState<string>("");
  const [collapsedPaths, setCollapsedPaths] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [searchIndex, setSearchIndex] = useState<number>(0);
  const [matchedPaths, setMatchedPaths] = useState<string[]>([]);

  const editorRef = useRef<HTMLTextAreaElement | null>(null);
  const lineNumberRef = useRef<HTMLDivElement | null>(null);
  const searchInputRef = useRef<HTMLInputElement | null>(null);
  const treeContainerRef = useRef<HTMLDivElement | null>(null);

  const parsedData = useMemo(() => {
    try {
      if (!rawJson.trim()) {
        setError("");
        return null;
      }
      const parsed = JSON.parse(rawJson);
      setError("");
      return parsed;
    } catch (err: any) {
      setError(err.message || "JSON không hợp lệ");
      return null;
    }
  }, [rawJson]);

  const lineCount = useMemo(() => {
    return rawJson.split("\n").length;
  }, [rawJson]);

  // Collect all matching paths
  useMemo(() => {
    if (!searchQuery || !parsedData) {
      setMatchedPaths([]);
      setSearchIndex(0);
      return;
    }

    const paths: string[] = [];
    const search = searchQuery.toLowerCase();

    const traverse = (value: any, path: string) => {
      if (typeof value === "string" && value.toLowerCase().includes(search)) {
        paths.push(path);
      }
      if (typeof value === "number" && String(value).includes(search)) {
        paths.push(path);
      }
      if (
        typeof value === "boolean" &&
        String(value).toLowerCase().includes(search)
      ) {
        paths.push(path);
      }

      if (Array.isArray(value)) {
        value.forEach((item, idx) => {
          traverse(item, `${path}[${idx}]`);
        });
      } else if (value !== null && typeof value === "object") {
        Object.entries(value).forEach(([key, val]) => {
          if (key.toLowerCase().includes(search)) {
            paths.push(`${path}.${key}`);
          }
          traverse(val, `${path}.${key}`);
        });
      }
    };

    traverse(parsedData, "root");
    setMatchedPaths(paths);
    setSearchIndex(0);
  }, [searchQuery, parsedData]);

  // Expand path when F3 is pressed
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.key === "f") {
        e.preventDefault();
        searchInputRef.current?.focus();
      } else if (e.key === "F3") {
        e.preventDefault();
        if (matchedPaths.length > 0) {
          const nextIndex = (searchIndex + 1) % matchedPaths.length;
          setSearchIndex(nextIndex);
          const pathToExpand = matchedPaths[nextIndex];
          expandPath(pathToExpand);
        }
      } else if (e.key === "Escape" && searchQuery) {
        setSearchQuery("");
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [searchIndex, matchedPaths, searchQuery]);

  const expandPath = (path: string) => {
    const parts = path.split(/\.|(\[\d+\])/);
    setCollapsedPaths((prev) => {
      const next = new Set(prev);
      let currentPath = "root";

      for (let i = 0; i < parts.length - 1; i++) {
        const part = parts[i];
        if (part && part !== "") {
          if (part.match(/^\[\d+\]$/)) {
            currentPath += part;
          } else {
            currentPath += `.${part}`;
          }
          next.delete(currentPath);
        }
      }
      return next;
    });
  };

  const expandAndScrollToPath = (path: string) => {
    expandPath(path);
    // Wait for DOM to update then find element with matching data-path
    requestAnimationFrame(() => {
      const container = treeContainerRef.current;
      if (!container) return;
      const nodes = Array.from(
        container.querySelectorAll("[data-path]"),
      ) as HTMLElement[];
      const target = nodes.find((n) => n.getAttribute("data-path") === path);
      if (target) {
        target.scrollIntoView({ behavior: "smooth", block: "center" });
      }
    });
  };

  const syncScroll = () => {
    if (editorRef.current && lineNumberRef.current) {
      lineNumberRef.current.scrollTop = editorRef.current.scrollTop;
    }
  };

  const updateJson = (value: string) => {
    setRawJson(value);
  };

  const parseQueryString = (query: string) => {
    const result: Record<string, string | string[]> = {};
    const parts = query
      .trim()
      .replace(/^[^?]*\?/, "")
      .split(/[&;]/)
      .filter(Boolean);

    for (const part of parts) {
      const [rawKey, ...rawValueParts] = part.split("=");
      if (!rawKey) continue;
      const key = decodeURIComponent(rawKey.replace(/\+/g, " ") || "");
      const value = decodeURIComponent(rawValueParts.join("=").replace(/\+/g, " ") || "");

      if (key in result) {
        const existing = result[key];
        result[key] = Array.isArray(existing)
          ? [...existing, value]
          : [existing, value];
      } else {
        result[key] = value;
      }
    }

    return result;
  };

  const parseIISRequest = (log: string) => {
    setIisParseError("");
    if (!log || !log.trim()) {
      setIisParseError("Chuỗi log rỗng");
      return;
    }

    const extractSearchDynamicValue = (text: string) => {
      const encodedMatch = text.match(/searchDynamic=([^\s&;]+)/i);
      if (encodedMatch && encodedMatch[1]) {
        return decodeURIComponent(encodedMatch[1]);
      }
      const rawMatch = text.match(/searchDynamic=(\{[\s\S]*\})/i);
      return rawMatch?.[1] ?? null;
    };

    let jsonText: string | null = null;
    try {
      const searchDynamicPayload = extractSearchDynamicValue(log);
      if (searchDynamicPayload) {
        jsonText = searchDynamicPayload;
      } else {
        const rawQuery = log.includes("?")
          ? log.slice(log.indexOf("?") + 1)
          : log;
        const queryString = rawQuery.split(/\s+/)[0];
        const parsedQuery = parseQueryString(queryString);
        const parsedKeys = Object.keys(parsedQuery);

        if (parsedKeys.length > 0) {
          setRawJson(JSON.stringify(parsedQuery, null, 2));
          setIisParseError("");
          return;
        }

        const braceMatch = log.match(/(\{[\s\S]*\})/);
        if (braceMatch && braceMatch[1]) jsonText = braceMatch[1];
      }

      if (jsonText) {
        const parsed = JSON.parse(jsonText);
        setRawJson(JSON.stringify(parsed, null, 2));
        setIisParseError("");
      } else {
        setIisParseError("Không tìm thấy JSON hoặc query string hợp lệ trong log");
      }
    } catch (err: any) {
      setIisParseError(err?.message || "Lỗi khi parse JSON");
    }
  };

  const handleClear = () => {
    setRawJson("");
    setIisLog("");
    setSearchQuery("");
    setMatchedPaths([]);
    setSearchIndex(0);
    setIisParseError("");
  };

  const toggleCollapse = (path: string) => {
    setCollapsedPaths((prev) => {
      const next = new Set(prev);
      if (next.has(path)) {
        next.delete(path);
      } else {
        next.add(path);
      }
      return next;
    });
  };

  const isCurrentMatch = (path: string): boolean => {
    return matchedPaths[searchIndex] === path;
  };

  const renderValue = (
    value: any,
    path: string,
    depth: number,
  ): React.ReactNode => {
    const isArray = Array.isArray(value);
    const isObject = value !== null && typeof value === "object" && !isArray;
    const isCollapsed = collapsedPaths.has(path);
    const isCurrentHighlight = isCurrentMatch(path);

    if (isArray || isObject) {
      const entries = isArray
        ? value.map((item: any, idx: number) => [idx, item])
        : Object.entries(value);
      const itemCount = entries.length;

      return (
        <div key={path} data-path={path}>
          <div className="flex items-center gap-2">
            <button
              onClick={() => toggleCollapse(path)}
              className="inline-flex h-5 w-5 items-center justify-center rounded border border-gray-300 bg-white text-xs hover:bg-gray-100 dark:border-gray-600 dark:bg-gray-800 dark:hover:bg-gray-700"
            >
              {isCollapsed ? "▶" : "▼"}
            </button>
            <span className="font-semibold text-blue-600 dark:text-blue-400">
              {isArray ? `[${itemCount}]` : `{${itemCount}}`}
            </span>
          </div>
          {!isCollapsed && (
            <div className="ml-6 border-l border-gray-300 pl-2 dark:border-gray-700">
              {entries.map(([key, val]) => {
                const childPath = isArray
                  ? `${path}[${key}]`
                  : `${path}.${key}`;
                const isChildCurrent = matchedPaths[searchIndex] === childPath;
                return (
                  <div key={key} className="py-1" data-path={childPath}>
                    {isArray ? (
                      renderValue(val, childPath, depth + 1)
                    ) : (
                      <>
                        <span
                          className={`${isChildCurrent ? "bg-yellow-300 dark:bg-yellow-600 font-bold" : ""} text-green-600 dark:text-green-400`}
                        >
                          "{key}"
                        </span>
                        <span className="text-gray-600 dark:text-gray-400">
                          :{" "}
                        </span>
                        {renderValue(val, childPath, depth + 1)}
                      </>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      );
    }

    // Primitive values
    if (typeof value === "string") {
      return (
        <span
          data-path={path}
          className={`${isCurrentHighlight ? "bg-yellow-300 dark:bg-yellow-600 font-bold" : ""} text-red-600 dark:text-red-400`}
        >
          "{value}"
        </span>
      );
    }
    if (typeof value === "number") {
      return (
        <span
          data-path={path}
          className={`${isCurrentHighlight ? "bg-yellow-300 dark:bg-yellow-600 font-bold" : ""} text-orange-600 dark:text-orange-400`}
        >
          {value}
        </span>
      );
    }
    if (typeof value === "boolean") {
      return (
        <span
          data-path={path}
          className={`${isCurrentHighlight ? "bg-yellow-300 dark:bg-yellow-600 font-bold" : ""} text-purple-600 dark:text-purple-400`}
        >
          {String(value)}
        </span>
      );
    }
    if (value === null) {
      return (
        <span data-path={path} className="text-gray-500 dark:text-gray-400">
          null
        </span>
      );
    }

    return (
      <span data-path={path} className="text-gray-900 dark:text-gray-100">
        {String(value)}
      </span>
    );
  };

  return (
    <>
      <PageMeta
        title="JSON Editor"
        description="JSON editor giống jsoneditoronline"
      />
      <div className="border border-gray-200 bg-white dark:border-gray-800 dark:bg-white/[0.03] lg:p-6">
        <div className="mb-2 flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-gray-800 dark:text-white/90">
              JSON Editor
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Nhập JSON vào tab bên trái, sẽ tự động format bên phải
            </p>
          </div>
          <div>
            <Button onClick={handleClear} size="sm" variant="outline">
              Clear
            </Button>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-2 h-[calc(100vh-250px)] overflow-hidden">
          {/* Left Tab - Raw JSON */}
          <div className="flex flex-col gap-2 min-h-0">
            <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300">
              Raw JSON (Input)
            </h4>
            <div className="flex items-start">
              <textarea
                value={iisLog}
                onChange={(e) => setIisLog(e.target.value)}
                onKeyDown={(e) => {
                  if ((e.key === "Enter" || e.key === "Tab") && !e.shiftKey) {
                    e.preventDefault();
                    parseIISRequest(iisLog);
                  }
                }}
                placeholder="Paste IIS log here (e.g. searchDynamic=%7B...%7D ...)"
                className="w-3/3 h-20 resize-none rounded border p-2 text-xs font-mono bg-white dark:bg-slate-800"
              />
              <div className="flex flex-col gap-2">
                {iisParseError && (
                  <div className="text-xs text-red-600 dark:text-red-400">
                    {iisParseError}
                  </div>
                )}
              </div>
            </div>
            <div className="relative flex-1 min-h-0 overflow-hidden rounded-xl border border-blue-200 bg-blue-50/50 dark:border-slate-700 dark:bg-slate-900">
              <div
                ref={lineNumberRef}
                className="absolute left-0 top-0 h-full w-10 overflow-hidden border-r border-blue-200 bg-blue-100/40 p-0 text-right text-xs font-mono text-blue-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-500"
              >
                {Array.from({ length: lineCount }, (_, i) => i + 1).map(
                  (num) => (
                    <div key={num} className="h-6 leading-6 pr-2">
                      {num}
                    </div>
                  ),
                )}
              </div>
              <textarea
                ref={editorRef}
                value={rawJson}
                onChange={(event) => updateJson(event.target.value)}
                onScroll={syncScroll}
                className="h-full w-full resize-none border-none bg-transparent p-3 pl-14 text-sm font-mono text-slate-900 outline-none leading-6 dark:text-slate-50"
                spellCheck={false}
              />
            </div>
          </div>

          {/* Right Tab - Tree View */}
          <div className="flex flex-col gap-2 min-h-0">
            <div className="flex items-center justify-between gap-2">
              <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                Tree View (Output)
              </h4>
              <div className="flex items-center gap-1 bg-white dark:bg-slate-800 px-2 py-1 rounded border border-gray-300 dark:border-slate-600">
                <input
                  ref={searchInputRef}
                  type="text"
                  placeholder="Ctrl+F"
                  aria-label="Search JSON"
                  className="w-48 text-xs outline-none bg-transparent text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-slate-500"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      if (matchedPaths.length > 0) {
                        const next = (searchIndex + 1) % matchedPaths.length;
                        setSearchIndex(next);
                        const pathToExpand = matchedPaths[next];
                        expandAndScrollToPath(pathToExpand);
                      }
                    }
                  }}
                />
                {searchQuery && (
                  <>
                    <span className="text-xs text-gray-600 dark:text-gray-400">
                      {matchedPaths.length > 0
                        ? `${searchIndex + 1}/${matchedPaths.length}`
                        : "0"}
                    </span>
                    <button
                      onClick={() => setSearchQuery("")}
                      className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 text-xs font-bold"
                    >
                      ✕
                    </button>
                  </>
                )}
              </div>
            </div>
            {error ? (
              <div className="flex-1 min-h-0 rounded-xl border border-red-300 bg-red-50 p-4 overflow-auto dark:border-red-900/50 dark:bg-red-950/30">
                <p className="text-sm text-red-600 dark:text-red-400">
                  <strong>Lỗi:</strong> {error}
                </p>
              </div>
            ) : parsedData !== null ? (
              <div
                ref={treeContainerRef}
                className="flex-1 min-h-0 overflow-auto rounded-xl border border-emerald-200 bg-emerald-50/50 p-4 font-mono text-sm dark:border-slate-700 dark:bg-slate-900/50"
              >
                {renderValue(parsedData, "root", 0)}
              </div>
            ) : (
              <div className="flex-1 min-h-0 flex items-center justify-center rounded-xl border border-emerald-200 bg-emerald-50/50 dark:border-slate-700 dark:bg-slate-900/50">
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  Nhập JSON vào bên trái...
                </p>
              </div>
            )}
          </div>
        </div>

      </div>
    </>
  );
}
