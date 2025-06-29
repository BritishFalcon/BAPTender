"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useBAPTender } from "@/context/BAPTenderContext";
import useWindowWidth from "@/hooks/useWindowWidth";
import { usePopup } from "@/context/PopupContext";
import {
  MIN_WEIGHT,
  MAX_WEIGHT,
  MIN_HEIGHT,
  MAX_HEIGHT,
  MIN_AGE,
  MAX_AGE,
} from "@/config";

const UserIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={1.5}
    className="w-5 h-5"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0z"
    />
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M4.5 20.25a8.25 8.25 0 0115 0"
    />
  </svg>
);

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

const calculateAge = (dobString: string): number => {
  if (!dobString) return 0;
  const dob = new Date(dobString);
  const today = new Date();
  let age = today.getFullYear() - dob.getFullYear();
  const m = today.getMonth() - dob.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < dob.getDate())) {
    age--;
  }
  return age;
};

export default function AccountWidget() {
  const { state } = useBAPTender();
  const userFromContext = state.self;
  const windowWidth = useWindowWidth();
  // Switch to compact icon view a bit earlier so the widgets fit beside the logo
  const showIconOnly = windowWidth < 640;
  // Dynamic compact size so the button can shrink but stay square
  const compactSize = Math.max(40, Math.min(60, windowWidth / 8));
  const { activePopup, setActivePopup } = usePopup();

  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    if (activePopup !== "account") {
      setExpanded(false);
    }
  }, [activePopup]);
  // Initialize realDob as true and don't include it in editable form state if it's always true
  const [formData, setFormData] = useState({
    displayName: "",
    email: "",
    weight: "",
    gender: "male", // Default to a valid option
    height: "",
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
      weight:
        userFromContext.weight && userFromContext.weight > 0
          ? String(userFromContext.weight)
          : "",
      gender: userFromContext.gender?.toLowerCase() || "male",
      height:
        userFromContext.height && userFromContext.height > 0
          ? String(userFromContext.height)
          : "",
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
        name === "weight" || name === "height"
          ? value === ""
            ? ""
            : parseFloat(value)
          : value,
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

    if (formData.weight === "" || isNaN(parseFloat(formData.weight as any))) {
      displayLocalFeedback("error", "Please enter a valid weight.");
      setIsSaving(false);
      return;
    }

    const weightNum = parseFloat(formData.weight as any);
    if (weightNum < MIN_WEIGHT || weightNum > MAX_WEIGHT) {
      displayLocalFeedback(
        "error",
        `Weight must be between ${MIN_WEIGHT} and ${MAX_WEIGHT} kg.`,
      );
      setIsSaving(false);
      return;
    }

    const age = calculateAge(formData.dob);
    if (age < MIN_AGE || age > MAX_AGE) {
      displayLocalFeedback(
        "error",
        `Age must be between ${MIN_AGE} and ${MAX_AGE} years.`,
      );
      setIsSaving(false);
      return;
    }

    if (formData.height !== "") {
      const heightNum = parseFloat(formData.height as any);
      if (isNaN(heightNum)) {
        displayLocalFeedback("error", "Please enter a valid height.");
        setIsSaving(false);
        return;
      }
      if (heightNum < MIN_HEIGHT || heightNum > MAX_HEIGHT) {
        displayLocalFeedback(
          "error",
          `Height must be between ${MIN_HEIGHT} and ${MAX_HEIGHT} cm.`,
        );
        setIsSaving(false);
        return;
      }
    }

    const payload = {
      displayName: formData.displayName,
      weight: parseFloat(formData.weight as any),
      gender: formData.gender,
      height:
        formData.height === "" ? null : parseFloat(formData.height as any),
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
        setActivePopup(null);
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
          const next = !expanded;
          setExpanded(next);
          setActivePopup(next ? "account" : null);
          if (next) resetFormData();
        }}
        className={`themed-button text-sm flex items-center justify-center ${
          showIconOnly ? '' : 'p-[var(--small-spacing)]'
        }`}
        style={
          showIconOnly
            ? {
                width: compactSize,
                height: compactSize,
                minWidth: compactSize,
                minHeight: compactSize,
                padding: 'var(--tiny-spacing)',
              }
            : {
                minWidth: '150px',
                height: compactSize,
                minHeight: compactSize,
                padding: 'var(--small-spacing)',
              }
        }
        title={
          showIconOnly
            ? userFromContext.displayName
              ? `Hey, ${userFromContext.displayName}`
              : "Account"
            : undefined
        }
      >
        {showIconOnly ? (
          <UserIcon />
        ) : userFromContext.displayName ? (
          `Hey, ${userFromContext.displayName}`
        ) : (
          "Account"
        )}
      </button>

      {expanded && (
        <div
          className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[90vw] max-w-sm sm:absolute sm:top-full sm:left-auto sm:right-0 sm:translate-x-0 sm:translate-y-0 sm:mt-[var(--small-spacing)] sm:min-w-[320px] sm:w-auto sm:max-w-md themed-card p-[var(--base-spacing)] shadow-2xl z-50 overflow-y-auto"
          style={{ maxHeight: 'calc(100vh - 2rem)' }}
        >
          <div className="flex justify-between items-center mb-[var(--base-spacing)]">
            <h2
              className="text-xl font-bold font-vt323"
              style={{ color: "var(--accent-color)" }}
            >
              Account Settings
            </h2>
            <button
              onClick={() => {
                setExpanded(false);
                setActivePopup(null);
              }}
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
                  min={MIN_WEIGHT}
                  max={MAX_WEIGHT}
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
                  value={formData.height}
                  min={MIN_HEIGHT}
                  max={MAX_HEIGHT}
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
