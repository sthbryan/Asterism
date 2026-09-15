use std::time::{SystemTime, UNIX_EPOCH};

use crate::models::{HistoryStore, RepoHistory, SeriesPoint, TrackedRepo};

pub const DAY: u64 = 86_400;
const MAX_POINTS: usize = 180;

pub fn now_secs() -> u64 {
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|d| d.as_secs())
        .unwrap_or(0)
}

pub fn day_bucket(ts: u64) -> u64 {
    ts / DAY * DAY
}

pub fn parse_iso_unix(raw: &str) -> Option<u64> {
    let s = raw.trim();
    if s.len() < 10 {
        return None;
    }
    let y: i32 = s.get(0..4)?.parse().ok()?;
    let m: u32 = s.get(5..7)?.parse().ok()?;
    let d: u32 = s.get(8..10)?.parse().ok()?;
    if m == 0 || m > 12 || d == 0 || d > 31 {
        return None;
    }
    let hour: u32 = s.get(11..13).and_then(|v| v.parse().ok()).unwrap_or(0);
    let min: u32 = s.get(14..16).and_then(|v| v.parse().ok()).unwrap_or(0);
    let sec: u32 = s.get(17..19).and_then(|v| v.parse().ok()).unwrap_or(0);
    let days = days_from_civil(y, m, d)? as i64;
    let secs = days
        .saturating_mul(DAY as i64)
        .saturating_add(hour as i64 * 3600)
        .saturating_add(min as i64 * 60)
        .saturating_add(sec as i64);
    Some(secs.max(0) as u64)
}

fn days_from_civil(y: i32, m: u32, d: u32) -> Option<i32> {
    if m == 0 || m > 12 || d == 0 || d > 31 {
        return None;
    }
    let y = if m <= 2 { y - 1 } else { y };
    let era = if y >= 0 { y } else { y - 399 }.div_euclid(400);
    let yoe = (y - era * 400) as u32;
    let mp = if m > 2 { m - 3 } else { m + 9 };
    let doy = (153 * mp + 2) / 5 + d - 1;
    let doe = yoe * 365 + yoe / 4 - yoe / 100 + doy;
    Some(era * 146097 + doe as i32 - 719468)
}

pub fn upsert(series: &mut Vec<SeriesPoint>, ts: u64, value: u64) {
    let day = day_bucket(ts);
    if let Some(last) = series.last_mut() {
        if day_bucket(last.ts) == day {
            last.ts = day;
            last.value = value;
            return;
        }
        if last.ts > day {
            series.push(SeriesPoint { ts: day, value });
            series.sort_by_key(|p| p.ts);
            series.dedup_by(|a, b| day_bucket(a.ts) == day_bucket(b.ts));
            return;
        }
    }
    series.push(SeriesPoint { ts: day, value });
}

pub fn downsample(points: &[SeriesPoint], max: usize) -> Vec<SeriesPoint> {
    if points.len() <= max || max < 3 {
        return points.to_vec();
    }
    let mut out = Vec::with_capacity(max);
    out.push(points[0]);
    let inner = (max - 2) as f64;
    let span = (points.len() - 2) as f64;
    for i in 1..=(max - 2) {
        let idx = 1 + ((i as f64 / inner) * span).round() as usize;
        let idx = idx.clamp(1, points.len() - 2);
        if out.last().map(|p| p.ts) != Some(points[idx].ts) {
            out.push(points[idx]);
        }
    }
    if let Some(last) = points.last() {
        if out.last().map(|p| p.ts) != Some(last.ts) {
            out.push(*last);
        }
    }
    out
}

pub fn apply_fetch(store: &mut HistoryStore, repo: &TrackedRepo, now: u64) {
    if store.version == 0 {
        store.version = 1;
    }
    let entry = store
        .repos
        .entry(repo.full_name.clone())
        .or_insert_with(RepoHistory::default);
    upsert(&mut entry.stars, now, repo.stars);
    upsert(&mut entry.downloads, now, repo.downloads);
    upsert(&mut entry.forks, now, repo.forks);
    entry.stars = downsample(&entry.stars, MAX_POINTS);
    entry.downloads = downsample(&entry.downloads, MAX_POINTS);
    entry.forks = downsample(&entry.forks, MAX_POINTS);
}
