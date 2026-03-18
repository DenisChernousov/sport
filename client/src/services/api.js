const BASE = '/api';
let isRefreshing = false;
let refreshPromise = null;
function getAccessToken() {
    return localStorage.getItem('accessToken');
}
function setTokens(tokens) {
    localStorage.setItem('accessToken', tokens.accessToken);
    localStorage.setItem('refreshToken', tokens.refreshToken);
}
function clearTokens() {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
}
async function refreshAccessToken() {
    const refreshToken = localStorage.getItem('refreshToken');
    if (!refreshToken)
        return null;
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
        const data = await res.json();
        setTokens(data);
        return data.accessToken;
    }
    catch {
        clearTokens();
        return null;
    }
}
async function request(url, options = {}) {
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
        }
        else {
            clearTokens();
            window.dispatchEvent(new CustomEvent('auth:logout'));
            throw new Error('Session expired');
        }
    }
    if (!res.ok) {
        const body = await res.json().catch(() => ({ message: res.statusText }));
        throw new Error(body.message || `Request failed: ${res.status}`);
    }
    if (res.status === 204)
        return undefined;
    return res.json();
}
function toQuery(params) {
    if (!params)
        return '';
    const entries = Object.entries(params).filter(([, v]) => v != null);
    if (entries.length === 0)
        return '';
    const qs = new URLSearchParams(entries.map(([k, v]) => [k, String(v)])).toString();
    return `?${qs}`;
}
export const api = {
    auth: {
        register(data) {
            return request('/auth/register', {
                method: 'POST',
                body: JSON.stringify(data),
            });
        },
        login(data) {
            return request('/auth/login', {
                method: 'POST',
                body: JSON.stringify(data),
            });
        },
        refresh() {
            const refreshToken = localStorage.getItem('refreshToken');
            return request('/auth/refresh', {
                method: 'POST',
                body: JSON.stringify({ refreshToken }),
            });
        },
        logout() {
            const result = request('/auth/logout', { method: 'POST' });
            clearTokens();
            return result;
        },
        me() {
            return request('/auth/me');
        },
    },
    events: {
        list(params) {
            return request(`/events${toQuery(params)}`);
        },
        get(id) {
            return request(`/events/${id}`);
        },
        create(data) {
            return request('/events', {
                method: 'POST',
                body: JSON.stringify(data),
            });
        },
        update(id, data) {
            return request(`/events/${id}`, {
                method: 'PUT',
                body: JSON.stringify(data),
            });
        },
        uploadDiplomaBg(eventId, file) {
            const form = new FormData();
            form.append('bg', file);
            return request(`/events/${eventId}/diploma-bg`, {
                method: 'POST',
                body: form,
            });
        },
        delete(id) {
            return request(`/events/${id}`, { method: 'DELETE' });
        },
        join(id) {
            return request(`/events/${id}/join`, { method: 'POST' });
        },
        leave(id) {
            return request(`/events/${id}/leave`, { method: 'POST' });
        },
        leaderboard(id) {
            return request(`/events/${id}/leaderboard`);
        },
        downloadDiploma(eventId) {
            const token = localStorage.getItem('accessToken');
            window.open(`/api/events/${eventId}/diploma?token=${token}`, '_blank');
        },
    },
    activities: {
        create(data) {
            return request('/activities', {
                method: 'POST',
                body: JSON.stringify(data),
            });
        },
        list(params) {
            return request(`/activities${toQuery(params)}`);
        },
        get(id) {
            return request(`/activities/${id}`);
        },
        delete(id) {
            return request(`/activities/${id}`, { method: 'DELETE' });
        },
        uploadGpx(file) {
            const form = new FormData();
            form.append('file', file);
            return request('/activities/gpx', {
                method: 'POST',
                body: form,
            });
        },
        uploadScreenshot(file) {
            const form = new FormData();
            form.append('screenshot', file);
            return request('/activities/screenshot', {
                method: 'POST',
                body: form,
            });
        },
    },
    photos: {
        upload(activityId, files) {
            const form = new FormData();
            files.forEach((f) => form.append('photos', f));
            return request(`/activities/${activityId}/photos`, { method: 'POST', body: form });
        },
        list(activityId) {
            return request(`/activities/${activityId}/photos`);
        },
        delete(photoId) {
            return request(`/photos/${photoId}`, { method: 'DELETE' });
        },
        like(activityId) {
            return request(`/activities/${activityId}/like`, {
                method: 'POST',
            });
        },
        getLikes(activityId) {
            return request(`/activities/${activityId}/likes`);
        },
    },
    teams: {
        create(data) {
            return request('/teams', {
                method: 'POST',
                body: JSON.stringify(data),
            });
        },
        list(params) {
            return request(`/teams${toQuery(params)}`);
        },
        get(id) {
            return request(`/teams/${id}`);
        },
        update(id, data) {
            return request(`/teams/${id}`, {
                method: 'PATCH',
                body: JSON.stringify(data),
            });
        },
        join(id) {
            return request(`/teams/${id}/join`, { method: 'POST' });
        },
        joinByCode(code) {
            return request(`/teams/join/${code}`, { method: 'POST' });
        },
        leave(id) {
            return request(`/teams/${id}/leave`, { method: 'POST' });
        },
        kickMember(teamId, userId) {
            return request(`/teams/${teamId}/members/${userId}`, { method: 'DELETE' });
        },
        leaderboard() {
            return request('/teams/leaderboard');
        },
    },
    battles: {
        create(data) {
            return request('/battles', {
                method: 'POST',
                body: JSON.stringify(data),
            });
        },
        list(params) {
            return request(`/battles${toQuery(params)}`);
        },
        get(id) {
            return request(`/battles/${id}`);
        },
        accept(id) {
            return request(`/battles/${id}/accept`, { method: 'POST' });
        },
        decline(id) {
            return request(`/battles/${id}/decline`, { method: 'POST' });
        },
    },
    leaderboard: {
        users(params) {
            return request(`/leaderboard/users${toQuery(params)}`);
        },
        teams() {
            return request('/leaderboard/teams');
        },
        bySport(sport) {
            return request(`/leaderboard/sport/${sport}`);
        },
    },
    merch: {
        createOrder(data) {
            return request('/merch/order', { method: 'POST', body: JSON.stringify(data) });
        },
        myOrders() {
            return request('/merch/orders');
        },
    },
    packages: {
        list() {
            return request('/packages');
        },
        adminList() {
            return request('/packages/admin');
        },
        create(data) {
            return request('/packages/admin', { method: 'POST', body: JSON.stringify(data) });
        },
        update(id, data) {
            return request(`/packages/admin/${id}`, { method: 'PUT', body: JSON.stringify(data) });
        },
        delete(id) {
            return request(`/packages/admin/${id}`, { method: 'DELETE' });
        },
        uploadImage(id, file) {
            const form = new FormData();
            form.append('image', file);
            return request(`/packages/admin/${id}/image`, {
                method: 'POST',
                body: form,
            });
        },
    },
    social: {
        follow(userId) {
            return request(`/users/${userId}/follow`, { method: 'POST' });
        },
        followers(userId) {
            return request(`/users/${userId}/followers`);
        },
        following(userId) {
            return request(`/users/${userId}/following`);
        },
        followStatus(userId) {
            return request(`/users/${userId}/follow-status`);
        },
        feed(params) {
            return request(`/feed${toQuery(params)}`);
        },
        searchUsers(params) {
            return request(`/users/search${toQuery(params)}`);
        },
        createPlanned(data) {
            return request('/planned', { method: 'POST', body: JSON.stringify(data) });
        },
        listPlanned(params) {
            return request(`/planned${toQuery(params)}`);
        },
        deletePlanned(id) {
            return request(`/planned/${id}`, { method: 'DELETE' });
        },
    },
    profile: {
        get(id) {
            return request(`/profile/${id}`);
        },
        update(data) {
            return request('/profile', {
                method: 'PUT',
                body: JSON.stringify(data),
            });
        },
        activities(id, params) {
            return request(`/profile/${id}/activities${toQuery(params)}`);
        },
        achievements(id) {
            return request(`/profile/${id}/achievements`);
        },
        statsSummary() {
            return request('/profile/stats/summary');
        },
        uploadAvatar(file) {
            const form = new FormData();
            form.append('avatar', file);
            return request('/profile/avatar', {
                method: 'POST',
                body: form,
            });
        },
    },
};
