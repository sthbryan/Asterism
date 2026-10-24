use std::io::{ErrorKind, Read};
use std::process::{Command, Stdio};
use std::time::{Duration, Instant};

use serde_json::Value;

const GH_TIMEOUT: Duration = Duration::from_secs(30);

fn drain<R: Read + Send + 'static>(reader: Option<R>) -> std::thread::JoinHandle<Vec<u8>> {
    std::thread::spawn(move || {
        let mut buffer = Vec::new();
        if let Some(mut inner) = reader {
            let _ = inner.read_to_end(&mut buffer);
        }
        buffer
    })
}

fn augmented_path() -> String {
    let extra = "/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin";
    match std::env::var("PATH") {
        Ok(path) if !path.is_empty() => format!("{extra}:{path}"),
        _ => extra.to_string(),
    }
}

fn error_message(status: &std::process::ExitStatus, stdout: &[u8], stderr: &[u8]) -> String {
    let stderr = String::from_utf8_lossy(stderr);
    let stdout = String::from_utf8_lossy(stdout);
    if !stderr.trim().is_empty() {
        stderr.trim().to_string()
    } else if !stdout.trim().is_empty() {
        stdout.trim().to_string()
    } else {
        format!("gh exited with status {status}")
    }
}

fn run_gh(args: &[&str]) -> Result<String, String> {
    run_gh_env(args, &[])
}

pub(crate) fn run_gh_env(args: &[&str], extra_env: &[(&str, &str)]) -> Result<String, String> {
    let (status, stdout, stderr) = execute(args, extra_env)?;
    if status.success() {
        return Ok(String::from_utf8_lossy(&stdout).to_string());
    }
    Err(error_message(&status, &stdout, &stderr))
}

/// Like `run_gh_env`, but a non-zero exit with valid output is not fatal.
/// GraphQL reports per-field errors while still returning usable `data`.
pub(crate) fn run_gh_env_lenient(
    args: &[&str],
    extra_env: &[(&str, &str)],
) -> Result<String, String> {
    let (status, stdout, stderr) = execute(args, extra_env)?;
    if status.success() || !stdout.is_empty() {
        return Ok(String::from_utf8_lossy(&stdout).to_string());
    }
    Err(error_message(&status, &stdout, &stderr))
}

fn execute(
    args: &[&str],
    extra_env: &[(&str, &str)],
) -> Result<(std::process::ExitStatus, Vec<u8>, Vec<u8>), String> {
    let mut cmd = Command::new("gh");
    cmd.args(args)
        .env("PATH", augmented_path())
        .env("GH_HOST", super::host())
        .env("GH_PROMPT_DISABLED", "1")
        .env("GH_PAGER", "cat")
        .env("NO_COLOR", "1")
        .env("CLICOLOR", "0")
        // No background update checks or telemetry: a short command can be
        // cancelled before the notifier finishes, paying for it every run.
        .env("GH_NO_UPDATE_NOTIFIER", "1")
        .env("GH_NO_EXTENSION_UPDATE_NOTIFIER", "1")
        .env("GH_TELEMETRY", "0")
        .stdout(Stdio::piped())
        .stderr(Stdio::piped())
        .stdin(Stdio::null());
    for (key, value) in extra_env {
        cmd.env(key, value);
    }

    let mut child = cmd.spawn().map_err(|err| {
        if err.kind() == ErrorKind::NotFound {
            "GitHub CLI (gh) was not found on this machine.".to_string()
        } else {
            format!("Could not run gh: {err}")
        }
    })?;
    let stdout_reader = drain(child.stdout.take());
    let stderr_reader = drain(child.stderr.take());

    let deadline = Instant::now() + GH_TIMEOUT;
    let status = loop {
        match child.try_wait() {
            Ok(Some(status)) => break status,
            Ok(None) => {
                if Instant::now() >= deadline {
                    let _ = child.kill();
                    let _ = child.wait();
                    return Err(format!(
                        "gh did not answer within {} seconds and was stopped.",
                        GH_TIMEOUT.as_secs()
                    ));
                }
                std::thread::sleep(Duration::from_millis(20));
            }
            Err(err) => {
                let _ = child.kill();
                return Err(format!("Could not run gh: {err}"));
            }
        }
    };

    let stdout = stdout_reader.join().unwrap_or_default();
    let stderr = stderr_reader.join().unwrap_or_default();
    Ok((status, stdout, stderr))
}

/// A short, single-line look at whatever `gh` wrote, so a non-JSON reply
/// (a proxy page, a truncated body) is visible in the error instead of hidden.
fn preview(raw: &str) -> String {
    let one_line = raw.split_whitespace().collect::<Vec<_>>().join(" ");
    let mut chars = one_line.chars();
    let head: String = chars.by_ref().take(160).collect();
    format!("{head}{}", if chars.next().is_some() { "…" } else { "" })
}

fn parse_json(raw: &str) -> Result<Value, String> {
    let trimmed = raw.trim();
    if trimmed.is_empty() {
        return Ok(Value::Null);
    }
    serde_json::from_str(trimmed).map_err(|e| {
        format!(
            "Could not parse gh JSON: {e}. gh printed: {}",
            preview(trimmed)
        )
    })
}

pub(crate) fn run_gh_json(args: &[&str]) -> Result<Value, String> {
    parse_json(&run_gh(args)?)
}

pub(crate) fn run_gh_json_lenient(args: &[&str]) -> Result<Value, String> {
    parse_json(&run_gh_env_lenient(args, &[])?)
}

#[cfg(test)]
mod tests {
    use super::preview;

    #[test]
    fn preview_flattens_unexpected_output_and_bounds_it() {
        assert_eq!(
            preview("<html>\n  <body>Blocked</body>\n</html>"),
            "<html> <body>Blocked</body> </html>"
        );
        let long = preview(&"x".repeat(500));
        assert!(long.ends_with('…'));
        assert_eq!(long.chars().count(), 161);
    }
}

pub(super) fn first_line(output: &str) -> String {
    output.lines().next().unwrap_or("").trim().to_string()
}

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
