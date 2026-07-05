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

export function getHubSpotStatus(organizationId) {
  return request(`/api/crm/hubspot/status?organization_id=${encodeURIComponent(organizationId)}`);
}

// Full-page redirect target that kicks off the HubSpot OAuth consent flow.
export function hubspotInstallUrl(organizationId) {
  return `${API_BASE_URL}/api/crm/hubspot/install?organization_id=${encodeURIComponent(organizationId)}`;
}

export function discoverEvents(payload) {
  return request("/api/events/discover", {
    method: "POST",
    body: JSON.stringify(payload)
  });
}

export function listEvents() {
  return request("/api/events");
}

export function listPlaybooks() {
  return request("/api/admin/playbooks");
}

export function updatePlaybook(playbookId, payload) {
  return request(`/api/admin/playbooks/${playbookId}`, {
    method: "PUT",
    body: JSON.stringify(payload)
  });
}

export function listStyleProfiles() {
  return request("/api/admin/style-profiles");
}

export function updateStyleProfile(profileId, payload) {
  return request(`/api/admin/style-profiles/${profileId}`, {
    method: "PUT",
    body: JSON.stringify(payload)
  });
}
