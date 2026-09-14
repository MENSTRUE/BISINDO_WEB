const API_BASE = "http://127.0.0.1:8000";

export async function getModelVersions() {
  const response = await fetch(`${API_BASE}/api/model/versions`);

  if (!response.ok) {
    throw new Error(`Gagal mengambil model versions: ${response.status}`);
  }

  return response.json();
}

export async function selectModel(version) {
  const response = await fetch(`${API_BASE}/api/model/select`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      version,
    }),
  });

  if (!response.ok) {
    let message = `Gagal mengganti model: ${response.status}`;

    try {
      const body = await response.json();
      message = body.detail || body.message || message;
    } catch (_) {
      // ignore
    }

    throw new Error(message);
  }

  return response.json();
}

export async function getModelStatus() {
  const response = await fetch(`${API_BASE}/api/model/status`);

  if (!response.ok) {
    throw new Error(`Gagal mengambil status model: ${response.status}`);
  }

  return response.json();
}