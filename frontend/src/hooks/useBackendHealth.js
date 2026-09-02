import {
  useCallback,
  useEffect,
  useState,
} from "react";

import {
  getBackendHealth,
} from "../services/backendApi";

const POLL_INTERVAL = 5000;
const REQUEST_TIMEOUT = 2500;

function useBackendHealth() {
  const [status, setStatus] =
    useState("checking");

  const [health, setHealth] =
    useState(null);

  const [error, setError] =
    useState("");

  const checkBackend =
    useCallback(async () => {
      const controller =
        new AbortController();

      const timeoutId =
        window.setTimeout(
          () => controller.abort(),
          REQUEST_TIMEOUT,
        );

      try {
        const data =
          await getBackendHealth(
            controller.signal,
          );

        if (data.status !== "ok") {
          throw new Error(
            "Status backend tidak valid.",
          );
        }

        setHealth(data);
        setError("");
        setStatus("online");
      } catch (requestError) {
        setHealth(null);

        setError(
          requestError instanceof Error
            ? requestError.message
            : "Backend tidak dapat dihubungi.",
        );

        setStatus("offline");
      } finally {
        window.clearTimeout(
          timeoutId,
        );
      }
    }, []);

  useEffect(() => {
    checkBackend();

    const intervalId =
      window.setInterval(
        checkBackend,
        POLL_INTERVAL,
      );

    return () => {
      window.clearInterval(
        intervalId,
      );
    };
  }, [checkBackend]);

  return {
    status,
    health,
    error,

    isOnline:
      status === "online",

    isChecking:
      status === "checking",

    checkBackend,
  };
}

export default useBackendHealth;