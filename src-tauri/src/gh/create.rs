use super::{as_string, run_gh_env, run_gh_json};
use crate::models::{CreateOptions, CreateRepoInput, CreatedRepo, LicenseOption};

pub(crate) fn validate_repo_name(name: &str) -> Result<(), String> {
    if name.is_empty() {
        return Err("Repository name is required.".to_string());
    }
    if name.len() > 100 {
        return Err("Repository name must be 100 characters or fewer.".to_string());
    }
    if name == "." || name == ".." || name.ends_with(".git") {
        return Err("That repository name is not allowed.".to_string());
    }
    if !name
        .chars()
        .all(|c| c.is_ascii_alphanumeric() || c == '.' || c == '_' || c == '-')
    {
        return Err("Use letters, numbers, hyphens, underscores, or periods.".to_string());
    }
    Ok(())
}

pub fn list_create_options() -> Result<CreateOptions, String> {
    let user = run_gh_json(&["api", "user"])?;
    let login = as_string(&user, "login")
        .ok_or_else(|| "GitHub CLI did not return an authenticated user.".to_string())?;
    let mut owners = vec![login];
    if let Ok(orgs) = run_gh_json(&["api", "--paginate", "/user/orgs?per_page=100"]) {
        if let Some(arr) = orgs.as_array() {
            for item in arr {
                if let Some(org) = as_string(item, "login") {
                    if !owners
                        .iter()
                        .any(|existing| existing.eq_ignore_ascii_case(&org))
                    {
                        owners.push(org);
                    }
                }
            }
        }
    }
    let gitignores = match run_gh_json(&["api", "gitignore/templates"]) {
        Ok(json) => json
            .as_array()
            .map(|items| {
                items
                    .iter()
                    .filter_map(|item| item.as_str())
                    .map(|s| s.to_string())
                    .collect()
            })
            .unwrap_or_default(),
        Err(_) => Vec::new(),
    };
    let licenses = match run_gh_json(&["api", "licenses"]) {
        Ok(json) => json
            .as_array()
            .map(|items| {
                items
                    .iter()
                    .filter_map(|item| {
                        let key = as_string(item, "key")?;
                        let name = as_string(item, "name").unwrap_or_else(|| key.clone());
                        Some(LicenseOption { key, name })
                    })
                    .collect()
            })
            .unwrap_or_default(),
        Err(_) => Vec::new(),
    };
    Ok(CreateOptions {
        owners,
        gitignores,
        licenses,
    })
}

pub fn create_repo(input: CreateRepoInput) -> Result<CreatedRepo, String> {
    let owner = input.owner.trim();
    let name = input.name.trim();
    if owner.is_empty() {
        return Err("Owner is required.".to_string());
    }
    if owner.len() > 39
        || !owner.chars().all(|c| c.is_ascii_alphanumeric() || c == '-')
        || owner.starts_with('-')
        || owner.ends_with('-')
    {
        return Err("Invalid repository owner.".to_string());
    }
    validate_repo_name(name)?;
    let full_name = format!("{owner}/{name}");
    let mut args: Vec<String> = vec!["repo".to_string(), "create".to_string(), full_name.clone()];
    args.push(if input.private {
        "--private".to_string()
    } else {
        "--public".to_string()
    });
    if let Some(description) = input
        .description
        .as_deref()
        .map(str::trim)
        .filter(|value| !value.is_empty())
    {
        args.push("-d".to_string());
        args.push(description.to_string());
    }
    if input.add_readme {
        args.push("--add-readme".to_string());
    }
    if let Some(gitignore) = input
        .gitignore
        .as_deref()
        .map(str::trim)
        .filter(|value| !value.is_empty())
    {
        args.push("-g".to_string());
        args.push(gitignore.to_string());
    }
    if let Some(license) = input
        .license
        .as_deref()
        .map(str::trim)
        .filter(|value| !value.is_empty())
    {
        args.push("-l".to_string());
        args.push(license.to_string());
    }
    let refs: Vec<&str> = args.iter().map(String::as_str).collect();
    run_gh_env(&refs, &[("GH_PROMPT_DISABLED", "1")])?;
    Ok(CreatedRepo {
        full_name: full_name.clone(),
        html_url: format!("https://github.com/{full_name}"),
        private: input.private,
    })
}

