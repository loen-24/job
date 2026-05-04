const user = getUser();
if (!user || user.role !== "admin") {
  clearSession();
  window.location.href = "./login.html";
}

document.getElementById("adminIdentity").textContent = `${user.name} (${user.employeeId})`;

const statusOptions = [
  "Submitted",
  "Under Review",
  "Selected",
  "Rejected",
  "Pending Documents",
];

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

async function loadDashboard() {
  const data = await apiRequest("/api/admin/dashboard");
  document.getElementById("totalApplicants").textContent = data.totalApplicants || 0;
  document.getElementById("totalEmployees").textContent = data.totalEmployees || 0;
  document.getElementById("todaysEntries").textContent = data.todaysEntries || 0;

  const tbody = document.getElementById("recentBody");
  tbody.innerHTML = data.recentApplications.length
    ? data.recentApplications
        .map(
          (item) => `
          <tr>
            <td>${escapeHtml(item.reference_no)}</td>
            <td>${escapeHtml(item.full_name)}</td>
            <td>${escapeHtml(item.job_position)}</td>
            <td><span class="badge ${statusClass(item.status)}">${escapeHtml(item.status)}</span></td>
          </tr>`
        )
        .join("")
    : `<tr><td colspan="4" class="muted">No recent applications</td></tr>`;
}

async function loadEmployees() {
  const employees = await apiRequest("/api/admin/employees");
  const tbody = document.getElementById("employeesBody");

  tbody.innerHTML = employees.length
    ? employees
        .map(
          (emp) => `
          <tr>
            <td>${escapeHtml(emp.name)}</td>
            <td>${escapeHtml(emp.employeeId)}</td>
            <td>${emp.isActive ? '<span class="badge status-selected">Active</span>' : '<span class="badge status-rejected">Disabled</span>'}</td>
            <td>${formatDate(emp.createdAt)}</td>
            <td class="inline">
              <button class="btn ${emp.isActive ? "btn-warning" : "btn-success"}" onclick="toggleEmployee(${emp.id}, ${!emp.isActive})">
                ${emp.isActive ? "Disable" : "Enable"}
              </button>
              <button class="btn btn-danger" onclick="deleteEmployee(${emp.id})">Remove</button>
            </td>
          </tr>`
        )
        .join("")
    : `<tr><td colspan="5" class="muted">No employees created yet</td></tr>`;
}

async function loadApplicants(search = "") {
  const query = search ? `?search=${encodeURIComponent(search)}` : "";
  const rows = await apiRequest(`/api/admin/applicants${query}`);
  const tbody = document.getElementById("applicantsBody");

  tbody.innerHTML = rows.length
    ? rows
        .map((row) => {
          const statusSelect = statusOptions
            .map((status) => `<option ${status === row.status ? "selected" : ""}>${status}</option>`)
            .join("");

          return `
            <tr>
              <td>${escapeHtml(row.referenceNo)}</td>
              <td>
                <strong>${escapeHtml(row.fullName)}</strong><br />
                <span class="muted">DOB: ${escapeHtml(row.dob)}</span>
              </td>
              <td>${escapeHtml(row.mobile)}<br /><span class="muted">${escapeHtml(row.email)}</span></td>
              <td>${escapeHtml(row.jobPosition)}</td>
              <td>${escapeHtml(row.employeeName)}<br /><span class="muted">${escapeHtml(row.employeeId)}</span></td>
              <td>
                <select id="status-${row.id}">${statusSelect}</select>
                <button class="btn btn-secondary" style="margin-top: 6px;" onclick="updateStatus(${row.id})">Save</button>
              </td>
              <td>${row.photoPath ? `<img class="photo" src="${escapeHtml(resolveAssetUrl(row.photoPath))}" alt="photo">` : "-"}</td>
              <td>
                <button class="btn btn-warning" onclick="quickEditApplicant(${row.id})">Edit</button>
                <button class="btn btn-danger" onclick="deleteApplicant(${row.id})">Delete</button>
              </td>
            </tr>`;
        })
        .join("")
    : `<tr><td colspan="8" class="muted">No applicants found</td></tr>`;
}

