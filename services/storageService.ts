
import { Template, UserProfile, Client, PrintRecord } from '../types';
import { supabase } from './supabase';
import { User as SupabaseUser } from '@supabase/supabase-js';

export const GUEST_USER_ID = 'guest-user';
const LS_TEMPLATES_KEY = 'print_anything_templates';
const LS_CLIENTS_KEY = 'print_anything_clients';
const LS_HISTORY_KEY = 'print_anything_history';

// Helper to safely check session without crashing on network error
const getSessionSafe = async () => {
    try {
        const { data } = await supabase.auth.getSession();
        return data.session;
    } catch (e) {
        console.warn("Auth check failed (network/offline):", e);
        return null;
    }
};

// --- Auth & Profile ---

export const getProfile = async (overriddenUser?: SupabaseUser): Promise<UserProfile | null> => {
  let user = overriddenUser;
  
  if (!user) {
     const session = await getSessionSafe();
     user = session?.user;
  }
  
  if (!user) return null;
  
  try {
      // FIX: Use .select().limit(1) instead of .single()/.maybeSingle()
      // This prevents '406 Not Acceptable' errors when the DB returns an empty set 
      // under specific RLS or header configurations.
      const { data } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .limit(1);

      const profile = data?.[0];

      return {
        id: user.id,
        email: user.email || '',
        full_name: profile?.full_name || user.user_metadata?.full_name,
        role: profile?.role || 'user',
      };
  } catch (e) {
      console.warn("Profile fetch failed, using session data:", e);
      // Fallback if profile fetch fails (e.g. network error) but we have session user
      return {
        id: user.id,
        email: user.email || '',
        full_name: user.user_metadata?.full_name,
        role: 'user',
      };
  }
};

export const logout = async () => {
    try {
        await supabase.auth.signOut();
    } catch (e) {
        console.error("Logout error", e);
    }
};

export const getAllUsers = async (): Promise<UserProfile[]> => {
    try {
        const { data } = await supabase.from('profiles').select('*');
        return data || [];
    } catch (e) {
        console.warn("getAllUsers failed:", e);
        return [];
    }
};

// --- System Settings & Invitation Codes ---

export const getSystemSettings = async (): Promise<Record<string, string>> => {
    try {
        const { data } = await supabase.from('app_settings').select('*');
        const settings: Record<string, string> = {};
        data?.forEach((row: any) => {
            settings[row.key] = row.value;
        });
        return settings;
    } catch (e) {
        console.warn("Fetch settings failed", e);
        return {};
    }
};

export const toggleSystemSetting = async (key: string, value: string) => {
    try {
        await supabase.from('app_settings').upsert({ key, value });
    } catch (e) {
        console.error("Update setting failed", e);
        throw e;
    }
};

export interface InvitationCode {
    id: string;
    code: string;
    is_used: boolean;
    used_by?: string;
    created_at: string;
    used_at?: string;
}

export const generateInviteCode = async (user_id: string): Promise<InvitationCode | null> => {
    // Simple 6-char random code
    const code = Math.random().toString(36).substring(2, 8).toUpperCase();
    try {
        const { data, error } = await supabase
            .from('invitation_codes')
            .insert({
                code,
                created_by: user_id
            })
            .select()
            .single();
        if (error) throw error;
        return data;
    } catch (e) {
        console.error("Generate code failed", e);
        return null;
    }
};

export const getInviteCodes = async (): Promise<InvitationCode[]> => {
    try {
        const { data } = await supabase
            .from('invitation_codes')
            .select('*')
            .order('created_at', { ascending: false });
        return data || [];
    } catch (e) {
        return [];
    }
};

export const validateInviteCode = async (code: string): Promise<boolean> => {
    try {
        const { data } = await supabase
            .from('invitation_codes')
            .select('*')
            .eq('code', code.trim().toUpperCase())
            .eq('is_used', false)
            .single();
        return !!data;
    } catch (e) {
        return false;
    }
};

export const markInviteCodeUsed = async (code: string, userId: string) => {
    try {
        await supabase
            .from('invitation_codes')
            .update({ 
                is_used: true, 
                used_by: userId,
                used_at: new Date().toISOString()
            })
            .eq('code', code.trim().toUpperCase());
    } catch (e) {
        console.error("Mark code used failed", e);
    }
};

// --- Template Management ---

