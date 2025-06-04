"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useBAPTender } from "@/context/BAPTenderContext";

const formatDateForInput = (dateString: string | Date): string => {
  if (!dateString) return "";
  try {
    const date = new Date(dateString);
    // Adjust for timezone offset to get local YYYY-MM-DD
    date.setMinutes(date.getMinutes() - date.getTimezoneOffset());
    if (isNaN(date.getFullYear())) return "";
    return date.toISOString().split("T")[0];
  } catch (e) {
    return "";
  }
};

export default function AccountWidget() {
  const { state } = useBAPTender();
  const userFromContext = state.self;

  const [expanded, setExpanded] = useState(false);
  // Initialize realDob as true and don't include it in editable form state if it's always true
  const [formData, setFormData] = useState({
    displayName: "",
    email: "",
    weight: 0,
    gender: "male", // Default to a valid option
    height: 0,
    dob: "",
    // realDob is no longer a separate form field, will always be true in payload
  });
  const [feedback, setFeedback] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const resetFormData = useCallback(() => {
    setFormData({
      displayName: userFromContext.displayName || "",
      email: userFromContext.email || "",
      weight: userFromContext.weight || 0,
      gender: userFromContext.gender?.toLowerCase() || "male",
      height: userFromContext.height || 0,
      dob: userFromContext.dob ? formatDateForInput(userFromContext.dob) : "",
      // realDob is not part of this form state anymore
    });
  }, [userFromContext]);

  useEffect(() => {
    if (userFromContext.id) {
      resetFormData();
    }
  }, [userFromContext, resetFormData]);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>,
  ) => {
    const { name, value } = e.target;
    // No longer need to handle checkbox type for realDob here
    setFormData((prev) => ({
      ...prev,
      [name]:
        name === "weight" || name === "height" ? parseFloat(value) || 0 : value,
    }));
  };

  const displayLocalFeedback = (type: "success" | "error", message: string) => {
    setFeedback({ type, message });
    setTimeout(() => setFeedback(null), 4000);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setFeedback(null);

    const token = localStorage.getItem("token");
    if (!token) {
      displayLocalFeedback("error", "Not authenticated.");
      setIsSaving(false);
      return;
    }

    const payload = {
      displayName: formData.displayName,
      weight: formData.weight,
      gender: formData.gender,
      height: formData.height && formData.height > 0 ? formData.height : null,
      dob: formData.dob,
      realDob: true, // Always send true
    };
    // console.log("Payload for PATCH /api/users/me:", JSON.stringify(payload));

    try {
      const response = await fetch("/api/auth/users/me", {
        // NO TRAILING SLASH
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      // console.log("Save response status:", response.status);
      // const responseText = await response.text();
      // console.log("Save response text:", responseText);

      if (response.ok) {
        displayLocalFeedback(
          "success",
          "Account details updated! Refreshing data...",
        );
        setExpanded(false);
      } else {
        let errorDetail = `Update failed (status ${response.status}).`;
        try {
          const errorData = await response.json();
          errorDetail = errorData.detail || errorDetail;
        } catch (parseError) {
          /* console.error("Could not parse error response as JSON:", responseText); */
        }
        displayLocalFeedback("error", `Error: ${errorDetail}`);
      }
    } catch (err) {
      console.error("Error saving account details (fetch failed):", err);
      displayLocalFeedback(
        "error",
        "Failed to send update. Check network or server.",
      );
    } finally {
      setIsSaving(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("token");
    window.location.reload();
  };

  if (!userFromContext.id) {
    return (
      <div className="themed-button text-sm p-[var(--small-spacing)]">
        Loading Account...
      </div>
    );
  }

  return (
    <div className="relative font-sharetech">
      <button
        onClick={() => {
          setExpanded(!expanded);
          if (!expanded) resetFormData();
        }}
        className="themed-button text-sm p-[var(--small-spacing)]"
        style={{ minWidth: "150px" }}
      >
        {userFromContext.displayName
          ? `Hey, ${userFromContext.displayName}`
          : "Account"}
      </button>

      {expanded && (
        <div className="absolute right-0 mt-[var(--small-spacing)] min-w-[320px] w-auto max-w-sm sm:max-w-md themed-card p-[var(--base-spacing)] shadow-2xl z-50">
          <div className="flex justify-between items-center mb-[var(--base-spacing)]">
            <h2
              className="text-xl font-bold font-vt323"
              style={{ color: "var(--accent-color)" }}
            >
              Account Settings
            </h2>
            <button
              onClick={() => setExpanded(false)}
              className="text-sm hover:underline"
              style={{ color: "var(--text-color)" }}
            >
              &times; Close
            </button>
          </div>

          {feedback && (
            <div
              className={`p-[var(--small-spacing)] mb-[var(--small-spacing)] text-xs rounded ${feedback.type === "error" ? "bg-red-700 text-white" : "bg-green-700 text-white"}`}
            >
              {feedback.message}
            </div>
          )}

          <form
            onSubmit={handleSave}
            className="space-y-[var(--small-spacing)]"
          >
            {/* ... other input fields like displayName, email, weight, height ... */}
            <div>
              <label
                htmlFor="acc_displayName"
                className="block text-xs font-medium mb-[var(--tiny-spacing)]"
                style={{ color: "var(--accent-color)" }}
              >
                Display Name
              </label>
              <input
                id="acc_displayName"
                type="text"
                name="displayName"
                value={formData.displayName}
                onChange={handleChange}
                className="themed-input text-sm p-[var(--small-spacing)]"
              />
            </div>
            <div>
              <label
                htmlFor="acc_email"
                className="block text-xs font-medium mb-[var(--tiny-spacing)]"
                style={{ color: "var(--accent-color)" }}
              >
                Email (Cannot Change)
              </label>
              <input
                id="acc_email"
                type="email"
                name="email"
                value={formData.email}
                disabled
                className="themed-input text-sm p-[var(--small-spacing)] bg-opacity-50 cursor-not-allowed"
              />
            </div>
            <div className="grid grid-cols-2 gap-[var(--small-spacing)]">
              <div>
                <label
                  htmlFor="acc_weight"
                  className="block text-xs font-medium mb-[var(--tiny-spacing)]"
                  style={{ color: "var(--accent-color)" }}
                >
                  Weight (kg)
                </label>
                <input
                  id="acc_weight"
                  type="number"
                  name="weight"
                  value={formData.weight}
                  onChange={handleChange}
                  className="themed-input text-sm p-[var(--small-spacing)]"
                />
              </div>
              <div>
                <label
                  htmlFor="acc_height"
                  className="block text-xs font-medium mb-[var(--tiny-spacing)]"
                  style={{ color: "var(--accent-color)" }}
                >
                  Height (cm)
                </label>
                <input
                  id="acc_height"
                  type="number"
                  name="height"
                  value={formData.height || ""}
                  onChange={handleChange}
                  placeholder="Optional"
                  className="themed-input text-sm p-[var(--small-spacing)]"
                />
              </div>
            </div>
            <div>
              <label
                htmlFor="acc_gender"
                className="block text-xs font-medium mb-[var(--tiny-spacing)]"
                style={{ color: "var(--accent-color)" }}
              >
                Gender
              </label>
              <select
                id="acc_gender"
                name="gender"
                value={formData.gender}
                onChange={handleChange}
                className="themed-select text-sm p-[var(--small-spacing)]"
              >
                <option value="male">Male</option>
                <option value="female">Female</option>
              </select>
            </div>
            <div>
              <label
                htmlFor="acc_dob"
                className="block text-xs font-medium mb-[var(--tiny-spacing)]"
                style={{ color: "var(--accent-color)" }}
              >
                Date of Birth
              </label>
              <input
                id="acc_dob"
                type="date"
                name="dob"
                value={formData.dob}
                onChange={handleChange}
                className="themed-input text-sm p-[var(--small-spacing)]"
              />
            </div>

            {/* realDob checkbox is now REMOVED from UI */}
            {/* It will be sent as true in the payload by default */}

            <div
              className="flex justify-between items-center mt-[var(--base-spacing)] pt-[var(--small-spacing)] border-t"
              style={{ borderColor: "var(--card-border-color)" }}
            >
              <button
                type="submit"
                disabled={isSaving}
                className="themed-button text-sm py-1.5 px-3"
              >
                {isSaving ? "Saving..." : "Save Changes"}
              </button>
              <button
                type="button"
                onClick={handleLogout}
                className="themed-button-danger text-sm py-1.5 px-3"
              >
                Logout
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
