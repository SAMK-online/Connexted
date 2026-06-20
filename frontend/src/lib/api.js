const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:8000";

async function request(path, options = {}) {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {})
    },
    ...options
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.detail || `Request failed: ${response.status}`);
  }

  return response.json();
}

export function listCaptures() {
  return request("/api/captures");
}

export function createCapture(payload) {
  return request("/api/captures", {
    method: "POST",
    body: JSON.stringify(payload)
  });
}

export function getReport(captureId) {
  return request(`/api/reports/${captureId}`);
}

export function getAgentRun(captureId) {
  return request(`/api/reports/${captureId}/agent-run`);
}

export function updateDraft(draftId, payload) {
  return request(`/api/drafts/${draftId}`, {
    method: "PATCH",
    body: JSON.stringify(payload)
  });
}

export function regenerateDraft(draftId, payload) {
  return request(`/api/drafts/${draftId}/regenerate`, {
    method: "POST",
    body: JSON.stringify(payload)
  });
}

export function createReview(payload) {
  return request("/api/reviews", {
    method: "POST",
    body: JSON.stringify(payload)
  });
}

export function syncHubSpot(payload) {
  return request("/api/crm/hubspot/sync", {
    method: "POST",
    body: JSON.stringify(payload)
  });
}

