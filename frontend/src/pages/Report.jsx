import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useParams } from "react-router-dom";
import { createReview, getAgentRun, getReport, regenerateDraft, syncHubSpot } from "../lib/api.js";

export default function Report() {
  const { captureId } = useParams();
  const queryClient = useQueryClient();
  const report = useQuery({ queryKey: ["report", captureId], queryFn: () => getReport(captureId), retry: false });
  const agentRun = useQuery({ queryKey: ["agentRun", captureId], queryFn: () => getAgentRun(captureId), retry: false });

  const review = useMutation({
    mutationFn: createReview,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["report", captureId] })
  });
  const regenerate = useMutation({
    mutationFn: ({ draftId, command }) => regenerateDraft(draftId, { command }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["report", captureId] })
  });
  const crm = useMutation({ mutationFn: syncHubSpot });

  if (report.isLoading) return <p>Loading report...</p>;
  if (report.isError) return <p className="warning">Report is not ready yet. Refresh after the workflow finishes.</p>;

  const data = report.data;

  return (
    <section className="stack">
      <header className="page-header">
        <div>
          <p className="eyebrow">Review-ready report</p>
          <h2>{data.contact.name || "Unknown contact"} · {data.company.name || "Unknown company"}</h2>
        </div>
        <span className={`badge ${data.confidence}`}>{data.confidence} confidence</span>
      </header>

      <section className="card action-card">
        <p className="eyebrow">Recommended action</p>
        <h3>{data.strategy.recommended_angle}</h3>
        <p>{data.strategy.next_best_action}</p>
        <p><strong>CTA:</strong> {data.strategy.suggested_cta}</p>
        {data.warnings.map((warning) => <p className="warning" key={warning}>{warning}</p>)}
      </section>

      <section className="two-column">
        <div className="card">
          <h3>Signals</h3>
          {data.signals.map((signal) => (
            <div className="row" key={signal.id}>
              <div>
                <strong>{signal.signal_type}</strong>
                <p>{signal.summary}</p>
                {signal.inferred ? <span className="badge inferred">Inferred</span> : null}
              </div>
              <span className={`badge ${signal.confidence}`}>{signal.confidence}</span>
            </div>
          ))}
        </div>
        <div className="card">
          <h3>Evidence</h3>
          {data.sources.map((source) => (
            <div className="source" key={source.id}>
              <strong>{source.title}</strong>
              <p>{source.snippet}</p>
              {source.is_personal_social ? <span className="badge inferred">Personal social</span> : null}
            </div>
          ))}
        </div>
      </section>

      <section className="card stack">
        <h3>Draft review</h3>
        {data.drafts.map((draft) => (
          <article className="draft" key={draft.id}>
            <div className="draft-header">
              <strong>{draft.draft_type}</strong>
              <span className="badge">{draft.review_status}</span>
            </div>
            {draft.subject ? <p><strong>Subject:</strong> {draft.subject}</p> : null}
            <pre>{draft.body}</pre>
            {draft.inferred_claims_used ? <p className="warning">Uses inferred claims: {draft.inferred_claim_notes.join("; ")}</p> : null}
            <div className="actions">
              <button onClick={() => review.mutate({ capture_id: captureId, target_type: "draft", target_id: draft.id, action: "approve" })}>Approve draft</button>
              <button onClick={() => review.mutate({ capture_id: captureId, target_type: "draft", target_id: draft.id, action: "reject" })}>Reject</button>
              <button onClick={() => regenerate.mutate({ draftId: draft.id, command: "shorter" })}>Shorter</button>
              <button onClick={() => regenerate.mutate({ draftId: draft.id, command: "remove inferred claims" })}>Remove inferred claims</button>
            </div>
          </article>
        ))}
      </section>

      <section className="card stack">
        <h3>CRM sync</h3>
        <div className="actions">
          <button onClick={() => review.mutate({ capture_id: captureId, target_type: "capture", target_id: captureId, action: "approve_crm_sync" })}>Approve CRM sync</button>
          <button onClick={() => crm.mutate({ capture_id: captureId })}>Sync HubSpot</button>
        </div>
        {crm.data ? <p>{crm.data.message}</p> : null}
        {crm.error ? <p className="warning">{crm.error.message}</p> : null}
      </section>

      <section className="card">
        <h3>Agent trace</h3>
        {(agentRun.data?.steps || []).map((step) => (
          <div className="trace-step" key={step.id}>
            <strong>{step.name}</strong>
            <span>{step.status}</span>
            <p>{step.rationale || step.output_summary}</p>
          </div>
        ))}
      </section>
    </section>
  );
}

