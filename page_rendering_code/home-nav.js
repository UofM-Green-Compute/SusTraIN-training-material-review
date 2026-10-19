const sectionLinks = Array.from(document.querySelectorAll(".home-subnav-link"));
const homeSections = sectionLinks
  .map((link) => document.querySelector(link.getAttribute("href")))
  .filter(Boolean);

function setCurrentSection(sectionId) {
  for (const link of sectionLinks) {
    if (link.getAttribute("href") === `#${sectionId}`) {
      link.setAttribute("aria-current", "location");
    } else {
      link.removeAttribute("aria-current");
    }
  }
}

function updateCurrentSection() {
  const topOffset = 230;
  const currentSection = homeSections
    .filter((section) => section.getBoundingClientRect().top <= topOffset)
    .at(-1);

  setCurrentSection(currentSection?.id || homeSections[0]?.id);
}

window.addEventListener("scroll", updateCurrentSection, { passive: true });
window.addEventListener("hashchange", () => {
  setCurrentSection(window.location.hash.slice(1));
});
updateCurrentSection();