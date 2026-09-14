use std::io::ErrorKind;
use std::process::{Command, Stdio};

use serde_json::Value;

fn augmented_path() -> String {
    let extra = "/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin";
    match std::env::var("PATH") {
        Ok(path) if !path.is_empty() => format!("{extra}:{path}"),
        _ => extra.to_string(),
    }
}

fn run_gh(args: &[&str]) -> Result<String, String> {
    run_gh_env(args, &[])
}

pub(crate) fn run_gh_env(args: &[&str], extra_env: &[(&str, &str)]) -> Result<String, String> {
    let mut cmd = Command::new("gh");
    cmd.args(args)
        .env("PATH", augmented_path())
        .env("GH_PAGER", "cat")
        .env("NO_COLOR", "1")
        .env("CLICOLOR", "0")
        .stdout(Stdio::piped())
        .stderr(Stdio::piped())
        .stdin(Stdio::null());
    for (key, value) in extra_env {
        cmd.env(key, value);
    }

    let output = cmd.output().map_err(|err| {
        if err.kind() == ErrorKind::NotFound {
            "GitHub CLI (gh) was not found on this machine.".to_string()
        } else {
            format!("Could not run gh: {err}")
        }
    })?;

    if !output.status.success() {
        let stderr = String::from_utf8_lossy(&output.stderr);
        let stdout = String::from_utf8_lossy(&output.stdout);
        let msg = if !stderr.trim().is_empty() {
            stderr.trim().to_string()
        } else if !stdout.trim().is_empty() {
            stdout.trim().to_string()
        } else {
            format!("gh exited with status {}", output.status)
        };
        return Err(msg);
    }

    Ok(String::from_utf8_lossy(&output.stdout).to_string())
}

pub(super) fn run_gh_json(args: &[&str]) -> Result<Value, String> {
    let raw = run_gh(args)?;
    let trimmed = raw.trim();
    if trimmed.is_empty() {
        return Ok(Value::Null);
    }
    serde_json::from_str(trimmed).map_err(|e| format!("Could not parse gh JSON: {e}"))
}

pub(super) fn first_line(output: &str) -> String {
    output.lines().next().unwrap_or("").trim().to_string()
}

/// Runs a tool and returns its first output line plus an optional error.
pub(crate) fn tool_version(program: &str, args: &[&str]) -> (Option<String>, Option<String>) {
    let mut cmd = Command::new(program);
    cmd.args(args)
        .env("PATH", augmented_path())
        .stdout(Stdio::piped())
        .stderr(Stdio::piped())
        .stdin(Stdio::null());
    let output = match cmd.output() {
        Ok(output) => output,
        Err(err) if err.kind() == ErrorKind::NotFound => {
            return (
                None,
                Some(format!("{program} was not found on this machine.")),
            );
        }
        Err(err) => return (None, Some(format!("Could not run {program}: {err}"))),
    };
    if !output.status.success() {
        let stderr = String::from_utf8_lossy(&output.stderr);
        let msg = stderr.trim();
        return (
            None,
            Some(if msg.is_empty() {
                format!("{program} exited with status {}", output.status)
            } else {
                msg.to_string()
            }),
        );
    }
    let line = first_line(&String::from_utf8_lossy(&output.stdout));
    if line.is_empty() {
        (
            None,
            Some(format!("{program} returned empty version output.")),
        )
    } else {
        (Some(line), None)
    }
}
