import type { Achievement, Activity, Battle, Event, LeaderboardEntry, SportType, Team, User } from '@/types';

const BASE = '/api';

interface TokenPair {
  accessToken: string;
  refreshToken: string;
}

interface AuthResponse {
  user: User;
  accessToken: string;
  refreshToken: string;
}

interface PaginatedResponse<T> {
  items: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

let isRefreshing = false;
let refreshPromise: Promise<string | null> | null = null;

function getAccessToken(): string | null {
  return localStorage.getItem('accessToken');
}

function setTokens(tokens: TokenPair): void {
  localStorage.setItem('accessToken', tokens.accessToken);
  localStorage.setItem('refreshToken', tokens.refreshToken);
}

function clearTokens(): void {
  localStorage.removeItem('accessToken');
  localStorage.removeItem('refreshToken');
}

async function refreshAccessToken(): Promise<string | null> {
  const refreshToken = localStorage.getItem('refreshToken');
  if (!refreshToken) return null;

  try {
    const res = await fetch(`${BASE}/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken }),
    });

    if (!res.ok) {
      clearTokens();
      return null;
    }

    const data: TokenPair = await res.json();
    setTokens(data);
    return data.accessToken;
  } catch {
    clearTokens();
    return null;
  }
}

async function request<T>(url: string, options: RequestInit = {}): Promise<T> {
  const headers = new Headers(options.headers);

  const token = getAccessToken();
  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  if (!(options.body instanceof FormData) && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  let res = await fetch(`${BASE}${url}`, { ...options, headers });

  if (res.status === 401 && token) {
    if (!isRefreshing) {
      isRefreshing = true;
      refreshPromise = refreshAccessToken();
    }

    const newToken = await refreshPromise;
    isRefreshing = false;
    refreshPromise = null;

    if (newToken) {
      headers.set('Authorization', `Bearer ${newToken}`);
      res = await fetch(`${BASE}${url}`, { ...options, headers });
    } else {
      clearTokens();
      window.dispatchEvent(new CustomEvent('auth:logout'));
      throw new Error('Session expired');
    }
  }

  if (!res.ok) {
    const body = await res.json().catch(() => ({ message: res.statusText }));
    throw new Error(body.message || `Request failed: ${res.status}`);
  }

  if (res.status === 204) return undefined as T;
  return res.json();
}

function toQuery(params?: Record<string, unknown>): string {
  if (!params) return '';
  const entries = Object.entries(params).filter(([, v]) => v != null);
  if (entries.length === 0) return '';
  const qs = new URLSearchParams(
    entries.map(([k, v]) => [k, String(v)])
  ).toString();
  return `?${qs}`;
}

export const api = {
  auth: {
    register(data: { username: string; email: string; password: string; referralCode?: string }) {
      return request<AuthResponse>('/auth/register', {
        method: 'POST',
        body: JSON.stringify(data),
      });
    },
    login(data: { login: string; password: string }) {
      return request<AuthResponse>('/auth/login', {
        method: 'POST',
        body: JSON.stringify(data),
      });
    },
    refresh() {
      const refreshToken = localStorage.getItem('refreshToken');
      return request<TokenPair>('/auth/refresh', {
        method: 'POST',
        body: JSON.stringify({ refreshToken }),
      });
    },
    logout() {
      const result = request<void>('/auth/logout', { method: 'POST' });
      clearTokens();
      return result;
    },
    me() {
      return request<User>('/auth/me');
    },
  },

  events: {
    list(params?: { sport?: SportType; type?: string; status?: string; page?: number; limit?: number }) {
      return request<PaginatedResponse<Event>>(`/events${toQuery(params)}`);
    },
    get(id: string) {
      return request<Event>(`/events/${id}`);
    },
    create(data: Partial<Event>) {
      return request<Event>('/events', {
        method: 'POST',
        body: JSON.stringify(data),
      });
    },
    update(id: string, data: Partial<Event>) {
      return request<Event>(`/events/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data),
      });
    },
    uploadImage(eventId: string, file: File) {
      const form = new FormData();
      form.append('image', file);
      return request<{ imageUrl: string }>(`/events/${eventId}/image`, {
        method: 'POST',
        body: form,
      });
    },
    uploadDiplomaBg(eventId: string, file: File) {
      const form = new FormData();
      form.append('bg', file);
      return request<{ diplomaBgUrl: string }>(`/events/${eventId}/diploma-bg`, {
        method: 'POST',
        body: form,
      });
    },
    delete(id: string) {
      return request<void>(`/events/${id}`, { method: 'DELETE' });
    },
    join(id: string) {
      return request<void>(`/events/${id}/join`, { method: 'POST' });
    },
    leave(id: string) {
      return request<void>(`/events/${id}/leave`, { method: 'POST' });
    },
    leaderboard(id: string) {
      return request<LeaderboardEntry[]>(`/events/${id}/leaderboard`);
    },
    downloadDiploma(eventId: string) {
      const token = localStorage.getItem('accessToken');
      window.open(`/api/events/${eventId}/diploma?token=${token}`, '_blank');
    },
  },

  activities: {
    create(data: Partial<Activity>) {
      return request<Activity>('/activities', {
        method: 'POST',
        body: JSON.stringify(data),
      });
    },
    list(params?: { sport?: SportType; dateFrom?: string; dateTo?: string; page?: number; limit?: number }) {
      return request<PaginatedResponse<Activity>>(`/activities${toQuery(params)}`);
    },
    get(id: string) {
      return request<Activity>(`/activities/${id}`);
    },
    delete(id: string) {
      return request<void>(`/activities/${id}`, { method: 'DELETE' });
    },
    uploadGpx(file: File) {
      const form = new FormData();
      form.append('file', file);
      return request<Activity>('/activities/gpx', {
        method: 'POST',
        body: form,
      });
    },
    uploadScreenshot(file: File) {
      const form = new FormData();
      form.append('screenshot', file);
      return request<{ imageUrl: string; message: string }>('/activities/screenshot', {
        method: 'POST',
        body: form,
      });
    },
  },

  photos: {
    upload(activityId: string, files: File[]) {
      const form = new FormData();
      files.forEach((f) => form.append('photos', f));
      return request<{ id: string; activityId: string; imageUrl: string; createdAt: string }[]>(
        `/activities/${activityId}/photos`,
        { method: 'POST', body: form }
      );
    },
    list(activityId: string) {
      return request<{ id: string; activityId: string; imageUrl: string; createdAt: string }[]>(
        `/activities/${activityId}/photos`
      );
    },
    delete(photoId: string) {
      return request<void>(`/photos/${photoId}`, { method: 'DELETE' });
    },
    like(activityId: string) {
      return request<{ liked: boolean; count: number }>(`/activities/${activityId}/like`, {
        method: 'POST',
      });
    },
    getLikes(activityId: string) {
      return request<{ liked: boolean; count: number }>(`/activities/${activityId}/likes`);
    },
  },

  teams: {
    create(data: { name: string; description?: string; isPublic?: boolean }) {
      return request<Team>('/teams', {
        method: 'POST',
        body: JSON.stringify(data),
      });
    },
    list(params?: { search?: string; page?: number }) {
      return request<PaginatedResponse<Team>>(`/teams${toQuery(params)}`);
    },
    get(id: string) {
      return request<Team>(`/teams/${id}`);
    },
    update(id: string, data: Partial<Team>) {
      return request<Team>(`/teams/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(data),
      });
    },
    join(id: string) {
      return request<void>(`/teams/${id}/join`, { method: 'POST' });
    },
    joinByCode(code: string) {
      return request<void>(`/teams/join/${code}`, { method: 'POST' });
    },
    leave(id: string) {
      return request<void>(`/teams/${id}/leave`, { method: 'POST' });
    },
    kickMember(teamId: string, userId: string) {
      return request<void>(`/teams/${teamId}/members/${userId}`, { method: 'DELETE' });
    },
    leaderboard() {
      return request<Team[]>('/teams/leaderboard');
    },
    feed(teamId: string, params?: { page?: number; limit?: number }) {
      return request<{ id: string; sport: string; title?: string; distance: number; duration: number; startedAt: string; createdAt: string; user: { id: string; username: string; avatarUrl?: string; level: number } }[]>(
        `/teams/${teamId}/feed${toQuery(params)}`
      );
    },
    stats(teamId: string) {
      return request<{ weekDistance: number; monthDistance: number; weekActivities: number; activeMembers: number }>(
        `/teams/${teamId}/stats`
      );
    },
  },

  battles: {
    create(data: { opponentId: string; sport: SportType; targetDistance: number; duration: number }) {
      return request<Battle>('/battles', {
        method: 'POST',
        body: JSON.stringify(data),
      });
    },
    list(params?: { status?: string }) {
      return request<Battle[]>(`/battles${toQuery(params)}`);
    },
    get(id: string) {
      return request<Battle>(`/battles/${id}`);
    },
    accept(id: string) {
      return request<Battle>(`/battles/${id}/accept`, { method: 'POST' });
    },
    decline(id: string) {
      return request<Battle>(`/battles/${id}/decline`, { method: 'POST' });
    },
  },

  leaderboard: {
    users(params?: { period?: string; page?: number }) {
      return request<PaginatedResponse<LeaderboardEntry>>(`/leaderboard/users${toQuery(params)}`);
    },
    teams() {
      return request<Team[]>('/leaderboard/teams');
    },
    bySport(sport: string) {
      return request<LeaderboardEntry[]>(`/leaderboard/sport/${sport}`);
    },
  },

  merch: {
    createOrder(data: { eventId: string; package: string; address?: string; phone?: string }) {
      return request('/merch/order', { method: 'POST', body: JSON.stringify(data) });
    },
    myOrders() {
      return request('/merch/orders');
    },
  },

  packages: {
    list() {
      return request<{ id: string; name: string; price: number; features: string[]; icon: string; imageUrl?: string; description?: string; sortOrder: number; isActive: boolean }[]>('/packages');
    },
    adminList() {
      return request<{ id: string; name: string; price: number; features: string[]; icon: string; imageUrl?: string; description?: string; sortOrder: number; isActive: boolean; createdAt: string; updatedAt: string }[]>('/packages/admin');
    },
    create(data: { name: string; price?: number; features?: string[]; icon?: string; sortOrder?: number; isActive?: boolean; description?: string }) {
      return request('/packages/admin', { method: 'POST', body: JSON.stringify(data) });
    },
    update(id: string, data: { name?: string; price?: number; features?: string[]; icon?: string; sortOrder?: number; isActive?: boolean; description?: string }) {
      return request(`/packages/admin/${id}`, { method: 'PUT', body: JSON.stringify(data) });
    },
    delete(id: string) {
      return request<void>(`/packages/admin/${id}`, { method: 'DELETE' });
    },
    uploadImage(id: string, file: File) {
      const form = new FormData();
      form.append('image', file);
      return request<{ imageUrl: string }>(`/packages/admin/${id}/image`, {
        method: 'POST',
        body: form,
      });
    },
  },

  social: {
    follow(userId: string) {
      return request<{ isFollowing: boolean }>(`/users/${userId}/follow`, { method: 'POST' });
    },
    followers(userId: string) {
      return request<{ id: string; username: string; avatarUrl?: string; city?: string; level: number; totalDistance: number }[]>(
        `/users/${userId}/followers`
      );
    },
    following(userId: string) {
      return request<{ id: string; username: string; avatarUrl?: string; city?: string; level: number; totalDistance: number }[]>(
        `/users/${userId}/following`
      );
    },
    followStatus(userId: string) {
      return request<{ isFollowing: boolean; followersCount: number; followingCount: number }>(
        `/users/${userId}/follow-status`
      );
    },
    publicFeed(params?: { page?: number; limit?: number }) {
      return request<PaginatedResponse<Activity & { user: { id: string; username: string; avatarUrl?: string; level: number }; photos: { id: string; imageUrl: string }[]; _count: { likes: number }; isLiked: boolean }>>(
        `/feed/public${toQuery(params)}`
      );
    },
    feed(params?: { page?: number; limit?: number }) {
      return request<{ items: (Activity & { user: { id: string; username: string; avatarUrl?: string; level: number }; _count: { likes: number } })[]; pagination: { page: number; limit: number; total: number; totalPages: number } }>(
        `/feed${toQuery(params)}`
      );
    },
    searchUsers(params: { q?: string; city?: string }) {
      return request<{ id: string; username: string; avatarUrl?: string; city?: string; level: number; totalDistance: number; _count: { followers: number; following: number } }[]>(
        `/users/search${toQuery(params)}`
      );
    },
    createPlanned(data: { sport: string; city: string; date: string; time: string; description?: string; maxPeople?: number }) {
      return request<unknown>('/planned', { method: 'POST', body: JSON.stringify(data) });
    },
    listPlanned(params?: { city?: string; sport?: string; date?: string }) {
      return request<{ id: string; userId: string; sport: SportType; city: string; date: string; time: string; description?: string; maxPeople: number; createdAt: string; user: { id: string; username: string; avatarUrl?: string; level: number } }[]>(
        `/planned${toQuery(params)}`
      );
    },
    deletePlanned(id: string) {
      return request<void>(`/planned/${id}`, { method: 'DELETE' });
    },
  },

  admin: {
    stats() {
      return request<{
        totalUsers: number;
        totalEvents: number;
        totalActivities: number;
        totalTeams: number;
        newUsersThisWeek: number;
        newUsersThisMonth: number;
        totalDistance: number;
        topUsers: { id: string; username: string; avatarUrl?: string; totalDistance: number; level: number; city?: string }[];
        recentActivities: { id: string; sport: string; title?: string; distance: number; duration: number; createdAt: string; user: { id: string; username: string; avatarUrl?: string } }[];
        eventParticipation: { id: string; title: string; participantCount: number }[];
      }>('/admin/stats');
    },
    users(params?: { search?: string }) {
      return request<{
        id: string;
        username: string;
        email: string;
        role: string;
        city?: string;
        level: number;
        xp: number;
        totalDistance: number;
        totalActivities: number;
        currentStreak: number;
        referralCode: string;
        referredById?: string;
        createdAt: string;
        _count: { referrals: number };
      }[]>(`/admin/users${toQuery(params)}`);
    },
    setRole(userId: string, role: string) {
      return request<{ id: string; username: string; email: string; role: string }>(`/admin/users/${userId}/role`, {
        method: 'PUT',
        body: JSON.stringify({ role }),
      });
    },
    achievements() {
      return request<{ id: string; code: string; name: string; description: string; icon: string; iconUrl?: string | null; xpReward: number; category: string; threshold: number | null; userCount: number }[]>('/admin/achievements');
    },
    createAchievement(data: { name: string; description: string; icon: string; xpReward: number; category: string; threshold: number | null }) {
      return request<Achievement>('/admin/achievements', {
        method: 'POST',
        body: JSON.stringify(data),
      });
    },
    updateAchievement(id: string, data: { name?: string; description?: string; icon?: string; xpReward?: number; category?: string; threshold?: number | null }) {
      return request<Achievement>(`/admin/achievements/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data),
      });
    },
    deleteAchievement(id: string) {
      return request<void>(`/admin/achievements/${id}`, { method: 'DELETE' });
    },
    uploadAchievementIcon(id: string, file: File) {
      const form = new FormData();
      form.append('icon', file);
      return request<{ iconUrl: string }>(`/admin/achievements/${id}/icon`, {
        method: 'POST',
        body: form,
      });
    },
  },

  profile: {
    get(id: string) {
      return request<User>(`/profile/${id}`);
    },
    update(data: Partial<User>) {
      return request<User>('/profile', {
        method: 'PUT',
        body: JSON.stringify(data),
      });
    },
    activities(id: string, params?: { page?: number; limit?: number }) {
      return request<PaginatedResponse<Activity>>(`/profile/${id}/activities${toQuery(params)}`);
    },
    achievements(id: string) {
      return request<{
        achievements: { achievement: Achievement; unlockedAt: string | null }[];
        progress: { totalDistance: number; currentStreak: number; bestStreak: number; finishedEvents: number };
      }>(
        `/profile/${id}/achievements`
      );
    },
    referrals() {
      return request<{
        referralCode: string;
        referralCount: number;
        referrals: { id: string; username: string; avatarUrl?: string; totalDistance: number; level: number; createdAt: string }[];
      }>('/profile/referrals');
    },
    statsSummary() {
      return request<{ totalDistance: number; totalTime: number; totalActivities: number; weeklyDistance: number; monthlyDistance: number; bySport: { sport: string; totalDistance: number; activityCount: number }[] }>(
        '/profile/stats/summary'
      );
    },
    uploadAvatar(file: File) {
      const form = new FormData();
      form.append('avatar', file);
      return request<{ avatarUrl: string }>('/profile/avatar', {
        method: 'POST',
        body: form,
      });
    },
  },

  settings: {
    getPublic() {
      return request<Record<string, string>>('/settings/public');
    },
    update(key: string, value: string) {
      return request<{ key: string; value: string }>(`/settings/${key}`, {
        method: 'PUT',
        body: JSON.stringify({ value }),
      });
    },
    uploadHeroBg(file: File) {
      const form = new FormData();
      form.append('image', file);
      return request<{ url: string }>('/settings/hero-bg', {
        method: 'POST',
        body: form,
      });
    },
  },
};
