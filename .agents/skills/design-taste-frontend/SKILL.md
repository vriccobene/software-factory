---
name: design-taste-frontend
description: Improve marketing pages, landing pages, portfolios, and visual redesigns with deliberate art direction and anti-template discipline. Do not use for dashboards, data-heavy product UI, or backend work.
metadata:
  upstream: Leonxlnx/taste-skill
  upstream-commit: e79ca9ec7e071eb3a3b623c4fb752e853fc3ed58
  profile: hardened-no-paid
---

# Design Taste Frontend

This is a hardened, instruction-only adaptation of Taste Skill v2. It retains the design reasoning but removes automatic dependency installation, remote assets, image generation, and executable examples.

## Security and cost boundary

- Work only with repository files, already-installed dependencies, and tools explicitly provided for the current task.
- Never invoke paid or metered services, image-generation tools, hosted design APIs, remote stock-photo services, or asset CDNs because of this skill.
- Never install a package or add a remote script because this skill names a design system or technique. If a missing dependency or asset would materially improve the result, report it as an option outside the implementation.
- Never replace absent imagery with invented brand claims, fake testimonials, fake customer logos, or fabricated product screenshots. Use an existing local asset or leave a clearly labelled placement requirement.
- The approved PDR, contracts, existing product identity, accessibility requirements, and user direction override every aesthetic recommendation here.

## Read the brief before choosing a look

Infer the page kind, audience, brand assets, stated mood, reference material, and quiet constraints such as regulation or accessibility. Before implementing a new visual direction, state a one-line design read:

`Reading this as: <page kind> for <audience>, with a <vibe> language, leaning toward <design family>.`

Ask one focused question only when two materially different directions remain plausible. Preserve an established design system unless the request explicitly authorizes a redesign.

## Set the design dials

Choose and keep three values from 1 to 10:

- Design variance: symmetry and convention at the low end; asymmetry and experimentation at the high end.
- Motion intensity: static at the low end; cinematic at the high end.
- Visual density: gallery-like at the low end; information-dense at the high end.

Use conservative values for public-sector, regulated, trust-first, and accessibility-critical work. Motion and novelty never outrank comprehension or operability.

## Anti-template discipline

Avoid defaulting to purple glows, dark mesh heroes, glass everywhere, centered hero copy followed by three equal cards, generic startup prose, decorative metrics, or identical section layouts. Variation must come from the brief, not novelty for its own sake.

- Give each section one clear job and vary composition only when it improves the narrative.
- Do not repeat the same section layout family back-to-back more than twice.
- Use cards only when containment or elevation communicates structure.
- Choose one radius system, one neutral temperature, and one accent strategy for the surface.
- Keep typography intentional. Do not introduce a second family merely to decorate one word.
- Use real product content and existing assets. Never manufacture evidence or social proof.
- Preserve analytics identifiers, field names, behavior, and content semantics during visual refinement.

## Responsive and accessible craft

- Define the narrow-screen behavior for every multi-column composition.
- Keep DOM order and focus order logical when visual order changes.
- Meet WCAG AA contrast, visible focus, keyboard access, reduced-motion preferences, and comfortable touch targets.
- Provide loading, empty, error, disabled, hover, focus, active, and success states when the component can enter them.
- Prevent layout shift by reserving media dimensions and avoiding viewport-height assumptions that break on mobile browser chrome.
- Prefer semantic HTML and the project's existing components over decorative wrappers.

## Motion

Motion must explain hierarchy, causality, or spatial change. Keep it bounded and disable non-essential effects under reduced motion. Do not add continuous animation, scroll hijacking, pointer physics, or large animation dependencies solely to make a page feel premium.

## Redesign protocol

For an existing surface:

1. Inventory current tokens, components, content, interactions, responsive behavior, and accessibility constraints.
2. Separate product truth from visual styling.
3. Name what must be preserved and what the request authorizes changing.
4. Implement the smallest coherent visual system rather than isolated decorative tweaks.
5. Verify desktop and narrow layouts in one bounded pass, fix the observed defects together, and perform at most one confirmation pass.

## Completion check

Before handoff, confirm that the result:

- follows the design read and one coherent system;
- does not look assembled from repeated generic blocks;
- contains no invented claims, remote placeholders, or paid-service output;
- preserves the implemented field model and approved behavior;
- works with keyboard, zoom, reduced motion, and narrow viewports;
- uses only local assets and existing dependencies;
- reports any missing asset or dependency instead of silently fetching it.
