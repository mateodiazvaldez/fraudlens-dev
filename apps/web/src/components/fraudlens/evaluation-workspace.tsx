"use client";

import Image from "next/image";
import { useCallback, useEffect, useState, type ChangeEvent, type FormEvent } from "react";
import {
  createTransactionEvaluation,
  getTransactionEvaluations,
  toTransactionInput,
  type EvaluationForm,
  type EvaluationPage,
  type EvaluationResult,
  type TransactionEvaluation,
} from "@/lib/client/transaction-evaluations";

const PAGE_SIZE = 10;
function localDateTimeValue() {
  const now = new Date();
  return new Date(now.getTime() - now.getTimezoneOffset() * 60_000).toISOString().slice(0, 16);
}
const initialForm: EvaluationForm = {
  transaction_id: "", user_id: "", transaction_datetime: localDateTimeValue(),
  amount: "", currency: "ARS", merchant: "", country: "AR", card_country: "AR",
  cardholder_present: "false", card_present: "false",
};

function dateLabel(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "—" : new Intl.DateTimeFormat("es-AR", { dateStyle: "medium", timeStyle: "short" }).format(date);
}

function moneyLabel(amount: number, currency: string) {
  try { return new Intl.NumberFormat("es-AR", { style: "currency", currency }).format(amount); }
  catch { return `${amount} ${currency}`; }
}

function Brand() {
  return <a className="brand" href="#inicio" aria-label="FraudLens, inicio"><Image className="brand-logo-light" src="/brand/logo-completo-modo-claro.png" alt="FraudLens" width={1471} height={370} /><Image className="brand-logo-dark" src="/brand/logo-completo-modo-oscuro.png" alt="" aria-hidden="true" width={1471} height={370} /></a>;
}

function EvaluationForm({ onCreated }: { onCreated: (result: EvaluationResult) => void }) {
  const [form, setForm] = useState(initialForm);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  function update(event: ChangeEvent<HTMLInputElement | HTMLSelectElement>) {
    setForm(current => ({ ...current, [event.target.name]: event.target.value }));
  }
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setError("");
    try {
      onCreated(await createTransactionEvaluation(toTransactionInput(form)));
      setForm({ ...initialForm, transaction_datetime: localDateTimeValue() });
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "No se pudo guardar la evaluación.");
    } finally {
      setSubmitting(false);
    }
  }
  return <section className="panel form-panel" id="nueva-evaluacion" aria-labelledby="form-title">
    <div className="panel-heading"><div><p className="eyebrow">NUEVA EVALUACIÓN</p><h2 id="form-title">Registrar transacción</h2></div><span className="step-mark">01</span></div>
    <p className="panel-intro">Completá los datos de la operación para guardar una evaluación.</p>
    <form onSubmit={submit}>
      <fieldset disabled={submitting} className="form-fields"><div className="form-grid">
        <label className="form-field">ID de transacción<input name="transaction_id" value={form.transaction_id} onChange={update} required autoComplete="off" /></label>
        <label className="form-field">ID de usuario<input name="user_id" value={form.user_id} onChange={update} required autoComplete="off" /></label>
        <label className="form-field">Fecha y hora<input name="transaction_datetime" type="datetime-local" value={form.transaction_datetime} onChange={update} required /></label>
        <label className="form-field">Monto<input name="amount" type="number" min={Number.MIN_VALUE} step="any" value={form.amount} onChange={update} required /></label>
        <label className="form-field">Moneda<input name="currency" value={form.currency} onChange={update} minLength={3} maxLength={3} required /></label>
        <label className="form-field">Comercio<input name="merchant" value={form.merchant} onChange={update} required /></label>
        <label className="form-field">País de la transacción<input name="country" value={form.country} onChange={update} minLength={2} maxLength={2} required /></label>
        <label className="form-field">País de emisión de la tarjeta<input name="card_country" value={form.card_country} onChange={update} minLength={2} maxLength={2} required /></label>
        <label className="form-field">Titular presente<select name="cardholder_present" value={form.cardholder_present} onChange={update}><option value="false">No</option><option value="true">Sí</option></select></label>
        <label className="form-field">Tarjeta presente<select name="card_present" value={form.card_present} onChange={update}><option value="false">No</option><option value="true">Sí</option></select></label>
      </div></fieldset>
      <p className="contract-note">Tipo de operación: compra (PURCHASE). La evaluación consulta el historial disponible.</p>
      {error && <p className="feedback error" role="alert">{error}</p>}
      <div className="form-actions"><button className="button-primary" type="submit" disabled={submitting}>{submitting ? "Guardando…" : "Guardar evaluación"}</button></div>
    </form>
  </section>;
}

function ResultNotice({ result, onDismiss }: { result: EvaluationResult; onDismiss: () => void }) {
  return <section className="result-notice" role="status" aria-label="Evaluación guardada">
    <div><p className="eyebrow">EVALUACIÓN GUARDADA</p><strong>{result.transaction_id}</strong><p>Decisión registrada: <b>{result.decision}</b></p>{result.reasons?.map(reason => <p key={reason}>{reason}</p>)}{result.signals?.length ? <p>Señales: {result.signals.join(", ")}</p> : null}<code>ID: {result.transaction_evaluation_id}</code></div>
    <button className="icon-button" type="button" onClick={onDismiss} aria-label="Cerrar confirmación">×</button>
  </section>;
}