export const saveTemplate = async (template: Template, user?: UserProfile): Promise<string> => {
  if (!user) {
      const u = await getProfile();
      if (!u) throw new Error("Must be logged in");
      user = u;
  }

  // GUEST OR OFFLINE MODE
  if (user.id === GUEST_USER_ID) {
      return saveToLocalStorage(template);
  }

  try {
      const payload = {
        name: template.name,
        content: {
            objects: template.objects,
            settings: template.settings
        },
        is_public: template.is_public,
        user_id: user.id,
        updated_at: new Date().toISOString()
      };

      const { data, error } = await supabase
        .from('templates')
        .upsert(
          { 
            id: template.id.length > 20 ? template.id : undefined,
            ...payload 
          }, 
          { onConflict: 'id' }
        )
        .select()
        .single();

      if (error) throw error;
      return data.id;
  } catch (e) {
      console.warn("Save to Supabase failed, falling back to local storage", e);
      return saveToLocalStorage(template);
  }
};

const saveToLocalStorage = (template: Template) => {
    try {
        const stored = localStorage.getItem(LS_TEMPLATES_KEY);
        const templates: Template[] = stored ? JSON.parse(stored) : [];
        const existingIdx = templates.findIndex(t => t.id === template.id);
        
        // Ensure we track this as guest/local data
        const toSave = { ...template, user_id: GUEST_USER_ID, updatedAt: new Date().toISOString() };
        
        if (existingIdx >= 0) {
            templates[existingIdx] = toSave;
        } else {
            templates.push(toSave);
        }
        localStorage.setItem(LS_TEMPLATES_KEY, JSON.stringify(templates));
        return template.id;
    } catch (e) {
        console.error("LocalStorage save failed", e);
        return template.id; // Return ID anyway to prevent crash, though data is lost
    }
}

export const getTemplates = async (): Promise<Template[]> => {
    const session = await getSessionSafe();
    let cloudTemplates: Template[] = [];

    if (session) {
        try {
            const { data, error } = await supabase
                .from('templates')
                .select('*')
                .eq('user_id', session.user.id) // Only fetch user's templates
                .order('updated_at', { ascending: false });

            if (!error && data) {
                cloudTemplates = data.map((row: any) => ({
                    id: row.id,
                    user_id: row.user_id,
                    name: row.name,
                    objects: row.content?.objects || [],
                    settings: row.content?.settings || { width: 0, height: 0, unit: 'mm', widthUnit: 0, heightUnit: 0, dpi: 96 },
                    is_public: row.is_public || false,
                    updatedAt: row.updated_at
                }));
            }
        } catch (e) {
            console.warn("Fetch cloud templates failed:", e);
        }
    }

    let localTemplates: Template[] = [];
    try {
        const stored = localStorage.getItem(LS_TEMPLATES_KEY);
        localTemplates = stored ? JSON.parse(stored) : [];
    } catch(e) {}
    
    // Sort safely handling missing dates
    return [...cloudTemplates, ...localTemplates].sort((a, b) => {
        const dateA = a.updatedAt ? new Date(a.updatedAt).getTime() : 0;
        const dateB = b.updatedAt ? new Date(b.updatedAt).getTime() : 0;
        return dateB - dateA;
    });
};

export const getPublicTemplates = async (): Promise<Template[]> => {
    const session = await getSessionSafe();
    
    // Guest users currently only see local data, so no public gallery unless we open up RLS.
    // Assuming backend RLS allows anon read on is_public=true
    
    try {
        const { data, error } = await supabase
            .from('templates')
            .select('*')
            .eq('is_public', true)
            .order('updated_at', { ascending: false });

        if (!error && data) {
            return data.map((row: any) => ({
                id: row.id,
                user_id: row.user_id,
                name: row.name,
                objects: row.content?.objects || [],
                settings: row.content?.settings || { width: 0, height: 0, unit: 'mm', widthUnit: 0, heightUnit: 0, dpi: 96 },
                is_public: true,
                updatedAt: row.updated_at
            }));
        }
    } catch (e) {
        console.warn("Fetch public templates failed:", e);
    }
    return [];
};

export const copyTemplateToLibrary = async (template: Template, user: UserProfile): Promise<string> => {
     // Create a copy
     const newTemplate: Template = {
         ...template,
         id: Math.random().toString(36).substr(2, 9),
         user_id: user.id,
         name: `${template.name} (Copy)`,
         is_public: false, // Default to private
         updatedAt: new Date().toISOString()
     };
     
     return await saveTemplate(newTemplate, user);
};

