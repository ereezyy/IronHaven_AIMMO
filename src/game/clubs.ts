// Player clubs (guilds) — local create + realtime membership payload.

export interface Club {
  id: string;
  name: string;
  tag: string; // 2–4 chars
  leader: string;
  members: string[];
  motto: string;
  createdAt: number;
}

export interface ClubInvite {
  clubId: string;
  clubName: string;
  from: string;
}

const STORAGE_KEY = 'ironhaven-club';

export function loadLocalClub(): Club | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as Club) : null;
  } catch {
    return null;
  }
}

export function saveLocalClub(club: Club | null): void {
  try {
    if (!club) localStorage.removeItem(STORAGE_KEY);
    else localStorage.setItem(STORAGE_KEY, JSON.stringify(club));
  } catch {
    /* ignore */
  }
}

export function createClub(
  name: string,
  tag: string,
  leader: string,
  motto = ''
): Club {
  const cleanName = name.trim().slice(0, 24) || 'Nameless';
  const cleanTag = tag.trim().toUpperCase().slice(0, 4) || 'CLUB';
  return {
    id: `club_${crypto.randomUUID().slice(0, 8)}`,
    name: cleanName,
    tag: cleanTag,
    leader,
    members: [leader],
    motto: motto.trim().slice(0, 80),
    createdAt: Date.now(),
  };
}

export function joinClub(club: Club, username: string): Club {
  if (club.members.includes(username)) return club;
  return { ...club, members: [...club.members, username] };
}

export function leaveClub(club: Club, username: string): Club | null {
  const members = club.members.filter((m) => m !== username);
  if (members.length === 0) return null;
  const leader = club.leader === username ? members[0] : club.leader;
  return { ...club, members, leader };
}
