import { type FormEvent, useEffect, useReducer, useRef } from "react";
import { useI18n } from "@/app/hooks";
import type { CreatedRepo, CreateOptions } from "@/lib/types";
import { createRepo, listCreateOptions } from "@/services/api";
import { isInvalidName } from "../utils/validate";

type CreateState = {
  options: CreateOptions | null;
  owner: string;
  name: string;
  description: string;
  visibility: string;
  readme: boolean;
  gitignore: string;
  license: string;
  track: boolean;
  loading: boolean;
  busy: boolean;
  error: string | null;
  created: CreatedRepo | null;
  attempt: number;
};

type CreateAction =
  | { type: "loadStart" }
  | { type: "optionsLoaded"; options: CreateOptions }
  | { type: "optionsFailed"; error: string }
  | { type: "loadEnd" }
  | { type: "setOwner"; owner: string }
  | { type: "setName"; name: string }
  | { type: "setDescription"; description: string }
  | { type: "setVisibility"; visibility: string }
  | { type: "setReadme"; readme: boolean }
  | { type: "setGitignore"; gitignore: string }
  | { type: "setLicense"; license: string }
  | { type: "setTrack"; track: boolean }
  | { type: "setError"; error: string | null }
  | { type: "submitStart" }
  | { type: "submitSuccess"; created: CreatedRepo }
  | { type: "submitFailure"; error: string }
  | { type: "submitEnd" }
  | { type: "resetAnother" }
  | { type: "retry" };

function initCreate(login: string | null): CreateState {
  return {
    options: null,
    owner: login ?? "",
    name: "",
    description: "",
    visibility: "private",
    readme: true,
    gitignore: "",
    license: "",
    track: true,
    loading: true,
    busy: false,
    error: null,
    created: null,
    attempt: 0,
  };
}

function createReducer(state: CreateState, action: CreateAction): CreateState {
  switch (action.type) {
    case "loadStart":
      return { ...state, loading: true, error: null };
    case "optionsLoaded": {
      const owners = action.options.owners;
      const owner = owners.includes(state.owner)
        ? state.owner
        : (owners[0] ?? "");
      return { ...state, options: action.options, owner };
    }
    case "optionsFailed":
      return { ...state, error: action.error };
    case "loadEnd":
      return { ...state, loading: false };
    case "setOwner":
      return { ...state, owner: action.owner };
    case "setName":
      return { ...state, name: action.name };
    case "setDescription":
      return { ...state, description: action.description };
    case "setVisibility":
      return { ...state, visibility: action.visibility };
    case "setReadme":
      return { ...state, readme: action.readme };
    case "setGitignore":
      return { ...state, gitignore: action.gitignore };
    case "setLicense":
      return { ...state, license: action.license };
    case "setTrack":
      return { ...state, track: action.track };
    case "setError":
      return { ...state, error: action.error };
    case "submitStart":
      return { ...state, busy: true, error: null };
    case "submitSuccess":
      return { ...state, created: action.created };
    case "submitFailure":
      return { ...state, error: action.error };
    case "submitEnd":
      return { ...state, busy: false };
    case "resetAnother":
      return {
        ...state,
        created: null,
        name: "",
        description: "",
        error: null,
      };
    case "retry":
      return { ...state, attempt: state.attempt + 1 };
  }
}

/**
 * Form state and guarded submit for repository creation.
 * All fields share one reducer so busy/error/loading transitions stay
 * consistent; the in-flight guard lives in a ref outside the reducer.
 */
export function useCreateForm({
  login,
  onCreated,
}: {
  login: string | null;
  onCreated: (repo: CreatedRepo, track: boolean) => Promise<void>;
}) {
  const { t } = useI18n();
  const [state, dispatch] = useReducer(createReducer, login, initCreate);
  const submitting = useRef(false);

  const {
    options,
    owner,
    name,
    description,
    visibility,
    readme,
    gitignore,
    license,
    track,
    loading,
    busy,
    error,
    created,
    attempt,
  } = state;

  // biome-ignore lint/correctness/useExhaustiveDependencies: attempt is an intentional refetch signal for retry; it is not read inside the effect.
  useEffect(() => {
    let active = true;
    dispatch({ type: "loadStart" });
    listCreateOptions()
      .then((value) => {
        if (!active) return;
        dispatch({ type: "optionsLoaded", options: value });
      })
      .catch((err) => {
        if (active) dispatch({ type: "optionsFailed", error: String(err) });
      })
      .finally(() => {
        if (active) dispatch({ type: "loadEnd" });
      });
    return () => {
      active = false;
    };
  }, [attempt]);

  const cleanName = name.trim();
  const invalidName = isInvalidName(cleanName);

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (submitting.current || !owner || !cleanName || invalidName || !options)
      return;
    submitting.current = true;
    dispatch({ type: "submitStart" });
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
      dispatch({ type: "submitSuccess", created: repo });
      try {
        await onCreated(repo, track);
      } catch (err) {
        dispatch({
          type: "submitFailure",
          error: `${t("create.trackingFailed")} ${String(err)}`,
        });
      }
    } catch (err) {
      dispatch({
        type: "submitFailure",
        error: `${t("create.failed")} ${String(err)}`,
      });
    } finally {
      submitting.current = false;
      dispatch({ type: "submitEnd" });
    }
  }

  function resetForAnother() {
    dispatch({ type: "resetAnother" });
  }

  function retry() {
    dispatch({ type: "retry" });
  }

  return {
    options,
    owner,
    setOwner: (owner: string) => dispatch({ type: "setOwner", owner }),
    name,
    setName: (name: string) => dispatch({ type: "setName", name }),
    description,
    setDescription: (description: string) =>
      dispatch({ type: "setDescription", description }),
    visibility,
    setVisibility: (visibility: string) =>
      dispatch({ type: "setVisibility", visibility }),
    readme,
    setReadme: (readme: boolean) => dispatch({ type: "setReadme", readme }),
    gitignore,
    setGitignore: (gitignore: string) =>
      dispatch({ type: "setGitignore", gitignore }),
    license,
    setLicense: (license: string) => dispatch({ type: "setLicense", license }),
    track,
    setTrack: (track: boolean) => dispatch({ type: "setTrack", track }),
    loading,
    busy,
    error,
    setError: (error: string | null) => dispatch({ type: "setError", error }),
    created,
    cleanName,
    invalidName,
    submit,
    resetForAnother,
    retry,
  };
}

export type CreateFormApi = ReturnType<typeof useCreateForm>;