export const getTemplateById = async (id: string, user?: UserProfile): Promise<Template | null> => {
    // Check LS first
    try {
        const stored = localStorage.getItem(LS_TEMPLATES_KEY);
        if (stored) {
            const templates: Template[] = JSON.parse(stored);
            const found = templates.find(t => t.id === id);
            if (found) return found;
        }
    } catch(e) {}

    // If not found locally, try cloud
    try {
        const { data, error } = await supabase
          .from('templates')
          .select('*')
          .eq('id', id)
          .maybeSingle(); // Safer than single()
      
        if (error || !data) return null;
      
        return {
          id: data.id,
          user_id: data.user_id,
          name: data.name,
          objects: data.content?.objects || [],
          settings: data.content?.settings || { width: 0, height: 0, unit: 'mm', widthUnit: 0, heightUnit: 0, dpi: 96 },
          is_public: data.is_public || false,
          updatedAt: data.updated_at
        };
    } catch (e) {
        return null;
    }
};

export const deleteTemplate = async (id: string): Promise<void> => {
    let deletedLocally = false;
    try {
        const stored = localStorage.getItem(LS_TEMPLATES_KEY);
        if (stored) {
            const templates: Template[] = JSON.parse(stored);
            if (templates.some(t => t.id === id)) {
                const filtered = templates.filter(t => t.id !== id);
                localStorage.setItem(LS_TEMPLATES_KEY, JSON.stringify(filtered));
                deletedLocally = true;
            }
        }
    } catch(e) {}

    // Try delete from Cloud
    const session = await getSessionSafe();
    if (session && !deletedLocally) {
        try {
            await supabase.from('templates').delete().eq('id', id);
        } catch (e) {
            console.warn("Failed to delete from cloud", e);
        }
    }
};

// --- Client CRM ---

export const getClients = async (): Promise<Client[]> => {
  const session = await getSessionSafe();

  let cloudClients: Client[] = [];
  if (session) {
      try {
          const { data } = await supabase
            .from('clients')
            .select('*')
            .order('name', { ascending: true });
          if (data) cloudClients = data;
      } catch (e) {
          console.warn("Failed to fetch clients", e);
      }
  }
  
  let localClients: Client[] = [];
  try {
    const stored = localStorage.getItem(LS_CLIENTS_KEY);
    localClients = stored ? JSON.parse(stored) : [];
  } catch(e) {}
  
  // Combine lists
  const seenIds = new Set(cloudClients.map(c => c.id));
  const uniqueLocal = localClients.filter((c: Client) => !seenIds.has(c.id));
  
  return [...cloudClients, ...uniqueLocal];
};

export const saveClient = async (name: string): Promise<Client | null> => {
    const session = await getSessionSafe();

    // Helper to save locally
    const saveLocal = (userId: string, existingId?: string) => {
        try {
            const stored = localStorage.getItem(LS_CLIENTS_KEY);
            const clients: Client[] = stored ? JSON.parse(stored) : [];
            const newClient = { 
                id: existingId || Math.random().toString(36).substr(2, 9), 
                user_id: userId, 
                name 
            };
            clients.push(newClient);
            localStorage.setItem(LS_CLIENTS_KEY, JSON.stringify(clients));
            return newClient;
        } catch(e) {
            console.error("Local save client failed", e);
            return null;
        }
    };

    if (!session) {
        return saveLocal(GUEST_USER_ID);
    }

    const user = await getProfile(); 
    if(!user) return null;

    try {
        const { data, error } = await supabase
            .from('clients')
            .insert({ user_id: user.id, name })
            .select()
            .single();
        
        if(error) throw error;
        return data;
    } catch (e) {
        console.warn("Save client failed, saving locally", e);
        return saveLocal(user.id);
    }
};

const recentNamesCache = new Set<string>();

export const addRecentName = async (name: string, user?: UserProfile): Promise<void> => {
    if (!name || recentNamesCache.has(name)) return;
    recentNamesCache.add(name);
    try {
        await saveClient(name);
    } catch (e) {
        // Ignore errors
    }
};

export const deleteClient = async (id: string) => {
    try {
        const stored = localStorage.getItem(LS_CLIENTS_KEY);
        if (stored) {
            const clients: Client[] = JSON.parse(stored);
            if (clients.some(c => c.id === id)) {
                 localStorage.setItem(LS_CLIENTS_KEY, JSON.stringify(clients.filter(c => c.id !== id)));
            }
        }
    } catch(e) {}
    
    const session = await getSessionSafe();
    if(session) {
        try {
            await supabase.from('clients').delete().eq('id', id);
        } catch(e) {}
    }
};

// --- Print History ---

