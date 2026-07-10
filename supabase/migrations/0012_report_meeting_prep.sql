alter table public.reports
add column meeting_prep jsonb not null default '{
  "objective": "Prepare for the next meeting with verified context and a clear follow-up plan.",
  "agenda": [],
  "talking_points": [],
  "discovery_questions": [],
  "avoid": [],
  "likely_objections": [],
  "follow_up_plan": [],
  "crm_notes": []
}';
