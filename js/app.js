(function bootstrapLandingPage() {
  const SERVICE_IMAGE_FALLBACKS = [
    "https://images.unsplash.com/photo-1498050108023-c5249f4df085?auto=format&fit=crop&w=1200&q=80",
    "https://images.unsplash.com/photo-1557838923-2985c318be48?auto=format&fit=crop&w=1200&q=80",
    "https://images.unsplash.com/photo-1561070791-2526d30994b5?auto=format&fit=crop&w=1200&q=80",
    "https://images.unsplash.com/photo-1611224923853-80b023f02d71?auto=format&fit=crop&w=1200&q=80",
    "https://images.unsplash.com/photo-1556740749-887f6717d7e4?auto=format&fit=crop&w=1200&q=80",
    "https://images.unsplash.com/photo-1571721795195-a2ca2d3370a9?auto=format&fit=crop&w=1200&q=80"
  ];

  function safeParse(jsonString) {
    try {
      return JSON.parse(jsonString);
    } catch (error) {
      return null;
    }
  }

  function mergeContent(rawContent) {
    const defaults = structuredClone(window.DIGITALL_DEFAULT_CONTENT);
    if (!rawContent || typeof rawContent !== "object") {
      return defaults;
    }

    const merged = {
      ...defaults,
      ...rawContent,
      branding: { ...defaults.branding, ...(rawContent.branding || {}) },
      navigation: { ...defaults.navigation, ...(rawContent.navigation || {}) },
      theme: { ...defaults.theme, ...(rawContent.theme || {}) },
      hero: { ...defaults.hero, ...(rawContent.hero || {}) },
      contact: { ...defaults.contact, ...(rawContent.contact || {}) }
    };

    const links = Array.isArray(rawContent.navigation?.links) ? rawContent.navigation.links : defaults.navigation.links;
    merged.navigation.links = links.slice(0, 3).map((item, index) => ({
      ...defaults.navigation.links[index],
      ...(item || {})
    }));

    const services = Array.isArray(rawContent.services) && rawContent.services.length > 0 ? rawContent.services : defaults.services;
    merged.services = services.map((service, index) => ({
      ...defaults.services[index % defaults.services.length],
      ...service
    }));

    const illustrations = Array.isArray(rawContent.illustrations) ? rawContent.illustrations : defaults.illustrations;
    merged.illustrations = illustrations.slice(0, 3);
    while (merged.illustrations.length < 3) {
      merged.illustrations.push(defaults.illustrations[merged.illustrations.length]);
    }

    return merged;
  }

  async function getContent() {
    if (window.CMS_API) {
      const loaded = await window.CMS_API.loadContent(window.DIGITALL_DEFAULT_CONTENT);
      return mergeContent(loaded);
    }
    const raw = localStorage.getItem(window.DIGITALL_STORAGE_KEY);
    if (!raw) {
      return structuredClone(window.DIGITALL_DEFAULT_CONTENT);
    }
    return mergeContent(safeParse(raw));
  }

  function fillText(id, value) {
    const element = document.getElementById(id);
    if (element) {
      element.textContent = value || "";
    }
  }

  function fillLink(id, label, url) {
    const element = document.getElementById(id);
    if (!element) {
      return;
    }
    element.textContent = label || "";
    element.setAttribute("href", url || "#");
  }

  function fillImage(id, src) {
    const element = document.getElementById(id);
    if (element && src) {
      element.setAttribute("src", src);
    }
  }

  function applyBranding(content) {
    fillText("brandName", content.branding.name);
    const homeLink = document.getElementById("brandHomeLink");
    if (homeLink) {
      homeLink.setAttribute("href", content.branding.homeUrl || "#");
    }

    const logoElement = document.getElementById("brandLogo");
    const markElement = document.getElementById("brandMark");
    if (logoElement && markElement) {
      if (content.branding.logo) {
        logoElement.src = content.branding.logo;
        logoElement.style.display = "block";
        markElement.style.display = "none";
      } else {
        logoElement.style.display = "none";
        markElement.style.display = "grid";
      }
    }
  }

  function applyNavigation(content) {
    const links = content.navigation.links || [];
    fillLink("navLink1", links[0]?.label, links[0]?.url);
    fillLink("navLink2", links[1]?.label, links[1]?.url);
    fillLink("navLink3", links[2]?.label, links[2]?.url);
    fillLink("navCmsButton", content.navigation.cmsLabel, content.navigation.cmsUrl);
    fillLink("footerCmsButton", content.navigation.footerCmsLabel, content.navigation.footerCmsUrl);
  }

  function applyTheme(content) {
    const root = document.documentElement;
    const theme = content.theme || {};
    root.style.setProperty("--bg", theme.bg);
    root.style.setProperty("--text", theme.text);
    root.style.setProperty("--muted", theme.muted);
    root.style.setProperty("--primary", theme.primary);
    root.style.setProperty("--primary-dark", theme.primaryDark);
    root.style.setProperty("--accent", theme.accent);
    root.style.setProperty("--glass", theme.glass);
    root.style.setProperty("--bg-grad-1", theme.bgGrad1);
    root.style.setProperty("--bg-grad-2", theme.bgGrad2);
    root.style.setProperty("--blob-1", theme.blob1);
    root.style.setProperty("--blob-2", theme.blob2);
  }

  function renderHero(content) {
    fillText("heroEyebrow", content.hero.eyebrow);
    fillText("heroTitle", content.hero.title);
    fillText("heroSubtitle", content.hero.subtitle);
    fillLink("primaryCta", content.hero.primaryCtaLabel, content.hero.primaryCtaUrl);
    fillLink("secondaryCta", content.hero.secondaryCtaLabel, content.hero.secondaryCtaUrl);
    fillImage("heroMainImage", content.hero.image);

    const bulletsHost = document.getElementById("heroBullets");
    if (!bulletsHost) {
      return;
    }
    bulletsHost.innerHTML = "";
    (content.hero.bullets || []).forEach((bullet) => {
      const li = document.createElement("li");
      li.textContent = bullet;
      bulletsHost.appendChild(li);
    });
  }

  function createServiceMedia(service, index) {
    const media = document.createElement("div");
    media.className = "service-media";

    const mediaType = service.mediaType === "video" ? "video" : "image";
    const mediaUrl = service.image || SERVICE_IMAGE_FALLBACKS[index % SERVICE_IMAGE_FALLBACKS.length];
    const altText = service.title ? `Illustration ${service.title}` : "Illustration service";

    if (mediaType === "video") {
      const video = document.createElement("video");
      video.className = "service-image";
      video.src = mediaUrl;
      video.autoplay = true;
      video.loop = true;
      video.muted = true;
      video.playsInline = true;
      video.controls = true;
      media.appendChild(video);
    } else {
      const image = document.createElement("img");
      image.className = "service-image";
      image.src = mediaUrl;
      image.alt = altText;
      media.appendChild(image);
    }

    const icon = document.createElement("span");
    icon.className = "service-icon";
    icon.textContent = service.icon || "✨";
    media.appendChild(icon);

    return media;
  }

  function renderServices(content) {
    const host = document.getElementById("serviceGrid");
    if (!host) {
      return;
    }
    host.innerHTML = "";

    (content.services || []).forEach((service, index) => {
      const card = document.createElement("article");
      card.className = "service-card";

      const title = document.createElement("h3");
      title.textContent = service.title || "";

      const body = document.createElement("div");
      body.className = "service-body";
      body.appendChild(title);

      const points = Array.isArray(service.points)
        ? service.points
        : String(service.description || "")
            .split("|")
            .map((point) => point.trim())
            .filter(Boolean);

      if (points.length > 0) {
        const list = document.createElement("ul");
        list.className = "service-points";
        points.forEach((point) => {
          const item = document.createElement("li");
          item.textContent = point;
          list.appendChild(item);
        });
        body.appendChild(list);
      }

      card.append(createServiceMedia(service, index), body);
      host.appendChild(card);
    });
  }

  function renderContact(content) {
    fillText("contactTitle", content.contact.title);
    fillText("contactText", content.contact.text);
    fillText("contactPhone", content.contact.phone);
    fillText("contactEmail", content.contact.email);
    fillText("contactWebsite", content.contact.website);
    fillText("contactAddress", content.contact.address);
    fillText("footerText", content.footerText);
    fillText("footerPhone", content.contact.phone);
    fillText("footerEmail", content.contact.email);
    fillText("footerWebsite", content.contact.website);
  }

  function renderIllustrations(content) {
    fillImage("illustrationImage1", content.illustrations[0]);
    fillImage("illustrationImage2", content.illustrations[1]);
    fillImage("illustrationImage3", content.illustrations[2]);
  }

  async function init() {
    const content = await getContent();
    applyTheme(content);
    applyBranding(content);
    applyNavigation(content);
    renderHero(content);
    renderServices(content);
    renderIllustrations(content);
    renderContact(content);
  }

  init();
})();
