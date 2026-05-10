fn preview_directory_items_json(state: &PreviewState, space_id: Option<&str>) -> String {
    let items = state
        .directory_items
        .iter()
        .filter(|item| match space_id {
            Some(space_id) => item.space_id == space_id,
            None => true,
        })
        .map(preview_directory_item_json)
        .collect::<Vec<_>>();
    format!("[{}]", items.join(","))
}

fn preview_directory_item_json(item: &PreviewDirectoryItem) -> String {
    format!(
        "{{\"id\":{},\"resource_id\":{},\"space_id\":{},\"title\":{},\"description\":{},\"url\":{},\"item_type\":{},\"group\":{},\"pinned\":{},\"order\":{}}}",
        json_string(&item.id),
        json_string(&item.resource_id),
        json_string(&item.space_id),
        localized_text_json(&item.title),
        localized_text_json(&item.description),
        json_string(&item.url),
        json_string(&item.item_type),
        json_string(&item.group),
        if item.pinned { "true" } else { "false" },
        item.order
    )
}

fn preview_current_space_json(state: &PreviewState, space: &PreviewSpace) -> String {
    let base = preview_space_json(space);
    let template = preview_template_for_space(state, space);
    let hidden_block_ids = preview_hidden_block_ids(state, space);
    let dashboard = preview_dashboard_state_json(state, space, &template, &hidden_block_ids);
    let entries = preview_directory_items_json(state, Some(space.id.as_str()));
    let visible_order = preview_space_entries_visible_order_json(state, &space.id);
    let base = base.trim_end_matches('}');
    format!(
        "{base},\"template\":{},\"entries\":{{\"items\":{},\"visible_order\":{}}},\"dashboard\":{}}}",
        json_string(&space.dashboard_template),
        entries,
        visible_order,
        dashboard
    )
}

fn preview_dashboard_state_json(
    state: &PreviewState,
    space: &PreviewSpace,
    template: &PreviewTemplate,
    hidden_block_ids: &[String],
) -> String {
    format!(
        "{{\"template\":{},\"blocks\":{},\"block_order\":{},\"hidden_block_ids\":{},\"visible_block_ids\":{},\"visible_blocks\":{}}}",
        preview_template_json(template),
        preview_blocks_json(state, space, template, hidden_block_ids),
        preview_block_order_json(template),
        json_string_array(hidden_block_ids),
        preview_visible_block_ids_json(template, hidden_block_ids),
        preview_visible_blocks_json(state, space, template, hidden_block_ids)
    )
}

fn preview_block_order_json(template: &PreviewTemplate) -> String {
    let order = template
        .blocks
        .iter()
        .map(|block| json_string(&block.id))
        .collect::<Vec<_>>();
    format!("[{}]", order.join(","))
}

fn preview_visible_block_ids_json(
    template: &PreviewTemplate,
    hidden_block_ids: &[String],
) -> String {
    let ids = template
        .blocks
        .iter()
        .filter(|block| !hidden_block_ids.contains(&block.id))
        .map(|block| json_string(&block.id))
        .collect::<Vec<_>>();
    format!("[{}]", ids.join(","))
}

fn preview_space_entries_visible_order_json(state: &PreviewState, space_id: &str) -> String {
    let order = state
        .directory_items
        .iter()
        .filter(|item| item.space_id == space_id)
        .map(|item| json_string(&item.id))
        .collect::<Vec<_>>();
    format!("[{}]", order.join(","))
}

fn preview_visible_blocks_json(
    state: &PreviewState,
    space: &PreviewSpace,
    template: &PreviewTemplate,
    hidden_block_ids: &[String],
) -> String {
    let blocks = template
        .blocks
        .iter()
        .filter(|block| !hidden_block_ids.contains(&block.id))
        .enumerate()
        .map(|(index, block)| preview_block_json(state, space, template, block, true, index))
        .collect::<Vec<_>>();
    format!("[{}]", blocks.join(","))
}

