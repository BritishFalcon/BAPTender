import asyncio
import json
from typing import Dict, Optional
from uuid import UUID
from sse_starlette.sse import ServerSentEvent

class GroupBroadcaster:
    def __init__(self):
        self._groups: Dict[Optional[UUID], Dict[UUID, asyncio.Queue]] = {}

    def add_client(self, group_id: Optional[UUID], user_id: UUID) -> asyncio.Queue:
        queue: asyncio.Queue = asyncio.Queue()
        self._groups.setdefault(group_id, {})[user_id] = queue
        return queue

    def remove_client(self, group_id: Optional[UUID], user_id: UUID) -> None:
        if group_id in self._groups and user_id in self._groups[group_id]:
            del self._groups[group_id][user_id]
            if not self._groups[group_id]:
                del self._groups[group_id]

    async def broadcast(self, group_id: Optional[UUID], data: dict, event: str = "update") -> None:
        if group_id not in self._groups:
            return
        sse_event = ServerSentEvent(data=json.dumps(data, default=str), event=event)
        to_remove = []
        for uid, queue in self._groups[group_id].items():
            try:
                queue.put_nowait(sse_event)
            except asyncio.QueueFull:
                to_remove.append(uid)
        for uid in to_remove:
            self.remove_client(group_id, uid)

    async def send_to_user(self, group_id: Optional[UUID], user_id: UUID, data: dict, event: str = "update") -> None:
        if group_id in self._groups and user_id in self._groups[group_id]:
            queue = self._groups[group_id][user_id]
            try:
                queue.put_nowait(ServerSentEvent(data=json.dumps(data, default=str), event=event))
            except asyncio.QueueFull:
                self.remove_client(group_id, user_id)

    def revoke_user(self, group_id: Optional[UUID], user_id: UUID) -> None:
        if group_id in self._groups and user_id in self._groups[group_id]:
            queue = self._groups[group_id][user_id]
            queue.put_nowait(ServerSentEvent(event="revoke", data=""))
            self.remove_client(group_id, user_id)

broadcaster = GroupBroadcaster()
