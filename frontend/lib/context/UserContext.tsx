"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import { login as apiLogin } from "@/lib/api/auth";
import { getUsers, type User } from "@/lib/api/users";
import { getStoredUserId, setStoredUserId, clearStoredUserId } from "@/lib/api/client";
import { defaultPermissionsForRole } from "@/lib/permissions";

type UserContextValue = {
  currentUser: User | null;
  users: User[];
  setCurrentUserId: (id: string) => void;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  refreshUsers: () => Promise<void>;
  loading: boolean;
};

const UserContext = createContext<UserContextValue | null>(null);
const USERS_CACHE_KEY = "finance_users_cache_v1";

function normalizeUser(user: User): User {
  const permissions = user.role?.permissions?.length
    ? user.role.permissions
    : defaultPermissionsForRole(user.role?.code ?? "");
  const departments =
    user.departments?.length
      ? user.departments
      : user.department
        ? [user.department]
        : [];
  return {
    ...user,
    departments,
    role: {
      ...user.role,
      permissions,
    },
  };
}

function normalizeUsers(list: User[]) {
  return list.map((user) => normalizeUser(user));
}

function readCachedUsers(): User[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(USERS_CACHE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? normalizeUsers(parsed as User[]) : [];
  } catch {
    return [];
  }
}

function writeCachedUsers(list: User[]) {
  if (typeof window === "undefined") return;
  localStorage.setItem(USERS_CACHE_KEY, JSON.stringify(list));
}

function clearCachedUsers() {
  if (typeof window === "undefined") return;
  localStorage.removeItem(USERS_CACHE_KEY);
}

function pickUser(list: User[], preferredId?: string | null) {
  const activeUsers = list.filter((user) => user.isActive);
  return (
    activeUsers.find((u) => u.id === preferredId) ??
    activeUsers.find((u) => u.id === getStoredUserId()) ??
    activeUsers.find((u) => u.email === "nhanvien@sicom.local") ??
    activeUsers[0] ??
    null
  );
}

export function UserProvider({ children }: { children: React.ReactNode }) {
  const [users, setUsers] = useState<User[]>([]);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const applyUser = useCallback(
    (list: User[], preferredId?: string | null) => {
      const found = pickUser(list, preferredId);
      if (found) {
        setStoredUserId(found.id);
        setCurrentUser(found);
      } else {
        setCurrentUser(null);
      }
    },
    [],
  );

  const refreshUsers = useCallback(async () => {
    const list = normalizeUsers(await getUsers());
    writeCachedUsers(list);
    setUsers(list);
    applyUser(list, getStoredUserId());
  }, [applyUser]);

  useEffect(() => {
    const cachedUsers = readCachedUsers();
    const cachedUser = pickUser(cachedUsers, getStoredUserId());
    if (cachedUsers.length > 0) {
      setUsers(cachedUsers);
      if (cachedUser) {
        setStoredUserId(cachedUser.id);
        setCurrentUser(cachedUser);
      }
      setLoading(false);
    }

    refreshUsers()
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [refreshUsers]);

  const setCurrentUserId = (id: string) => {
    const user = users.find((u) => u.id === id && u.isActive) ?? null;
    if (user) setStoredUserId(id);
    setCurrentUser(user);
  };

  const login = async (email: string, password: string) => {
    const user = normalizeUser(await apiLogin(email, password));
    setStoredUserId(user.id);
    setCurrentUser(user);
    writeCachedUsers([user]);
    try {
      await refreshUsers();
    } catch {
      setUsers([user]);
    }
  };

  const logout = () => {
    clearStoredUserId();
    clearCachedUsers();
    setUsers([]);
    setCurrentUser(null);
  };

  return (
    <UserContext.Provider
      value={{
        currentUser,
        users,
        setCurrentUserId,
        login,
        logout,
        refreshUsers,
        loading,
      }}
    >
      {children}
    </UserContext.Provider>
  );
}

export function useUser() {
  const ctx = useContext(UserContext);
  if (!ctx) throw new Error("useUser must be used within UserProvider");
  return ctx;
}