fn preview_block_json(
    state: &PreviewState,
    space: &PreviewSpace,
    template: &PreviewTemplate,
    block: &PreviewTemplateBlock,
    visible: bool,
    index: usize,
) -> String {
    let contract = preview_block_contract_json(state, block);
    let order = index + 1;
    format!(
        "{{\"id\":{},\"type\":{},\"title\":{},\"space\":{},\"template\":{},\"config\":{},\"layout\":{{\"xs\":{{\"order\":{}}}}},\"order\":{},\"visible\":{},\"contract\":{}}}",
        json_string(&block.id),
        json_string(&block.block_type),
        localized_text_json(&block.title),
        json_string(&space.id),
        json_string(&template.key),
        preview_block_config_json(block),
        order,
        order,
        if visible { "true" } else { "false" },
        contract
    )
}

fn preview_block_config_json(block: &PreviewTemplateBlock) -> String {
    match block.block_type.as_str() {
        "calendar_upcoming" => format!(
            "{{\"limit\":{},\"window\":\"week\",\"include_archived\":false,\"include_reminders\":true}}",
            block.limit
        ),
        "inventory_summary" => format!(
            "{{\"limit\":{},\"attention_limit\":{},\"slice\":\"pantry\",\"include_archived\":false}}",
            block.limit,
            block.limit.max(1)
        ),
        _ => format!("{{\"limit\":{}}}", block.limit),
    }
}

fn preview_block_contract_json(state: &PreviewState, block: &PreviewTemplateBlock) -> String {
    match block.block_type.as_str() {
        "calendar_upcoming" => {
            let resource = preview_resource_inspect_json(state, &["calendar"]);
            format!(
                "{{\"source_kind\":\"knowledge-api\",\"entry_kind\":\"calendar-entry\",\"summary_kind\":\"calendar-upcoming\",\"inspect\":{{\"path\":\"/api/knowledge/v1/calendar/upcoming\",\"preferred_target\":\"resource\",\"params\":{{\"window\":\"week\",\"include_archived\":false,\"include_reminders\":true,\"limit\":{}}},\"resource\":{}}}}}",
                block.limit.max(1),
                resource.unwrap_or_else(|| "null".to_string())
            )
        }
        "inventory_summary" => {
            let resource = preview_resource_inspect_json(state, &["inventory"]);
            format!(
                "{{\"source_kind\":\"knowledge-api\",\"entry_kind\":\"inventory-item\",\"summary_kind\":\"inventory-summary\",\"summary_slice\":\"pantry\",\"inspect\":{{\"path\":\"/api/knowledge/v1/inventory/summary\",\"preferred_target\":\"resource\",\"params\":{{\"slice\":\"pantry\",\"include_archived\":false,\"attention_limit\":{}}},\"resource\":{}}}}}",
                block.limit.max(1),
                resource.unwrap_or_else(|| "null".to_string())
            )
        }
        _ => format!(
            "{{\"source_kind\":\"atrium-materialized-entries\",\"entry_kind\":\"service-link\",\"selector\":{{\"classification\":\"default_on\",\"pinned_only\":true,\"limit\":{}}}}}",
            block.limit.max(1)
        ),
    }
}

fn preview_resource_inspect_json(state: &PreviewState, resource_ids: &[&str]) -> Option<String> {
    let entry = state.directory_items.iter().find(|item| {
        let normalized_title = localized_text_sort_key(&item.title);
        resource_ids.iter().any(|resource_id| {
            item.resource_id.eq_ignore_ascii_case(resource_id)
                || normalized_title == resource_id.to_ascii_lowercase()
        })
    })?;
    let url = entry.url.trim();
    if url.is_empty() {
        return None;
    }
    Some(format!(
        "{{\"id\":{},\"title\":{},\"url\":{}}}",
        json_string(&entry.resource_id),
        localized_text_json(&entry.title),
        json_string(url)
    ))
}
