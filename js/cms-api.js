(function initCmsApi() {
  function safeParse(raw) {
    try {
      return JSON.parse(raw);
    } catch (error) {
      return null;
    }
  }

  function clone(value) {
    return structuredClone(value);
  }

  function getLocalKey() {
    return window.DIGITALL_STORAGE_KEY || "digitall-booster-content-v1";
  }

  function getConfig() {
    const defaultConfig = {
      provider: "local",
      supabase: {
        url: "",
        anonKey: "",
        table: "site_content",
        rowId: 1
      }
    };
    const userConfig = window.CMS_CONFIG || {};
    return {
      ...defaultConfig,
      ...userConfig,
      supabase: {
        ...defaultConfig.supabase,
        ...(userConfig.supabase || {})
      }
    };
  }

  function readLocal(defaultContent) {
    const raw = localStorage.getItem(getLocalKey());
    if (!raw) {
      return clone(defaultContent);
    }
    return safeParse(raw) || clone(defaultContent);
  }

  function writeLocal(content) {
    localStorage.setItem(getLocalKey(), JSON.stringify(content, null, 2));
  }

  let supabaseClient = null;
  function getSupabaseClient() {
    const config = getConfig();
    if (!window.supabase) {
      throw new Error("Librairie Supabase non chargee.");
    }
    if (!config.supabase.url || !config.supabase.anonKey) {
      throw new Error("Supabase non configure dans data/cms-config.js");
    }
    if (!supabaseClient) {
      supabaseClient = window.supabase.createClient(config.supabase.url, config.supabase.anonKey);
    }
    return supabaseClient;
  }

  function isSupabaseEnabled() {
    const config = getConfig();
    return config.provider === "supabase" && !!config.supabase.url && !!config.supabase.anonKey;
  }

  async function readRemote(defaultContent) {
    const config = getConfig();
    const client = getSupabaseClient();
    const { data, error } = await client
      .from(config.supabase.table)
      .select("payload")
      .eq("id", config.supabase.rowId)
      .maybeSingle();

    if (error) {
      throw new Error("Erreur lecture Supabase.");
    }
    if (!data || !data.payload) {
      return clone(defaultContent);
    }
    return data.payload;
  }

  async function writeRemote(content) {
    const config = getConfig();
    const client = getSupabaseClient();
    const sessionResult = await client.auth.getSession();
    if (!sessionResult.data?.session) {
      throw new Error("Connecte-toi dans le dashboard pour sauvegarder sur Supabase.");
    }

    const payload = {
      id: config.supabase.rowId,
      payload: content
    };
    const { error } = await client.from(config.supabase.table).upsert(payload, { onConflict: "id" });
    if (error) {
      throw new Error("Erreur ecriture Supabase.");
    }
  }

  async function loadContent(defaultContent) {
    if (!isSupabaseEnabled()) {
      return readLocal(defaultContent);
    }
    try {
      const remote = await readRemote(defaultContent);
      writeLocal(remote);
      return remote;
    } catch (error) {
      return readLocal(defaultContent);
    }
  }

  async function saveContent(content) {
    if (isSupabaseEnabled()) {
      await writeRemote(content);
    }
    writeLocal(content);
  }

  async function login(email, password) {
    const client = getSupabaseClient();
    const { error } = await client.auth.signInWithPassword({ email, password });
    if (error) {
      throw new Error(error.message || "Echec de connexion Supabase.");
    }
  }

  async function logout() {
    const client = getSupabaseClient();
    await client.auth.signOut();
  }

  async function getSession() {
    if (!isSupabaseEnabled()) {
      return null;
    }
    const client = getSupabaseClient();
    const { data } = await client.auth.getSession();
    return data?.session || null;
  }

  window.CMS_API = {
    getConfig,
    isSupabaseEnabled,
    loadContent,
    saveContent,
    login,
    logout,
    getSession
  };
})();
