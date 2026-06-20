import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { createCapture, listCaptures } from "../lib/api.js";

export default function Captures() {
  const queryClient = useQueryClient();
  const captures = useQuery({ queryKey: ["captures"], queryFn: listCaptures });
  const mutation = useMutation({
    mutationFn: createCapture,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["captures"] })
  });

  function submit(event) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    mutation.mutate({
      organization_id: "demo-org",
      rep_id: "demo-rep",
      source: "web",
      raw_text: form.get("raw_text"),
      prospect_name: form.get("prospect_name"),
      company_name: form.get("company_name"),
      notes: form.get("notes")
    });
    event.currentTarget.reset();
  }

  return (
    <section className="stack">
      <header className="page-header">
        <div>
          <p className="eyebrow">Review Queue</p>
          <h2>Lead captures</h2>
        </div>
        <span className="badge">Action-priority sorting</span>
      </header>

      <form className="card form-grid" onSubmit={submit}>
        <label>
          Prospect name
          <input name="prospect_name" placeholder="Ada Lovelace" />
        </label>
        <label>
          Company
          <input name="company_name" placeholder="Analytical Engines Inc." />
        </label>
        <label className="full">
          WhatsApp/card text
          <textarea name="raw_text" placeholder="Paste OCR text or WhatsApp notes for local testing" />
        </label>
        <label className="full">
          Conversation notes
          <textarea name="notes" placeholder="Mentioned partnerships, hiring, funding, expansion..." />
        </label>
        <button disabled={mutation.isPending}>
          {mutation.isPending ? "Queueing..." : "Create test capture"}
        </button>
      </form>

      <div className="grid">
        {(captures.data || []).map((capture) => (
          <Link className="card capture-card" to={`/captures/${capture.id}`} key={capture.id}>
            <div>
              <h3>{capture.prospect_name || "Unknown prospect"}</h3>
              <p>{capture.company_name || "Company pending"}</p>
            </div>
            <span className={`status ${capture.status}`}>{capture.status}</span>
            {capture.warnings?.length ? (
              <p className="warning">{capture.warnings[0]}</p>
            ) : null}
          </Link>
        ))}
      </div>
    </section>
  );
}

