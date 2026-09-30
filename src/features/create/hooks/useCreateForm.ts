import { type FormEvent, useEffect, useReducer, useRef } from "react";
import { useI18n } from "@/app/hooks";
import { useResource } from "@/app/hooks/useResource";
import type { CreatedRepo, CreateOptions } from "@/lib/types";
import { createRepo, listCreateOptions } from "@/services/api";
import { createOptionsCache } from "@/services/api/resources";
import { isInvalidName } from "../utils/validate";

type CreateState = {
  owner: string;
  name: string;
  description: string;
  visibility: string;
  readme: boolean;
  gitignore: string;
  license: string;
  track: boolean;
  busy: boolean;
  error: string | null;
  created: CreatedRepo | null;
};

type CreateAction =
  | { type: "optionsLoaded"; options: CreateOptions }
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
  | { type: "resetAnother" };

function initCreate(login: string | null): CreateState {
  return {
    owner: login ?? "",
    name: "",
    description: "",
    visibility: "private",
    readme: true,
    gitignore: "",
    license: "",
    track: true,
    busy: false,
    error: null,
    created: null,
  };
}

function createReducer(state: CreateState, action: CreateAction): CreateState {
  switch (action.type) {
    case "optionsLoaded": {
      const owners = action.options.owners;
      const owner = owners.includes(state.owner)
        ? state.owner
        : (owners[0] ?? "");
      return { ...state, owner };
    }
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
  }
}

async function fetchOptions() {
  return {
    data: await listCreateOptions(),
    fetchedAt: Math.floor(Date.now() / 1_000),
    warning: null,
  };
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
  const optionsResource = useResource(
    createOptionsCache,
    "options",
    fetchOptions,
  );
  const options = optionsResource.saved?.data ?? null;
  const loading = optionsResource.loading;
  const [state, dispatch] = useReducer(createReducer, login, initCreate);
  const submitting = useRef(false);

  const {
    owner,
    name,
    description,
    visibility,
    readme,
    gitignore,
    license,
    track,
    busy,
    error,
    created,
  } = state;

  useEffect(() => {
    if (options) dispatch({ type: "optionsLoaded", options });
  }, [options]);

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

  return {
    options,
    loading,
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
    busy,
    error: error ?? optionsResource.error,
    setError: (error: string | null) => dispatch({ type: "setError", error }),
    created,
    cleanName,
    invalidName,
    submit,
    resetForAnother,
    retry: optionsResource.refresh,
  };
}

export type CreateFormApi = ReturnType<typeof useCreateForm>;
