import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  getModelStatus,
  getModelVersions,
  selectModel,
} from "../lib/modelApi";

const ModelContext = createContext(null);

export function ModelProvider({ children }) {
  const [versions, setVersions] = useState([]);
  const [activeVersion, setActiveVersion] = useState("v1");
  const [status, setStatus] = useState(null);

  const [loading, setLoading] = useState(true);
  const [switching, setSwitching] = useState(false);
  const [error, setError] = useState("");

  const refresh = useCallback(async () => {
    try {
      setError("");

      const [versionData, statusData] = await Promise.all([
        getModelVersions(),
        getModelStatus(),
      ]);

      const versionList = Array.isArray(versionData?.versions)
        ? versionData.versions
        : [];

      setVersions(versionList);

      const active =
        versionData?.active_version ||
        statusData?.active_version ||
        statusData?.version ||
        "v1";

      setActiveVersion(active);
      setStatus(statusData);
    } catch (err) {
      console.error("[ModelContext] refresh failed:", err);
      setError(err?.message || "Gagal mengambil status model.");
    } finally {
      setLoading(false);
    }
  }, []);

  const changeModel = useCallback(
    async (version) => {
      if (!version) return;

      if (version === activeVersion) {
        return;
      }

      try {
        setSwitching(true);
        setError("");

        await selectModel(version);

        // Ambil kondisi aktual dari backend setelah switch.
        await refresh();
      } catch (err) {
        console.error("[ModelContext] switch failed:", err);
        setError(err?.message || "Gagal mengganti model.");
        throw err;
      } finally {
        setSwitching(false);
      }
    },
    [activeVersion, refresh]
  );

  useEffect(() => {
    refresh();
  }, [refresh]);

  const activeModel = useMemo(() => {
    return (
      versions.find(
        (item) =>
          item.version === activeVersion ||
          item.id === activeVersion
      ) || null
    );
  }, [versions, activeVersion]);

  const value = useMemo(
    () => ({
      versions,
      activeVersion,
      activeModel,
      status,

      loading,
      switching,
      error,

      refresh,
      changeModel,
    }),
    [
      versions,
      activeVersion,
      activeModel,
      status,
      loading,
      switching,
      error,
      refresh,
      changeModel,
    ]
  );

  return (
    <ModelContext.Provider value={value}>
      {children}
    </ModelContext.Provider>
  );
}

export function useModel() {
  const context = useContext(ModelContext);

  if (!context) {
    throw new Error("useModel harus digunakan di dalam ModelProvider");
  }

  return context;
}