"use client";

import React, { useState, useEffect } from "react";
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
  const currentGroup: GroupType = state.group;
  const currentMembers: GroupMember[] = state.members;

  const [expanded, setExpanded] = useState(false);
  const [myGroups, setMyGroups] = useState<GroupType[]>([]);
  const [publicGroups, setPublicGroups] = useState<GroupType[]>([]);
  const [inviteLink, setInviteLink] = useState<string | null>(null);

  const [loadingMyGroups, setLoadingMyGroups] = useState(false);
  const [loadingPublicGroups, setLoadingPublicGroups] = useState(false);

  useEffect(() => {
    if (!expanded) return;
    fetchMyGroups();
    fetchPublicGroups();
  }, [expanded]);

  async function fetchMyGroups() {
    setLoadingMyGroups(true);
    try {
      const res = await fetch("/api/groups/my");
      if (res.ok) setMyGroups(await res.json());
    } catch (err) {
      console.error("Error fetching my groups", err);
    } finally {
      setLoadingMyGroups(false);
    }
  }

  async function fetchPublicGroups() {
    setLoadingPublicGroups(true);
    try {
      const res = await fetch("/api/groups/public");
      if (res.ok) setPublicGroups(await res.json());
    } catch (err) {
      console.error("Error fetching public groups", err);
    } finally {
      setLoadingPublicGroups(false);
    }
  }

  async function generateInviteLink() {
    if (!currentGroup || currentGroup.public) {
      alert("Only private groups can generate invite links.");
      return;
    }
    try {
      const res = await fetch(`/api/groups/invite-link/${currentGroup.id}`);
      if (res.ok) {
        const data = await res.json();
        setInviteLink(data.invite_link);
      } else {
        const error = await res.json();
        alert("Error: " + error.detail);
      }
    } catch (err) {
      console.error("Error generating invite link", err);
    }
  }

  return (
    <div className="relative">
      {/* Header Widget */}
      <button
        onClick={() => setExpanded((prev) => !prev)}
        className="bg-gray-800 text-white px-4 py-2 rounded hover:bg-gray-700"
      >
        {currentGroup && currentGroup.id ? (
          <>
            <span className="font-semibold">{currentGroup.name}</span>{" "}
            <span className="text-sm italic">
              ({currentGroup.public ? "Public" : "Private"})
            </span>
          </>
        ) : (
          <span>No Group</span>
        )}
      </button>

      {/* Expanded Content */}
      {expanded && (
        <div className="absolute z-50 top-full mt-2 w-[450px] max-h-[75vh] overflow-y-auto bg-white shadow-lg border rounded text-black p-4">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-bold">Group Management</h2>
            <button
              onClick={() => setExpanded(false)}
              className="text-sm text-gray-500 hover:text-black"
            >
              Close
            </button>
          </div>

          <div className="mb-6">
            <h3 className="font-semibold mb-1">Current Group</h3>
            {currentGroup && currentGroup.id ? (
              <div>
                <p>
                  <span className="font-medium">Name:</span> {currentGroup.name}
                </p>
                <p>
                  <span className="font-medium">Type:</span>{" "}
                  {currentGroup.public ? "Public" : "Private"}
                </p>
                <div className="mt-2">
                  <h4 className="font-semibold">Members:</h4>
                  <ul className="list-disc pl-5">
                    {currentMembers.map((member) => (
                      <li key={member.id}>
                        {member.displayName}{" "}
                        {member.isOwner && (
                          <span className="italic text-sm">(Owner)</span>
                        )}
                      </li>
                    ))}
                  </ul>
                </div>
                {!currentGroup.public && (
                  <div className="mt-3">
                    <button
                      onClick={generateInviteLink}
                      className="bg-blue-500 text-white px-3 py-1 rounded hover:bg-blue-600"
                    >
                      Generate Invite Link
                    </button>
                    {inviteLink && (
                      <p className="mt-2 break-words text-sm text-gray-700">
                        <span className="font-medium">Invite:</span>{" "}
                        {inviteLink}
                      </p>
                    )}
                  </div>
                )}
              </div>
            ) : (
              <p>You are not currently in a group.</p>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <h4 className="font-semibold mb-1">My Groups</h4>
              {loadingMyGroups ? (
                <p>Loading...</p>
              ) : myGroups.length > 0 ? (
                <ul className="list-disc pl-5 text-sm">
                  {myGroups.map((group) => (
                    <li key={group.id}>
                      {group.name}{" "}
                      <span className="italic">
                        ({group.public ? "Public" : "Private"})
                      </span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm">No groups found.</p>
              )}
            </div>
            <div>
              <h4 className="font-semibold mb-1">Public Groups</h4>
              {loadingPublicGroups ? (
                <p>Loading...</p>
              ) : publicGroups.length > 0 ? (
                <ul className="list-disc pl-5 text-sm">
                  {publicGroups.map((group) => (
                    <li key={group.id}>{group.name}</li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm">No public groups found.</p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
