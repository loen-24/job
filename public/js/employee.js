const user = getUser();
if (!user || user.role !== "employee") {
  clearSession();
  window.location.href = "/login.html";
}

document.getElementById("employeeIdentity").textContent = `${user.name} (${user.employeeId})`;

let latestReference = "";

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function formatDate(date) {
  return new Date(date).toLocaleString();
}

async function loadMyApplicants() {
  const rows = await apiRequest("/api/employee/applicants");
  const tbody = document.getElementById("myApplicantsBody");

  tbody.innerHTML = rows.length
    ? rows
        .map(
          (row) => `
          <tr>
            <td>${escapeHtml(row.referenceNo)}</td>
            <td>${escapeHtml(row.fullName)}</td>
            <td>${escapeHtml(row.mobile)}<br /><span class="muted">${escapeHtml(row.email)}</span></td>
            <td>${escapeHtml(row.jobPosition)}</td>
            <td><span class="badge ${statusClass(row.status)}">${escapeHtml(row.status)}</span></td>
            <td>${row.photoPath ? `<img class="photo" src="${escapeHtml(row.photoPath)}" alt="photo">` : "-"}</td>
            <td>${formatDate(row.createdAt)}</td>
          </tr>`
        )
        .join("")
    : `<tr><td colspan="7" class="muted">No applicant entries submitted yet</td></tr>`;
}

document.getElementById("applicantForm").addEventListener("submit", async (event) => {
  event.preventDefault();
  showMessage("formMessage", "", "error");

  const form = event.target;
  const formData = new FormData(form);

  try {
    const response = await apiRequest("/api/employee/applicants", {
      method: "POST",
      body: formData,
    });

    latestReference = response.referenceNo;
    document.getElementById("generatedRef").textContent = latestReference;
    showMessage("formMessage", "Application submitted successfully", "success");
    form.reset();
    await loadMyApplicants();
  } catch (error) {
    showMessage("formMessage", error.message || "Submission failed", "error");
  }
});

document.getElementById("copyRefBtn").addEventListener("click", async () => {
  if (!latestReference) {
    document.getElementById("copyMsg").textContent = "No reference number generated yet.";
    return;
  }

  try {
    await navigator.clipboard.writeText(latestReference);
    document.getElementById("copyMsg").textContent = "Reference copied to clipboard.";
  } catch {
    document.getElementById("copyMsg").textContent = "Copy failed. Please copy manually.";
  }
});

document.getElementById("logoutBtn").addEventListener("click", () => {
  clearSession();
  window.location.href = "/login.html";
});

(async () => {
  try {
    await loadMyApplicants();
  } catch (error) {
    if (error.status === 401 || error.status === 403) {
      clearSession();
      window.location.href = "/login.html";
      return;
    }
    showMessage("formMessage", error.message || "Failed to load applicants", "error");
  }
})();
