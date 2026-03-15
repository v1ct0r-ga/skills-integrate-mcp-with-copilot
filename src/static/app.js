document.addEventListener("DOMContentLoaded", () => {
  const TOKEN_STORAGE_KEY = "teacherToken";
  const USERNAME_STORAGE_KEY = "teacherUsername";

  const activitiesList = document.getElementById("activities-list");
  const activitySelect = document.getElementById("activity");
  const signupForm = document.getElementById("signup-form");
  const messageDiv = document.getElementById("message");
  const teacherOnlyNote = document.getElementById("teacher-only-note");

  const userMenuBtn = document.getElementById("user-menu-btn");
  const userMenu = document.getElementById("user-menu");
  const teacherStatus = document.getElementById("teacher-status");
  const loginMenuBtn = document.getElementById("login-menu-btn");
  const logoutMenuBtn = document.getElementById("logout-menu-btn");

  const loginModal = document.getElementById("login-modal");
  const loginCloseBtn = document.getElementById("login-close-btn");
  const teacherLoginForm = document.getElementById("teacher-login-form");
  const teacherUsernameInput = document.getElementById("teacher-username");
  const teacherPasswordInput = document.getElementById("teacher-password");

  let teacherToken = localStorage.getItem(TOKEN_STORAGE_KEY) || "";
  let teacherUsername = localStorage.getItem(USERNAME_STORAGE_KEY) || "";

  function showMessage(text, style) {
    messageDiv.textContent = text;
    messageDiv.className = style;
    messageDiv.classList.remove("hidden");

    setTimeout(() => {
      messageDiv.classList.add("hidden");
    }, 5000);
  }

  function setTeacherAuth(enabled) {
    const controls = signupForm.querySelectorAll("input, select, button");
    controls.forEach((control) => {
      control.disabled = !enabled;
    });

    if (enabled) {
      teacherOnlyNote.textContent = `Teacher mode enabled (${teacherUsername}). You can register and unregister students.`;
    } else {
      teacherOnlyNote.textContent =
        "Teachers must log in to register or unregister students.";
    }
  }

  function updateAuthUI() {
    const loggedIn = Boolean(teacherToken);

    teacherStatus.textContent = loggedIn
      ? `Teacher: ${teacherUsername}`
      : "Student view";
    loginMenuBtn.classList.toggle("hidden", loggedIn);
    logoutMenuBtn.classList.toggle("hidden", !loggedIn);
    setTeacherAuth(loggedIn);
  }

  function setLoggedOutState() {
    teacherToken = "";
    teacherUsername = "";
    localStorage.removeItem(TOKEN_STORAGE_KEY);
    localStorage.removeItem(USERNAME_STORAGE_KEY);
    updateAuthUI();
  }

  async function ensureTeacherSession() {
    if (!teacherToken) {
      updateAuthUI();
      return;
    }

    try {
      const response = await fetch("/auth/me", {
        headers: {
          "X-Teacher-Token": teacherToken,
        },
      });

      if (!response.ok) {
        setLoggedOutState();
        return;
      }

      const payload = await response.json();
      teacherUsername = payload.username;
      localStorage.setItem(USERNAME_STORAGE_KEY, teacherUsername);
    } catch (error) {
      console.error("Error validating teacher session:", error);
      setLoggedOutState();
      showMessage("Failed to validate teacher session.", "error");
    }

    updateAuthUI();
  }

  function openLoginModal() {
    loginModal.classList.remove("hidden");
    teacherUsernameInput.focus();
  }

  function closeLoginModal() {
    loginModal.classList.add("hidden");
    teacherLoginForm.reset();
  }

  async function handleTeacherLogout() {
    if (!teacherToken) {
      return;
    }

    try {
      await fetch("/auth/logout", {
        method: "POST",
        headers: {
          "X-Teacher-Token": teacherToken,
        },
      });
    } catch (error) {
      console.error("Error during logout:", error);
    }

    setLoggedOutState();
    fetchActivities();
    showMessage("Logged out.", "success");
  }

  // Function to fetch activities from API
  async function fetchActivities() {
    try {
      const response = await fetch("/activities");
      const activities = await response.json();

      // Clear loading message
      activitiesList.innerHTML = "";
      activitySelect.innerHTML =
        '<option value="">-- Select an activity --</option>';

      // Populate activities list
      Object.entries(activities).forEach(([name, details]) => {
        const activityCard = document.createElement("div");
        activityCard.className = "activity-card";

        const spotsLeft =
          details.max_participants - details.participants.length;

        // Create participants HTML with delete icons instead of bullet points
        const participantsHTML =
          details.participants.length > 0
            ? `<div class="participants-section">
              <h5>Participants:</h5>
              <ul class="participants-list">
                ${details.participants
                  .map(
                    (email) =>
                      `<li><span class="participant-email">${email}</span>${
                        teacherToken
                          ? `<button class="delete-btn" data-activity="${name}" data-email="${email}">❌</button>`
                          : ""
                      }</li>`
                  )
                  .join("")}
              </ul>
            </div>`
            : `<p><em>No participants yet</em></p>`;

        activityCard.innerHTML = `
          <h4>${name}</h4>
          <p>${details.description}</p>
          <p><strong>Schedule:</strong> ${details.schedule}</p>
          <p><strong>Availability:</strong> ${spotsLeft} spots left</p>
          <div class="participants-container">
            ${participantsHTML}
          </div>
        `;

        activitiesList.appendChild(activityCard);

        // Add option to select dropdown
        const option = document.createElement("option");
        option.value = name;
        option.textContent = name;
        activitySelect.appendChild(option);
      });

      // Add event listeners to delete buttons
      if (teacherToken) {
        document.querySelectorAll(".delete-btn").forEach((button) => {
          button.addEventListener("click", handleUnregister);
        });
      }
    } catch (error) {
      activitiesList.innerHTML =
        "<p>Failed to load activities. Please try again later.</p>";
      console.error("Error fetching activities:", error);
    }
  }

  // Handle unregister functionality
  async function handleUnregister(event) {
    if (!teacherToken) {
      showMessage("Only logged-in teachers can unregister students.", "error");
      return;
    }

    const button = event.target;
    const activity = button.getAttribute("data-activity");
    const email = button.getAttribute("data-email");

    try {
      const response = await fetch(
        `/activities/${encodeURIComponent(
          activity
        )}/unregister?email=${encodeURIComponent(email)}`,
        {
          method: "DELETE",
          headers: {
            "X-Teacher-Token": teacherToken,
          },
        }
      );

      const result = await response.json();

      if (response.ok) {
        showMessage(result.message, "success");

        // Refresh activities list to show updated participants
        fetchActivities();
      } else {
        if (response.status === 401) {
          setLoggedOutState();
          fetchActivities();
        }
        showMessage(result.detail || "An error occurred", "error");
      }
    } catch (error) {
      showMessage("Failed to unregister. Please try again.", "error");
      console.error("Error unregistering:", error);
    }
  }

  // Handle form submission
  signupForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    if (!teacherToken) {
      showMessage("Only logged-in teachers can register students.", "error");
      return;
    }

    const email = document.getElementById("email").value;
    const activity = document.getElementById("activity").value;

    try {
      const response = await fetch(
        `/activities/${encodeURIComponent(
          activity
        )}/signup?email=${encodeURIComponent(email)}`,
        {
          method: "POST",
          headers: {
            "X-Teacher-Token": teacherToken,
          },
        }
      );

      const result = await response.json();

      if (response.ok) {
        showMessage(result.message, "success");
        signupForm.reset();

        // Refresh activities list to show updated participants
        fetchActivities();
      } else {
        if (response.status === 401) {
          setLoggedOutState();
          fetchActivities();
        }
        showMessage(result.detail || "An error occurred", "error");
      }
    } catch (error) {
      showMessage("Failed to sign up. Please try again.", "error");
      console.error("Error signing up:", error);
    }
  });

  userMenuBtn.addEventListener("click", () => {
    userMenu.classList.toggle("hidden");
  });

  loginMenuBtn.addEventListener("click", () => {
    userMenu.classList.add("hidden");
    openLoginModal();
  });

  logoutMenuBtn.addEventListener("click", () => {
    userMenu.classList.add("hidden");
    handleTeacherLogout();
  });

  loginCloseBtn.addEventListener("click", closeLoginModal);

  loginModal.addEventListener("click", (event) => {
    if (event.target === loginModal) {
      closeLoginModal();
    }
  });

  teacherLoginForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const username = teacherUsernameInput.value.trim();
    const password = teacherPasswordInput.value;

    try {
      const response = await fetch("/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ username, password }),
      });

      const result = await response.json();

      if (!response.ok) {
        showMessage(result.detail || "Login failed", "error");
        return;
      }

      teacherToken = result.token;
      teacherUsername = result.username;
      localStorage.setItem(TOKEN_STORAGE_KEY, teacherToken);
      localStorage.setItem(USERNAME_STORAGE_KEY, teacherUsername);
      closeLoginModal();
      updateAuthUI();
      fetchActivities();
      showMessage(`Teacher ${teacherUsername} logged in.`, "success");
    } catch (error) {
      showMessage("Unable to login right now. Please try again.", "error");
      console.error("Error logging in:", error);
    }
  });

  document.addEventListener("click", (event) => {
    if (!event.target.closest("#teacher-auth")) {
      userMenu.classList.add("hidden");
    }
  });

  // Initialize app
  ensureTeacherSession();
  fetchActivities();
});
