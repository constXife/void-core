fn query_param(raw_path: &str, key: &str) -> Option<String> {
    let query = raw_path.split_once('?')?.1;
    for pair in query.split('&') {
        let mut parts = pair.splitn(2, '=');
        let current_key = parts.next().unwrap_or_default().trim();
        if current_key != key {
            continue;
        }
        let value = parts.next().unwrap_or_default().trim();
        if !value.is_empty() {
            return Some(value.to_string());
        }
    }
    None
}

fn request_body(request: &str) -> &str {
    request
        .split_once("\r\n\r\n")
        .map(|(_, body)| body)
        .or_else(|| request.split_once("\n\n").map(|(_, body)| body))
        .unwrap_or("")
}

fn extract_json_string(body: &str, key: &str) -> Option<String> {
    let needle = format!("\"{key}\"");
    let start = body.find(&needle)?;
    let tail = &body[start + needle.len()..];
    let colon = tail.find(':')?;
    let value = tail[colon + 1..].trim_start();
    let rest = value.strip_prefix('"')?;
    let end = rest.find('"')?;
    Some(rest[..end].to_string())
}

fn extract_nested_json_string(body: &str, object_key: &str, key: &str) -> Option<String> {
    let object_needle = format!("\"{object_key}\"");
    let object_start = body.find(&object_needle)?;
    let object_tail = &body[object_start + object_needle.len()..];
    let brace_start = object_tail.find('{')?;
    let object_body = &object_tail[brace_start..];
    extract_json_string(object_body, key)
}

fn extract_json_bool(body: &str, key: &str) -> Option<bool> {
    let needle = format!("\"{key}\"");
    let start = body.find(&needle)?;
    let tail = &body[start + needle.len()..];
    let colon = tail.find(':')?;
    let value = tail[colon + 1..].trim_start();
    if value.starts_with("true") {
        Some(true)
    } else if value.starts_with("false") {
        Some(false)
    } else {
        None
    }
}

fn extract_optional_json_string_array(body: &str, key: &str) -> Option<Vec<String>> {
    if !body.contains(&format!("\"{key}\"")) {
        return None;
    }
    Some(extract_json_string_array(body, key))
}

fn extract_json_string_array(body: &str, key: &str) -> Vec<String> {
    let needle = format!("\"{key}\"");
    let Some(start) = body.find(&needle) else {
        return Vec::new();
    };
    let tail = &body[start + needle.len()..];
    let Some(bracket_start) = tail.find('[') else {
        return Vec::new();
    };
    let tail = &tail[bracket_start + 1..];
    let Some(bracket_end) = tail.find(']') else {
        return Vec::new();
    };
    tail[..bracket_end]
        .split(',')
        .filter_map(|value| {
            let trimmed = unquote(value.trim());
            (!trimmed.is_empty()).then(|| trimmed.to_string())
        })
        .collect()
}

fn extract_dashboard_blocks(body: &str) -> Vec<PreviewTemplateBlock> {
    let mut blocks = Vec::new();
    let mut remaining = body;
    while let Some(index) = remaining.find("\"type\"") {
        let block_body = &remaining[index..];
        let block_type = extract_json_string(block_body, "type").unwrap_or_else(|| "core.resources_pinned".to_string());
        let id = extract_json_string(block_body, "id").unwrap_or_else(|| "preview-block".to_string());
        let title = extract_json_string(block_body, "title").unwrap_or_else(|| "Preview block".to_string());
        let limit = extract_json_number(block_body, "limit").unwrap_or(8);
        blocks.push(PreviewTemplateBlock {
            title: localized_text(&format!("atrium.block.{id}.title"), &title, ""),
            id,
            block_type,
            limit,
        });
        remaining = &block_body[6..];
    }
    blocks
}

fn extract_json_number(body: &str, key: &str) -> Option<i64> {
    let needle = format!("\"{key}\"");
    let start = body.find(&needle)?;
    let tail = &body[start + needle.len()..];
    let colon = tail.find(':')?;
    let value = tail[colon + 1..].trim_start();
    let digits = value
        .chars()
        .take_while(|ch| ch.is_ascii_digit() || *ch == '-')
        .collect::<String>();
    digits.parse::<i64>().ok()
}

fn slugify(value: &str) -> String {
    let mut slug = String::new();
    let mut last_dash = false;
    for ch in value.chars() {
        let lower = ch.to_ascii_lowercase();
        if lower.is_ascii_alphanumeric() {
            slug.push(lower);
            last_dash = false;
        } else if !last_dash {
            slug.push('-');
            last_dash = true;
        }
    }
    slug.trim_matches('-').to_string()
}
