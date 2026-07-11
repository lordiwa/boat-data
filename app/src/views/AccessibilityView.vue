<script setup lang="ts">
// app/src/views/AccessibilityView.vue
//
// TASK-018: a code-level accessibility statement (not an overlay widget —
// see the ticket's engineering-guidance framing). States the conformance
// target, points at how the target is enforced (axe-core in the test
// suite, per PROJECT conventions), lists known limitations honestly rather
// than claiming perfect conformance, and gives a real contact channel for
// anyone who hits a barrier.
const LAST_UPDATED = '2026-07-11';
const CONTACT_EMAIL = 'srparca@gmail.com';
</script>

<template>
  <div class="accessibility container">
    <h1>Accessibility statement</h1>

    <p>
      DataYacht is committed to making this site usable by as many people as possible, including people who use
      assistive technology such as screen readers, screen magnifiers, or keyboard-only navigation.
    </p>

    <section class="accessibility__section">
      <h2>Conformance target</h2>
      <p>
        This site targets <strong>WCAG 2.1 Level AA</strong> (Web Content Accessibility Guidelines). We aim for
        semantic HTML first, ARIA only where semantics alone can&rsquo;t express a control&rsquo;s role or state,
        visible keyboard focus indicators throughout, and text/background color combinations that meet the AA
        contrast ratio (4.5:1 for normal text).
      </p>
      <p>
        Conformance is checked with automated <code>axe-core</code> scans that run as part of this app&rsquo;s
        automated test suite on every change, so accessibility regressions are caught before they reach the site
        &mdash; not bolted on afterward with an overlay widget.
      </p>
    </section>

    <section class="accessibility__section">
      <h2>Known limitations</h2>
      <p>
        We are not aware of any outstanding critical or serious accessibility barriers as of the date below. If
        that changes &mdash; or if you find one we missed &mdash; please let us know using the contact channel
        below and we will investigate.
      </p>
    </section>

    <section class="accessibility__section">
      <h2>Reporting an accessibility issue</h2>
      <p>
        If you encounter an accessibility barrier anywhere on this site, please email
        <a :href="`mailto:${CONTACT_EMAIL}`">{{ CONTACT_EMAIL }}</a> with the page URL and a description of the
        problem (and, if possible, the assistive technology and browser you were using). We will do our best to
        respond promptly.
      </p>
    </section>

    <p class="accessibility__updated">Last updated: {{ LAST_UPDATED }}</p>
  </div>
</template>

<style scoped>
.accessibility {
  padding: 2.5rem 1.5rem 4rem;
  max-width: 720px;
}

.accessibility__section {
  margin-top: 1.75rem;
}

.accessibility__section h2 {
  font-size: 1.15rem;
  margin-bottom: 0.5rem;
}

/* TASK-018: this page's mailto link sits inline in a sentence, unlike every
   other link in the app (nav items, chips, table cells) which are visually
   set off from body text by their own layout. A link inside a run of body
   text needs a non-color cue at rest (WCAG 1.4.1 Use of Color) — the app's
   global `a:hover { text-decoration: underline }` alone isn't enough here. */
.accessibility__section p a {
  text-decoration: underline;
}

.accessibility__updated {
  margin-top: 2.5rem;
  color: var(--color-text-muted);
  font-size: 0.9rem;
}
</style>
