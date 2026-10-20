const teamGrid = document.getElementById("teamGrid");

function appendText(parent, tagName, className, text) {
  if (!text) {
    return;
  }

  const element = document.createElement(tagName);
  element.className = className;
  element.textContent = text;
  parent.appendChild(element);
}

function renderProfile(profile) {
  const card = document.createElement("article");
  card.className = "team-member";

  if (profile.image) {
    const photo = document.createElement("img");
    photo.className = "team-member-photo";
    photo.src = profile.image;
    photo.alt = profile.name;
    photo.loading = "lazy";
    card.appendChild(photo);
  }

  const details = document.createElement("div");
  details.className = "team-member-details";
  appendText(details, "h3", "", profile.name);
  appendText(details, "p", "team-member-role", profile.position);
  appendText(details, "p", "team-member-institution", profile.institution);
  appendText(details, "p", "team-member-bio", profile.bio);

  if (/^https:\/\/orcid\.org\/[\w-]+$/i.test(profile.orcid)) {
    const link = document.createElement("a");
    link.className = "team-member-link";
    link.href = profile.orcid;
    link.target = "_blank";
    link.rel = "noreferrer";
    link.textContent = "ORCID profile";
    details.appendChild(link);
  }

  card.appendChild(details);
  return card;
}

async function loadTeamProfiles() {
  if (!teamGrid) {
    return;
  }

  try {
    const response = await fetch("./page_rendering_code/assets/bios/bios-manifest.json");
    if (!response.ok) {
      throw new Error(`Bios manifest request failed: ${response.status}`);
    }

    const profiles = await response.json();
    teamGrid.replaceChildren();

    if (!Array.isArray(profiles) || profiles.length === 0) {
      teamGrid.innerHTML = '<p class="team-status">Team profiles will be added soon.</p>';
      return;
    }

    for (const profile of profiles) {
      teamGrid.appendChild(renderProfile(profile));
    }
  } catch (error) {
    console.error(error);
    teamGrid.innerHTML = '<p class="team-status">Team profiles are temporarily unavailable.</p>';
  }
}

loadTeamProfiles();