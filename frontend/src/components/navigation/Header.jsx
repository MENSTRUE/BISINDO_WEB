import {
  Cpu,
  LoaderCircle,
  Moon,
  Sun,
  Wifi,
  WifiOff,
  ChevronDown,
} from "lucide-react";

import {
  useEffect,
  useRef,
  useState,
} from "react";

import useBackendHealth
  from "../../hooks/useBackendHealth";

import {
  useRealtime,
} from "../../contexts/RealtimeContext";

import {
  useTheme,
} from "../../contexts/ThemeContext";

import {
  useModel,
} from "../../contexts/ModelContext";

import "../../styles/header.css";


function getModelLabel(version) {
  if (version === "v1") {
    return "V1 · Legacy";
  }

  if (version === "v2") {
    return "V2 · Multimodal";
  }

  return version?.toUpperCase() || "Unknown";
}


function Header() {
  /* =========================
     REST BACKEND
  ========================= */

  const {
    health,
    isOnline:
      isBackendOnline,
    isChecking:
      isBackendChecking,
  } = useBackendHealth();


  /* =========================
     WEBSOCKET
  ========================= */

  const {
    status:
      realtimeStatus,

    isConnected:
      isRealtimeConnected,
  } = useRealtime();


  /* =========================
     MODEL
  ========================= */

  const {
    versions,
    activeVersion,
    changeModel,
    switching,
    loading:
      isModelLoading,
    error:
      modelError,
  } = useModel();


  const [
    isModelMenuOpen,
    setIsModelMenuOpen,
  ] = useState(false);


  const modelMenuRef =
    useRef(null);


  useEffect(() => {
    const handleOutsideClick =
      (event) => {
        if (
          modelMenuRef.current &&
          !modelMenuRef.current.contains(
            event.target
          )
        ) {
          setIsModelMenuOpen(
            false
          );
        }
      };


    document.addEventListener(
      "mousedown",
      handleOutsideClick
    );


    return () => {
      document.removeEventListener(
        "mousedown",
        handleOutsideClick
      );
    };
  }, []);


  const handleModelChange =
    async (version) => {
      if (
        !version ||
        version ===
          activeVersion ||
        switching
      ) {
        setIsModelMenuOpen(
          false
        );

        return;
      }


      try {
        await changeModel(
          version
        );

        setIsModelMenuOpen(
          false
        );
      } catch (error) {
        console.error(
          "[Header] model switch failed:",
          error
        );
      }
    };


  /* =========================
     THEME
  ========================= */

  const {
    theme,
    toggleTheme,
  } = useTheme();


  const isDarkTheme =
    theme === "dark";


  const ThemeIcon =
    isDarkTheme
      ? Sun
      : Moon;


  const themeLabel =
    isDarkTheme
      ? "Dark Mode"
      : "Light Mode";


  const themeButtonTitle =
    isDarkTheme
      ? "Gunakan Light Mode"
      : "Gunakan Dark Mode";


  /* =========================
     CONNECTION
  ========================= */

  const getConnectionState =
    () => {
      if (
        isBackendChecking
      ) {
        return "checking";
      }


      if (
        !isBackendOnline
      ) {
        return "offline";
      }


      if (
        isRealtimeConnected
      ) {
        return "online";
      }


      if (
        realtimeStatus ===
        "connecting"
      ) {
        return "checking";
      }


      return "offline";
    };


  const connectionState =
    getConnectionState();


  const ConnectionIcon =
    connectionState ===
    "checking"
      ? LoaderCircle
      : connectionState ===
          "online"
        ? Wifi
        : WifiOff;


  const getConnectionText =
    () => {
      if (
        isBackendChecking
      ) {
        return "Checking...";
      }


      if (
        !isBackendOnline
      ) {
        return "Backend Offline";
      }


      if (
        isRealtimeConnected
      ) {
        return "Realtime Online";
      }


      if (
        realtimeStatus ===
        "connecting"
      ) {
        return (
          "Realtime Connecting"
        );
      }


      return "Realtime Offline";
    };


  return (
    <header className="main-header">
      {/* =========================
          TITLE
      ========================== */}

      <div className="header-title-group">
        <span className="header-eyebrow">
          Workspace
        </span>

        <h1>
          BISINDO Recognition
        </h1>
      </div>


      {/* =========================
          CONTROLS
      ========================== */}

      <div className="header-controls">
        {/* MODEL SWITCHER */}

        <div
          ref={modelMenuRef}
          className="header-model-switcher"
        >
          <button
            type="button"
            className={
              `header-control-card header-model-button ${
                isModelMenuOpen
                  ? "open"
                  : ""
              }`
            }
            title="Pilih model pengenalan"
            aria-expanded={
              isModelMenuOpen
            }
            disabled={
              isModelLoading
            }
            onClick={() =>
              setIsModelMenuOpen(
                (current) =>
                  !current
              )
            }
          >
            <span className="header-control-icon">
              {switching ? (
                <LoaderCircle
                  size={16}
                  strokeWidth={1.8}
                  className="connection-loading"
                />
              ) : (
                <Cpu
                  size={16}
                  strokeWidth={1.8}
                />
              )}
            </span>

            <div className="header-control-content">
              <span className="header-control-label">
                Active Model
              </span>

              <strong>
                {switching
                  ? "Switching..."
                  : getModelLabel(
                      activeVersion
                    )}
              </strong>
            </div>

            <ChevronDown
              size={14}
              strokeWidth={1.8}
              className={
                `header-model-chevron ${
                  isModelMenuOpen
                    ? "rotate"
                    : ""
                }`
              }
            />
          </button>


          {isModelMenuOpen && (
            <div className="header-model-menu">
              <div className="header-model-menu-heading">
                Select Model
              </div>

              {versions.map(
                (model) => {
                  const version =
                    model.version ||
                    model.id;

                  const isActive =
                    version ===
                    activeVersion;

                  const isReady =
                    model.ready !==
                    false;


                  return (
                    <button
                      type="button"
                      key={
                        version
                      }
                      className={
                        `header-model-option ${
                          isActive
                            ? "active"
                            : ""
                        }`
                      }
                      disabled={
                        !isReady ||
                        switching
                      }
                      onClick={() =>
                        handleModelChange(
                          version
                        )
                      }
                    >
                      <span
                        className={
                          `header-model-status ${
                            isReady
                              ? "ready"
                              : "offline"
                          }`
                        }
                      />

                      <div>
                        <strong>
                          {
                            getModelLabel(
                              version
                            )
                          }
                        </strong>

                        <span>
                          {version ===
                          "v2"
                            ? "V3.2 · 7 Input"
                            : "Legacy Pipeline"}
                        </span>
                      </div>

                      {isActive && (
                        <span className="header-model-active-text">
                          Active
                        </span>
                      )}
                    </button>
                  );
                }
              )}


              {modelError && (
                <div className="header-model-error">
                  {
                    modelError
                  }
                </div>
              )}
            </div>
          )}
        </div>


        {/* CONNECTION */}

        <div
          className={
            `header-control-card connection ${connectionState}`
          }
          title={
            health
              ? (
                  `${health.service} ${health.version}`
                  +
                  ` · WebSocket ${realtimeStatus}`
                )
              : (
                  "Status koneksi backend"
                )
          }
        >
          <span className="header-control-icon">
            <ConnectionIcon
              size={16}
              strokeWidth={1.8}
              className={
                connectionState ===
                "checking"
                  ? (
                      "connection-loading"
                    )
                  : ""
              }
            />
          </span>

          <div className="header-control-content">
            <span className="header-control-label">
              Connection
            </span>

            <strong>
              <span
                className={
                  `connection-dot ${connectionState}`
                }
              />

              {
                getConnectionText()
              }
            </strong>
          </div>
        </div>


        {/* THEME */}

        <button
          type="button"
          className="header-control-card header-theme-toggle"
          title={
            themeButtonTitle
          }
          aria-label={
            themeButtonTitle
          }
          onClick={
            toggleTheme
          }
        >
          <span className="header-control-icon theme-toggle-icon">
            <ThemeIcon
              size={16}
              strokeWidth={1.8}
            />
          </span>

          <div className="header-control-content">
            <span className="header-control-label">
              Appearance
            </span>

            <strong>
              {themeLabel}
            </strong>
          </div>
        </button>
      </div>
    </header>
  );
}


export default Header;