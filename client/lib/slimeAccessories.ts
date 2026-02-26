// SVG accessory overlays for slime sprites
// Each function returns SVG markup to be overlaid on the slime body at specified coordinates

export interface AccessoryDef {
  id: number;
  name: string;
  name_en: string;
  slot: "head" | "face" | "body";
  icon: string;
  cost_gold: number;
  cost_gems: number;
  svg_overlay: string;
}

// Generate SVG overlay for a specific accessory
// Returns SVG string to be placed inside the slime SVG viewBox (0 0 100 100)
export function getAccessorySvg(overlayId: string): string {
  switch (overlayId) {
    case "ribbon_red":
      return `
        <g transform="translate(50, 18)">
          <path d="M-8,0 C-12,-6 -6,-10 0,-4 C6,-10 12,-6 8,0 C4,4 0,2 0,2 C0,2 -4,4 -8,0Z" fill="#FF6B6B" stroke="#CC4444" stroke-width="0.5"/>
          <circle cx="0" cy="0" r="2" fill="#CC4444"/>
          <path d="M-2,2 L-4,8" stroke="#FF6B6B" stroke-width="1.5" stroke-linecap="round"/>
          <path d="M2,2 L4,8" stroke="#FF6B6B" stroke-width="1.5" stroke-linecap="round"/>
        </g>`;

    case "crown":
      return `
        <g transform="translate(50, 14)">
          <path d="M-12,6 L-10,-2 L-6,3 L0,-6 L6,3 L10,-2 L12,6 Z" fill="#FFD700" stroke="#DAA520" stroke-width="0.5"/>
          <rect x="-12" y="5" width="24" height="4" rx="1" fill="#FFD700" stroke="#DAA520" stroke-width="0.5"/>
          <circle cx="-6" cy="2" r="1.2" fill="#FF6B6B"/>
          <circle cx="0" cy="-2" r="1.5" fill="#74B9FF"/>
          <circle cx="6" cy="2" r="1.2" fill="#55EFC4"/>
        </g>`;

    case "wizard_hat":
      return `
        <g transform="translate(50, 8)">
          <path d="M-14,16 L0,-8 L14,16 Z" fill="#6C5CE7" stroke="#4834B5" stroke-width="0.5"/>
          <ellipse cx="0" cy="16" rx="16" ry="3" fill="#4834B5"/>
          <circle cx="0" cy="-6" r="2.5" fill="#FFEAA7">
            <animate attributeName="opacity" values="1;0.5;1" dur="2s" repeatCount="indefinite"/>
          </circle>
          <circle cx="-5" cy="5" r="1" fill="#FFEAA7" opacity="0.5"/>
          <circle cx="4" cy="8" r="0.8" fill="#FFEAA7" opacity="0.4"/>
        </g>`;

    case "flower_crown":
      return `
        <g transform="translate(50, 18)">
          <path d="M-12,2 Q-8,-2 -4,1 Q0,-3 4,1 Q8,-2 12,2" fill="none" stroke="#55EFC4" stroke-width="1.5"/>
          <circle cx="-8" cy="0" r="3" fill="#FF9FF3" opacity="0.9"/>
          <circle cx="-8" cy="0" r="1.2" fill="#FFEAA7"/>
          <circle cx="0" cy="-2" r="3.5" fill="#FD79A8" opacity="0.9"/>
          <circle cx="0" cy="-2" r="1.4" fill="#FFEAA7"/>
          <circle cx="8" cy="0" r="3" fill="#A29BFE" opacity="0.9"/>
          <circle cx="8" cy="0" r="1.2" fill="#FFEAA7"/>
          <circle cx="-4" cy="1" r="2" fill="#74B9FF" opacity="0.7"/>
          <circle cx="4" cy="1" r="2" fill="#FF6B6B" opacity="0.7"/>
        </g>`;

    case "santa_hat":
      return `
        <g transform="translate(50, 10)">
          <path d="M-12,12 Q-4,-4 10,-8 L12,-6 Q2,-2 -6,10 Z" fill="#FF3B30" stroke="#CC2200" stroke-width="0.5"/>
          <ellipse cx="-10" cy="12" rx="14" ry="3" fill="white"/>
          <circle cx="11" cy="-7" r="3" fill="white"/>
        </g>`;

    case "cat_ears":
      return `
        <g transform="translate(50, 14)">
          <path d="M-14,4 L-10,-10 L-4,2 Z" fill="#FFB8A0" stroke="#E17055" stroke-width="0.5"/>
          <path d="M-12,2 L-10,-6 L-6,1 Z" fill="#FF9FF3" opacity="0.6"/>
          <path d="M14,4 L10,-10 L4,2 Z" fill="#FFB8A0" stroke="#E17055" stroke-width="0.5"/>
          <path d="M12,2 L10,-6 L6,1 Z" fill="#FF9FF3" opacity="0.6"/>
        </g>`;

    case "heart_glasses":
      return `
        <g transform="translate(50, 30)">
          <path d="M-13,-3 C-13,-7 -9,-7 -7,-4 C-5,-7 -1,-7 -1,-3 C-1,1 -7,5 -7,5 C-7,5 -13,1 -13,-3Z" fill="#FF6B6B" opacity="0.85"/>
          <path d="M1,-3 C1,-7 5,-7 7,-4 C9,-7 13,-7 13,-3 C13,1 7,5 7,5 C7,5 1,1 1,-3Z" fill="#FF6B6B" opacity="0.85"/>
          <line x1="-1" y1="-2" x2="1" y2="-2" stroke="#CC4444" stroke-width="1"/>
          <circle cx="-7" cy="-3" r="0.8" fill="white" opacity="0.5"/>
          <circle cx="7" cy="-3" r="0.8" fill="white" opacity="0.5"/>
        </g>`;

    case "round_glasses":
      return `
        <g transform="translate(50, 30)">
          <circle cx="-8" cy="0" r="5.5" fill="none" stroke="#2D3436" stroke-width="1.2"/>
          <circle cx="8" cy="0" r="5.5" fill="none" stroke="#2D3436" stroke-width="1.2"/>
          <line x1="-2.5" y1="0" x2="2.5" y2="0" stroke="#2D3436" stroke-width="1"/>
          <circle cx="-8" cy="-1" r="1" fill="white" opacity="0.3"/>
          <circle cx="8" cy="-1" r="1" fill="white" opacity="0.3"/>
        </g>`;

    case "star_sticker":
      return `
        <g transform="translate(65, 40)">
          <polygon points="0,-6 1.5,-2 6,-2 2.5,1 4,5 0,2.5 -4,5 -2.5,1 -6,-2 -1.5,-2" fill="#FFEAA7" stroke="#DAA520" stroke-width="0.3">
            <animate attributeName="opacity" values="1;0.7;1" dur="2s" repeatCount="indefinite"/>
          </polygon>
        </g>`;

    case "bow_tie":
      return `
        <g transform="translate(50, 68)">
          <path d="M-8,-4 L0,0 L-8,4 Z" fill="#FF6B6B"/>
          <path d="M8,-4 L0,0 L8,4 Z" fill="#FF6B6B"/>
          <circle cx="0" cy="0" r="2" fill="#CC4444"/>
        </g>`;

    case "scarf":
      return `
        <g transform="translate(50, 65)">
          <path d="M-20,0 Q-10,-4 0,-2 Q10,-4 20,0 Q10,4 0,6 Q-10,4 -20,0Z" fill="#55EFC4" stroke="#2D9A65" stroke-width="0.5" opacity="0.9"/>
          <path d="M8,2 L10,14 Q12,16 8,16 L6,4Z" fill="#55EFC4" stroke="#2D9A65" stroke-width="0.5" opacity="0.9"/>
          <line x1="-15" y1="0" x2="15" y2="0" stroke="#2D9A65" stroke-width="0.5" opacity="0.4"/>
        </g>`;

    case "cape":
      return `
        <g>
          <path d="M25,55 Q20,60 18,80 Q25,85 50,86 Q75,85 82,80 Q80,60 75,55" fill="#A29BFE" opacity="0.7" stroke="#6C5CE7" stroke-width="0.5"/>
          <path d="M28,57 Q24,62 22,78 Q28,82 50,83 Q72,82 78,78 Q76,62 72,57" fill="#C8B6FF" opacity="0.3"/>
        </g>`;

    case "angel_wings":
      return `
        <g>
          <path d="M18,48 Q6,35 8,22 Q12,28 16,34 Q14,28 18,20 Q20,30 22,38 Q20,32 24,26 Q24,36 24,44" fill="white" opacity="0.6" stroke="white" stroke-width="0.3">
            <animate attributeName="opacity" values="0.6;0.35;0.6" dur="3s" repeatCount="indefinite"/>
          </path>
          <path d="M82,48 Q94,35 92,22 Q88,28 84,34 Q86,28 82,20 Q80,30 78,38 Q80,32 76,26 Q76,36 76,44" fill="white" opacity="0.6" stroke="white" stroke-width="0.3">
            <animate attributeName="opacity" values="0.6;0.35;0.6" dur="3s" repeatCount="indefinite"/>
          </path>
        </g>`;

    case "devil_horns":
      return `
        <g transform="translate(50, 16)">
          <path d="M-12,4 L-14,-8 Q-12,-10 -10,-6 L-8,2" fill="#FF3B30" stroke="#CC2200" stroke-width="0.5"/>
          <path d="M12,4 L14,-8 Q12,-10 10,-6 L8,2" fill="#FF3B30" stroke="#CC2200" stroke-width="0.5"/>
        </g>`;

    case "rainbow_halo":
      return `
        <g transform="translate(50, 14)">
          <ellipse cx="0" cy="0" rx="18" ry="5" fill="none" stroke-width="2.5"
            stroke="url(#rainbow_grad)">
            <animate attributeName="opacity" values="0.8;0.5;0.8" dur="3s" repeatCount="indefinite"/>
          </ellipse>
        </g>`;

    default:
      return "";
  }
}

// Additional SVG defs needed for some accessories
export function getAccessoryDefs(overlayId: string): string {
  if (overlayId === "rainbow_halo") {
    return `
      <linearGradient id="rainbow_grad" x1="0%" y1="0%" x2="100%" y2="0%">
        <stop offset="0%" stop-color="#FF6B6B"/>
        <stop offset="16%" stop-color="#FFEAA7"/>
        <stop offset="33%" stop-color="#55EFC4"/>
        <stop offset="50%" stop-color="#74B9FF"/>
        <stop offset="66%" stop-color="#A29BFE"/>
        <stop offset="83%" stop-color="#FF9FF3"/>
        <stop offset="100%" stop-color="#FF6B6B"/>
      </linearGradient>`;
  }
  return "";
}
