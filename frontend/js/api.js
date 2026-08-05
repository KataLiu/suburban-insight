async function checkBackendHealth() {
  const response = await fetch(`${API_BASE_URL}/health`);
  if (!response.ok) {
    throw new Error(`Backend responded with ${response.status}`);
  }
  return response.json();
}

async function fetchSuburbs(councilId) {
  const url = councilId
    ? `${API_BASE_URL}/api/suburbs?council_id=${encodeURIComponent(councilId)}`
    : `${API_BASE_URL}/api/suburbs`;
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to load suburbs (${response.status})`);
  }
  return response.json();
}

async function fetchCouncils() {
  const response = await fetch(`${API_BASE_URL}/api/councils`);
  if (!response.ok) {
    throw new Error(`Failed to load councils (${response.status})`);
  }
  return response.json();
}

async function fetchSuburbDetail(suburbId) {
  const response = await fetch(`${API_BASE_URL}/api/suburbs/${suburbId}`);
  if (!response.ok) {
    throw new Error(`Failed to load suburb "${suburbId}" (${response.status})`);
  }
  return response.json();
}

async function fetchComparison(suburbIds) {
  const response = await fetch(`${API_BASE_URL}/api/compare`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ suburb_ids: suburbIds }),
  });
  if (!response.ok) {
    throw new Error(`Failed to load comparison (${response.status})`);
  }
  return response.json();
}
