"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import { useBAPTender } from "@/context/BAPTenderContext";

type GroupType = { id: string; name: string; public: boolean };
type GroupMember = {
  id: string;
  displayName: string;
  isOwner: boolean;
  active: boolean;
};

export default function GroupsWidget() {
  const { state } = useBAPTender();
  const currentGroup: GroupType | null = state.group?.id ? state.group : null;
  const currentMembers: GroupMember[] = state.members || [];

  const [expanded, setExpanded] = useState(false);
  const [myGroups, setMyGroups] = useState<GroupType[]>([]);
  const [publicGroups, setPublicGroups] = useState<GroupType[]>([]);
  const [inviteLink, setInviteLink] = useState<string | null>(null);
  const [inviteToken, setInviteToken] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);

  const [loadingMyGroups, setLoadingMyGroups] = useState(false);
  const [loadingPublicGroups, setLoadingPublicGroups] = useState(false);
  const [loadingAction, setLoadingAction] = useState<string | null>(null);
  const [newGroupName, setNewGroupName] = useState("");
  const [newGroupPublic, setNewGroupPublic] = useState(false);

  const getToken = useCallback(
    () =>
      typeof window !== "undefined" ? localStorage.getItem("token") : null,
    [],
  );

  const displayFeedback = (type: "success" | "error", message: string) => {
    setFeedback({ type, message });
    setTimeout(() => setFeedback(null), 4000);
  };

  const fetchData = useCallback(async () => {
    const token = getToken();
    if (!token || !expanded) return;

    setLoadingMyGroups(true);
    setLoadingPublicGroups(true);
    setInviteLink(null);

    try {
      const [myGroupsRes, publicGroupsRes] = await Promise.all([
        fetch("/api/group/my/", {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch("/api/group/public/", {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        }),
      ]);

      if (myGroupsRes.ok) {
        setMyGroups(await myGroupsRes.json());
      } else {
        console.error("Failed to fetch my groups:", myGroupsRes.status);
        displayFeedback("error", "Failed to load your groups.");
      }

      if (publicGroupsRes.ok) {
        setPublicGroups(await publicGroupsRes.json());
      } else {
        console.error("Failed to fetch public groups:", publicGroupsRes.status);
        displayFeedback("error", "Failed to load public groups.");
      }
    } catch (err) {
      console.error("Error fetching group data", err);
      displayFeedback("error", "Error loading group data.");
    } finally {
      setLoadingMyGroups(false);
      setLoadingPublicGroups(false);
    }
  }, [getToken, expanded]);

  useEffect(() => {
    if (expanded) {
      fetchData();
    }
  }, [expanded, fetchData]);

  const makeGroupApiCall = async (
    url: string,
    method: string,
    actionGroupId: string | null,
    successMessage: string,
    errorMessagePrefix: string,
  ) => {
    const token = getToken();
    if (!token) {
      displayFeedback("error", "You're not logged in.");
      return false;
    }
    setLoadingAction(actionGroupId || "true_action");

    try {
      const res = await fetch(url, {
        method: method,
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        displayFeedback("success", successMessage);
        window.location.reload(); // Force context refresh
        return true;
      } else {
        const error = await res
          .json()
          .catch(() => ({ detail: "Unknown error." }));
        displayFeedback("error", `${errorMessagePrefix}: ${error.detail}`);
        return false;
      }
    } catch (err) {
      console.error(`Error during ${errorMessagePrefix}:`, err);
      displayFeedback(
        "error",
        `Client-side error during ${errorMessagePrefix}.`,
      );
      return false;
    } finally {
      setLoadingAction(null);
    }
  };

  const handleSwitchGroup = (groupId: string) => {
    makeGroupApiCall(
      `/api/group/switch/?group_id=${groupId}`,
      "POST",
      groupId,
      `Switched active group!`,
      "Failed to switch group",
    );
  };

  const handleGoSolo = () => {
    makeGroupApiCall(
      `/api/group/switch/`,
      "POST",
      "goSolo",
      "You are now flying solo!",
      "Failed to go solo",
    );
  };

  const handleJoinPublicGroup = (groupId: string) => {
    makeGroupApiCall(
      `/api/group/join/${groupId}/`,
      "POST",
      groupId,
      `Successfully joined and switched to group!`,
      "Failed to join group",
    );
  };

  const handleCreateGroup = async () => {
    const token = getToken();
    if (!token) {
      displayFeedback("error", "You're not logged in.");
      return;
    }

    if (!newGroupName.trim()) {
      displayFeedback("error", "Group name is required.");
      return;
    }

    setLoadingAction("create");

    try {
      const res = await fetch("/api/group/create", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          name: newGroupName.trim(),
          public: newGroupPublic,
        }),
      });
      if (res.ok) {
        displayFeedback("success", "Group created!");
        window.location.reload();
      } else {
        const error = await res
          .json()
          .catch(() => ({ detail: "Unknown error." }));
        if (res.status === 409) {
          displayFeedback("error", "Group name already taken!");
        } else {
          displayFeedback("error", `Failed to create group: ${error.detail}`);
        }
      }
    } catch (err) {
      console.error("Error creating group", err);
      displayFeedback("error", "Client-side error creating group.");
    } finally {
      setLoadingAction(null);
    }
  };

  const handleLeaveGroup = (groupId: string) => {
    if (
      window.confirm(
        "Are you sure you want to permanently leave this group? This action cannot be undone.",
      )
    ) {
      makeGroupApiCall(
        `/api/group/leave/${groupId}/`,
        "POST",
        groupId,
        "Successfully left group.",
        "Failed to leave group",
      );
    }
  };

  async function generateInviteLink() {
    const token = getToken();
    if (!token || !currentGroup || !currentGroup.id || currentGroup.public) {
      displayFeedback(
        "error",
        "Invite links are for current, private groups only.",
      );
      return;
    }
    setLoadingAction(`invite-${currentGroup.id}`);
    try {
      const res = await fetch(`/api/group/invite-link/${currentGroup.id}/`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setInviteToken(data.invite_token || null);
        const link = data.invite_token
          ? `${window.location.origin}/invite/${data.invite_token}`
          : data.invite_link;
        setInviteLink(link);
        displayFeedback("success", "Invite link generated!");
      } else {
        const error = await res
          .json()
          .catch(() => ({ detail: "Failed to generate invite link" }));
        displayFeedback(
          "error",
          `Error generating invite link: ${error.detail}`,
        );
      }
    } catch (err) {
      console.error("Error generating invite link", err);
      displayFeedback("error", "Client-side error generating invite link.");
    } finally {
      setLoadingAction(null);
    }
  }

  const myGroupIds = useMemo(
    () => new Set(myGroups.map((g) => g.id)),
    [myGroups],
  );

  return (
    <div className="relative font-sharetech">
      <button
        onClick={() => setExpanded((prev) => !prev)}
        className="themed-button text-sm p-[var(--small-spacing)] min-w-[80px] md:min-w-[80px] text-left leading-tight" // Adjusted padding & leading
      >
        {currentGroup?.name ? (
          <>
            <span className="font-semibold block truncate">
              {currentGroup.name}
            </span>
            <span className="text-xs italic opacity-80">
              ({currentGroup.public ? "Public" : "Private"}){" "}
              {currentMembers.length} Mbr(s)
            </span>
          </>
        ) : (
          <span>No Group</span>
        )}
      </button>

      {expanded && (
        // Adjusted width: min-content, max-w-sm for mobile, md:max-w-md for larger.
        // Increased max-h slightly, adjusted padding for less claustrophobia.
        <div
          className="absolute z-50 top-full right-0 md:left-0 md:right-auto mt-[var(--small-spacing)]
                         min-w-[300px] w-auto max-w-wd sm:max-w-md md:max-w-lg
                         max-h-[150vh] overflow-y-auto
                         themed-card p-[var(--small-spacing)] md:p-[var(--base-spacing)] shadow-2xl"
        >
          <div className="flex justify-between items-center mb-[var(--base-spacing)]">
            {" "}
            {/* Increased mb */}
            <h2
              className="text-xl font-bold font-vt323"
              style={{ color: "var(--accent-color)" }}
            >
              Group Central
            </h2>
            <button
              onClick={() => setExpanded(false)}
              className="text-sm hover:underline"
              style={{ color: "var(--text-color)" }}
            >
              Close
            </button>
          </div>

          {feedback && (
            <div
              className={`p-[var(--small-spacing)] mb-[var(--base-spacing)] text-xs rounded ${feedback.type === "error" ? "bg-red-700 text-white" : "bg-green-700 text-white"}`}
            >
              {feedback.message}
            </div>
          )}

          {/* Increased spacing between major sections using space-y-[var(--golden-spacing)] */}
          <div className="space-y-[var(--golden-spacing)]">
            {/* Current Group Info & Actions */}
            <section>
              {" "}
              {/* Changed div to section for semantics */}
              <h3
                className="font-semibold mb-[var(--small-spacing)] border-b pb-[var(--small-spacing)] text-lg"
                style={{
                  borderColor: "var(--card-border-color)",
                  color: "var(--primary-color)",
                }}
              >
                Active Session
              </h3>
              {currentGroup ? (
                <div className="text-sm space-y-[var(--base-spacing)]">
                  {" "}
                  {/* Increased space-y */}
                  <p>
                    <span className="font-medium">Group:</span>{" "}
                    {currentGroup.name} (
                    {currentGroup.public ? "Public" : "Private"})
                  </p>
                  {currentMembers.length > 0 && (
                    <div>
                      <h4 className="font-medium text-xs mb-[var(--tiny-spacing)]">
                        Members ({currentMembers.length}):
                      </h4>
                      <ul
                        className="list-none pl-[var(--small-spacing)] space-y-[var(--tiny-spacing)] max-h-24 overflow-y-auto text-xs border rounded p-[var(--small-spacing)]"
                        style={{
                          borderColor: "var(--input-border)",
                          background: "var(--input-bg)",
                        }}
                      >
                        {currentMembers.map((member) => (
                          <li
                            key={member.id}
                            className={
                              member.id === state.self.id ? "font-bold" : ""
                            }
                          >
                            {member.displayName}
                            {member.isOwner && (
                              <span className="italic text-xs opacity-70">
                                {" "}
                                (Owner)
                              </span>
                            )}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {!currentGroup.public && (
                    <div className="mt-[var(--base-spacing)]">
                      {" "}
                      {/* Increased mt */}
                      <button
                        onClick={generateInviteLink}
                        disabled={!!loadingAction}
                        className="themed-button text-xs py-[var(--tiny-spacing)] px-[var(--small-spacing)] w-full"
                      >
                        {" "}
                        {/* Adjusted padding */}
                        {loadingAction === `invite-${currentGroup.id}`
                          ? "Generating..."
                          : "Generate Invite Link"}
                      </button>
                      {inviteLink && (
                        <div className="space-y-[var(--tiny-spacing)] mt-[var(--small-spacing)]">
                          <input
                            type="text"
                            readOnly
                            value={inviteLink}
                            className="themed-input text-xs p-[var(--small-spacing)] w-full"
                            onClick={(e) =>
                              (e.target as HTMLInputElement).select()
                            }
                          />
                          {inviteToken && (
                            <input
                              type="text"
                              readOnly
                              value={inviteToken}
                              className="themed-input text-xs p-[var(--small-spacing)] w-full"
                              onClick={(e) =>
                                (e.target as HTMLInputElement).select()
                              }
                            />
                          )}
                        </div>
                      )}
                    </div>
                  )}
                  <button
                    onClick={handleGoSolo}
                    disabled={!!loadingAction}
                    className="themed-button-danger text-xs py-[var(--tiny-spacing)] px-[var(--small-spacing)] w-full mt-[var(--base-spacing)]"
                  >
                    {" "}
                    {/* Adjusted padding */}
                    {loadingAction === "goSolo"
                      ? "Processing..."
                      : "Go Solo (Deactivate Group)"}
                  </button>
                </div>
              ) : (
                <div className="text-sm space-y-[var(--small-spacing)]">
                  <p>You are currently flying solo.</p>
                </div>
              )}
            </section>

            {/* Create Group */}
            <section>
              <h4
                className="font-semibold mb-[var(--small-spacing)] border-b pb-[var(--small-spacing)] text-lg"
                style={{
                  borderColor: "var(--card-border-color)",
                  color: "var(--primary-color)",
                }}
              >
                Create Group
              </h4>
              <div className="space-y-[var(--small-spacing)] text-sm">
                <input
                  type="text"
                  placeholder="Group name"
                  value={newGroupName}
                  onChange={(e) => setNewGroupName(e.target.value)}
                  className="themed-input text-xs p-[var(--small-spacing)] w-full"
                />
                <label className="flex items-center gap-[var(--tiny-spacing)] text-xs">
                  <input
                    type="checkbox"
                    checked={newGroupPublic}
                    onChange={(e) => setNewGroupPublic(e.target.checked)}
                  />
                  Public Group
                </label>
                <button
                  onClick={handleCreateGroup}
                  disabled={!!loadingAction || !newGroupName.trim()}
                  className="themed-button text-xs py-[var(--tiny-spacing)] px-[var(--small-spacing)] w-full"
                >
                  {loadingAction === "create" ? "Creating..." : "Create"}
                </button>
              </div>
            </section>

            {/* My Groups */}
            <section>
              <h4
                className="font-semibold mb-[var(--small-spacing)] border-b pb-[var(--small-spacing)] text-lg"
                style={{
                  borderColor: "var(--card-border-color)",
                  color: "var(--primary-color)",
                }}
              >
                My Groups ({myGroups.length})
              </h4>
              {loadingMyGroups ? (
                <p className="text-xs">Loading your groups...</p>
              ) : myGroups.length > 0 ? (
                <ul className="space-y-[var(--small-spacing)] text-sm max-h-32 overflow-y-auto">
                  {" "}
                  {/* Increased space-y */}
                  {myGroups.map((group) => (
                    <li
                      key={group.id}
                      className="flex justify-between items-center p-[var(--small-spacing)] rounded hover:bg-[rgba(128,128,128,0.1)]"
                    >
                      {" "}
                      {/* Increased p */}
                      <div className="truncate pr-2">
                        {group.name}
                        <span className="italic text-xs opacity-70 ml-1">
                          ({group.public ? "Public" : "Private"})
                        </span>
                        {group.id === currentGroup?.id && (
                          <span
                            className="text-xs font-bold ml-1"
                            style={{ color: "var(--accent-color)" }}
                          >
                            (Active)
                          </span>
                        )}
                      </div>
                      <div className="flex-shrink-0 flex gap-[var(--small-spacing)]">
                        {" "}
                        {/* Increased gap */}
                        {group.id !== currentGroup?.id && (
                          <button
                            onClick={() => handleSwitchGroup(group.id)}
                            disabled={!!loadingAction}
                            className="themed-button text-xs py-[var(--tiny-spacing)] px-[var(--small-spacing)]"
                          >
                            {" "}
                            {/* Adjusted padding */}
                            {loadingAction === group.id ? "..." : "Switch"}
                          </button>
                        )}
                        <button
                          onClick={() => handleLeaveGroup(group.id)}
                          disabled={!!loadingAction}
                          className="themed-button-danger text-xs py-[var(--tiny-spacing)] px-[var(--small-spacing)]"
                        >
                          {" "}
                          {/* Adjusted padding */}
                          {loadingAction === group.id ? "..." : "Leave"}
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-xs italic">
                  You haven&apos;t joined or created any groups yet.
                </p>
              )}
            </section>

            {/* Public Groups - Now correctly filtered */}
            <section>
              <h4
                className="font-semibold mb-[var(--small-spacing)] border-b pb-[var(--small-spacing)] text-lg"
                style={{
                  borderColor: "var(--card-border-color)",
                  color: "var(--primary-color)",
                }}
              >
                Public Groups (
                {
                  publicGroups.filter(
                    (publicGroup) => !myGroupIds.has(publicGroup.id),
                  ).length
                }
                )
              </h4>
              {loadingPublicGroups ? (
                <p className="text-xs">Loading public groups...</p>
              ) : (
                (() => {
                  const availablePublicGroups = publicGroups.filter(
                    (publicGroup) => !myGroupIds.has(publicGroup.id),
                  );
                  return availablePublicGroups.length > 0 ? (
                    <ul className="space-y-[var(--small-spacing)] text-sm max-h-32 overflow-y-auto">
                      {" "}
                      {/* Increased space-y */}
                      {availablePublicGroups.map((group) => (
                        <li
                          key={group.id}
                          className="flex justify-between items-center p-[var(--small-spacing)] rounded hover:bg-[rgba(128,128,128,0.1)]"
                        >
                          {" "}
                          {/* Increased p */}
                          <span className="truncate pr-2">{group.name}</span>
                          <div className="flex-shrink-0">
                            <button
                              onClick={() => handleJoinPublicGroup(group.id)}
                              disabled={!!loadingAction}
                              className="themed-button text-xs py-[var(--tiny-spacing)] px-[var(--small-spacing)] bg-green-600 hover:bg-green-500"
                            >
                              {" "}
                              {/* Adjusted padding */}
                              {loadingAction === group.id ? "..." : "Join"}
                            </button>
                          </div>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-xs italic">
                      No new public groups to join (or you&apos;re already a member
                      of all of them).
                    </p>
                  );
                })()
              )}
            </section>
          </div>
        </div>
      )}
    </div>
  );
}
