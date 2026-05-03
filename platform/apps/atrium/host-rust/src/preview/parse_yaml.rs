fn parse_scalar(source: &str, key: &str) -> Option<String> {
    let prefix = format!("{key}:");
    source.lines().find_map(|line| {
        let trimmed = line.trim();
        trimmed
            .strip_prefix(&prefix)
            .map(|value| unquote(value.trim()).to_string())
            .filter(|value| !value.is_empty())
    })
}

fn parse_string_list(source: &str, key: &str) -> Vec<String> {
    let mut items = Vec::new();
    let mut in_list = false;
    let list_prefix = format!("{key}:");
    for line in source.lines() {
        if !in_list {
            if line.trim() == list_prefix {
                in_list = true;
            }
            continue;
        }

        let trimmed = line.trim();
        if let Some(value) = trimmed.strip_prefix("- ") {
            let normalized = unquote(value.trim()).to_string();
            if !normalized.is_empty() {
                items.push(normalized);
            }
            continue;
        }

        if !trimmed.is_empty() {
            break;
        }
    }
    items
}

fn parse_placement_resources(source: &str) -> Vec<PreviewPlacementEntry> {
    let mut items = Vec::new();
    let mut in_list = false;
    let mut current: Option<PreviewPlacementEntry> = None;

    for line in source.lines() {
        let trimmed = line.trim();
        if !in_list {
            if trimmed == "resources:" {
                in_list = true;
            }
            continue;
        }

        if let Some(value) = trimmed.strip_prefix("- resource:") {
            if let Some(entry) = current.take() {
                items.push(entry);
            }
            current = Some(PreviewPlacementEntry {
                resource_id: unquote(value.trim()).to_string(),
                pinned: false,
                order: 100,
            });
            continue;
        }

        let Some(entry) = current.as_mut() else {
            if !trimmed.is_empty() {
                break;
            }
            continue;
        };

        if let Some(value) = trimmed.strip_prefix("resource:") {
            entry.resource_id = unquote(value.trim()).to_string();
        } else if let Some(value) = trimmed.strip_prefix("pinned:") {
            entry.pinned = matches!(unquote(value.trim()), "true" | "True" | "TRUE" | "yes" | "on");
        } else if let Some(value) = trimmed.strip_prefix("order:") {
            entry.order = unquote(value.trim()).parse::<i64>().unwrap_or(100);
        } else if !trimmed.is_empty() && !line.starts_with(' ') {
            break;
        }
    }

    if let Some(entry) = current.take() {
        items.push(entry);
    }

    items
}

fn preview_filter_hidden_block_ids(
    blocks: &[PreviewTemplateBlock],
    hidden_block_ids: &[String],
) -> Vec<String> {
    let available_ids = blocks
        .iter()
        .map(|block| block.id.clone())
        .collect::<Vec<_>>();
    let mut filtered = Vec::new();
    for block_id in hidden_block_ids {
        let normalized = block_id.trim();
        if normalized.is_empty()
            || filtered.iter().any(|existing| existing == normalized)
            || !available_ids.iter().any(|available| available == normalized)
        {
            continue;
        }
        filtered.push(normalized.to_string());
    }
    filtered
}

fn parse_template_blocks(source: &str) -> Vec<PreviewTemplateBlock> {
    let mut blocks = Vec::new();
    let mut current: Option<PreviewTemplateBlock> = None;

    for line in source.lines() {
        let trimmed = line.trim();
        if let Some(value) = trimmed.strip_prefix("- id:") {
            if let Some(block) = current.take() {
                blocks.push(normalize_block(block));
            }
            current = Some(PreviewTemplateBlock {
                id: unquote(value.trim()).to_string(),
                block_type: String::new(),
                title: LocalizedText {
                    key: String::new(),
                    translations: BTreeMap::new(),
                },
                limit: 8,
            });
            continue;
        }

        let Some(block) = current.as_mut() else {
            continue;
        };
        if let Some(value) = trimmed.strip_prefix("type:") {
            block.block_type = unquote(value.trim()).to_string();
        } else if let Some(value) = trimmed.strip_prefix("title:") {
            let title = unquote(value.trim()).to_string();
            if !title.is_empty() {
                block.title = localized_text("", &title, "");
            }
        } else if let Some(value) = trimmed.strip_prefix("limit:") {
            if let Ok(limit) = unquote(value.trim()).parse::<i64>() {
                block.limit = limit;
            }
        }
    }

    if let Some(block) = current.take() {
        blocks.push(normalize_block(block));
    }

    blocks
}

fn normalize_block(mut block: PreviewTemplateBlock) -> PreviewTemplateBlock {
    if block.id.trim().is_empty() {
        block.id = "preview-block".to_string();
    }
    if block.block_type.trim().is_empty() {
        block.block_type = "resources_pinned".to_string();
    }
    if block.title.key.trim().is_empty() {
        block.title.key = format!("atrium.block.{}.title", block.id);
    }
    if block.title.translations.is_empty() {
        block.title = localized_text(&block.title.key, "Key resources", "Ключевые ресурсы");
    }
    block
}

fn parse_widgets_count(source: &str) -> usize {
    let mut in_widgets = false;
    let mut count = 0usize;
    for line in source.lines() {
        let trimmed = line.trim();
        if !in_widgets {
            if trimmed == "widgets:" {
                in_widgets = true;
            }
            continue;
        }
        if trimmed.starts_with("- ") {
            count += 1;
            continue;
        }
        if !trimmed.is_empty() {
            break;
        }
    }
    count
}