export interface HistoryItem extends PrintRecord {
    template_name?: string;
}

export const getAllPrintHistory = async (): Promise<HistoryItem[]> => {
    const session = await getSessionSafe();
    let history: HistoryItem[] = [];

    // Cloud Fetch
    if (session) {
        try {
            const { data } = await supabase
                .from('print_history')
                .select('*, templates(name)')
                .order('created_at', { ascending: false })
                .limit(50);
            
            if (data) {
                history = data.map((item: any) => ({
                    ...item,
                    template_name: item.templates?.name || 'Unknown Template'
                }));
            }
        } catch (e) {
            console.warn("Failed to fetch cloud history", e);
        }
    }

    // Local Storage
    try {
        const stored = localStorage.getItem(LS_HISTORY_KEY);
        if (stored) {
            const storedTemplates = localStorage.getItem(LS_TEMPLATES_KEY);
            const templates: Template[] = storedTemplates ? JSON.parse(storedTemplates) : [];
            const templateMap = new Map(templates.map(t => [t.id, t.name]));

            const localHistory: PrintRecord[] = JSON.parse(stored);
            
            const enhancedLocalHistory: HistoryItem[] = localHistory.map(rec => ({
                ...rec,
                template_name: templateMap.get(rec.template_id) || 'Unknown Template'
            }));

            // Merge: If we have cloud data, we prefer it, but if cloud is empty/failed or we are guest, use local
            // For now, simple strategy: if logged in, cloud + local (deduped by ID), if guest, just local
            
            const seenIds = new Set(history.map(h => h.id));
            enhancedLocalHistory.forEach(h => {
                if (!seenIds.has(h.id)) {
                    history.push(h);
                }
            });
        }
    } catch(e) {}

    return history.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
};

export const getHistoryRecordById = async (id: string): Promise<PrintRecord | null> => {
    // 1. Try Local
    try {
        const stored = localStorage.getItem(LS_HISTORY_KEY);
        if (stored) {
            const localHistory: PrintRecord[] = JSON.parse(stored);
            const found = localHistory.find(h => h.id === id);
            if (found) return found;
        }
    } catch(e) {}

    // 2. Try Cloud
    const session = await getSessionSafe();
    if (session) {
        try {
            const { data } = await supabase
                .from('print_history')
                .select('*')
                .eq('id', id)
                .single();
            if (data) return data;
        } catch(e) {}
    }
    return null;
}

export const getPrintHistory = async (templateId: string): Promise<PrintRecord[]> => {
    const session = await getSessionSafe();
    let history: PrintRecord[] = [];

    // Cloud
    if (session) {
        try {
            const { data } = await supabase
                .from('print_history')
                .select('*')
                .eq('template_id', templateId)
                .order('created_at', { ascending: false })
                .limit(20);
            if (data) history = data;
        } catch (e) {
            // ignore
        }
    }

    // Local
    try {
        const stored = localStorage.getItem(LS_HISTORY_KEY);
        if (stored) {
            const allHistory: PrintRecord[] = JSON.parse(stored);
            const templateHistory = allHistory
                .filter(h => h.template_id === templateId)
                .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
            
            // Deduplicate if cloud works but basic fallback
            // Simple check: if cloud returned 0, use local. If cloud has data, it's likely more authoritative/synced.
            // But we might have offline edits.
            const seenIds = new Set(history.map(h => h.id));
            templateHistory.forEach(h => {
                if (!seenIds.has(h.id)) history.push(h);
            });
        }
    } catch(e) {}

    return history.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
};

export const savePrintRecord = async (templateId: string, data: Record<string, string>, user?: UserProfile) => {
    if (!user) return;
    
    const record: PrintRecord = {
        id: Math.random().toString(36).substr(2, 9),
        template_id: templateId,
        user_id: user.id,
        data,
        created_at: new Date().toISOString()
    };

    // Save Local
    try {
        const stored = localStorage.getItem(LS_HISTORY_KEY);
        const allHistory: PrintRecord[] = stored ? JSON.parse(stored) : [];
        allHistory.push(record);
        // Limit local storage size
        if (allHistory.length > 50) allHistory.shift();
        localStorage.setItem(LS_HISTORY_KEY, JSON.stringify(allHistory));
    } catch(e) {}

    // Save Cloud
    if (user.id !== GUEST_USER_ID) {
        try {
            await supabase.from('print_history').insert({
                template_id: templateId,
                user_id: user.id,
                data: data
            });
        } catch (e) {
            console.warn("Failed to save print history to cloud", e);
        }
    }
};