async function toggleEmployee(id, isActive) {
  try {
    await apiRequest(`/api/admin/employees/${id}`, {
      method: "PATCH",
      body: JSON.stringify({ isActive }),
    });
    showMessage("employeeMessage", `Employee ${isActive ? "enabled" : "disabled"} successfully`, "success");
    await loadEmployees();
  } catch (error) {
    showMessage("employeeMessage", error.message, "error");
  }
}

async function deleteEmployee(id) {
  if (!confirm("Remove this employee? This works only if no applicant is linked.")) return;

  try {
    await apiRequest(`/api/admin/employees/${id}`, { method: "DELETE" });
    showMessage("employeeMessage", "Employee removed successfully", "success");
    await loadEmployees();
    await loadDashboard();
  } catch (error) {
    showMessage("employeeMessage", error.message, "error");
  }
}

async function updateStatus(id) {
  const status = document.getElementById(`status-${id}`).value;

  try {
    await apiRequest(`/api/admin/applicants/${id}`, {
      method: "PUT",
      body: JSON.stringify({ status }),
    });
    showMessage("applicantMessage", "Status updated", "success");
    await loadApplicants(document.getElementById("searchInput").value.trim());
    await loadDashboard();
  } catch (error) {
    showMessage("applicantMessage", error.message, "error");
  }
}

async function quickEditApplicant(id) {
  const fullName = prompt("Full Name (leave blank to keep unchanged):");
  const email = prompt("Email (leave blank to keep unchanged):");
  const mobile = prompt("Mobile (10-15 digits, blank to keep unchanged):");
  const jobPosition = prompt("Job Position (leave blank to keep unchanged):");

  const payload = {};
  if (fullName) payload.fullName = fullName.trim();
  if (email) payload.email = email.trim();
  if (mobile) payload.mobile = mobile.trim();
  if (jobPosition) payload.jobPosition = jobPosition.trim();

  if (!Object.keys(payload).length) return;

  try {
    await apiRequest(`/api/admin/applicants/${id}`, {
      method: "PUT",
      body: JSON.stringify(payload),
    });
    showMessage("applicantMessage", "Applicant updated successfully", "success");
    await loadApplicants(document.getElementById("searchInput").value.trim());
  } catch (error) {
    showMessage("applicantMessage", error.message, "error");
  }
}

async function deleteApplicant(id) {
  if (!confirm("Delete this applicant record?")) return;

  try {
    await apiRequest(`/api/admin/applicants/${id}`, { method: "DELETE" });
    showMessage("applicantMessage", "Applicant deleted successfully", "success");
    await loadApplicants(document.getElementById("searchInput").value.trim());
    await loadDashboard();
  } catch (error) {
    showMessage("applicantMessage", error.message, "error");
  }
}

window.toggleEmployee = toggleEmployee;
window.deleteEmployee = deleteEmployee;
window.updateStatus = updateStatus;
window.quickEditApplicant = quickEditApplicant;
window.deleteApplicant = deleteApplicant;

document.getElementById("addEmployeeForm").addEventListener("submit", async (event) => {
  event.preventDefault();
  showMessage("employeeMessage", "", "error");

  const payload = {
    name: document.getElementById("empName").value.trim(),
    employeeId: document.getElementById("empId").value.trim(),
    password: document.getElementById("empPassword").value,
  };

  try {
    await apiRequest("/api/admin/employees", {
      method: "POST",
      body: JSON.stringify(payload),
    });

    document.getElementById("addEmployeeForm").reset();
    showMessage("employeeMessage", "Employee created successfully", "success");
    await loadEmployees();
    await loadDashboard();
  } catch (error) {
    showMessage("employeeMessage", error.message, "error");
  }
});

document.getElementById("searchForm").addEventListener("submit", async (event) => {
  event.preventDefault();
  await loadApplicants(document.getElementById("searchInput").value.trim());
});

document.getElementById("clearSearchBtn").addEventListener("click", async () => {
  document.getElementById("searchInput").value = "";
  await loadApplicants("");
});

document.getElementById("logoutBtn").addEventListener("click", () => {
  clearSession();
  window.location.href = "./login.html";
});

(async () => {
  try {
    await Promise.all([loadDashboard(), loadEmployees(), loadApplicants()]);
  } catch (error) {
    if (error.status === 401 || error.status === 403) {
      clearSession();
      window.location.href = "./login.html";
      return;
    }
    showMessage("applicantMessage", error.message || "Failed to load data", "error");
  }
})();
