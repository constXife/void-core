fn localized_text(key: &str, en: &str, ru: &str) -> LocalizedText {
    let mut translations = BTreeMap::new();
    if !en.trim().is_empty() {
        translations.insert("en".to_string(), en.to_string());
    }
    if !ru.trim().is_empty() {
        translations.insert("ru".to_string(), ru.to_string());
    }
    LocalizedText {
        key: key.to_string(),
        translations,
    }
}

fn unquote(value: &str) -> &str {
    value
        .strip_prefix('"')
        .and_then(|inner| inner.strip_suffix('"'))
        .or_else(|| {
            value
                .strip_prefix('\'')
                .and_then(|inner| inner.strip_suffix('\''))
        })
        .unwrap_or(value)
}

fn json_string(value: &str) -> String {
    let escaped = value
        .replace('\\', "\\\\")
        .replace('"', "\\\"")
        .replace('\n', "\\n");
    format!("\"{escaped}\"")
}

fn json_string_array(values: &[String]) -> String {
    let parts = values.iter().map(|value| json_string(value)).collect::<Vec<_>>();
    format!("[{}]", parts.join(","))
}

fn yaml_string(value: &str) -> String {
    let escaped = value.replace('\\', "\\\\").replace('"', "\\\"");
    format!("\"{escaped}\"")
}
