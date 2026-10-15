use super::{as_string, as_u64};
use crate::history::{day_bucket, now_secs, parse_iso_unix};
use crate::models::{LanguageShare, PopularPath, Referrer, Traffic, TrafficDay};
use serde_json::Value;

fn parse_traffic_days(json: &Value, key: &str) -> Vec<TrafficDay> {
    let Some(arr) = json.get(key).and_then(|v| v.as_array()) else {
        return Vec::new();
    };
    let mut days = Vec::new();
    for item in arr {
        let ts = item
            .get("timestamp")
            .and_then(|v| v.as_str())
            .and_then(parse_iso_unix)
            .map(day_bucket)
            .unwrap_or(0);
        if ts == 0 {
            continue;
        }
        days.push(TrafficDay {
            ts,
            count: as_u64(item, "count"),
            uniques: as_u64(item, "uniques"),
        });
    }
    days.sort_by_key(|d| d.ts);
    days
}

pub(crate) fn parse_traffic(json: &Value, series_key: &str) -> Traffic {
    let days = parse_traffic_days(json, series_key);
    let sample_from = days.first().map(|d| d.ts);
    let sample_to = days.last().map(|d| d.ts);
    Traffic {
        count: as_u64(json, "count"),
        uniques: as_u64(json, "uniques"),
        days,
        fetched_at: Some(now_secs()),
        sample_from,
        sample_to,
    }
}

pub(crate) fn traffic_status(err: &str) -> crate::models::TrafficStatus {
    if err.contains("403") || err.to_ascii_lowercase().contains("forbidden") {
        crate::models::TrafficStatus::Forbidden
    } else {
        crate::models::TrafficStatus::Error
    }
}

pub(super) fn parse_referrers(json: &Value) -> Vec<Referrer> {
    let Some(arr) = json.as_array() else {
        return Vec::new();
    };
    let mut rows: Vec<Referrer> = arr
        .iter()
        .filter_map(|item| {
            let referrer = as_string(item, "referrer")?;
            Some(Referrer {
                referrer,
                count: as_u64(item, "count"),
                uniques: as_u64(item, "uniques"),
            })
        })
        .collect();
    rows.sort_by_key(|row| std::cmp::Reverse(row.count));
    rows
}

pub(super) fn parse_paths(json: &Value) -> Vec<PopularPath> {
    let Some(arr) = json.as_array() else {
        return Vec::new();
    };
    let mut rows: Vec<PopularPath> = arr
        .iter()
        .filter_map(|item| {
            let path = as_string(item, "path")?;
            Some(PopularPath {
                path,
                title: as_string(item, "title"),
                count: as_u64(item, "count"),
                uniques: as_u64(item, "uniques"),
            })
        })
        .collect();
    rows.sort_by_key(|row| std::cmp::Reverse(row.count));
    rows
}

pub(super) fn parse_languages(json: &Value) -> Vec<LanguageShare> {
    let mut langs = Vec::new();
    if let Some(obj) = json.as_object() {
        for (name, bytes) in obj {
            let n = bytes
                .as_u64()
                .or_else(|| bytes.as_i64().map(|v| v.max(0) as u64))
                .unwrap_or(0);
            langs.push(LanguageShare {
                name: name.clone(),
                bytes: n,
            });
        }
    }
    langs.sort_by_key(|language| std::cmp::Reverse(language.bytes));
    langs
}

pub(super) fn topics(value: &Value) -> Vec<String> {
    value
        .get("topics")
        .and_then(|v| v.as_array())
        .map(|arr| {
            arr.iter()
                .filter_map(|v| v.as_str().map(|s| s.to_string()))
                .collect()
        })
        .unwrap_or_default()
}

pub(super) fn license_name(value: &Value) -> Option<String> {
    value.get("license").and_then(|lic| {
        as_string(lic, "spdx_id")
            .filter(|s| s != "NOASSERTION")
            .or_else(|| as_string(lic, "name"))
    })
}
