import React, { useEffect, useState } from "react";
import PageMeta from "../../components/common/PageMeta";

type Tab = {
  id: string;
  title: string;
  url: string;
};

const DEFAULT_APPS: Tab[] = [
  { id: "1", title: "Google", url: "https://www.google.com" },
  { id: "2", title: "GitHub", url: "https://github.com" },
  { id: "3", title: "StackOverflow", url: "https://stackoverflow.com" },
];

const storageKey = "frequent_apps_tabs_v1";

const ensureUrl = (value: string) => {
  if (!value) return "";
  if (/^https?:\/\//i.test(value)) return value;
  return `https://${value}`;
};

const FrequentlyUsed: React.FC = () => {
  const [tabs, setTabs] = useState<Tab[]>(() => {
    try {
      const raw = localStorage.getItem(storageKey);
      if (!raw) return DEFAULT_APPS;
      const parsed = JSON.parse(raw) as Tab[];
      return parsed.length ? parsed : DEFAULT_APPS;
    } catch (e) {
      return DEFAULT_APPS;
    }
  });

  const [activeId, setActiveId] = useState<string | null>(() =>
    tabs.length ? tabs[0].id : null,
  );
  const [newUrl, setNewUrl] = useState("");
  const [newTitle, setNewTitle] = useState("");

  useEffect(() => {
    localStorage.setItem(storageKey, JSON.stringify(tabs));
  }, [tabs]);

  useEffect(() => {
    if (!activeId && tabs.length) setActiveId(tabs[0].id);
  }, [tabs, activeId]);

  const openApp = (tab: Tab) => {
    const exists = tabs.find((t) => t.url === tab.url);
    if (exists) {
      setActiveId(exists.id);
      return;
    }
    const id = `${Date.now()}`;
    const newTab = { id, title: tab.title || tab.url, url: tab.url };
    setTabs((s) => [...s, newTab]);
    setActiveId(id);
  };

  const addCustom = () => {
    const sanitized = ensureUrl(newUrl.trim());
    if (!sanitized) return;
    openApp({ id: "", title: newTitle.trim() || sanitized, url: sanitized });
    setNewUrl("");
    setNewTitle("");
  };

  const closeTab = (id: string) => {
    setTabs((s) => s.filter((t) => t.id !== id));
    if (activeId === id) {
      const idx = tabs.findIndex((t) => t.id === id);
      const next = tabs[idx + 1] || tabs[idx - 1] || tabs[0];
      setActiveId(next ? next.id : null);
    }
  };

  return (
    <>
      <PageMeta title="Phần mềm hay dùng" description="Các trang web thường dùng nhúng trong ứng dụng" />

      <div className="min-h-screen p-6 bg-white">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">Phần mềm hay dùng</h1>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Mở website trong tab nhúng. Trạng thái và nội dung sẽ được giữ khi chuyển tab.</p>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <input
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              placeholder="Tên trang web"
              className="h-10 rounded-lg border border-gray-300 px-3 text-sm dark:border-gray-700 dark:bg-gray-900 dark:text-white"
            />
            <input
              value={newUrl}
              onChange={(e) => setNewUrl(e.target.value)}
              placeholder="https://example.com"
              className="h-10 rounded-lg border border-gray-300 px-3 text-sm dark:border-gray-700 dark:bg-gray-900 dark:text-white"
            />
            <button onClick={addCustom} className="rounded-lg bg-brand-500 px-3 text-white">Open</button>
          </div>
        </div>

        <div className="mb-4 flex flex-wrap items-center gap-2">
          {tabs.map((t) => (
            <div key={t.id} className={`flex items-center gap-2 rounded-lg border px-3 py-1 ${t.id === activeId ? "border-brand-500 bg-brand-50" : "border-gray-200 bg-white"}`}>
              <button onClick={() => setActiveId(t.id)} className="text-sm">
                {t.title}
              </button>
              <button onClick={() => closeTab(t.id)} className="text-xs text-red-600">✕</button>
            </div>
          ))}
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white p-3 dark:border-gray-700 dark:bg-gray-900" style={{ height: '70vh' }}>
          {/* Keep iframes mounted to preserve internal state; hide non-active frames */}
          <div className="h-full w-full relative">
            {tabs.map((t) => (
              <iframe
                key={t.id}
                title={t.title}
                src={t.url}
                sandbox="allow-forms allow-modals allow-pointer-lock allow-popups allow-presentation allow-same-origin allow-scripts"
                className={`absolute inset-0 h-full w-full transition-opacity ${t.id === activeId ? 'opacity-100 z-20' : 'opacity-0 z-10 pointer-events-none'}`}
                style={{ border: '0' }}
              />
            ))}
            {tabs.length === 0 && (
              <div className="flex h-full items-center justify-center text-gray-500">No tabs open</div>
            )}
          </div>
        </div>

        <div className="mt-4 text-sm text-gray-500">
          Lưu ý: Một số trang web có thể chặn nhúng (X-Frame-Options). Nếu site không hiển thị, mở trực tiếp trong trình duyệt.
        </div>
      </div>
    </>
  );
};

export default FrequentlyUsed;
