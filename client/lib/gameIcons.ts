/**
 * Fantasy RPG-style game icons as SVG data URIs.
 * viewBox 0 0 24 24, thick outlines, warm gold/brown palette.
 */

const O = "#2D1B0E"; // master outline

function toUri(defs: string, body: string, active: boolean): string {
  const f = active
    ? ""
    : `<filter id="f"><feColorMatrix type="saturate" values="0.2"/><feComponentTransfer><feFuncA type="linear" slope="0.5"/></feComponentTransfer></filter>`;
  const g = active ? "" : ` filter="url(#f)"`;
  return `data:image/svg+xml,${encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><defs>${f}${defs}</defs><g${g}>${body}</g></svg>`
  )}`;
}

type IconFn = (active: boolean) => string;

const ICONS: Record<string, IconFn> = {

  /* ── Slime Count: cute slime blob ── */
  slime_count: (a) => toUri(
    `<radialGradient id="g1" cx="50%" cy="35%" r="55%"><stop offset="0%" stop-color="#8FE86A"/><stop offset="100%" stop-color="#2E8B22"/></radialGradient>`,
    `<ellipse cx="12" cy="14.5" rx="8.5" ry="6.5" fill="url(#g1)" stroke="${O}" stroke-width="1.5"/>` +
    `<ellipse cx="9" cy="13" rx="1.5" ry="1.8" fill="#fff"/>` +
    `<ellipse cx="15" cy="13" rx="1.5" ry="1.8" fill="#fff"/>` +
    `<circle cx="9.5" cy="13.3" r=".9" fill="${O}"/>` +
    `<circle cx="15.5" cy="13.3" r=".9" fill="${O}"/>` +
    `<ellipse cx="9" cy="10" rx="2.5" ry="1" fill="#fff" opacity=".35" transform="rotate(-15 9 10)"/>` +
    `<ellipse cx="12" cy="18.5" rx="3.5" ry=".5" fill="${O}" opacity=".12"/>`,
    a
  ),

  /* ── Attendance: reward calendar with star ── */
  attendance: (a) => toUri(
    `<linearGradient id="g1" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#F5E6C8"/><stop offset="100%" stop-color="#D4B896"/></linearGradient>`,
    `<rect x="4" y="5" width="16" height="16" rx="2.5" fill="url(#g1)" stroke="${O}" stroke-width="1.5"/>` +
    `<rect x="4" y="5" width="16" height="5" rx="2.5" fill="#C0392B" stroke="${O}" stroke-width="1.5"/>` +
    `<rect x="4" y="8.5" width="16" height="1.5" fill="#C0392B"/>` +
    `<rect x="8" y="3" width="2" height="4" rx="1" fill="${O}"/>` +
    `<rect x="14" y="3" width="2" height="4" rx="1" fill="${O}"/>` +
    `<polygon points="12,12 13.2,14.5 16,14.8 14,16.8 14.5,19.5 12,18.2 9.5,19.5 10,16.8 8,14.8 10.8,14.5" fill="#D4AF37" stroke="${O}" stroke-width=".7"/>` +
    `<circle cx="10.5" cy="13.5" r=".5" fill="#fff" opacity=".4"/>`,
    a
  ),

  /* ── Mission: quest scroll ── */
  mission: (a) => toUri(
    `<linearGradient id="g1" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#F5E6C8"/><stop offset="100%" stop-color="#C4A67D"/></linearGradient>`,
    `<rect x="6" y="4" width="12" height="16" rx="1" fill="url(#g1)" stroke="${O}" stroke-width="1.5"/>` +
    `<ellipse cx="12" cy="4" rx="7" ry="2" fill="#DCC8A0" stroke="${O}" stroke-width="1.5"/>` +
    `<ellipse cx="12" cy="20" rx="7" ry="2" fill="#C4A67D" stroke="${O}" stroke-width="1.5"/>` +
    `<line x1="9" y1="9" x2="15" y2="9" stroke="${O}" stroke-width=".8" opacity=".35"/>` +
    `<line x1="9" y1="11.5" x2="15" y2="11.5" stroke="${O}" stroke-width=".8" opacity=".35"/>` +
    `<line x1="9" y1="14" x2="13" y2="14" stroke="${O}" stroke-width=".8" opacity=".35"/>` +
    `<circle cx="15" cy="16.5" r="2" fill="#C0392B" stroke="${O}" stroke-width=".7"/>` +
    `<circle cx="15" cy="16.5" r=".8" fill="#E74C3C"/>`,
    a
  ),

  /* ── Mailbox: fantasy sealed letter ── */
  mailbox: (a) => toUri(
    `<linearGradient id="g1" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#F5E6C8"/><stop offset="100%" stop-color="#D4B896"/></linearGradient>`,
    `<rect x="3" y="6" width="18" height="13" rx="2" fill="url(#g1)" stroke="${O}" stroke-width="1.5"/>` +
    `<path d="M3.5,6 L12,12.5 L20.5,6" fill="#E8D5A3"/>` +
    `<path d="M3,6 L12,13 L21,6" fill="none" stroke="${O}" stroke-width="1.5" stroke-linejoin="round"/>` +
    `<path d="M3,19 L9,14" stroke="${O}" stroke-width=".6" opacity=".15"/>` +
    `<path d="M21,19 L15,14" stroke="${O}" stroke-width=".6" opacity=".15"/>` +
    `<circle cx="12" cy="14" r="2.5" fill="#C0392B" stroke="${O}" stroke-width="1"/>` +
    `<circle cx="12" cy="14" r="1" fill="#E74C3C"/>` +
    `<circle cx="11.3" cy="13.4" r=".5" fill="#fff" opacity=".3"/>`,
    a
  ),

  /* ── Background: magic wand + stars ── */
  background: (a) => toUri(
    `<linearGradient id="g1" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="#9B59B6"/><stop offset="100%" stop-color="#6C3483"/></linearGradient>`,
    `<line x1="6" y1="20" x2="16" y2="6" stroke="#8B6914" stroke-width="2.5" stroke-linecap="round"/>` +
    `<line x1="6" y1="20" x2="16" y2="6" stroke="#D4AF37" stroke-width="1.5" stroke-linecap="round"/>` +
    `<circle cx="17" cy="5" r="3.5" fill="url(#g1)" stroke="${O}" stroke-width="1"/>` +
    `<polygon points="17,3 17.8,5.5 20,5.8 18.3,7.2 18.8,9.3 17,8 15.2,9.3 15.7,7.2 14,5.8 16.2,5.5" fill="#D4AF37" stroke="${O}" stroke-width=".5"/>` +
    `<circle cx="10" cy="5" r=".8" fill="#D4AF37" opacity=".6"/>` +
    `<circle cx="20" cy="10" r=".6" fill="#D4AF37" opacity=".5"/>` +
    `<circle cx="13" cy="2.5" r=".5" fill="#fff" opacity=".5"/>`,
    a
  ),

  /* ── Care: heart potion bottle ── */
  care: (a) => toUri(
    `<linearGradient id="g1" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#FF6B9D"/><stop offset="100%" stop-color="#C0392B"/></linearGradient>`,
    `<path d="M8,10 L8,18 Q8,21 12,21 Q16,21 16,18 L16,10 Z" fill="url(#g1)" stroke="${O}" stroke-width="1.5"/>` +
    `<rect x="10" y="5" width="4" height="5.5" rx="1" fill="#D4B896" stroke="${O}" stroke-width="1.5"/>` +
    `<rect x="9.5" y="3" width="5" height="3" rx="1.5" fill="#8B6914" stroke="${O}" stroke-width="1"/>` +
    `<path d="M12,12.5 C10.5,11 8.5,12 9,13.5 C9.5,15 12,17 12,17 C12,17 14.5,15 15,13.5 C15.5,12 13.5,11 12,12.5Z" fill="#FF4757" opacity=".5"/>` +
    `<ellipse cx="10" cy="12" rx="1" ry="1.5" fill="#fff" opacity=".25"/>` +
    `<circle cx="14" cy="7" r=".4" fill="#fff" opacity=".5"/>`,
    a
  ),

  /* ── Codex: ancient magic book ── */
  codex: (a) => toUri(
    `<linearGradient id="g1" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#6C3483"/><stop offset="100%" stop-color="#4A235A"/></linearGradient>` +
    `<linearGradient id="g2" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#F5E6C8"/><stop offset="100%" stop-color="#D4B896"/></linearGradient>`,
    `<rect x="3" y="3" width="18" height="18" rx="2" fill="url(#g1)" stroke="${O}" stroke-width="1.5"/>` +
    `<rect x="3" y="3" width="4" height="18" rx="2" fill="#3D1B5E" stroke="${O}" stroke-width="1.5"/>` +
    `<rect x="7" y="5" width="12.5" height="14" rx="1" fill="url(#g2)" stroke="${O}" stroke-width=".7"/>` +
    `<rect x="17.5" y="10" width="3.5" height="4" rx="1" fill="#D4AF37" stroke="${O}" stroke-width=".7"/>` +
    `<circle cx="19.3" cy="12" r=".7" fill="#8B6914"/>` +
    `<circle cx="13" cy="12" r="3" fill="none" stroke="#D4AF37" stroke-width=".7" opacity=".5"/>` +
    `<polygon points="13,9.5 13.8,11.2 15.5,11.5 14.2,12.8 14.5,14.5 13,13.5 11.5,14.5 11.8,12.8 10.5,11.5 12.2,11.2" fill="#D4AF37" opacity=".45"/>` +
    `<circle cx="13" cy="12" r="4.5" fill="#D4AF37" opacity=".06"/>`,
    a
  ),

  /* ── Achievements: gem-studded shield ── */
  achievements: (a) => toUri(
    `<linearGradient id="g1" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#D4AF37"/><stop offset="100%" stop-color="#8B6914"/></linearGradient>` +
    `<linearGradient id="g2" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#3498DB"/><stop offset="100%" stop-color="#2471A3"/></linearGradient>`,
    `<path d="M12,2 L20,6 L20,13 Q20,20 12,22 Q4,20 4,13 L4,6 Z" fill="url(#g1)" stroke="${O}" stroke-width="1.5"/>` +
    `<path d="M12,4 L18,7.5 L18,13 Q18,18.5 12,20 Q6,18.5 6,13 L6,7.5 Z" fill="url(#g2)" stroke="${O}" stroke-width=".7"/>` +
    `<polygon points="12,8 14,11 12,14 10,11" fill="#E74C3C" stroke="${O}" stroke-width=".7"/>` +
    `<polygon points="12,8.5 13,10.5 12,12.5 11,10.5" fill="#FF6B6B" opacity=".4"/>` +
    `<ellipse cx="8" cy="9.5" rx="1.5" ry="2" fill="#fff" opacity=".12" transform="rotate(-10 8 9.5)"/>`,
    a
  ),

  /* ── Leaderboard: ruby crown ── */
  leaderboard: (a) => toUri(
    `<linearGradient id="g1" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#F1C40F"/><stop offset="100%" stop-color="#D4AF37"/></linearGradient>`,
    `<path d="M4,18 L4,12 L7.5,14 L12,8 L16.5,14 L20,12 L20,18 Z" fill="url(#g1)" stroke="${O}" stroke-width="1.5" stroke-linejoin="round"/>` +
    `<rect x="4" y="17" width="16" height="3" rx="1" fill="#B8860B" stroke="${O}" stroke-width="1.2"/>` +
    `<circle cx="4" cy="12" r="1.5" fill="#F1C40F" stroke="${O}" stroke-width=".7"/>` +
    `<circle cx="12" cy="8" r="1.5" fill="#F1C40F" stroke="${O}" stroke-width=".7"/>` +
    `<circle cx="20" cy="12" r="1.5" fill="#F1C40F" stroke="${O}" stroke-width=".7"/>` +
    `<polygon points="12,14.5 13.5,17 12,19.2 10.5,17" fill="#E74C3C" stroke="${O}" stroke-width=".5"/>` +
    `<polygon points="12,15 12.8,17 12,18.5 11.2,17" fill="#FF6B6B" opacity=".4"/>` +
    `<circle cx="7.5" cy="18.2" r="1" fill="#3498DB" stroke="${O}" stroke-width=".4"/>` +
    `<circle cx="16.5" cy="18.2" r="1" fill="#2ECC71" stroke="${O}" stroke-width=".4"/>` +
    `<ellipse cx="8" cy="14" rx="1.5" ry="1" fill="#fff" opacity=".15"/>`,
    a
  ),

  /* ── Inventory: adventurer backpack ── */
  inventory: (a) => toUri(
    `<linearGradient id="g1" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#A0522D"/><stop offset="100%" stop-color="#6B3410"/></linearGradient>`,
    `<rect x="5" y="7" width="14" height="14" rx="3" fill="url(#g1)" stroke="${O}" stroke-width="1.5"/>` +
    `<path d="M5,10 L12,7 L19,10" fill="#8B4513" stroke="${O}" stroke-width="1"/>` +
    `<path d="M8,7 L8,3.5 Q8,2 10,2 L14,2 Q16,2 16,3.5 L16,7" fill="none" stroke="#6B3410" stroke-width="2.2"/>` +
    `<path d="M8,7 L8,3.5 Q8,2 10,2 L14,2 Q16,2 16,3.5 L16,7" fill="none" stroke="#A0522D" stroke-width="1.2"/>` +
    `<rect x="8" y="13" width="8" height="5" rx="1.5" fill="#7B3F00" stroke="${O}" stroke-width=".7"/>` +
    `<rect x="10.5" y="12" width="3" height="2.5" rx=".5" fill="#D4AF37" stroke="${O}" stroke-width=".6"/>` +
    `<rect x="11.2" y="12.5" width="1.6" height="1.5" rx=".3" fill="#8B6914"/>` +
    `<ellipse cx="8" cy="10.5" rx="1.5" ry="2" fill="#fff" opacity=".1"/>`,
    a
  ),

  /* ── Gacha: mystical glowing egg ── */
  gacha: (a) => toUri(
    `<radialGradient id="g1" cx="50%" cy="40%" r="50%"><stop offset="0%" stop-color="#E8D5F5"/><stop offset="50%" stop-color="#9B59B6"/><stop offset="100%" stop-color="#6C3483"/></radialGradient>`,
    `<ellipse cx="12" cy="13" rx="7" ry="9" fill="url(#g1)" stroke="${O}" stroke-width="1.5"/>` +
    `<path d="M8,10 L10,12 L8,14" fill="none" stroke="#D4AF37" stroke-width=".7" opacity=".45"/>` +
    `<path d="M16,10 L14,12 L16,14" fill="none" stroke="#D4AF37" stroke-width=".7" opacity=".45"/>` +
    `<path d="M10,7 L12,9 L14,7" fill="none" stroke="#D4AF37" stroke-width=".7" opacity=".45"/>` +
    `<polygon points="12,11 12.7,12.5 14.3,12.7 13.1,13.7 13.4,15.3 12,14.5 10.6,15.3 10.9,13.7 9.7,12.7 11.3,12.5" fill="#D4AF37" stroke="${O}" stroke-width=".4"/>` +
    `<ellipse cx="12" cy="13" rx="8" ry="10" fill="#D4AF37" opacity=".05"/>` +
    `<ellipse cx="9.5" cy="9" rx="2" ry="2.5" fill="#fff" opacity=".2" transform="rotate(-10 9.5 9)"/>`,
    a
  ),

  /* ── Shop: potion flask with coins ── */
  shop: (a) => toUri(
    `<linearGradient id="g1" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#2ECC71"/><stop offset="100%" stop-color="#1E8449"/></linearGradient>`,
    `<path d="M9,10 L6,17 Q5.5,21 9,21 L15,21 Q18.5,21 18,17 L15,10 Z" fill="url(#g1)" stroke="${O}" stroke-width="1.5"/>` +
    `<rect x="10" y="5" width="4" height="5.5" rx="1" fill="#E0E0E0" stroke="${O}" stroke-width="1.2"/>` +
    `<rect x="9.5" y="3" width="5" height="3" rx="1.5" fill="#8B6914" stroke="${O}" stroke-width="1"/>` +
    `<circle cx="10" cy="17" r="1" fill="#5DFFAA" opacity=".4"/>` +
    `<circle cx="14" cy="15.5" r=".7" fill="#5DFFAA" opacity=".3"/>` +
    `<circle cx="12" cy="19" r=".5" fill="#5DFFAA" opacity=".25"/>` +
    `<ellipse cx="8.5" cy="13" rx="1" ry="2" fill="#fff" opacity=".15"/>` +
    `<ellipse cx="20" cy="18" rx="2.5" ry="2.5" fill="#D4AF37" stroke="${O}" stroke-width="1"/>` +
    `<ellipse cx="20" cy="17.5" rx="1.8" ry="1.5" fill="#F1C40F" opacity=".5"/>`,
    a
  ),

  /* ── Home: slime cave ── */
  home: (a) => toUri(
    `<radialGradient id="g1" cx="50%" cy="70%" r="40%"><stop offset="0%" stop-color="#F4A460"/><stop offset="100%" stop-color="#3D2017"/></radialGradient>` +
    `<linearGradient id="g2" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#8B7355"/><stop offset="100%" stop-color="#5C4033"/></linearGradient>`,
    `<path d="M2,20 Q4,10 8,8 Q10,6 12,4 Q14,6 16,8 Q20,10 22,20 Z" fill="url(#g2)" stroke="${O}" stroke-width="1.5"/>` +
    `<ellipse cx="12" cy="20" rx="5" ry="5.5" fill="url(#g1)"/>` +
    `<ellipse cx="12" cy="20" rx="5" ry="5.5" fill="none" stroke="${O}" stroke-width="1.2"/>` +
    `<circle cx="12" cy="17" r="1.5" fill="#8FE86A" opacity=".6"/>` +
    `<circle cx="11.5" cy="16.8" r=".4" fill="#fff" opacity=".4"/>` +
    `<line x1="2" y1="20" x2="22" y2="20" stroke="${O}" stroke-width="1.5"/>` +
    `<circle cx="6" cy="12" r=".5" fill="#D4AF37" opacity=".4"/>` +
    `<circle cx="18" cy="11" r=".4" fill="#D4AF37" opacity=".3"/>`,
    a
  ),

  /* ── Community: guild banner/flag ── */
  community: (a) => toUri(
    `<linearGradient id="g1" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#E74C3C"/><stop offset="100%" stop-color="#922B21"/></linearGradient>`,
    `<rect x="5" y="2" width="2.5" height="20" rx=".5" fill="#8B6914" stroke="${O}" stroke-width="1"/>` +
    `<circle cx="6.2" cy="2.5" r="1.2" fill="#D4AF37" stroke="${O}" stroke-width=".6"/>` +
    `<path d="M7.5,4 L20,4 L20,14 L17,12 L14,14 L7.5,14 Z" fill="url(#g1)" stroke="${O}" stroke-width="1.5"/>` +
    `<path d="M20,4 L17,12 L14,14 L20,14 Z" fill="#922B21" opacity=".3"/>` +
    `<circle cx="13" cy="9" r="2.5" fill="none" stroke="#D4AF37" stroke-width="1" opacity=".6"/>` +
    `<polygon points="13,7 13.5,8.3 14.8,8.5 13.9,9.3 14.1,10.6 13,10 11.9,10.6 12.1,9.3 11.2,8.5 12.5,8.3" fill="#D4AF37" opacity=".6"/>` +
    `<ellipse cx="10" cy="6" rx="1.5" ry="1" fill="#fff" opacity=".1"/>`,
    a
  ),

  /* ── Merge: alchemy cauldron ── */
  merge: (a) => toUri(
    `<radialGradient id="g1" cx="50%" cy="30%" r="60%"><stop offset="0%" stop-color="#A569BD"/><stop offset="100%" stop-color="#4A235A"/></radialGradient>` +
    `<linearGradient id="g2" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#555"/><stop offset="100%" stop-color="#333"/></linearGradient>`,
    `<ellipse cx="12" cy="16" rx="8" ry="5.5" fill="url(#g2)" stroke="${O}" stroke-width="1.5"/>` +
    `<path d="M4,14 Q4,22 12,22 Q20,22 20,14" fill="url(#g2)" stroke="${O}" stroke-width="1.5"/>` +
    `<ellipse cx="12" cy="14" rx="8" ry="3.5" fill="url(#g1)" stroke="${O}" stroke-width="1.2"/>` +
    `<path d="M6,14 L4,12 L3,14" fill="none" stroke="${O}" stroke-width="1.2"/>` +
    `<path d="M18,14 L20,12 L21,14" fill="none" stroke="${O}" stroke-width="1.2"/>` +
    `<circle cx="9" cy="13" r="1.2" fill="#D4AF37" opacity=".5"/>` +
    `<circle cx="14" cy="12.5" r=".8" fill="#2ECC71" opacity=".5"/>` +
    `<circle cx="11" cy="11" r=".6" fill="#D4AF37" opacity=".4"/>` +
    `<circle cx="9" cy="9" r=".7" fill="#A569BD" opacity=".5"/>` +
    `<circle cx="13" cy="8" r=".9" fill="#A569BD" opacity=".4"/>` +
    `<circle cx="15" cy="10" r=".5" fill="#2ECC71" opacity=".4"/>` +
    `<circle cx="11" cy="7" r=".5" fill="#D4AF37" opacity=".3"/>`,
    a
  ),

  /* ── Discovery: treasure map ── */
  discovery: (a) => toUri(
    `<linearGradient id="g1" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="#F5E6C8"/><stop offset="100%" stop-color="#C4A67D"/></linearGradient>`,
    `<rect x="3" y="4" width="18" height="16" rx="1.5" fill="url(#g1)" stroke="${O}" stroke-width="1.5" transform="rotate(-3 12 12)"/>` +
    `<path d="M5,8 Q8,6 10,9 Q12,12 15,10 Q18,8 20,11" fill="none" stroke="#8B6914" stroke-width="1" stroke-dasharray="2 1.5" opacity=".5"/>` +
    `<path d="M5,14 Q8,12 11,15 Q14,18 18,15" fill="none" stroke="#8B6914" stroke-width=".8" opacity=".3"/>` +
    `<path d="M14,13 L17,10 M17,13 L14,10" stroke="#C0392B" stroke-width="1.8" stroke-linecap="round"/>` +
    `<circle cx="7" cy="17" r="2" fill="none" stroke="#8B6914" stroke-width=".8" opacity=".4"/>` +
    `<path d="M7,15 L7,17 M5.5,16.5 L8.5,16.5" stroke="#8B6914" stroke-width=".6" opacity=".4"/>` +
    `<circle cx="15.5" cy="11.5" r=".5" fill="#D4AF37" opacity=".6"/>`,
    a
  ),

  /* ── Mini: dice with sword ── */
  mini: (a) => toUri(
    `<linearGradient id="g1" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="#ECF0F1"/><stop offset="100%" stop-color="#BDC3C7"/></linearGradient>`,
    `<rect x="3" y="7" width="14" height="14" rx="2.5" fill="url(#g1)" stroke="${O}" stroke-width="1.5"/>` +
    `<circle cx="7" cy="11" r="1" fill="${O}"/>` +
    `<circle cx="13" cy="11" r="1" fill="${O}"/>` +
    `<circle cx="10" cy="14" r="1" fill="${O}"/>` +
    `<circle cx="7" cy="17" r="1" fill="${O}"/>` +
    `<circle cx="13" cy="17" r="1" fill="${O}"/>` +
    `<line x1="19" y1="2" x2="14" y2="13" stroke="#8B8B8B" stroke-width="2" stroke-linecap="round"/>` +
    `<line x1="19" y1="2" x2="14" y2="13" stroke="#BDC3C7" stroke-width="1" stroke-linecap="round"/>` +
    `<path d="M18,2 L20,1.5 L20.5,3.5 L19,3 Z" fill="#D4AF37" stroke="${O}" stroke-width=".6"/>` +
    `<rect x="13" y="11.5" width="3" height="1.5" rx=".5" fill="#8B6914" stroke="${O}" stroke-width=".5"/>`,
    a
  ),

  /* ── Collection: treasure chest with gems ── */
  collection: (a) => toUri(
    `<linearGradient id="g1" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#A0522D"/><stop offset="100%" stop-color="#6B3410"/></linearGradient>` +
    `<linearGradient id="g2" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#8B6914"/><stop offset="100%" stop-color="#6B4F10"/></linearGradient>`,
    `<rect x="3" y="12" width="18" height="9" rx="2" fill="url(#g1)" stroke="${O}" stroke-width="1.5"/>` +
    `<rect x="3" y="12" width="18" height="3" fill="#8B4513" stroke="${O}" stroke-width="1"/>` +
    `<path d="M3,12 L3,8 Q3,5 6,5 L18,5 Q21,5 21,8 L21,12" fill="url(#g2)" stroke="${O}" stroke-width="1.5"/>` +
    `<rect x="10.5" y="11" width="3" height="3" rx=".5" fill="#D4AF37" stroke="${O}" stroke-width=".7"/>` +
    `<circle cx="12" cy="12.5" r=".6" fill="#8B6914"/>` +
    `<polygon points="8,8 8.5,9.5 7,9.5" fill="#E74C3C" stroke="${O}" stroke-width=".4"/>` +
    `<polygon points="12,6.5 12.8,8 11.2,8" fill="#3498DB" stroke="${O}" stroke-width=".4"/>` +
    `<polygon points="16,8 16.5,9.5 15,9.5" fill="#2ECC71" stroke="${O}" stroke-width=".4"/>` +
    `<ellipse cx="7" cy="7" rx="2" ry="1" fill="#fff" opacity=".1"/>`,
    a
  ),

  /* ── Profile: adventurer portrait frame ── */
  profile: (a) => toUri(
    `<linearGradient id="g1" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#D4AF37"/><stop offset="100%" stop-color="#8B6914"/></linearGradient>` +
    `<radialGradient id="g2" cx="50%" cy="40%" r="50%"><stop offset="0%" stop-color="#4A6FA5"/><stop offset="100%" stop-color="#2C3E50"/></radialGradient>`,
    `<rect x="3" y="2" width="18" height="20" rx="2" fill="url(#g1)" stroke="${O}" stroke-width="1.5"/>` +
    `<rect x="5" y="4" width="14" height="16" rx="1" fill="url(#g2)"/>` +
    `<circle cx="12" cy="10" r="3.5" fill="#E8D5A3" stroke="${O}" stroke-width=".8"/>` +
    `<circle cx="12" cy="10" r="3.5" fill="#D4B896"/>` +
    `<path d="M7,20 Q7,15 12,14 Q17,15 17,20" fill="#6C3483" stroke="${O}" stroke-width=".7"/>` +
    `<circle cx="12" cy="9.5" r="2.5" fill="#E8D5A3"/>` +
    `<ellipse cx="12" cy="7.5" rx="2.8" ry="1.5" fill="#5C3317"/>` +
    `<circle cx="11" cy="9.5" r=".4" fill="${O}"/>` +
    `<circle cx="13" cy="9.5" r=".4" fill="${O}"/>` +
    `<path d="M11.3,11 Q12,11.8 12.7,11" fill="none" stroke="${O}" stroke-width=".4"/>` +
    `<polygon points="12,2 13,3.5 11,3.5" fill="#D4AF37" stroke="${O}" stroke-width=".4"/>`,
    a
  ),
};

/**
 * Returns a game icon as a data URI string.
 * @param name Icon identifier (e.g. "home", "codex", "merge")
 * @param size Ignored in data URI (sizing handled via CSS), kept for API compat
 * @param active true = vibrant colors, false = desaturated/dim
 */
export function getGameIcon(name: string, _size: number = 24, active: boolean = true): string {
  const fn = ICONS[name];
  if (!fn) return "";
  return fn(active);
}
