fn localized_text_sort_key(value: &LocalizedText) -> String {
    value
        .translations
        .get("en")
        .or_else(|| value.translations.values().next())
        .map(|item| item.to_lowercase())
        .unwrap_or_else(|| value.key.to_lowercase())
}

fn localized_text_json(value: &LocalizedText) -> String {
    let translations = value
        .translations
        .iter()
        .map(|(lang, text)| format!("{}:{}", json_string(lang), json_string(text)))
        .collect::<Vec<_>>();
    format!(
        "{{\"key\":{},\"translations\":{{{}}}}}",
        json_string(&value.key),
        translations.join(",")
    )
}

fn localized_text_yaml_lines(value: &LocalizedText, indent: usize) -> Vec<String> {
    let prefix = " ".repeat(indent);
    let mut lines = vec![format!("{prefix}key: {}", yaml_string(&value.key))];
    lines.push(format!("{prefix}translations:"));
    for (lang, text) in &value.translations {
        lines.push(format!("{prefix}  {lang}: {}", yaml_string(text)));
    }
    lines
}

fn parse_localized_text(source: &str, key: &str, default_key: &str) -> LocalizedText {
    let lines = source.lines().collect::<Vec<_>>();
    let field_prefix = format!("{key}:");
    let Some((index, field_line)) = lines
        .iter()
        .enumerate()
        .find(|(_, line)| line.trim() == field_prefix)
    else {
        return LocalizedText {
            key: default_key.to_string(),
            translations: BTreeMap::new(),
        };
    };

    let base_indent = leading_spaces(field_line);
    let mut text = LocalizedText {
        key: default_key.to_string(),
        translations: BTreeMap::new(),
    };
    let mut in_translations = false;
    let mut translations_indent = 0usize;

    for line in lines.iter().skip(index + 1) {
        if line.trim().is_empty() {
            continue;
        }
        let indent = leading_spaces(line);
        if indent <= base_indent {
            break;
        }
        let trimmed = line.trim();
        if let Some(value) = trimmed.strip_prefix("key:") {
            let parsed = unquote(value.trim()).to_string();
            if !parsed.is_empty() {
                text.key = parsed;
            }
            in_translations = false;
        } else if trimmed == "translations:" {
            in_translations = true;
            translations_indent = indent;
        } else if in_translations && indent > translations_indent {
            if let Some((lang, value)) = trimmed.split_once(':') {
                let lang = lang.trim().to_ascii_lowercase();
                let value = unquote(value.trim()).to_string();
                if !lang.is_empty() && !value.is_empty() {
                    text.translations.insert(lang, value);
                }
            }
        } else {
            in_translations = false;
        }
    }

    text
}

fn leading_spaces(value: &str) -> usize {
    value.chars().take_while(|ch| *ch == ' ').count()
}
