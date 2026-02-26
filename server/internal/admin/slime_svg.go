package admin

import (
	"fmt"
	"math"
	"strconv"

	"github.com/gofiber/fiber/v2"
)

type slimeColors struct {
	body  string
	light string
	dark  string
	iris  string
}

var elementColors = map[string]slimeColors{
	"water":     {body: "#5BB8F5", light: "#B0DEFF", dark: "#3578D8", iris: "#2B7AE8"},
	"fire":      {body: "#F56B4A", light: "#FFB89C", dark: "#C8382A", iris: "#E83A1E"},
	"grass":     {body: "#48D48E", light: "#AEF5CE", dark: "#289A60", iris: "#22AA58"},
	"light":     {body: "#F2D66A", light: "#FFF8C0", dark: "#D4A428", iris: "#E8B820"},
	"dark":      {body: "#9080D0", light: "#C8B8F5", dark: "#6050A0", iris: "#7858CC"},
	"ice":       {body: "#88F0F0", light: "#D0FAFA", dark: "#50B8C0", iris: "#38C8D8"},
	"electric":  {body: "#FFD060", light: "#FFF4C0", dark: "#D0A038", iris: "#E8A810"},
	"poison":    {body: "#7860E8", light: "#A898FF", dark: "#4830B8", iris: "#6838E0"},
	"earth":     {body: "#E87858", light: "#FFC0A0", dark: "#B04838", iris: "#C04828"},
	"wind":      {body: "#D8E4E8", light: "#F0F5F8", dark: "#A8B8C0", iris: "#88A8B8"},
	"celestial": {body: "#FF80B0", light: "#FFC0D8", dark: "#C84880", iris: "#E830A0"},
}

// speciesHash produces a deterministic hash for per-species variation (matches client)
func speciesHash(speciesID, salt int) uint32 {
	h := uint32(speciesID)*2654435761 + uint32(salt)*340573
	h = ((h >> 16) ^ h) * 0x45d9f3b
	return (h >> 16) ^ h
}

// shiftColor applies a hue/lightness shift to a hex color
func shiftColor(hex string, hueShift, lightShift float64) string {
	r, _ := strconv.ParseInt(hex[1:3], 16, 64)
	g, _ := strconv.ParseInt(hex[3:5], 16, 64)
	b, _ := strconv.ParseInt(hex[5:7], 16, 64)

	rf, gf, bf := float64(r)/255, float64(g)/255, float64(b)/255
	max := math.Max(rf, math.Max(gf, bf))
	min := math.Min(rf, math.Min(gf, bf))
	l := (max + min) / 2
	var h, s float64
	if max != min {
		d := max - min
		if l > 0.5 {
			s = d / (2 - max - min)
		} else {
			s = d / (max + min)
		}
		switch max {
		case rf:
			h = (gf - bf) / d
			if gf < bf {
				h += 6
			}
		case gf:
			h = (bf-rf)/d + 2
		case bf:
			h = (rf-gf)/d + 4
		}
		h *= 60
	}

	h = math.Mod(h+hueShift+360, 360)
	l = math.Max(0.05, math.Min(0.95, l+lightShift/100))

	// HSL to RGB
	a := s * math.Min(l, 1-l)
	f := func(n float64) int {
		k := math.Mod(n+h/30, 12)
		c := l - a*math.Max(math.Min(math.Min(k-3, 9-k), 1), -1)
		return int(math.Round(255 * math.Max(0, math.Min(1, c))))
	}
	return fmt.Sprintf("#%02x%02x%02x", f(0), f(8), f(4))
}

func getSpeciesColorsGo(element string, speciesID int) slimeColors {
	base, ok := elementColors[element]
	if !ok {
		base = elementColors["water"]
	}
	if speciesID == 0 {
		return base
	}
	h1 := speciesHash(speciesID, 100)
	h2 := speciesHash(speciesID, 101)
	hueShift := float64(int(h1%37) - 18)
	lightShift := float64(int(h2%11) - 5)

	return slimeColors{
		body:  shiftColor(base.body, hueShift, lightShift),
		light: shiftColor(base.light, hueShift, lightShift),
		dark:  shiftColor(base.dark, hueShift, lightShift),
		iris:  shiftColor(base.iris, hueShift, lightShift),
	}
}

