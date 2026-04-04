// ==========================================================================
// CollapsibleSection — Reusable expand/collapse sections for panels
//
// Usage:
//   import { collapsibleSection, wireCollapsibles } from './ui/CollapsibleSection.js';
//   html += collapsibleSection('city-resources', 'Resources', innerHtml);
//   container.innerHTML = html;
//   wireCollapsibles(container);
// ==========================================================================

const STORAGE_PREFIX = 'da-collapse-';

/**
 * Generate HTML for a collapsible section.
 * @param {string} id — unique section identifier (used for sessionStorage)
 * @param {string} title — section header text
 * @param {string} contentHtml — inner HTML content
 * @param {object} [options]
 * @param {boolean} [options.startCollapsed=false] — start collapsed
 * @returns {string} HTML string
 */
export function collapsibleSection(id, title, contentHtml, options = {}) {
  const stored = sessionStorage.getItem(STORAGE_PREFIX + id);
  const collapsed = stored !== null ? stored === '1' : (options.startCollapsed || false);
  const cls = collapsed ? ' collapsed' : '';

  return `<div class="collapsible-section${cls}" data-section-id="${id}">
    <div class="collapsible-header">
      <span class="collapsible-title">${title}</span>
      <span class="collapsible-chevron">&#9660;</span>
    </div>
    <div class="collapsible-body">
      ${contentHtml}
    </div>
  </div>`;
}

/**
 * Wire up click handlers for all collapsible sections within a container.
 * Call this AFTER setting innerHTML.
 * @param {HTMLElement} containerEl
 */
export function wireCollapsibles(containerEl) {
  containerEl.querySelectorAll('.collapsible-header').forEach(header => {
    header.addEventListener('click', () => {
      const section = header.parentElement;
      const id = section.dataset.sectionId;
      const body = section.querySelector('.collapsible-body');

      if (section.classList.contains('collapsed')) {
        // Expand
        section.classList.remove('collapsed');
        body.style.maxHeight = body.scrollHeight + 'px';
        sessionStorage.setItem(STORAGE_PREFIX + id, '0');
        // After transition, remove max-height to allow dynamic content
        setTimeout(() => { body.style.maxHeight = ''; }, 300);
      } else {
        // Collapse — set explicit height first for transition
        body.style.maxHeight = body.scrollHeight + 'px';
        // Force reflow
        body.offsetHeight;
        body.style.maxHeight = '0px';
        section.classList.add('collapsed');
        sessionStorage.setItem(STORAGE_PREFIX + id, '1');
      }
    });
  });

  // Set initial max-height for collapsed sections
  containerEl.querySelectorAll('.collapsible-section.collapsed .collapsible-body').forEach(body => {
    body.style.maxHeight = '0px';
  });
}