function EvaluationRow({ item }: { item: TransactionEvaluation }) {
  return <article className="evaluation-row">
    <div className="row-identity"><span className="row-symbol" aria-hidden="true">↗</span><div><strong>{item.transaction_id}</strong><small>Usuario {item.user_id}</small></div></div>
    <div><span className="row-label">COMERCIO</span><strong>{item.merchant}</strong></div>
    <div><span className="row-label">MONTO</span><strong>{moneyLabel(item.amount, item.currency)}</strong></div>
    <div><span className="row-label">FECHA</span><strong>{dateLabel(item.transaction_datetime)}</strong></div>
    <div><span className="row-label">RESULTADO</span><span className={`decision-pill decision-${item.decision.toLowerCase()}`}>{item.decision === "BLOCK" ? "BLOCK · legado fijo" : item.decision}</span>{item.reasons?.map(reason => <small key={reason}>{reason}</small>)}{item.signals?.length ? <small>Señales: {item.signals.join(", ")}</small> : null}</div>
  </article>;
}

function History({ onRefresh, refreshKey }: { onRefresh: () => void; refreshKey: number }) {
  const [page, setPage] = useState<EvaluationPage | null>(null);
  const [offset, setOffset] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const load = useCallback(async (signal: AbortSignal) => {
    setLoading(true);
    setError("");
    try { setPage(await getTransactionEvaluations(offset, PAGE_SIZE, signal)); }
    catch (cause) {
      if (!signal.aborted) setError(cause instanceof Error ? cause.message : "No se pudo cargar el historial.");
    } finally { if (!signal.aborted) setLoading(false); }
  }, [offset]);
  useEffect(() => {
    const controller = new AbortController();
    void Promise.resolve().then(() => load(controller.signal));
    return () => controller.abort();
  }, [load, refreshKey]);
  function changePage(nextOffset: number) { setOffset(Math.max(0, nextOffset)); onRefresh(); }
  return <section className="panel history-panel" id="historial" aria-labelledby="history-title">
    <div className="panel-heading"><div><p className="eyebrow">ACTIVIDAD</p><h2 id="history-title">Historial de evaluaciones</h2></div><button className="button-secondary" type="button" onClick={onRefresh} disabled={loading}>Actualizar</button></div>
    {loading && <p className="feedback" role="status">Cargando evaluaciones…</p>}
    {error && <div className="feedback error" role="alert"><span>{error}</span><button type="button" className="text-button" onClick={onRefresh}>Reintentar</button></div>}
    {!loading && !error && page?.items.length === 0 && <div className="empty-state"><span className="empty-icon" aria-hidden="true">◷</span><h3>Todavía no hay evaluaciones</h3><p>Las evaluaciones guardadas aparecerán acá.</p></div>}
    {!loading && !error && page && page.items.length > 0 && <>
      <div className="evaluation-list" aria-live="polite">{page.items.map(item => <EvaluationRow key={item.transaction_evaluation_id} item={item} />)}</div>
      <div className="pagination"><span>Mostrando {page.offset + 1}–{page.offset + page.items.length}</span><div className="pagination-actions"><button className="button-secondary" type="button" disabled={page.offset === 0 || loading} onClick={() => changePage(Math.max(0, page.offset - page.limit))}>Anterior</button><button className="button-secondary" type="button" disabled={!page.has_more || loading} onClick={() => changePage(page.offset + page.limit)}>Siguiente</button></div></div>
    </>}
  </section>;
}

export default function EvaluationWorkspace() {
  const [result, setResult] = useState<EvaluationResult | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  return <div className="app-shell" id="inicio">
    <aside className="sidebar"><Brand /><p className="sidebar-caption">ANÁLISIS DE TRANSACCIONES</p><nav aria-label="Navegación principal"><a className="nav-item active" href="#nueva-evaluacion"><span aria-hidden="true">＋</span>Nueva evaluación</a><a className="nav-item" href="#historial"><span aria-hidden="true">◷</span>Historial</a></nav><div className="sidebar-bottom"><span className="status-dot" aria-hidden="true" /> MVP · evaluación asistida</div></aside>
    <main className="workspace-main"><header className="page-header"><div><p className="eyebrow">FRAUDLENS / MVP</p><h1>Evaluación de transacciones</h1><p>Registrá una operación y consultá su historial.</p></div><a href="#nueva-evaluacion" className="button-primary header-cta">＋ <span>Nueva evaluación</span></a></header>
      {result && <ResultNotice result={result} onDismiss={() => setResult(null)} />}
      <div className="workspace-grid"><EvaluationForm onCreated={evaluation => { setResult(evaluation); setRefreshKey(value => value + 1); }} /><History refreshKey={refreshKey} onRefresh={() => setRefreshKey(value => value + 1)} /></div>
      <footer className="page-footer"><span>FraudLens · MVP</span><span>Las decisiones reflejan la evaluación registrada.</span></footer>
    </main>
  </div>;
}
