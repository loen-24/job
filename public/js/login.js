const existingUser = getUser();
if (existingUser?.role === "admin") {
  window.location.href = "./admin.html";
}
if (existingUser?.role === "employee") {
  window.location.href = "./employee.html";
}

document.getElementById("loginForm").addEventListener("submit", async (event) => {
  event.preventDefault();
  showMessage("message", "", "error");

  const payload = {
    employeeId: document.getElementById("employeeId").value.trim(),
    password: document.getElementById("password").value,
  };

  try {
    const response = await apiRequest("/api/auth/login", {
      method: "POST",
      body: JSON.stringify(payload),
    });

    setSession({ token: response.token, user: response.user });

    if (response.user.role === "admin") {
      window.location.href = "./admin.html";
    } else {
      window.location.href = "./employee.html";
    }
  } catch (error) {
    showMessage("message", error.message || "Login failed", "error");
  }
});
