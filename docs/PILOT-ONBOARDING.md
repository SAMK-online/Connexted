# Pilot Onboarding — First Customer Checklist

A practical week-one plan for putting CONNEXTed in front of a pilot team, setting honest expectations, and collecting the feedback that matters.

## What the pilot proves

CONNEXTed's bet: reps capture more leads, faster, with better follow-up, when the path is **WhatsApp note → enriched report → human-reviewed outreach → CRM**. The pilot should measure exactly that, not feature breadth.

## Before day one (you, ~2 hours)

- [ ] Deploy per the [Deployment Runbook](DEPLOYMENT.md), or run locally and screen-share for a first demo
- [ ] Decide the CRM path: HubSpot native ([Configuration](CONFIGURATION.md#hubspot-setup)), an adapter ([CRM Adapters](CRM-ADAPTERS.md)), or CSV export for week one
- [ ] Twilio WhatsApp sandbox joined by the pilot reps' phones (sandbox is fine for a pilot; production sender approval takes days — start it early if the pilot converts)
- [ ] Create a test capture yourself and walk the full flow once

## Day one with the customer (~45 min working session)

1. **Configure the Playbook together** (`/app/playbook`) — this is the highest-leverage step; strategy and draft quality follow directly from it:
   - ICP and target personas
   - Products/services offered and target sectors (with sector positioning notes)
   - Priority GTM signals (what makes a lead urgent *for them*)
   - Proof points and personalization rules
   - Trusted sources and research resources
2. **Capture a real lead live**: have a rep paste actual notes from a recent event conversation (or send via WhatsApp). Review the report, edit a draft, approve it, sync/export it.
3. **Teach the review model** — this is the pitch, be explicit:
   - Nothing is ever sent automatically; reps approve every action
   - Inferred claims are labeled; warnings show what's missing or low-confidence
   - Every agent step is visible in the run trace
4. **Set expectations** using the "Known limitations" list in the [Deployment Runbook](DEPLOYMENT.md) — shared workspace (no per-user logins yet), conservative template-based drafts, retry button if a capture stalls.

## During the pilot (2–3 weeks)

Ask reps to run **every** event/meeting lead through CONNEXTed — partial adoption produces no signal.

Weekly, look at:
- Captures created vs. captures reaching **review ready** (workflow reliability)
- Drafts approved as-is vs. edited vs. regenerated (content quality — read the edits, they're the feedback)
- Time from conversation to approved follow-up (the metric the product exists to shrink)
- CRM syncs approved (trust in the pipeline)

## The feedback to collect (your ask as the vendor)

1. Where did a report feel *wrong* — bad enrichment, off-target strategy, tone problems in drafts?
2. Which warnings/confidence labels were useful, which were noise?
3. What did reps do *outside* the tool that it should have covered?
4. Would they pay for this at production quality — and which missing capability blocks that? (per-user auth? live LLM drafting? their CRM? mobile?)
5. Playbook gaps: what context did they wish they could give the system?

## Support playbook

| Symptom | Action |
| --- | --- |
| Capture stuck `running` | Capture page → **Retry** (re-queues the workflow) |
| Capture `failed` | Open the agent-run trace for the step error; retry after fixing (usually a provider key/quota issue) |
| WhatsApp message didn't arrive | Check Twilio console logs; verify webhook URL and that the phone joined the sandbox |
| HubSpot sync 502 | The report is intact — check HubSpot app scopes/token, then re-approve sync |
| "mock mode" warning on reports | Expected until provider keys are configured — see the provider matrix in [Configuration](CONFIGURATION.md) |
