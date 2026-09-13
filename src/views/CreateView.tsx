import { useEffect, useRef, useState, type FormEvent } from "react";
import { CheckCircle, ArrowSquareOut } from "@phosphor-icons/react";
import { openUrl } from "@tauri-apps/plugin-opener";
import { createRepo, isMockMode, listCreateOptions } from "../lib/api";
import type { CreatedRepo, CreateOptions } from "../lib/types";
import { Button } from "../components/Button";

const field = "mt-2 w-full rounded-md border border-line bg-wash px-3 py-2 text-[13px] text-paper focus:outline-2 focus:outline-accent disabled:opacity-50";

export function CreateView({ login, onCreated, onOverview }: {
  login: string | null;
  onCreated: (repo: CreatedRepo, track: boolean) => Promise<void>;
  onOverview: () => void;
}) {
  const [options, setOptions] = useState<CreateOptions | null>(null);
  const [owner, setOwner] = useState(login ?? "");
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [visibility, setVisibility] = useState("private");
  const [readme, setReadme] = useState(true);
  const [gitignore, setGitignore] = useState("");
  const [license, setLicense] = useState("");
  const [track, setTrack] = useState(true);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [created, setCreated] = useState<CreatedRepo | null>(null);
  const [attempt, setAttempt] = useState(0);
  const submitting = useRef(false);
  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(null);
    listCreateOptions().then((value) => {
      if (!active) return;
      setOptions(value);
      setOwner((current) => value.owners.includes(current) ? current : value.owners[0] ?? "");
    }).catch((err) => { if (active) setError(String(err)); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [attempt]);

  const cleanName = name.trim();
  const invalidName = cleanName && (!/^[a-zA-Z0-9._-]{1,100}$/.test(cleanName) || [".", ".."].includes(cleanName) || cleanName.endsWith(".git"));
  async function submit(event: FormEvent) {
    event.preventDefault();
    if (submitting.current || !owner || !cleanName || invalidName || !options) return;
    submitting.current = true;
    setBusy(true);
    setError(null);
    try {
      const repo = await createRepo({ owner, name: cleanName, description: description.trim() || null,
        private: visibility === "private", addReadme: readme, gitignore: gitignore || null, license: license || null });
      // Creation is complete even if saving the local tracking preference fails.
      setCreated(repo);
      try { await onCreated(repo, track); }
      catch (err) { setError(`Repository created, but tracking could not be saved. Select it in Repositories. ${String(err)}`); }
    } catch (err) {
      setError(`${String(err)} Check your repositories on GitHub before retrying if the connection was interrupted.`);
    } finally { submitting.current = false; setBusy(false); }
  }
  return <div className="h-full overflow-y-auto px-6 py-7">
    <div className="mx-auto max-w-[640px]">
      {created ? <div className="py-8" role="status">
        <CheckCircle size={30} className="text-ok" />
        <h2 className="mt-4 text-xl font-semibold">Repository created</h2>
        <p className="mt-2 break-all font-mono text-sm">{created.fullName}</p>
        <p className="mt-2 text-sm text-mist">{created.private ? "Private" : "Public"} repository{isMockMode() ? " · Demo only" : " on GitHub"}.</p>
        {error && <p role="alert" className="mt-4 text-sm text-accent-soft">{error}</p>}
        <div className="mt-6 flex flex-wrap gap-2">
          <Button variant="primary" onClick={onOverview}>View overview</Button>
          {!isMockMode() && <Button onClick={() => { void openUrl(created.htmlUrl).catch((err) => setError(String(err))); }}>Open on GitHub <ArrowSquareOut size={14} /></Button>}
          <Button disabled={busy} onClick={() => { setCreated(null); setName(""); setDescription(""); setError(null); }}>Create another</Button>
        </div>
      </div> : <form onSubmit={(event) => { void submit(event); }}>
        <h2 className="text-xl font-semibold tracking-[-0.02em]">A new home for your project</h2>
        <p className="mt-2 text-[13px] leading-relaxed text-mist">Create a repository on GitHub and start tracking it in Asterism.</p>
        {isMockMode() && <p className="mt-3 text-sm text-mist">Demo mode — no repository will be created on GitHub.</p>}
        {loading && <p role="status" className="mt-5 text-sm text-mist">Loading repository options…</p>}
        {error && <div role="alert" className="mt-5 text-sm text-accent-soft"><p className="whitespace-pre-wrap break-words">{error}</p>{!options && <Button className="mt-3" onClick={() => setAttempt((value) => value + 1)} type="button">Retry loading</Button>}</div>}
        <fieldset disabled={busy || loading || !options} className="mt-7 space-y-6 disabled:opacity-60">
          <div className="grid gap-4 sm:grid-cols-[1fr_2fr]">
            <label className="text-[13px] font-medium">Owner<select value={owner} onChange={(event) => setOwner(event.target.value)} className={field} required>{options?.owners.map((item) => <option key={item}>{item}</option>)}</select></label>
            <label className="text-[13px] font-medium">Repository name<input value={name} onChange={(event) => setName(event.target.value)} className={field} maxLength={100} required autoComplete="off" placeholder="my-project" aria-invalid={Boolean(invalidName)} aria-describedby="name-help" /></label>
          </div>
          <p id="name-help" className="-mt-3 text-xs text-mist">{invalidName ? "Use letters, numbers, periods, hyphens or underscores. Names cannot be . or .., or end in .git." : `${owner || "owner"}/${cleanName || "my-project"}`}</p>
          <label className="block text-[13px] font-medium">Description <span className="font-normal text-mist">(optional)</span><input value={description} onChange={(event) => setDescription(event.target.value)} maxLength={350} className={field} placeholder="What does this project do?" /></label>
          <fieldset><legend className="text-[13px] font-medium">Visibility</legend><div className="mt-3 space-y-3">{[ ["private", "Private", "Only you and people you grant access can see this repository."], ["public", "Public", "Anyone on the internet can see this repository."] ].map(([value, label, hint]) => <label key={value} className="flex items-start gap-3 text-[13px]"><input type="radio" name="visibility" value={value} checked={visibility === value} onChange={() => setVisibility(value)} className="mt-1 accent-accent" /><span><span className="font-medium">{label}</span><span className="mt-1 block text-xs text-mist">{hint}</span></span></label>)}</div></fieldset>
          <div className="border-t border-hairline pt-5">
            <label className="flex items-center gap-3 text-[13px]"><input type="checkbox" checked={readme} onChange={(event) => setReadme(event.target.checked)} className="accent-accent" />Add a README</label>
            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              <label className="text-[13px] font-medium">.gitignore<select className={field} value={gitignore} onChange={(event) => setGitignore(event.target.value)}><option value="">None</option>{options?.gitignores.map((item) => <option key={item}>{item}</option>)}</select></label>
              <label className="text-[13px] font-medium">License<select className={field} value={license} onChange={(event) => setLicense(event.target.value)}><option value="">None</option>{options?.licenses.map((item) => <option key={item.key} value={item.key}>{item.name}</option>)}</select></label>
            </div>
          </div>
          <label className="flex items-center gap-3 border-t border-hairline pt-5 text-[13px]"><input type="checkbox" checked={track} onChange={(event) => setTrack(event.target.checked)} className="accent-accent" />Track this repository in Asterism</label>
          <div className="flex justify-end pb-4"><Button type="submit" variant="primary" disabled={busy || !owner || !cleanName || Boolean(invalidName)}>{busy ? "Creating repository…" : "Create repository"}</Button></div>
        </fieldset>
      </form>}
    </div>
  </div>;
}
