use super::{parse_iso_unix, upsert};

#[test]
fn unix_epoch() {
    assert_eq!(parse_iso_unix("1970-01-01T00:00:00Z"), Some(0));
    assert_eq!(parse_iso_unix("2020-01-01T00:00:00Z"), Some(1_577_836_800));
}

#[test]
fn upsert_same_day_replaces() {
    let mut series = Vec::new();
    upsert(&mut series, 1_700_000_000, 10);
    upsert(&mut series, 1_700_000_100, 12);
    assert_eq!(series.len(), 1);
    assert_eq!(series[0].value, 12);
}
