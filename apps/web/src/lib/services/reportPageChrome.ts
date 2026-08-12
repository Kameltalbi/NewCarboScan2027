/**
 * Chrome commun des pages de rapport (hors couverture) :
 * header 1,5 cm + footer 1,5 cm, marges latérales 1,5 cm.
 */

export const PAGE_MARGIN = '1.5cm';

export const PAGE_SHELL =
  `padding: 0 ${PAGE_MARGIN}; background: white; font-family: Inter, -apple-system, sans-serif; box-sizing: border-box;`;

/** Logo compact pour tenir dans un header de 1,5 cm */
export const PAGE_LOGO_SLOT = '{{orgLogoHtml}}';

export function reportPageHeader(title: string, icon: string = PAGE_LOGO_SLOT): string {
  return `<div class="report-running-header" style="height: 1.5cm; display: flex; align-items: center; justify-content: space-between; gap: 10px; border-bottom: 1px solid #e2e8f0; box-sizing: border-box; margin: 0;">
  <div style="display: flex; align-items: center; gap: 8px; min-width: 0; flex: 1;">
    ${icon}
    <span style="font-size: 12px; font-weight: 700; color: #1e293b; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${title}</span>
  </div>
  <span style="font-size: 10px; color: #64748b; white-space: nowrap; flex-shrink: 0;">Bilan Carbone {{year}} — {{companyName}}</span>
</div>`;
}

export function reportPageFooter(): string {
  return `<div class="report-running-footer" style="height: 1.5cm; display: flex; align-items: center; justify-content: space-between; gap: 10px; border-top: 1px solid #e2e8f0; box-sizing: border-box; margin: 0; font-size: 10px; color: #64748b;">
  <span>CarboScan®</span>
  <span>{{companyName}} — Bilan Carbone {{year}}</span>
  <span>Document confidentiel</span>
</div>`;
}

/** Ouvre une page contenu (après couverture) avec header 1,5 cm */
export function reportPageOpen(title: string, icon: string = PAGE_LOGO_SLOT): string {
  return `<div class="report-content-page" style="${PAGE_SHELL}">
  ${reportPageHeader(title, icon)}
  <div class="report-page-body" style="padding: 12px 0;">`;
}

/** Ferme une page contenu avec footer 1,5 cm */
export function reportPageClose(): string {
  return `</div>
  ${reportPageFooter()}
</div>`;
}
