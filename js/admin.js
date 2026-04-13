(function bootstrapCms() {
  const DEFAULTS = structuredClone(window.DIGITALL_DEFAULT_CONTENT);

  function cloneDefault() {
    return structuredClone(DEFAULTS);
  }

  function parseJson(raw) {
    try {
      return JSON.parse(raw);
    } catch (error) {
      return null;
    }
  }

  async function loadContent() {
    if (window.CMS_API) {
      const loaded = await window.CMS_API.loadContent(cloneDefault());
      return mergeContent(loaded);
    }
    const raw = localStorage.getItem(window.DIGITALL_STORAGE_KEY);
    if (!raw) {
      return cloneDefault();
    }
    return mergeContent(parseJson(raw));
  }

  async function saveContent(content) {
    if (window.CMS_API) {
      await window.CMS_API.saveContent(content);
      return;
    }
    localStorage.setItem(window.DIGITALL_STORAGE_KEY, JSON.stringify(content, null, 2));
  }

  function byId(id) {
    return document.getElementById(id);
  }

  function setStatus(text, isError) {
    const status = byId("status");
    status.textContent = text;
    status.style.color = isError ? "#b3261e" : "#284b73";
  }

  async function updateSupabaseAuthStatus() {
    const node = byId("supabaseAuthStatus");
    if (!node) {
      return;
    }
    if (!window.CMS_API || !window.CMS_API.isSupabaseEnabled()) {
      node.textContent = "Mode local actif. Configure data/cms-config.js et provider=supabase pour le mode global.";
      return;
    }
    const session = await window.CMS_API.getSession();
    node.textContent = session?.user?.email
      ? `Connecte sur Supabase: ${session.user.email}`
      : "Non connecte sur Supabase.";
  }

  function linesToArray(value) {
    return value
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean);
  }

  function mergeContent(rawContent) {
    if (!rawContent || typeof rawContent !== "object") {
      return cloneDefault();
    }

    const merged = {
      ...cloneDefault(),
      ...rawContent,
      storage: { ...DEFAULTS.storage, ...(rawContent.storage || {}) },
      branding: { ...DEFAULTS.branding, ...(rawContent.branding || {}) },
      navigation: { ...DEFAULTS.navigation, ...(rawContent.navigation || {}) },
      theme: { ...DEFAULTS.theme, ...(rawContent.theme || {}) },
      hero: { ...DEFAULTS.hero, ...(rawContent.hero || {}) },
      contact: { ...DEFAULTS.contact, ...(rawContent.contact || {}) }
    };
    merged.storage.cloudinary = {
      ...DEFAULTS.storage.cloudinary,
      ...(rawContent.storage?.cloudinary || {})
    };

    const links = Array.isArray(rawContent.navigation?.links) ? rawContent.navigation.links : DEFAULTS.navigation.links;
    merged.navigation.links = links.slice(0, 3).map((item, index) => ({
      ...DEFAULTS.navigation.links[index],
      ...(item || {})
    }));

    const services = Array.isArray(rawContent.services) && rawContent.services.length ? rawContent.services : DEFAULTS.services;
    merged.services = services.map((service, index) => ({
      ...DEFAULTS.services[index % DEFAULTS.services.length],
      ...service
    }));

    const illustrations = Array.isArray(rawContent.illustrations) ? rawContent.illustrations : DEFAULTS.illustrations;
    merged.illustrations = illustrations.slice(0, 3);
    while (merged.illustrations.length < 3) {
      merged.illustrations.push(DEFAULTS.illustrations[merged.illustrations.length]);
    }

    return merged;
  }

  function escapeAttribute(value) {
    return String(value || "")
      .replaceAll("&", "&amp;")
      .replaceAll('"', "&quot;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;");
  }

  async function readFileAsDataUrl(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result || ""));
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  function getStorageConfigFromForm() {
    return {
      provider: byId("storageProvider").value || "local",
      cloudinary: {
        cloudName: byId("cloudinaryCloudName").value.trim(),
        uploadPreset: byId("cloudinaryUploadPreset").value.trim(),
        folder: byId("cloudinaryFolder").value.trim()
      }
    };
  }

  async function uploadFileWithProvider(file, storageConfig) {
    if (storageConfig.provider !== "cloudinary") {
      return readFileAsDataUrl(file);
    }

    const cloudName = storageConfig.cloudinary.cloudName;
    const uploadPreset = storageConfig.cloudinary.uploadPreset;
    const folder = storageConfig.cloudinary.folder;

    if (!cloudName || !uploadPreset) {
      throw new Error("Cloudinary non configure: Cloud Name et Upload Preset sont requis.");
    }

    const endpoint = `https://api.cloudinary.com/v1_1/${cloudName}/auto/upload`;
    const form = new FormData();
    form.append("file", file);
    form.append("upload_preset", uploadPreset);
    if (folder) {
      form.append("folder", folder);
    }

    const response = await fetch(endpoint, {
      method: "POST",
      body: form
    });
    if (!response.ok) {
      throw new Error("Echec upload Cloudinary. Verifie tes parametres.");
    }

    const result = await response.json();
    return result.secure_url || result.url;
  }

  function addServiceEditor(host, service, index) {
    const wrapper = document.createElement("div");
    wrapper.className = "item";
    wrapper.dataset.role = "service-item";
    wrapper.innerHTML = `
      <div class="item-header">
        <p class="item-title">Service ${index + 1}</p>
        <button type="button" class="btn btn-danger" data-remove-service>Supprimer</button>
      </div>
      <div class="grid-2">
        <label>Icone (emoji)
          <input type="text" data-field="icon" value="${escapeAttribute(service.icon)}">
        </label>
        <label>Titre
          <input type="text" data-field="title" value="${escapeAttribute(service.title)}">
        </label>
        <label>Media Type
          <select data-field="mediaType">
            <option value="image" ${service.mediaType === "video" ? "" : "selected"}>Image</option>
            <option value="video" ${service.mediaType === "video" ? "selected" : ""}>Video</option>
          </select>
        </label>
        <label class="full">Image URL
          <input type="text" data-field="image" value="${escapeAttribute(service.image)}">
        </label>
        <div class="upload-row full">
          <button type="button" class="btn" data-upload-service-media>Uploader media</button>
          <input type="file" class="upload-input" data-upload-service-input accept="image/*,video/*">
        </div>
        <label class="full">Description
          <textarea rows="2" data-field="description">${escapeAttribute(service.description)}</textarea>
        </label>
        <label class="full">Points (1 ligne = 1 point)
          <textarea rows="3" data-field="points">${escapeAttribute((Array.isArray(service.points) ? service.points : []).join("\n"))}</textarea>
        </label>
      </div>
    `;
    host.appendChild(wrapper);
  }

  function addStepEditor(host, step, index) {
    const wrapper = document.createElement("div");
    wrapper.className = "item";
    wrapper.dataset.role = "step-item";
    wrapper.innerHTML = `
      <div class="item-header">
        <p class="item-title">Etape ${index + 1}</p>
        <button type="button" class="btn btn-danger" data-remove-step>Supprimer</button>
      </div>
      <div class="grid-2">
        <label>Titre etape
          <input type="text" data-field="step" value="${escapeAttribute(step.step)}">
        </label>
        <label class="full">Description
          <textarea rows="2" data-field="description">${escapeAttribute(step.description)}</textarea>
        </label>
      </div>
    `;
    host.appendChild(wrapper);
  }

  function renderEditors(content) {
    byId("storageProvider").value = content.storage.provider || "local";
    byId("cloudinaryCloudName").value = content.storage.cloudinary.cloudName || "";
    byId("cloudinaryUploadPreset").value = content.storage.cloudinary.uploadPreset || "";
    byId("cloudinaryFolder").value = content.storage.cloudinary.folder || "";

    byId("brandName").value = content.branding.name || "";
    byId("brandLogo").value = content.branding.logo || "";
    byId("brandHomeUrl").value = content.branding.homeUrl || "#";
    byId("nav1Label").value = content.navigation.links[0]?.label || "";
    byId("nav1Url").value = content.navigation.links[0]?.url || "";
    byId("nav2Label").value = content.navigation.links[1]?.label || "";
    byId("nav2Url").value = content.navigation.links[1]?.url || "";
    byId("nav3Label").value = content.navigation.links[2]?.label || "";
    byId("nav3Url").value = content.navigation.links[2]?.url || "";
    byId("navCmsLabel").value = content.navigation.cmsLabel || "";
    byId("navCmsUrl").value = content.navigation.cmsUrl || "";
    byId("footerCmsLabel").value = content.navigation.footerCmsLabel || "";
    byId("footerCmsUrl").value = content.navigation.footerCmsUrl || "";

    byId("heroEyebrow").value = content.hero.eyebrow || "";
    byId("heroTitle").value = content.hero.title || "";
    byId("heroSubtitle").value = content.hero.subtitle || "";
    byId("heroImage").value = content.hero.image || "";
    byId("primaryCtaLabel").value = content.hero.primaryCtaLabel || "";
    byId("primaryCtaUrl").value = content.hero.primaryCtaUrl || "";
    byId("secondaryCtaLabel").value = content.hero.secondaryCtaLabel || "";
    byId("secondaryCtaUrl").value = content.hero.secondaryCtaUrl || "";
    byId("heroBullets").value = (content.hero.bullets || []).join("\n");
    const illustrations = Array.isArray(content.illustrations) ? content.illustrations : [];
    byId("illustrationImage1Input").value = illustrations[0] || "";
    byId("illustrationImage2Input").value = illustrations[1] || "";
    byId("illustrationImage3Input").value = illustrations[2] || "";

    byId("themeText").value = content.theme.text || "#10233f";
    byId("themeMuted").value = content.theme.muted || "#4f637f";
    byId("themePrimary").value = content.theme.primary || "#0d63d4";
    byId("themePrimaryDark").value = content.theme.primaryDark || "#083f85";
    byId("themeAccent").value = content.theme.accent || "#f39b34";
    byId("themeBg").value = content.theme.bg || "#ecf4ff";
    byId("themeBgGrad1").value = content.theme.bgGrad1 || "#dfeeff";
    byId("themeBgGrad2").value = content.theme.bgGrad2 || "#ffe8cf";
    byId("themeBlob1").value = content.theme.blob1 || "#79b9ff";
    byId("themeBlob2").value = content.theme.blob2 || "#ffbb74";
    byId("themeGlassOpacity").value = Number(String(content.theme.glass || "rgba(255, 255, 255, 0.56)").split(",").pop()?.replace(")", "")) || 0.56;

    const servicesEditor = byId("servicesEditor");
    servicesEditor.innerHTML = "";
    (content.services || []).forEach((service, index) => addServiceEditor(servicesEditor, service, index));

    const processEditor = byId("processEditor");
    processEditor.innerHTML = "";
    (content.process || []).forEach((step, index) => addStepEditor(processEditor, step, index));

    byId("contactTitle").value = content.contact.title || "";
    byId("contactText").value = content.contact.text || "";
    byId("contactPhone").value = content.contact.phone || "";
    byId("contactEmail").value = content.contact.email || "";
    byId("contactWebsite").value = content.contact.website || "";
    byId("contactAddress").value = content.contact.address || "";
    byId("footerText").value = content.footerText || "";
  }

  function collectServices() {
    return Array.from(document.querySelectorAll('[data-role="service-item"]'))
      .map((item) => ({
        icon: item.querySelector('[data-field="icon"]').value.trim(),
        title: item.querySelector('[data-field="title"]').value.trim(),
        mediaType: item.querySelector('[data-field="mediaType"]').value,
        image: item.querySelector('[data-field="image"]').value.trim(),
        description: item.querySelector('[data-field="description"]').value.trim(),
        points: linesToArray(item.querySelector('[data-field="points"]').value)
      }))
      .filter((service) => service.title || service.description || service.icon || service.points.length > 0);
  }

  function collectProcess() {
    return Array.from(document.querySelectorAll('[data-role="step-item"]'))
      .map((item) => ({
        step: item.querySelector('[data-field="step"]').value.trim(),
        description: item.querySelector('[data-field="description"]').value.trim()
      }))
      .filter((step) => step.step || step.description);
  }

  function collectFormContent() {
    const opacity = Number(byId("themeGlassOpacity").value || 0.56);
    const safeOpacity = Number.isFinite(opacity) ? Math.min(1, Math.max(0.1, opacity)) : 0.56;

    return {
      storage: getStorageConfigFromForm(),
      branding: {
        name: byId("brandName").value.trim(),
        logo: byId("brandLogo").value.trim(),
        homeUrl: byId("brandHomeUrl").value.trim()
      },
      navigation: {
        links: [
          { label: byId("nav1Label").value.trim(), url: byId("nav1Url").value.trim() },
          { label: byId("nav2Label").value.trim(), url: byId("nav2Url").value.trim() },
          { label: byId("nav3Label").value.trim(), url: byId("nav3Url").value.trim() }
        ],
        cmsLabel: byId("navCmsLabel").value.trim(),
        cmsUrl: byId("navCmsUrl").value.trim(),
        footerCmsLabel: byId("footerCmsLabel").value.trim(),
        footerCmsUrl: byId("footerCmsUrl").value.trim()
      },
      theme: {
        text: byId("themeText").value,
        muted: byId("themeMuted").value,
        primary: byId("themePrimary").value,
        primaryDark: byId("themePrimaryDark").value,
        accent: byId("themeAccent").value,
        bg: byId("themeBg").value,
        bgGrad1: byId("themeBgGrad1").value,
        bgGrad2: byId("themeBgGrad2").value,
        blob1: byId("themeBlob1").value,
        blob2: byId("themeBlob2").value,
        glass: `rgba(255, 255, 255, ${safeOpacity})`
      },
      hero: {
        eyebrow: byId("heroEyebrow").value.trim(),
        title: byId("heroTitle").value.trim(),
        subtitle: byId("heroSubtitle").value.trim(),
        image: byId("heroImage").value.trim(),
        primaryCtaLabel: byId("primaryCtaLabel").value.trim(),
        primaryCtaUrl: byId("primaryCtaUrl").value.trim(),
        secondaryCtaLabel: byId("secondaryCtaLabel").value.trim(),
        secondaryCtaUrl: byId("secondaryCtaUrl").value.trim(),
        bullets: linesToArray(byId("heroBullets").value)
      },
      services: collectServices(),
      process: collectProcess(),
      illustrations: [
        byId("illustrationImage1Input").value.trim(),
        byId("illustrationImage2Input").value.trim(),
        byId("illustrationImage3Input").value.trim()
      ],
      contact: {
        title: byId("contactTitle").value.trim(),
        text: byId("contactText").value.trim(),
        phone: byId("contactPhone").value.trim(),
        email: byId("contactEmail").value.trim(),
        website: byId("contactWebsite").value.trim(),
        address: byId("contactAddress").value.trim()
      },
      footerText: byId("footerText").value.trim()
    };
  }

  function bindDynamicDelete() {
    document.body.addEventListener("click", (event) => {
      const removeServiceButton = event.target.closest("[data-remove-service]");
      if (removeServiceButton) {
        removeServiceButton.closest('[data-role="service-item"]').remove();
      }

      const removeStepButton = event.target.closest("[data-remove-step]");
      if (removeStepButton) {
        removeStepButton.closest('[data-role="step-item"]').remove();
      }

      const uploadServiceButton = event.target.closest("[data-upload-service-media]");
      if (uploadServiceButton) {
        uploadServiceButton.parentElement.querySelector("[data-upload-service-input]").click();
      }
    });

    document.body.addEventListener("change", async (event) => {
      if (!event.target.matches("[data-upload-service-input]")) {
        return;
      }
      const file = event.target.files?.[0];
      if (!file) {
        return;
      }
      try {
        setStatus("Upload media service en cours...");
        const uploadedUrl = await uploadFileWithProvider(file, getStorageConfigFromForm());
        const container = event.target.closest(".upload-row")?.previousElementSibling?.querySelector('[data-field="image"]');
        const mediaTypeSelect = event.target.closest(".grid-2")?.querySelector('[data-field="mediaType"]');
        if (container) {
          container.value = uploadedUrl;
        }
        if (mediaTypeSelect) {
          mediaTypeSelect.value = file.type.startsWith("video/") ? "video" : "image";
        }
        setStatus("Upload media service termine.");
      } catch (error) {
        setStatus(error.message || "Erreur upload media service.", true);
      }
    });
  }

  function bindMediaUploads() {
    document.querySelectorAll("[data-upload-target]").forEach((button) => {
      button.addEventListener("click", () => {
        const targetId = button.getAttribute("data-upload-target");
        byId(`upload-${targetId}`).click();
      });
    });

    document.querySelectorAll(".upload-input[id^='upload-']").forEach((input) => {
      input.addEventListener("change", async (event) => {
        const file = event.target.files?.[0];
        if (!file) {
          return;
        }
        try {
          setStatus("Upload media en cours...");
          const uploadedUrl = await uploadFileWithProvider(file, getStorageConfigFromForm());
          const targetId = input.id.replace("upload-", "");
          const targetInput = byId(targetId);
          if (targetInput) {
            targetInput.value = uploadedUrl;
            setStatus(`Media charge pour ${targetId}.`);
          }
        } catch (error) {
          setStatus(error.message || "Erreur upload media.", true);
        }
      });
    });
  }

  function setupSupabaseAuth() {
    const loginButton = byId("supabaseLoginButton");
    const logoutButton = byId("supabaseLogoutButton");
    const reloadButton = byId("reloadRemoteButton");
    if (!loginButton || !logoutButton || !reloadButton || !window.CMS_API) {
      return;
    }

    loginButton.addEventListener("click", async () => {
      try {
        const email = byId("supabaseEmail").value.trim();
        const password = byId("supabasePassword").value;
        if (!email || !password) {
          setStatus("Renseigne email et mot de passe Supabase.", true);
          return;
        }
        await window.CMS_API.login(email, password);
        await updateSupabaseAuthStatus();
        setStatus("Connexion Supabase reussie.");
      } catch (error) {
        setStatus(error.message || "Echec de connexion Supabase.", true);
      }
    });

    logoutButton.addEventListener("click", async () => {
      await window.CMS_API.logout();
      await updateSupabaseAuthStatus();
      setStatus("Deconnexion Supabase effectuee.");
    });

    reloadButton.addEventListener("click", async () => {
      const content = await loadContent();
      renderEditors(content);
      setStatus("Contenu recharge depuis la source configuree.");
    });
  }

  function downloadJson(content) {
    const blob = new Blob([JSON.stringify(content, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "digitall-booster-content.json";
    anchor.click();
    URL.revokeObjectURL(url);
  }

  function setupButtons() {
    byId("addService").addEventListener("click", () => {
      const host = byId("servicesEditor");
      const count = host.querySelectorAll('[data-role="service-item"]').length;
      addServiceEditor(host, { icon: "✨", title: "", mediaType: "image", image: "", description: "", points: [] }, count);
    });

    byId("addStep").addEventListener("click", () => {
      const host = byId("processEditor");
      const count = host.querySelectorAll('[data-role="step-item"]').length;
      addStepEditor(host, { step: "", description: "" }, count);
    });

    byId("saveButton").addEventListener("click", async () => {
      const payload = mergeContent(collectFormContent());
      await saveContent(payload);
      setStatus("Sauvegarde effectuee. Rechargez la landing page pour voir les changements.");
    });

    byId("resetButton").addEventListener("click", async () => {
      const defaults = cloneDefault();
      await saveContent(defaults);
      renderEditors(defaults);
      setStatus("Contenu reinitialise avec les valeurs par defaut.");
    });

    byId("exportButton").addEventListener("click", () => {
      downloadJson(collectFormContent());
      setStatus("Export JSON termine.");
    });

    byId("importInput").addEventListener("change", async (event) => {
      const file = event.target.files?.[0];
      if (!file) {
        return;
      }

      const raw = await file.text();
      const parsedRaw = parseJson(raw);
      if (!parsedRaw) {
        setStatus("Fichier JSON invalide.", true);
        return;
      }
      const parsed = mergeContent(parsedRaw);

      await saveContent(parsed);
      renderEditors(parsed);
      setStatus("Import termine et contenu charge.");
    });
  }

  async function init() {
    const content = await loadContent();
    renderEditors(content);
    bindDynamicDelete();
    bindMediaUploads();
    setupButtons();
    setupSupabaseAuth();
    await updateSupabaseAuthStatus();
  }

  init();
})();
