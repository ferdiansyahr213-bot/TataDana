'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase/client';
import { getCurrentUserProfile } from '@/lib/supabase/data-service';
import { sanitizeUserDisplayName, sanitizeUserId } from './user-sanitize';

export { sanitizeUserDisplayName, sanitizeUserId };

export interface AuthUserData {
  id: string;
  email: string;
  fullName: string;
  phone: string;
  plan: string;
  role: string;
  avatarUrl?: string;
  verificationStatus?: string;
}

/**
 * React hook to retrieve active logged-in user profile from Supabase Auth & Session.
 */
export function useAuth() {
  const [user, setUser] = useState<AuthUserData | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    let isMounted = true;

    async function loadAuth() {
      try {
        setIsLoading(true);

        // 1. Check Supabase Auth official session
        let sbUser: any = null;
        try {
          if (supabase) {
            const { data } = await supabase.auth.getUser();
            sbUser = data?.user || null;
          }
        } catch {
          // ignore network timeout
        }

        // 2. Check SessionStorage & URL params
        let sId = '';
        let sName = '';
        let sEmail = '';
        let sPhone = '';
        let sRole = 'user';
        let sPlan = 'starter';
        let sAvatar = '';
        let sStatus = 'verified';

        if (typeof window !== 'undefined') {
          const params = new URLSearchParams(window.location.search);
          const paramId = params.get('userId') || params.get('impersonate');

          sId = paramId || sessionStorage.getItem('current_user_id') || sessionStorage.getItem('user_id') || '';
          sName = sessionStorage.getItem('user_name') || '';
          sEmail = sessionStorage.getItem('user_email') || '';
          sPhone = sessionStorage.getItem('user_phone') || '';
          sRole = sessionStorage.getItem('user_role') || 'user';
          sPlan = sessionStorage.getItem('user_plan') || '';
          sAvatar = sessionStorage.getItem('user_avatar') || '';
          sStatus = sessionStorage.getItem('user_verification_status') || 'verified';
        }

        // Merge Supabase Auth if available
        if (sbUser) {
          if (!sId) sId = sbUser.id;
          if (!sEmail) sEmail = sbUser.email || '';
          const meta = sbUser.user_metadata || {};
          if (!sName) sName = meta.full_name || meta.name || '';
          if (!sPhone) sPhone = meta.phone || sbUser.phone || '';
          if (meta.role) sRole = meta.role;
          if (meta.plan) sPlan = meta.plan;
        }

        // 3. Query backend profile if ID is available
        if (sId) {
          try {
            const profile = await getCurrentUserProfile(sId);
            if (profile) {
              if (profile.email) sEmail = profile.email;
              if (profile.full_name) sName = profile.full_name;
              if (profile.phone_number) sPhone = profile.phone_number;
              if (profile.plan) sPlan = profile.plan;
              if (profile.role) sRole = profile.role;
              if (profile.avatar_url) sAvatar = profile.avatar_url;
              if (profile.verification_status) sStatus = profile.verification_status;
            }
          } catch {
            // fallback
          }
        }

        const resolvedName = sanitizeUserDisplayName(sName, sEmail);
        const resolvedId = sanitizeUserId(sId, sEmail);

        if (isMounted) {
          setUser({
            id: resolvedId,
            email: sEmail || '',
            fullName: resolvedName,
            phone: sPhone || '',
            plan: sPlan || 'starter',
            role: sRole || 'user',
            avatarUrl: sAvatar || '',
            verificationStatus: sStatus,
          });
        }
      } catch (err) {
        console.error('Failed to load active user:', err);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    }

    loadAuth();

    return () => {
      isMounted = false;
    };
  }, []);

  return { user, isLoading };
}

export const useUser = useAuth;
