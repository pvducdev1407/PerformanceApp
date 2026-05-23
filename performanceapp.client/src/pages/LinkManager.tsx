import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
  type DragEvent,
} from "react";
import PageMeta from "../components/common/PageMeta";
import Button from "../components/ui/button/Button";

type LinkEntry = {
  id: string;
  url: string;
  shortName?: string;
  note: string;
  group?: string;
};

const LINK_STORAGE_KEY = "link-manager-data";

export default function LinkManager() {
  const [links, setLinks] = useState<LinkEntry[]>([]);
  const [linkUrl, setLinkUrl] = useState<string>("");
  const [linkShortName, setLinkShortName] = useState<string>("");
  const [linkNote, setLinkNote] = useState<string>("");
  const [linkGroup, setLinkGroup] = useState<string>("");
  const [searchText, setSearchText] = useState<string>("");
  const [openGroups, setOpenGroups] = useState<Set<string>>(new Set());
  const [editingLinkId, setEditingLinkId] = useState<string | null>(null);
  const [linkFormError, setLinkFormError] = useState<string>("");
  const searchInputRef = useRef<HTMLInputElement | null>(null);
  const draggedItemRef = useRef<{ id: string; group: string } | null>(null);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(LINK_STORAGE_KEY);
      if (!stored) return;
      const parsed = JSON.parse(stored) as LinkEntry[];
      if (Array.isArray(parsed)) {
        setLinks(parsed);
      }
    } catch {
      setLinks([]);
    }
  }, []);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "f") {
        event.preventDefault();
        searchInputRef.current?.focus();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const saveLinksToStorage = (nextLinks: LinkEntry[]) => {
    setLinks(nextLinks);
    localStorage.setItem(LINK_STORAGE_KEY, JSON.stringify(nextLinks));
  };

  const resetLinkForm = () => {
    setLinkUrl("");
    setLinkShortName("");
    setLinkNote("");
    setLinkGroup("");
    setEditingLinkId(null);
    setLinkFormError("");
  };

  const handleSaveLink = () => {
    if (!linkUrl.trim()) {
      setLinkFormError("Đường dẫn không được để trống");
      return;
    }

    const nextLinks = editingLinkId
      ? links.map((link) =>
          link.id === editingLinkId
            ? {
                ...link,
                url: linkUrl.trim(),
                shortName: linkShortName.trim(),
                note: linkNote.trim(),
                group: linkGroup.trim(),
              }
            : link,
        )
      : [
          ...links,
          {
            id:
              typeof crypto !== "undefined" &&
              typeof crypto.randomUUID === "function"
                ? crypto.randomUUID()
                : `${Date.now()}-${Math.random()}`,
            url: linkUrl.trim(),
            shortName: linkShortName.trim(),
            note: linkNote.trim(),
            group: linkGroup.trim(),
          },
        ];

    saveLinksToStorage(nextLinks);
    resetLinkForm();
  };

  const handleEditLink = (link: LinkEntry) => {
    setLinkUrl(link.url);
    setLinkShortName(link.shortName || "");
    setLinkNote(link.note);
    setLinkGroup(link.group || "");
    setEditingLinkId(link.id);
    setLinkFormError("");
  };

  const handleDeleteLink = (linkId: string) => {
    saveLinksToStorage(links.filter((link) => link.id !== linkId));
    if (editingLinkId === linkId) {
      resetLinkForm();
    }
  };

  const toggleGroup = (groupName: string) => {
    setOpenGroups((prev) => {
      const next = new Set(prev);
      if (next.has(groupName)) {
        next.delete(groupName);
      } else {
        next.add(groupName);
      }
      return next;
    });
  };

  const reorderLinksInGroup = (groupName: string, draggedId: string, targetId: string) => {
    const nextLinks = [...links];
    const groupItems = nextLinks.filter(
      (item) => (item.group?.trim() || "Không nhóm") === groupName,
    );
    const draggedIndex = groupItems.findIndex((item) => item.id === draggedId);
    const targetIndex = groupItems.findIndex((item) => item.id === targetId);
    if (draggedIndex === -1 || targetIndex === -1 || draggedIndex === targetIndex) {
      return;
    }

    const reordered = [...groupItems];
    const [moved] = reordered.splice(draggedIndex, 1);
    reordered.splice(targetIndex, 0, moved);

    let groupPointer = 0;
    const reorderedLinks = nextLinks.map((item) => {
      if ((item.group?.trim() || "Không nhóm") === groupName) {
        return reordered[groupPointer++];
      }
      return item;
    });

    saveLinksToStorage(reorderedLinks);
  };

  const handleDragStart = (
    event: DragEvent<HTMLDivElement>,
    link: LinkEntry,
    groupName: string,
  ) => {
    draggedItemRef.current = { id: link.id, group: groupName };
    event.dataTransfer.effectAllowed = "move";
    event.currentTarget.classList.add("opacity-70");
  };

  const handleDragEnd = (event: DragEvent<HTMLDivElement>) => {
    draggedItemRef.current = null;
    event.currentTarget.classList.remove("opacity-70");
  };

  const handleDragOver = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = "move";
  };

  const handleDrop = (
    event: DragEvent<HTMLDivElement>,
    targetLink: LinkEntry,
    groupName: string,
  ) => {
    event.preventDefault();
    const dragged = draggedItemRef.current;
    if (!dragged || dragged.group !== groupName || dragged.id === targetLink.id) {
      return;
    }
    reorderLinksInGroup(groupName, dragged.id, targetLink.id);
  };

  const filteredLinks = useMemo(() => {
    const query = searchText.trim().toLowerCase();
    if (!query) {
      return links;
    }

    return links.filter((link) =>
      `${link.url} ${link.shortName || ""} ${link.note}`
        .toLowerCase()
        .includes(query),
    );
  }, [links, searchText]);

  const groupedLinks = useMemo(() => {
    return filteredLinks.reduce<Record<string, LinkEntry[]>>((result, link) => {
      const groupName = link.group?.trim() || "Không nhóm";
      if (!result[groupName]) result[groupName] = [];
      result[groupName].push(link);
      return result;
    }, {});
  }, [filteredLinks]);

  const groupColors = useMemo(() => {
    const palette = [
      "border-rose-200 bg-rose-100 text-rose-800 dark:border-rose-700 dark:bg-rose-900/50 dark:text-rose-200",
      "border-amber-200 bg-amber-100 text-amber-800 dark:border-amber-700 dark:bg-amber-900/50 dark:text-amber-200",
      "border-emerald-200 bg-emerald-100 text-emerald-800 dark:border-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-200",
      "border-sky-200 bg-sky-100 text-sky-800 dark:border-sky-700 dark:bg-sky-900/50 dark:text-sky-200",
      "border-fuchsia-200 bg-fuchsia-100 text-fuchsia-800 dark:border-fuchsia-700 dark:bg-fuchsia-900/50 dark:text-fuchsia-200",
      "border-violet-200 bg-violet-100 text-violet-800 dark:border-violet-700 dark:bg-violet-900/50 dark:text-violet-200",
      "border-lime-200 bg-lime-100 text-lime-800 dark:border-lime-700 dark:bg-lime-900/50 dark:text-lime-200",
      "border-slate-200 bg-slate-100 text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100",
    ];

    return Object.keys(groupedLinks).reduce<Record<string, string>>((result, groupName, index) => {
      result[groupName] = palette[index % palette.length];
      return result;
    }, {});
  }, [groupedLinks]);

  const handleExportLinks = () => {
    const blob = new Blob([JSON.stringify(links, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "link-manager.json";
    anchor.click();
    URL.revokeObjectURL(url);
  };

  const handleImportLinks = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();

    reader.onload = () => {
      try {
        const text = reader.result as string;
        const parsed = JSON.parse(text) as LinkEntry[];
        if (!Array.isArray(parsed)) {
          throw new Error("Tệp JSON không đúng định dạng");
        }

        const normalized = parsed.map((item) => ({
          id:
            typeof item?.id === "string" && item.id
              ? item.id
              : `${Date.now()}-${Math.random()}`,
          url: String(item?.url || ""),
          shortName: String(item?.shortName || ""),
          note: String(item?.note || ""),
          group: String(item?.group || ""),
        }));

        saveLinksToStorage(normalized);
        resetLinkForm();
      } catch (err: any) {
        setLinkFormError(err?.message || "Không đọc được tệp JSON");
      }
    };

    reader.readAsText(file);
    event.target.value = "";
  };

  return (
    <>
      <PageMeta
        title="Link Manager"
        description="Quản lý đường dẫn, ghi chú và lưu dữ liệu trên client"
      />
      <div className="border border-gray-200 bg-white dark:border-gray-800 dark:bg-white/[0.03] lg:p-6">
        <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h3 className="text-lg font-semibold text-gray-800 dark:text-white/90">
              Quản lý đường dẫn
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Thêm, sửa, xóa đường dẫn và ghi chú; dữ liệu lưu trên client.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button onClick={handleExportLinks} size="sm" variant="outline">
              Tải JSON
            </Button>
            <label className="inline-flex cursor-pointer items-center rounded-lg border border-gray-300 bg-white px-3 py-2 text-xs text-gray-700 hover:border-gray-400 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200">
              Chọn tệp JSON
              <input
                type="file"
                accept="application/json"
                className="hidden"
                onChange={handleImportLinks}
              />
            </label>
          </div>
        </div>

        <div className="grid gap-4 xl:grid-cols-[2fr_1fr]">
          <div className="space-y-3 rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-950/40">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-sm font-semibold text-slate-900 dark:text-white">
                  Danh sách đường dẫn
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Tổng: {filteredLinks.length} / {links.length}
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <input
                  ref={searchInputRef}
                  value={searchText}
                  onChange={(e) => setSearchText(e.target.value)}
                  placeholder="Search URL hoặc ghi chú"
                  className="w-full rounded border border-gray-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition-all duration-200 ease-out focus:border-brand-500 focus:ring-2 focus:ring-brand-100 focus:sm:w-96 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 sm:w-72"
                />
              </div>
            </div>
            <div className=" h-[calc(100vh-300px)] overflow-auto rounded-xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-700 dark:bg-slate-900/60">
              {filteredLinks.length === 0 ? (
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  Không tìm thấy đường dẫn.
                </p>
              ) : (
                <div className="space-y-5">
                  {Object.entries(groupedLinks).map(([groupName, groupItems]) => {
                    const isOpen = searchText.trim() !== "" || openGroups.has(groupName);
                    return (
                      <div key={groupName} className="space-y-3">
                        <button
                          type="button"
                          onClick={() => toggleGroup(groupName)}
                          className={`flex w-full items-center justify-between rounded-xl border px-3 py-2 text-left text-sm font-semibold transition hover:border-brand-300 ${groupColors[groupName] ?? "border-slate-200 bg-slate-100 text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"}`}
                        >
                          <span>
                            {groupName} ({groupItems.length})
                          </span>
                          <span className={`ml-2 text-xs transition-transform ${isOpen ? "rotate-180" : "rotate-0"}`}>
                            ▼
                          </span>
                        </button>
                        {isOpen && (
                          <div className="space-y-3">
                            {groupItems.map((link) => (
                              <div
                                key={link.id}
                                draggable
                                onDragStart={(event) => handleDragStart(event, link, groupName)}
                                onDragEnd={handleDragEnd}
                                onDragOver={handleDragOver}
                                onDrop={(event) => handleDrop(event, link, groupName)}
                                className="rounded-xl border border-gray-200 bg-white p-3 text-sm shadow-sm transition hover:border-brand-300 dark:border-slate-700 dark:bg-slate-950/50"
                              >
                                <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                                  <div className="min-w-0 flex-1">
                                    <div className="flex flex-wrap items-center gap-2">
                                      <span className="cursor-grab rounded-full border border-slate-200 bg-slate-100 px-2 py-1 text-[11px] text-slate-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300">
                                        ⇅
                                      </span>
                                      <a
                                        href={link.url}
                                        target="_blank"
                                        rel="noreferrer"
                                        title={link.url}
                                        className="break-all text-sm font-semibold text-brand-600 hover:text-brand-800 dark:text-brand-400"
                                      >
                                        {link.shortName ? link.shortName : link.url}
                                      </a>
                                      {link.group && (
                                        <span className="rounded-full bg-slate-200 px-2 py-0.5 text-[11px] uppercase tracking-[0.18em] text-slate-600 dark:bg-slate-700 dark:text-slate-300">
                                          {link.group}
                                        </span>
                                      )}
                                    </div>
                                    {link.note ? (
                                      <p className="mt-2 text-xs text-slate-600 dark:text-slate-400">
                                        {link.note}
                                      </p>
                                    ) : null}
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <button
                                      onClick={() => handleEditLink(link)}
                                      className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-gray-200 bg-white text-gray-600 transition hover:border-brand-300 hover:text-brand-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:text-brand-300"
                                      aria-label="Sửa đường dẫn"
                                    >
                                      ✎
                                    </button>
                                    <button
                                      onClick={() => handleDeleteLink(link.id)}
                                      className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-gray-200 bg-white text-gray-600 transition hover:border-red-300 hover:text-red-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:text-red-400"
                                      aria-label="Xóa đường dẫn"
                                    >
                                      🗑
                                    </button>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          <div className="space-y-3 rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-950/40">
            <div className="space-y-2">
              <label className="block text-xs font-semibold uppercase tracking-[0.12em] text-slate-500 dark:text-slate-400">
                Đường dẫn
              </label>
              <input
                value={linkUrl}
                onChange={(e) => setLinkUrl(e.target.value)}
                placeholder="https://example.com"
                className="w-full rounded border border-gray-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-100 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
              />
            </div>
            <div className="space-y-2">
              <label className="block text-xs font-semibold uppercase tracking-[0.12em] text-slate-500 dark:text-slate-400">
                Tên viết tắt
              </label>
              <input
                value={linkShortName}
                onChange={(e) => setLinkShortName(e.target.value)}
                placeholder="Ví dụ: BK, Docs, CRM"
                className="w-full rounded border border-gray-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-100 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
              />
            </div>
            <div className="space-y-2">
                <label className="block text-xs font-semibold uppercase tracking-[0.12em] text-slate-500 dark:text-slate-400">
                  Nhóm
                </label>
                <input
                  value={linkGroup}
                  onChange={(e) => setLinkGroup(e.target.value)}
                  placeholder="Ví dụ: Favorite, Work, News"
                  className="w-full rounded border border-gray-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-100 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
                />
              </div>
              <div className="space-y-2">
                <label className="block text-xs font-semibold uppercase tracking-[0.12em] text-slate-500 dark:text-slate-400">
                  Ghi chú
                </label>
                <textarea
                  value={linkNote}
                  onChange={(e) => setLinkNote(e.target.value)}
                  rows={3}
                  placeholder="Ghi chú cho đường dẫn"
                  className="w-full rounded border border-gray-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-100 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
                />
              </div>
            {linkFormError && (
              <p className="text-sm text-red-600 dark:text-red-400">
                {linkFormError}
              </p>
            )}
            <div className="flex flex-wrap gap-2">
              <Button onClick={handleSaveLink} size="sm">
                {editingLinkId ? "Cập nhật" : "Thêm đường dẫn"}
              </Button>
              {editingLinkId && (
                <Button onClick={resetLinkForm} size="sm" variant="outline">
                  Hủy
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
