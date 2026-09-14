import { useEffect, useRef, useState, type FormEvent } from "react";
import { createRepo, listCreateOptions } from "../../lib/api";
import type { CreatedRepo, CreateOptions } from "../../lib/types";

export function isInvalidName(cleanName: string): boolean {
  return Boolean(
    cleanName &&
      (!/^[a-zA-Z0-9._-]{1,100}$/.test(cleanName) ||
        [".", ".."].includes(cleanName) ||
        cleanName.endsWith(".git")),
  );
}

export function useCreateForm({
  login,
  onCreated,
}: {
  login: string | null;
  onCreated: (repo: CreatedRepo, track: boolean) => Promise<void>;
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
    listCreateOptions()
      .then((value) => {
        if (!active) return;
        setOptions(value);
        setOwner((current) => (value.owners.includes(current) ? current : (value.owners[0] ?? "")));
      })
      .catch((err) => {
        if (active) setError(String(err));
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [attempt]);

  const cleanName = name.trim();
  const invalidName = isInvalidName(cleanName);

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (submitting.current || !owner || !cleanName || invalidName || !options) return;
    submitting.current = true;
    setBusy(true);
    setError(null);
    try {
      const repo = await createRepo({
        owner,
        name: cleanName,
        description: description.trim() || null,
        private: visibility === "private",
        addReadme: readme,
        gitignore: gitignore || null,
        license: license || null,
      });
      // Creation is complete even if saving the local tracking preference fails.
      setCreated(repo);
      try {
        await onCreated(repo, track);
      } catch (err) {
        setError(
          `Repository created, but tracking could not be saved. Select it in Repositories. ${String(err)}`,
        );
      }
    } catch (err) {
      setError(
        `${String(err)} Check your repositories on GitHub before retrying if the connection was interrupted.`,
      );
    } finally {
      submitting.current = false;
      setBusy(false);
    }
  }

  function resetForAnother() {
    setCreated(null);
    setName("");
    setDescription("");
    setError(null);
  }

  function retry() {
    setAttempt((value) => value + 1);
  }

  return {
    options,
    owner,
    setOwner,
    name,
    setName,
    description,
    setDescription,
    visibility,
    setVisibility,
    readme,
    setReadme,
    gitignore,
    setGitignore,
    license,
    setLicense,
    track,
    setTrack,
    loading,
    busy,
    error,
    setError,
    created,
    cleanName,
    invalidName,
    submit,
    resetForAnother,
    retry,
  };
}

export type CreateFormApi = ReturnType<typeof useCreateForm>;
