function showTrackMessage(text, kind = "error") {
  const el = document.getElementById("trackMessage");
  el.innerHTML = text ? `<div class="message ${kind}">${text}</div>` : "";
}

function statusClass(status) {
  return `status-${String(status || "").toLowerCase().replace(/\s+/g, "-")}`;
}

function fillResult(data) {
  document.getElementById("resultCard").style.display = "block";
  document.getElementById("rName").textContent = data.fullName;
  document.getElementById("rEmail").textContent = data.email;
  document.getElementById("rMobile").textContent = data.mobile;
  document.getElementById("rGender").textContent = data.gender;
  document.getElementById("rDob").textContent = data.dob;
  document.getElementById("rPosition").textContent = data.jobPosition;
  document.getElementById("rAddress").textContent = data.address;
  document.getElementById("rRef").textContent = data.referenceNo;
  document.getElementById("rStatus").innerHTML = `<span class="badge ${statusClass(data.status)}">${data.status}</span>`;
  document.getElementById("rPhoto").src = data.photoPath ? resolveAssetUrl(data.photoPath) : "";
  document.getElementById("rPhoto").style.display = data.photoPath ? "block" : "none";
}

async function trackByReference(referenceNo) {
  const response = await fetch(buildApiUrl("/api/public/track"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ referenceNo }),
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.message || "Unable to fetch application details");
  }

  return data;
}

document.getElementById("trackForm").addEventListener("submit", async (event) => {
  event.preventDefault();
  showTrackMessage("");
  document.getElementById("resultCard").style.display = "none";

  const referenceNo = document.getElementById("referenceNo").value.trim().toUpperCase();
  if (!referenceNo) {
    showTrackMessage("Please enter your reference number");
    return;
  }

  try {
    const data = await trackByReference(referenceNo);
    fillResult(data);
  } catch (error) {
    showTrackMessage(error.message || "Unable to track application");
  }
});

const params = new URLSearchParams(window.location.search);
const prefillRef = params.get("ref");
if (prefillRef) {
  document.getElementById("referenceNo").value = prefillRef.toUpperCase();
  document.getElementById("trackForm").dispatchEvent(new Event("submit"));
}