func (h *AdminHandler) SlimeIcon(c *fiber.Ctx) error {
	speciesID, _ := strconv.Atoi(c.Params("id"))
	element := c.Query("element", "water")
	grade := c.Query("grade", "common")

	colors := getSpeciesColorsGo(element, speciesID)
	deeper := shiftColor(colors.dark, 0, -8)
	uid := fmt.Sprintf("s%d", speciesID)

	// Body shape variation based on species
	variant := speciesHash(speciesID, 1) % 5
	var bodyPath string
	switch variant {
	case 0: // round
		bodyPath = "M25,8 C38,8 46,18 46,30 C46,42 38,48 25,48 C12,48 4,42 4,30 C4,18 12,8 25,8Z"
	case 1: // tall
		bodyPath = "M25,5 C37,5 44,16 44,28 C44,40 40,50 25,50 C10,50 6,40 6,28 C6,16 13,5 25,5Z"
	case 2: // wide
		bodyPath = "M25,10 C42,10 48,20 48,30 C48,42 40,48 25,48 C10,48 2,42 2,30 C2,20 8,10 25,10Z"
	case 3: // droplet
		bodyPath = "M25,6 C30,6 44,18 44,32 C44,43 36,48 25,48 C14,48 6,43 6,32 C6,18 20,6 25,6Z"
	default: // blob
		bodyPath = "M25,8 C36,6 46,16 45,30 C44,42 36,50 25,49 C14,50 5,42 5,30 C4,16 14,6 25,8Z"
	}

	// Grade effects
	var gradeDefs, gradeEffects, sparkles string
	if grade == "legendary" || grade == "mythic" {
		gradeDefs = fmt.Sprintf(`<filter id="glow_%s" x="-30%%" y="-30%%" width="160%%" height="160%%">
      <feGaussianBlur in="SourceGraphic" stdDeviation="3" result="blur"/>
      <feColorMatrix in="blur" type="matrix" values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 0.4 0" result="g"/>
      <feMerge><feMergeNode in="g"/><feMergeNode in="SourceGraphic"/></feMerge>
    </filter>`, uid)
		gradeEffects = fmt.Sprintf(`filter="url(#glow_%s)"`, uid)
	}
	if grade == "mythic" {
		sparkles = `<polygon points="8,12 9,14.5 12,15 9,15.5 8,18 7,15.5 4,15 7,14.5" fill="white" opacity="0.9"><animate attributeName="opacity" values="0.9;0.3;0.9" dur="1.5s" repeatCount="indefinite"/></polygon>
    <polygon points="42,10 43,12.5 46,13 43,13.5 42,16 41,13.5 38,13 41,12.5" fill="white" opacity="0.7"><animate attributeName="opacity" values="0.3;0.9;0.3" dur="2s" repeatCount="indefinite"/></polygon>
    <polygon points="15,42 15.8,44 18,44.5 15.8,45 15,47 14.2,45 12,44.5 14.2,44" fill="white" opacity="0.6"><animate attributeName="opacity" values="0.6;0.2;0.6" dur="1.8s" repeatCount="indefinite"/></polygon>`
	} else if grade == "legendary" {
		sparkles = `<polygon points="10,14 10.8,16 13,16.5 10.8,17 10,19 9.2,17 7,16.5 9.2,16" fill="white" opacity="0.8"><animate attributeName="opacity" values="0.8;0.2;0.8" dur="2s" repeatCount="indefinite"/></polygon>
    <polygon points="40,12 40.6,13.5 42,14 40.6,14.5 40,16 39.4,14.5 38,14 39.4,13.5" fill="white" opacity="0.6"><animate attributeName="opacity" values="0.2;0.8;0.2" dur="1.5s" repeatCount="indefinite"/></polygon>`
	} else if grade == "rare" || grade == "epic" {
		sparkles = `<polygon points="12,16 12.8,18 15,18.5 12.8,19 12,21 11.2,19 9,18.5 11.2,18" fill="white" opacity="0.7"><animate attributeName="opacity" values="0.7;0.2;0.7" dur="2s" repeatCount="indefinite"/></polygon>`
	}

	svg := fmt.Sprintf(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="-5 -8 60 62" width="50" height="50" overflow="visible">
  <defs>
    <radialGradient id="g_%s" cx="38%%" cy="30%%" r="60%%" fx="35%%" fy="28%%">
      <stop offset="0%%" stop-color="%s"/>
      <stop offset="35%%" stop-color="%s"/>
      <stop offset="75%%" stop-color="%s"/>
      <stop offset="100%%" stop-color="%s"/>
    </radialGradient>
    <radialGradient id="j_%s" cx="40%%" cy="25%%" r="55%%">
      <stop offset="0%%" stop-color="white" stop-opacity="0.12"/>
      <stop offset="50%%" stop-color="white" stop-opacity="0.03"/>
      <stop offset="100%%" stop-color="white" stop-opacity="0"/>
    </radialGradient>
    <filter id="o_%s" x="-20%%" y="-20%%" width="140%%" height="140%%">
      <feGaussianBlur stdDeviation="1.8" result="blur"/>
      <feColorMatrix in="blur" type="matrix" values="0 0 0 0 1  0 0 0 0 1  0 0 0 0 1  0 0 0 0.4 0"/>
    </filter>
    %s
  </defs>
  <!-- White outline -->
  <path d="%s" fill="white" filter="url(#o_%s)"/>
  <!-- Body -->
  <path d="%s" fill="url(#g_%s)" %s/>
  <!-- Jelly shine -->
  <path d="%s" fill="url(#j_%s)"/>
  <!-- Highlight -->
  <ellipse cx="18" cy="20" rx="6" ry="4" fill="white" opacity="0.25" transform="rotate(-20,18,20)"/>
  <ellipse cx="15" cy="18" rx="3" ry="2" fill="white" opacity="0.45" transform="rotate(-15,15,18)"/>
  <!-- Eyes -->
  <ellipse cx="18" cy="28" rx="4" ry="4.5" fill="white"/>
  <ellipse cx="32" cy="28" rx="4" ry="4.5" fill="white"/>
  <ellipse cx="18.5" cy="29" rx="2.8" ry="3.2" fill="%s"/>
  <ellipse cx="32.5" cy="29" rx="2.8" ry="3.2" fill="%s"/>
  <ellipse cx="19" cy="28.5" rx="1.2" ry="1.4" fill="black"/>
  <ellipse cx="33" cy="28.5" rx="1.2" ry="1.4" fill="black"/>
  <ellipse cx="19.5" cy="27.8" rx="0.7" ry="0.8" fill="white" opacity="0.9"/>
  <ellipse cx="33.5" cy="27.8" rx="0.7" ry="0.8" fill="white" opacity="0.9"/>
  <!-- Blush -->
  <ellipse cx="13" cy="33" rx="3.5" ry="2" fill="#FF8888" opacity="0.2"/>
  <ellipse cx="37" cy="33" rx="3.5" ry="2" fill="#FF8888" opacity="0.2"/>
  <!-- Mouth -->
  <path d="M22,34 Q25,37 28,34" stroke="%s" stroke-width="0.8" fill="none" stroke-linecap="round"/>
  %s
</svg>`,
		uid, colors.light, colors.body, colors.dark, deeper,
		uid, uid,
		gradeDefs,
		bodyPath, uid,
		bodyPath, uid, gradeEffects,
		bodyPath, uid,
		colors.iris, colors.iris,
		colors.dark,
		sparkles,
	)

	c.Set("Content-Type", "image/svg+xml")
	c.Set("Cache-Control", "public, max-age=86400")
	return c.SendString(svg)
}
