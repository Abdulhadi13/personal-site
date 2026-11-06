---
name: Abdulhadi Fatani
description: Bilingual personal website using the supplied style kit.
colors:
  primary: "#4C638B"
  primary-soft: "#E9EEF6"
  paper: "#F7F7F2"
  ink: "#262D3B"
  muted: "#606774"
  muted-surface: "#EEEFEB"
  border: "#DADDDC"
  focus: "#4C638B"
  dark-primary: "#A6BDE4"
  dark-primary-soft: "#2D3C54"
  dark-background: "#171C25"
  dark-text: "#EEF0F5"
  dark-muted: "#B0B9C9"
  dark-muted-surface: "#29323F"
  dark-border: "#3C4758"
  dark-focus: "#BCD0F3"
typography:
  headline:
    fontFamily: '"IBM Plex Sans", "IBM Plex Sans Arabic", sans-serif'
    fontSize: "clamp(1.75rem, 5vw, 2.5rem)"
    fontWeight: 500
    lineHeight: 1.2
    letterSpacing: "-0.025em"
  body:
    fontFamily: '"IBM Plex Sans", "IBM Plex Sans Arabic", sans-serif'
    fontSize: "1rem"
    lineHeight: 1.65
  body-arabic:
    fontFamily: '"IBM Plex Sans Arabic", "IBM Plex Sans", sans-serif'
    fontSize: "1rem"
    lineHeight: 1.9
  label:
    fontFamily: '"IBM Plex Sans", "IBM Plex Sans Arabic", sans-serif'
    fontSize: "1rem"
    fontWeight: 500
    lineHeight: 1.5
rounded:
  sm: "4px"
spacing:
  "1": "0.25rem"
  "2": "0.5rem"
  "3": "0.75rem"
  "4": "1rem"
  "6": "1.5rem"
  "8": "2rem"
  "12": "3rem"
components:
  button-quiet:
    backgroundColor: transparent
    textColor: "{colors.primary}"
    typography: "{typography.label}"
    rounded: "{rounded.sm}"
    padding: "0.5rem 1rem"
    height: "2.75rem"
  button-quiet-hover:
    backgroundColor: "{colors.muted-surface}"
  navigation-link:
    textColor: "{colors.muted}"
    rounded: "{rounded.sm}"
    padding: "0.5rem 0.75rem"
  navigation-current:
    backgroundColor: "{colors.primary-soft}"
    textColor: "{colors.primary}"
---

# Design System: Abdulhadi Fatani

## Overview

The supplied style kit is the visual authority. This record captures its implemented subset: bilingual typography, semantic light and dark colors, quiet controls, and section navigation. The source CSS in `styling_guide/kit/` and `src/styles/global.css` remains authoritative when this snapshot differs.

**Key Characteristics:**
- Restrained typography and borders.
- Equivalent English and Arabic presentation.
- Visible navigation and preference controls.

## Colors

### Primary
The kit's primary blue identifies controls and the current navigation item. Its soft counterpart supplies the current item's background. Theme-specific semantic variables resolve these roles; the frontmatter records both modes.

### Neutral
Paper and ink provide the light background and text; dark background and dark text provide their dark-mode equivalents. Muted text, muted surfaces, and border colors distinguish resting navigation, hover states, and the header divider. Focus has its own semantic token.

## Typography

Local IBM Plex Sans and IBM Plex Sans Arabic serve all visible text, with sans-serif fallback and font-display swap. Arabic reverses the family preference and uses its larger body line-height. The construction heading uses the responsive headline role; Arabic headings use a line-height of (1.5). The name and controls use medium weight (500). The heading's maximum measure is (68ch).

## Layout

The header container is centered with maximum width (72rem). Its three columns hold the name, centered navigation, and controls. Container padding is the kit's space-6 step. At widths up to (48rem), navigation spans a second row, header padding uses space-4, and the name and controls remain on the first row.

The shell fills at least the viewport; the construction heading is centered in the remaining main area, with space-12 block padding and space-6 inline padding. Logical CSS properties support Arabic RTL. The minimum page width is (20rem).

## Elevation & Depth

The implemented surface uses no shadows. A thin header border and tonal navigation states provide separation.

## Shapes

Navigation and controls share the kit's small corner radius. The header divider is a single-pixel border. Theme icons are inline, stroked SVGs; there are no raster assets.

## Components

### Buttons

Language and theme controls use the quiet variant: transparent background, primary text, and muted-surface hover. Controls have a minimum height of (2.75rem); the theme control is square. The skip link uses the kit's filled button treatment and becomes visible on focus. Keyboard focus uses a two-pixel outline with four-pixel offset.

Button background transitions use (140ms) and `cubic-bezier(0.16, 1, 0.3, 1)`. Reduced-motion preference disables transitions and animation. No content entrance animation is present.

### Navigation

Four wrapping links identify Home, Projects, Blogs, and About. All links use medium weight (500) so changing the current page does not change their widths. Muted resting text becomes standard text on hover; `aria-current="page"` applies primary text and a soft background. Links retain comfortable control-height targets.

The eight English and Arabic routes share this shell. Language switching preserves the section and changes document language and direction. Theme initially follows the system and a manual choice persists in localStorage. The theme control's space is reserved while its script initializes to prevent header movement; without JavaScript, it remains hidden. Links and content remain usable without JavaScript.

## Do's and Don'ts

### Do:
- **Do** reuse the supplied kit's semantic variables and local fonts.
- **Do** preserve equivalent English and Arabic layouts, labels, and focus visibility.

### Don't:
- **Don't** modify the supplied style kit to create a competing token system.
- **Don't** treat unused kit components or colors as implemented site patterns.
