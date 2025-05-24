"use client";

import React, { useState, useEffect } from "react";
import { useBAPTender } from "@/context/BAPTenderContext";

type GroupType = { id: string; name: string; public: boolean };
type GroupMember = {
  id: string;
  displayName: string;
  isOwner: boolean;
  active: boolean; // This 'active' seems to come from UserGroup.active
};

export default function GroupsWidget() {
  const { state } = useBAPTender();
  const currentGroup: GroupType | undefined = state.group?.id ? state.group : undefined; // Handle potentially empty group
  const currentMembers: GroupMember[] = state.members || [];

  const [expanded, setExpanded] = useState(false);
  const [myGroups, setMyGroups] = useState<GroupType[]>([]);
  const [publicGroups, setPublicGroups] = useState<GroupType[]>([]);
  const [inviteLink, setInviteLink] = useState<string | null>(null);

  const [loadingMyGroups, setLoadingMyGroups] = useState(false);
  const [loadingPublicGroups, setLoadingPublicGroups] = useState(false);

  // Function to get JWT token
  const getToken = () => typeof window !== "undefined" ? localStorage.getItem("token") : null;


  useEffect(() => {
    if (!expanded) return;
    const token = getToken();
    if (token) {
      fetchMyGroups(token);
      fetchPublicGroups(token);
    }
  }, [expanded]);

  async function fetchMyGroups(token: string) {
    setLoadingMyGroups(true);
    try {
      // CORRECTED URL
      const res = await fetch("/api/group/my", {
        headers: { "Authorization": `Bearer ${token}` }
      });
      if (res.ok) setMyGroups(await res.json());
      else console.error("Failed to fetch my groups:", res.status, await res.text());
    } catch (err) {
      console.error("Error fetching my groups", err);
    } finally {
      setLoadingMyGroups(false);
    }
  }

  async function fetchPublicGroups(token: string) {
    setLoadingPublicGroups(true);
    try {
      // CORRECTED URL
      const res = await fetch("/api/group/public", {
        headers: { "Authorization": `Bearer ${token}` }
      });
      if (res.ok) setPublicGroups(await res.json());
       else console.error("Failed to fetch public groups:", res.status, await res.text());
    } catch (err) {
      console.error("Error fetching public groups", err);
    } finally {
      setLoadingPublicGroups(false);
    }
  }

  async function generateInviteLink() {
    const token = getToken();
    if (!token || !currentGroup || !currentGroup.id || currentGroup.public) {
      alert("Only private groups can generate invite links, and you must be in one.");
      return;
    }
    try {
      // CORRECTED URL
      const res = await fetch(`/api/group/invite-link/${currentGroup.id}`, {
        headers: { "Authorization": `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setInviteLink(data.invite_link);
      } else {
        const error = await res.json();
        alert("Error generating invite link: " + error.detail);
      }
    } catch (err) {
      console.error("Error generating invite link", err);
      alert("Client-side error generating invite link.");
    }
  }

  return (
    <div className="relative font-sharetech">
      <button
        onClick={() => setExpanded((prev) => !prev)}
        className="themed-button text-sm p-2"
      >
        {currentGroup && currentGroup.name ? (
          <>
            <span className="font-semibold">{currentGroup.name}</span>{" "}
            <span className="text-xs italic">
              ({currentGroup.public ? "Public" : "Private"})
            </span>
          </>
        ) : (
          <span>No Group</span>
        )}
      </button>

      {expanded && (
        <div className="absolute z-50 top-full mt-2 w-80 md:w-[450px] max-h-[75vh] overflow-y-auto themed-card p-var(--base-spacing)">
          <div className="flex justify-between items-center mb-var(--small-spacing)">
            <h2 className="text-lg font-bold font-vt323" style={{color: 'var(--accent-color)'}}>Group Management</h2>
            <button
              onClick={() => setExpanded(false)}
              className="text-xs hover:underline" style={{color: 'var(--text-color)'}}
            >
              Close
            </button>
          </div>

          <div className="mb-var(--base-spacing)">
            <h3 className="font-semibold mb-1" style={{color: 'var(--primary-color)'}}>Current Group</h3>
            {currentGroup && currentGroup.name ? (
              <div className="text-sm">
                <p><span className="font-medium">Name:</span> {currentGroup.name}</p>
                <p><span className="font-medium">Type:</span> {currentGroup.public ? "Public" : "Private"}</p>
                <div className="mt-2">
                  <h4 className="font-semibold">Members:</h4>
                  <ul className="list-disc list-inside pl-2 space-y-0.5">
                    {currentMembers.map((member) => (
                      <li key={member.id}>
                        {member.displayName}{" "}
                        {member.isOwner && (<span className="italic text-xs">(Owner)</span>)}
                        {!member.active && (<span className="italic text-xs text-red-500"> (Inactive)</span>)}
                      </li>
                    ))}
                  </ul>
                </div>
                {!currentGroup.public && (
                  <div className="mt-3">
                    <button
                      onClick={generateInviteLink}
                      className="themed-button text-xs p-2"
                    >
                      Generate Invite Link
                    </button>
                    {inviteLink && (
                      <p className="mt-2 break-words text-xs" style={{color: 'var(--text-color)'}}>
                        <span className="font-medium">Invite:</span>{" "}
                        <input type="text" readOnly value={inviteLink} className="themed-input text-xs p-1 w-full mt-1" onClick={(e) => (e.target as HTMLInputElement).select()} />
                      </p>
                    )}
                  </div>
                )}
              </div>
            ) : (
              <p className="text-sm">You are not currently in a group.</p>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-var(--base-spacing)">
            <div>
              <h4 className="font-semibold mb-1" style={{color: 'var(--primary-color)'}}>My Groups</h4>
              {loadingMyGroups ? (<p className="text-xs">Loading...</p>) :
               myGroups.length > 0 ? (
                <ul className="list-disc list-inside pl-2 space-y-0.5 text-xs">
                  {myGroups.map((group) => (
                    <li key={group.id}>
                      {group.name}{" "}
                      <span className="italic">({group.public ? "Public" : "Private"})</span>
                      {/* TODO: Add button to switch to this group */}
                    </li>
                  ))}
                </ul>
              ) : (<p className="text-xs">No other groups found.</p>)}
            </div>
            <div>
              <h4 className="font-semibold mb-1" style={{color: 'var(--primary-color)'}}>Public Groups</h4>
              {loadingPublicGroups ? (<p className="text-xs">Loading...</p>) :
              publicGroups.length > 0 ? (
                <ul className="list-disc list-inside pl-2 space-y-0.5 text-xs">
                  {publicGroups.map((group) => (
                    <li key={group.id}>
                      {group.name}
                      {/* TODO: Add button to join this group */}
                    </li>
                  ))}
                </ul>
              ) : (<p className="text-xs">No public groups found.</p>)}
            </div>
          </div>
           {/* TODO: Add forms to create new group or join public group by ID */}
        </div>
      )}
    </div>
  );
}